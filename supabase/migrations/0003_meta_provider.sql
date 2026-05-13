ALTER TABLE public.businesses
  ADD COLUMN IF NOT EXISTS whatsapp_provider text CHECK (whatsapp_provider IN ('twilio','meta')) DEFAULT 'twilio',
  ADD COLUMN IF NOT EXISTS meta_phone_number_id text,
  ADD COLUMN IF NOT EXISTS meta_waba_id text;

CREATE UNIQUE INDEX IF NOT EXISTS businesses_meta_phone_number_id_idx
  ON public.businesses (meta_phone_number_id)
  WHERE meta_phone_number_id IS NOT NULL;
