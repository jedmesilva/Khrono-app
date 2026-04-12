-- =============================================================
-- 1. Adicionar valor_hora em provider_services
--    (pode já existir se o app inseriu via cliente Supabase)
-- =============================================================
ALTER TABLE provider_services
  ADD COLUMN IF NOT EXISTS valor_hora decimal(10,2);

-- Backfill: calcular a partir de multiplicador × valor_base do prestador
UPDATE provider_services ps
SET valor_hora = ROUND(
  COALESCE(
    (SELECT pp.valor_base FROM provider_profiles pp WHERE pp.profile_id = ps.profile_id),
    50
  )::numeric * COALESCE(ps.multiplicador, 1)::numeric,
  2
)
WHERE ps.valor_hora IS NULL;

-- Garantir valor padrão para qualquer linha ainda nula
UPDATE provider_services SET valor_hora = 50.00 WHERE valor_hora IS NULL;

ALTER TABLE provider_services ALTER COLUMN valor_hora SET NOT NULL;
ALTER TABLE provider_services ALTER COLUMN valor_hora SET DEFAULT 50.00;

-- Deprecar multiplicador: tornar nullable (parar de usar, manter por compatibilidade)
ALTER TABLE provider_services ALTER COLUMN multiplicador DROP NOT NULL;
ALTER TABLE provider_services ALTER COLUMN multiplicador DROP DEFAULT;

-- =============================================================
-- 2. Criar tabela provider_tools (tools próprias do prestador)
-- =============================================================
CREATE TABLE IF NOT EXISTS provider_tools (
  id           uuid         PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id   uuid         NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  nome         text         NOT NULL,
  tipo         text         NOT NULL CHECK (tipo IN ('veiculo', 'ferramenta', 'equipamento')),
  details      text,
  is_available boolean      NOT NULL DEFAULT true,
  created_at   timestamptz  NOT NULL DEFAULT now(),
  updated_at   timestamptz  NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_provider_tools_profile ON provider_tools (profile_id);

-- =============================================================
-- 3. Criar tabela service_skills (N:N service ↔ skills_catalog)
-- =============================================================
CREATE TABLE IF NOT EXISTS service_skills (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  service_id uuid        NOT NULL REFERENCES provider_services(id) ON DELETE CASCADE,
  skill_id   uuid        NOT NULL REFERENCES skills_catalog(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (service_id, skill_id)
);

CREATE INDEX IF NOT EXISTS idx_service_skills_service ON service_skills (service_id);
CREATE INDEX IF NOT EXISTS idx_service_skills_skill   ON service_skills (skill_id);

-- =============================================================
-- 4. Criar tabela service_tools (N:N service ↔ provider_tools)
-- =============================================================
CREATE TABLE IF NOT EXISTS service_tools (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  service_id uuid        NOT NULL REFERENCES provider_services(id) ON DELETE CASCADE,
  tool_id    uuid        NOT NULL REFERENCES provider_tools(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (service_id, tool_id)
);

CREATE INDEX IF NOT EXISTS idx_service_tools_service ON service_tools (service_id);
CREATE INDEX IF NOT EXISTS idx_service_tools_tool    ON service_tools (tool_id);

-- =============================================================
-- 5. Migrar skill_catalog_id existente → service_skills
--    (coluna pode já existir no Supabase mesmo sem estar no Drizzle)
-- =============================================================
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name   = 'provider_services'
      AND column_name  = 'skill_catalog_id'
  ) THEN
    INSERT INTO service_skills (service_id, skill_id)
    SELECT id, skill_catalog_id
    FROM provider_services
    WHERE skill_catalog_id IS NOT NULL
    ON CONFLICT (service_id, skill_id) DO NOTHING;
  END IF;
END;
$$;

-- =============================================================
-- 6. Migrar tools JSONB existentes → provider_tools + service_tools
-- =============================================================
DO $$
DECLARE
  svc       RECORD;
  tool_item jsonb;
  tool_id   uuid;
  tool_nome text;
  tool_tipo text;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name   = 'provider_services'
      AND column_name  = 'tools'
  ) THEN
    RETURN;
  END IF;

  FOR svc IN
    SELECT id, profile_id, tools
    FROM provider_services
    WHERE tools IS NOT NULL
      AND jsonb_typeof(tools) = 'array'
      AND jsonb_array_length(tools) > 0
  LOOP
    FOR tool_item IN SELECT * FROM jsonb_array_elements(svc.tools) LOOP
      tool_nome := tool_item->>'nome';
      tool_tipo := LOWER(COALESCE(tool_item->>'tipo', 'equipamento'));

      IF tool_tipo NOT IN ('veiculo', 'ferramenta', 'equipamento') THEN
        tool_tipo := 'equipamento';
      END IF;

      IF tool_nome IS NOT NULL AND tool_nome <> '' THEN
        SELECT id INTO tool_id
        FROM provider_tools
        WHERE profile_id = svc.profile_id AND nome = tool_nome
        LIMIT 1;

        IF tool_id IS NULL THEN
          INSERT INTO provider_tools (profile_id, nome, tipo, is_available)
          VALUES (svc.profile_id, tool_nome, tool_tipo, true)
          RETURNING id INTO tool_id;
        END IF;

        INSERT INTO service_tools (service_id, tool_id)
        VALUES (svc.id, tool_id)
        ON CONFLICT (service_id, tool_id) DO NOTHING;
      END IF;
    END LOOP;
  END LOOP;
END;
$$;

-- =============================================================
-- 7. FK em contracts.service_id → provider_services
-- =============================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'contracts_service_id_fkey'
  ) THEN
    ALTER TABLE contracts
      ADD CONSTRAINT contracts_service_id_fkey
      FOREIGN KEY (service_id) REFERENCES provider_services(id) ON DELETE SET NULL;
  END IF;
