-- Garante unicidade de PINs ativos: jamais pode existir dois PINs
-- com o mesmo valor e status = 'active' ao mesmo tempo.
-- PINs inativados, usados ou invalidados não são afetados pelo índice.
CREATE UNIQUE INDEX IF NOT EXISTS idx_provider_pins_unique_active_pin
  ON provider_pins (pin)
  WHERE status = 'active';
