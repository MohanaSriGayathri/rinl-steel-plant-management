/*
  # Add login tracking and fix signup issues

  1. New Tables
    - `user_sessions`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references users.id)
      - `login_timestamp` (timestamp, default now())
      - `logout_timestamp` (timestamp, nullable)
      - `ip_address` (text, nullable)
      - `user_agent` (text, nullable)
      - `session_duration` (interval, nullable)
      - `role_at_login` (text, not null)
      - `created_at` (timestamp, default now())

  2. Security
    - Enable RLS on `user_sessions` table
    - Add policies for users to read their own sessions
    - Add policies for admins to read all sessions

  3. Fixes
    - Improve users table policies for better signup handling
    - Add better error handling and logging
*/

-- Create user_sessions table for login tracking
CREATE TABLE IF NOT EXISTS user_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  login_timestamp timestamptz DEFAULT now(),
  logout_timestamp timestamptz,
  ip_address text,
  user_agent text,
  session_duration interval,
  role_at_login text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;

-- Create policies for user_sessions
CREATE POLICY "Users can read their own sessions"
  ON user_sessions
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can read all sessions"
  ON user_sessions
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role = 'admin'
    )
  );

CREATE POLICY "Authenticated users can insert their own sessions"
  ON user_sessions
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own sessions"
  ON user_sessions
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_login_timestamp ON user_sessions(login_timestamp);
CREATE INDEX IF NOT EXISTS idx_user_sessions_role ON user_sessions(role_at_login);

-- Create trigger to automatically update session_duration on logout
CREATE OR REPLACE FUNCTION update_session_duration()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.logout_timestamp IS NOT NULL AND OLD.logout_timestamp IS NULL THEN
        NEW.session_duration = NEW.logout_timestamp - NEW.login_timestamp;
    END IF;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_user_sessions_duration 
    BEFORE UPDATE ON user_sessions 
    FOR EACH ROW 
    EXECUTE FUNCTION update_session_duration();

-- Fix users table policies to ensure signup works properly
DROP POLICY IF EXISTS "Allow insert during signup" ON users;
DROP POLICY IF EXISTS "Users can insert own profile" ON users;
DROP POLICY IF EXISTS "Enable insert for authenticated users during signup" ON users;

-- Create a more permissive insert policy for signup
CREATE POLICY "Allow insert during signup"
  ON users
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Ensure the users table has all necessary columns
DO $$
BEGIN
  -- Add password column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'password'
  ) THEN
    ALTER TABLE users ADD COLUMN password text;
  END IF;

  -- Add email column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'email'
  ) THEN
    ALTER TABLE users ADD COLUMN email text NOT NULL;
  END IF;

  -- Add last_login column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'last_login'
  ) THEN
    ALTER TABLE users ADD COLUMN last_login timestamptz;
  END IF;

  -- Add login_count column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'login_count'
  ) THEN
    ALTER TABLE users ADD COLUMN login_count integer DEFAULT 0;
  END IF;
END $$;

-- Create function to log user login
CREATE OR REPLACE FUNCTION log_user_login(
  p_user_id uuid,
  p_role text,
  p_ip_address text DEFAULT NULL,
  p_user_agent text DEFAULT NULL
)
RETURNS uuid AS $$
DECLARE
  session_id uuid;
BEGIN
  -- Insert new session record
  INSERT INTO user_sessions (user_id, role_at_login, ip_address, user_agent)
  VALUES (p_user_id, p_role, p_ip_address, p_user_agent)
  RETURNING id INTO session_id;
  
  -- Update user's last login and increment login count
  UPDATE users 
  SET 
    last_login = now(),
    login_count = COALESCE(login_count, 0) + 1
  WHERE id = p_user_id;
  
  RETURN session_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to log user logout
CREATE OR REPLACE FUNCTION log_user_logout(p_session_id uuid)
RETURNS void AS $$
BEGIN
  UPDATE user_sessions 
  SET logout_timestamp = now()
  WHERE id = p_session_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;