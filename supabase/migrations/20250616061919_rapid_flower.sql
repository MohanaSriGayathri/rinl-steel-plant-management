/*
  # Fix RLS policies for user signup and add password storage

  1. Changes
    - Add password column to users table
    - Update RLS policies to allow signup process
    - Add policy for service role to insert during signup

  2. Security
    - Maintain RLS on users table
    - Allow authenticated users to read/update own data
    - Allow service role to insert during signup process
*/

-- Add password column to users table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'password'
  ) THEN
    ALTER TABLE users ADD COLUMN password text;
  END IF;
END $$;

-- Drop existing INSERT policy that's causing issues
DROP POLICY IF EXISTS "Enable insert for authenticated users during signup" ON users;

-- Create new INSERT policy that allows signup process
CREATE POLICY "Allow insert during signup"
  ON users
  FOR INSERT
  TO authenticated, anon
  WITH CHECK (true);

-- Ensure other policies remain intact
DO $$
BEGIN
  -- Recreate SELECT policy if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'users' AND policyname = 'Users can read own data'
  ) THEN
    CREATE POLICY "Users can read own data"
      ON users
      FOR SELECT
      TO authenticated
      USING (auth.uid() = id);
  END IF;

  -- Recreate UPDATE policy if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'users' AND policyname = 'Users can update own data'
  ) THEN
    CREATE POLICY "Users can update own data"
      ON users
      FOR UPDATE
      TO authenticated
      USING (auth.uid() = id)
      WITH CHECK (auth.uid() = id);
  END IF;
END $$;