-- Add stripe_payment_method_id to wallet_cards so saved cards can be
-- charged without the user re-entering their card details every time.
ALTER TABLE wallet_cards
  ADD COLUMN IF NOT EXISTS stripe_payment_method_id TEXT;
