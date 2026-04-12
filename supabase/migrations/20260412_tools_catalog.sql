CREATE TABLE IF NOT EXISTS tools_catalog (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  description text,
  tipo text NOT NULL CHECK (tipo IN ('veiculo', 'ferramenta', 'equipamento')),
  status text NOT NULL DEFAULT 'active',
  verified boolean NOT NULL DEFAULT false,
  image_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (nome, tipo)
);

ALTER TABLE tools_catalog ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tools_catalog_read" ON tools_catalog;
CREATE POLICY "tools_catalog_read" ON tools_catalog
  FOR SELECT USING (true);

INSERT INTO tools_catalog (nome, tipo, description, status, verified)
VALUES
  ('Carro', 'veiculo', 'Veículo de passeio para transporte de pessoas ou pequenas cargas.', 'active', false),
  ('Moto', 'veiculo', 'Motocicleta para deslocamentos rápidos e entregas ágeis.', 'active', false),
  ('Van', 'veiculo', 'Van para transporte de cargas médias, mudanças e grupos.', 'active', false),
  ('Caminhão', 'veiculo', 'Caminhão para transporte de cargas pesadas e mudanças de grande porte.', 'active', false),
  ('Pickup', 'veiculo', 'Caminhonete para transporte de cargas leves e materiais de construção.', 'active', false),
  ('Bicicleta', 'veiculo', 'Bicicleta para entregas locais e deslocamentos de curta distância.', 'active', false),
  ('Scooter', 'veiculo', 'Scooter elétrica ou a gasolina para entregas rápidas e mobilidade urbana.', 'active', false),
  ('Furadeira', 'ferramenta', 'Furadeira elétrica para perfuração em paredes, madeira e metal.', 'active', false),
  ('Serra Circular', 'ferramenta', 'Serra circular para cortes precisos em madeira e outros materiais.', 'active', false),
  ('Parafusadeira', 'ferramenta', 'Parafusadeira elétrica para montagem e fixação rápida de peças.', 'active', false),
  ('Esmerilhadeira', 'ferramenta', 'Esmerilhadeira angular para corte, desbaste e polimento de metais.', 'active', false),
  ('Martelo', 'ferramenta', 'Martelo para fixação, demolição leve e trabalhos manuais em geral.', 'active', false),
  ('Chave de Fenda', 'ferramenta', 'Jogo de chaves de fenda para aperto e soltura de parafusos de diferentes tipos.', 'active', false),
  ('Nível a Laser', 'ferramenta', 'Nível a laser para nivelamento e alinhamento preciso em instalações.', 'active', false),
  ('Escada', 'equipamento', 'Escada extensível ou de degraus para trabalhos em altura.', 'active', false),
  ('Carrinho de Mudança', 'equipamento', 'Carrinho plataforma para movimentação de móveis e caixas pesadas.', 'active', false),
  ('Betoneira', 'equipamento', 'Betoneira elétrica para mistura de concreto e argamassa em obras.', 'active', false),
  ('Compressor de Ar', 'equipamento', 'Compressor de ar para pintura a pistola, limpeza e ferramentas pneumáticas.', 'active', false),
  ('Gerador', 'equipamento', 'Gerador de energia para uso em locais sem tomada ou em quedas de energia.', 'active', false),
  ('Andaime', 'equipamento', 'Andaime tubular para trabalhos em fachadas, tetos e ambientes elevados.', 'active', false),
  ('Aspirador Industrial', 'equipamento', 'Aspirador de alta potência para limpeza de obras, pós e resíduos pesados.', 'active', false)
ON CONFLICT (nome, tipo) DO UPDATE SET
  description = EXCLUDED.description,
  status = EXCLUDED.status,
  updated_at = now();

CREATE OR REPLACE FUNCTION public.handle_tool_catalog_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_tool_catalog_updated ON tools_catalog;
CREATE TRIGGER on_tool_catalog_updated
  BEFORE UPDATE ON tools_catalog
  FOR EACH ROW EXECUTE FUNCTION public.handle_tool_catalog_updated_at();