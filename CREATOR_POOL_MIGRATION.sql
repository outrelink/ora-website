-- Creator Pool Table Migration
-- Run this SQL in your Supabase SQL Editor to create the creator_pool table

CREATE TABLE IF NOT EXISTS creator_pool (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    email TEXT NOT NULL UNIQUE,
    display_name TEXT,
    category TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index on email for faster lookups
CREATE INDEX IF NOT EXISTS idx_creator_pool_email ON creator_pool(email);

-- Create index on category for filtering
CREATE INDEX IF NOT EXISTS idx_creator_pool_category ON creator_pool(category);

-- Create index on created_at for sorting
CREATE INDEX IF NOT EXISTS idx_creator_pool_created_at ON creator_pool(created_at DESC);

-- Add RLS (Row Level Security) policies if needed
-- For now, we'll rely on the service role key for admin access
-- If you want to add RLS, uncomment and adjust:

-- ALTER TABLE creator_pool ENABLE ROW LEVEL SECURITY;

-- CREATE POLICY "Admin can manage creator pool"
--     ON creator_pool
--     FOR ALL
--     USING (auth.role() = 'service_role');

-- Add trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_creator_pool_updated_at 
    BEFORE UPDATE ON creator_pool
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

