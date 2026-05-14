ALTER TABLE public.businesses
  ADD COLUMN IF NOT EXISTS google_oauth_invalid boolean NOT NULL DEFAULT false;