END;
$$;

-- =============================================================
-- 8. Remover colunas obsoletas de provider_services
-- =============================================================
ALTER TABLE provider_services DROP COLUMN IF EXISTS skill;
ALTER TABLE provider_services DROP COLUMN IF EXISTS skill_catalog_id;
ALTER TABLE provider_services DROP COLUMN IF EXISTS tools;

-- =============================================================
-- 9. RLS para as novas tabelas
-- =============================================================

-- provider_tools
ALTER TABLE provider_tools ENABLE ROW LEVEL SECURITY;

CREATE POLICY "provider_tools_select" ON provider_tools
  FOR SELECT USING (true);

CREATE POLICY "provider_tools_insert" ON provider_tools
  FOR INSERT WITH CHECK (auth.uid() = profile_id);

CREATE POLICY "provider_tools_update" ON provider_tools
  FOR UPDATE USING (auth.uid() = profile_id);

CREATE POLICY "provider_tools_delete" ON provider_tools
  FOR DELETE USING (auth.uid() = profile_id);

-- service_skills
ALTER TABLE service_skills ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_skills_select" ON service_skills
  FOR SELECT USING (true);

CREATE POLICY "service_skills_insert" ON service_skills
  FOR INSERT WITH CHECK (
    auth.uid() = (
      SELECT profile_id FROM provider_services WHERE id = service_id LIMIT 1
    )
  );

CREATE POLICY "service_skills_delete" ON service_skills
  FOR DELETE USING (
    auth.uid() = (
      SELECT profile_id FROM provider_services WHERE id = service_id LIMIT 1
    )
  );

-- service_tools
ALTER TABLE service_tools ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_tools_select" ON service_tools
  FOR SELECT USING (true);

CREATE POLICY "service_tools_insert" ON service_tools
  FOR INSERT WITH CHECK (
    auth.uid() = (
      SELECT profile_id FROM provider_services WHERE id = service_id LIMIT 1
    )
  );

CREATE POLICY "service_tools_delete" ON service_tools
  FOR DELETE USING (
    auth.uid() = (
      SELECT profile_id FROM provider_services WHERE id = service_id LIMIT 1
    )
  );

-- =============================================================
-- 10. Trigger: atualiza updated_at de provider_tools
-- =============================================================
CREATE OR REPLACE FUNCTION public.handle_provider_tool_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_provider_tool_updated ON provider_tools;
CREATE TRIGGER on_provider_tool_updated
  BEFORE UPDATE ON provider_tools
  FOR EACH ROW EXECUTE FUNCTION public.handle_provider_tool_updated_at();
