
-- Add missing columns to passengers table
ALTER TABLE public.passengers ADD COLUMN IF NOT EXISTS flight_number TEXT;
ALTER TABLE public.passengers ADD COLUMN IF NOT EXISTS booking_reference TEXT;
ALTER TABLE public.passengers ADD COLUMN IF NOT EXISTS tax NUMERIC DEFAULT 0;
ALTER TABLE public.passengers ADD COLUMN IF NOT EXISTS surcharge NUMERIC DEFAULT 0;

-- Force schema cache refresh
NOTIFY pgrst, 'reload schema';