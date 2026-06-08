-- ==========================================
-- Tivuta - Leads Table Configuration
-- This script is intended to be run in the Supabase SQL Editor
-- ==========================================

-- 1. Create the base table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.leads (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Add new columns if they are missing (ideal for updating an existing table)
DO $$
BEGIN
    -- Club affiliation
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='leads' AND column_name='club_affiliation') THEN
        ALTER TABLE public.leads ADD COLUMN club_affiliation text;
    END IF;
    
    -- First name
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='leads' AND column_name='first_name') THEN
        ALTER TABLE public.leads ADD COLUMN first_name text;
    END IF;
    
    -- Last name
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='leads' AND column_name='last_name') THEN
        ALTER TABLE public.leads ADD COLUMN last_name text;
    END IF;
    
    -- ID number
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='leads' AND column_name='id_number') THEN
        ALTER TABLE public.leads ADD COLUMN id_number text;
    END IF;
    
    -- Phone number
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='leads' AND column_name='phone') THEN
        ALTER TABLE public.leads ADD COLUMN phone text;
    END IF;
    
    -- Email address
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='leads' AND column_name='email') THEN
        ALTER TABLE public.leads ADD COLUMN email text;
    END IF;
    
    -- Joining tracks (saved as a JSON array since it's a multi-select)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='leads' AND column_name='joining_tracks') THEN
        ALTER TABLE public.leads ADD COLUMN joining_tracks jsonb;
    END IF;

    -- Interface language (already existed, but added just in case)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='leads' AND column_name='locale') THEN
        ALTER TABLE public.leads ADD COLUMN locale text;
    END IF;
END $$;

-- 3. (Optional) Remove old columns that are no longer in use
-- Note: Uncommenting the following lines will delete these columns and their old data.
-- ALTER TABLE public.leads DROP COLUMN IF EXISTS name;
-- ALTER TABLE public.leads DROP COLUMN IF EXISTS address;
-- ALTER TABLE public.leads DROP COLUMN IF EXISTS workplace;
-- ALTER TABLE public.leads DROP COLUMN IF EXISTS income_type;
-- ALTER TABLE public.leads DROP COLUMN IF EXISTS referral_source;

-- 4. Update permissions: Allow potential customers to insert data anonymously (Insert)
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;

-- Create a policy that allows data insertion (INSERT) for everyone, if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'leads' 
        AND policyname = 'Enable insert for anon users'
    ) THEN
        CREATE POLICY "Enable insert for anon users" ON public.leads
            FOR INSERT
            TO anon
            WITH CHECK (true);
    END IF;
END $$;
