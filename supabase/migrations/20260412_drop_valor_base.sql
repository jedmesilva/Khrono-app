-- Remove valor_base from provider_profiles.
-- Each service now defines its own valor_hora directly.
ALTER TABLE provider_profiles DROP COLUMN IF EXISTS valor_base;
