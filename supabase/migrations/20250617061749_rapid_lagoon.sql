/*
  # Add email column to users table

  1. Changes
    - Add email column to users table
    - Set default email values based on employee_id for existing users
    - Make email column required and unique
    - Add index for performance

  2. Security
    - Maintain existing RLS policies
    - Email column will be used for authentication
*/

-- First, add the email column if it doesn't exist
ALTER TABLE users ADD COLUMN IF NOT EXISTS email text;

-- Update all existing records to have email based on employee_id
-- This will work regardless of whether records exist or not
UPDATE users 
SET email = employee_id || '@rinl.com' 
WHERE email IS NULL;

-- Now make the email column required
ALTER TABLE users ALTER COLUMN email SET NOT NULL;

-- Add unique constraint on email if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE table_name = 'users' AND constraint_name = 'users_email_key'
  ) THEN
    ALTER TABLE users ADD CONSTRAINT users_email_key UNIQUE (email);
  END IF;
END $$;

-- Create index on email for faster lookups
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);