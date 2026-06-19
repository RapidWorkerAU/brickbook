-- Add state column to builds for Australia-wide support
ALTER TABLE public.builds ADD COLUMN IF NOT EXISTS state text;

-- Default existing records to WA (current user base)
UPDATE public.builds SET state = 'WA' WHERE state IS NULL;
