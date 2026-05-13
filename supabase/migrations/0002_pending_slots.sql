ALTER TABLE public.conversations
  ADD COLUMN IF NOT EXISTS pending_slots jsonb,
  ADD COLUMN IF NOT EXISTS pending_service_id uuid REFERENCES public.services(id) ON DELETE SET NULL;
