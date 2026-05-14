-- Añade columna billing_active a businesses.
-- true  = suscripción activa (o trial en curso).
-- false = suscripción cancelada / expirada → el pipeline AI devuelve mensaje de cortesía.
--
-- Por defecto true para no romper negocios existentes con suscripción ya activa.

alter table public.businesses
  add column if not exists billing_active boolean not null default true;

comment on column public.businesses.billing_active is
  'true mientras la suscripción Stripe esté activa o en trial. Se pone a false en customer.subscription.deleted.';
