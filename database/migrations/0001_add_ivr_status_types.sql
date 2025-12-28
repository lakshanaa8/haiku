-- Migration: Add new call status types for enhanced IVR
-- Date: 2024-01-25

-- Add new status values to the existing enum
ALTER TYPE call_status ADD VALUE IF NOT EXISTS 'not_available';
ALTER TYPE call_status ADD VALUE IF NOT EXISTS 'in_progress';

-- If the enum doesn't exist, create it with all values
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'call_status') THEN
        CREATE TYPE call_status AS ENUM ('pending', 'processing', 'completed', 'failed', 'not_available', 'in_progress');
        
        -- Update the calls table to use the enum if it's not already using it
        ALTER TABLE calls ALTER COLUMN status TYPE call_status USING status::call_status;
    END IF;
END $$;