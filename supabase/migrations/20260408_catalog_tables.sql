-- =============================================================
-- Catálogo de Skills
-- =============================================================
CREATE TABLE IF NOT EXISTS skills_catalog (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  description text,
  category text,
  status text NOT NULL DEFAULT 'active',
  verified boolean NOT NULL DEFAULT false,
  image_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- =============================================================
-- Catálogo de Services
-- =============================================================
CREATE TABLE IF NOT EXISTS services_catalog (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  description text,
  category text,
  status text NOT NULL DEFAULT 'active',
  verified boolean NOT NULL DEFAULT false,
  image_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- =============================================================
-- Relação: Usuário ↔ Skills
-- =============================================================
CREATE TABLE IF NOT EXISTS user_skills (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  skill_id uuid NOT NULL REFERENCES skills_catalog(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (profile_id, skill_id)
);

-- =============================================================
-- Relação: Usuário ↔ Services
-- =============================================================
CREATE TABLE IF NOT EXISTS user_services (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  service_id uuid NOT NULL REFERENCES services_catalog(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (profile_id, service_id)
);

-- =============================================================
-- Row Level Security (RLS)
-- =============================================================

-- skills_catalog: leitura pública, escrita apenas para admins
ALTER TABLE skills_catalog ENABLE ROW LEVEL SECURITY;
CREATE POLICY "skills_catalog_read" ON skills_catalog
  FOR SELECT USING (true);

-- services_catalog: leitura pública, escrita apenas para admins
ALTER TABLE services_catalog ENABLE ROW LEVEL SECURITY;
CREATE POLICY "services_catalog_read" ON services_catalog
  FOR SELECT USING (true);

-- user_skills: usuário vê e gerencia apenas as suas
ALTER TABLE user_skills ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user_skills_select" ON user_skills
  FOR SELECT USING (auth.uid() = profile_id);
CREATE POLICY "user_skills_insert" ON user_skills
  FOR INSERT WITH CHECK (auth.uid() = profile_id);
CREATE POLICY "user_skills_delete" ON user_skills
  FOR DELETE USING (auth.uid() = profile_id);

-- user_services: usuário vê e gerencia apenas os seus
ALTER TABLE user_services ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user_services_select" ON user_services
  FOR SELECT USING (auth.uid() = profile_id);
CREATE POLICY "user_services_insert" ON user_services
  FOR INSERT WITH CHECK (auth.uid() = profile_id);
CREATE POLICY "user_services_delete" ON user_services
  FOR DELETE USING (auth.uid() = profile_id);
