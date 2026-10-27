/*
  # Fix user signup RLS policy

  1. Security Changes
    - Add policy to allow user profile creation during signup
    - The existing policy prevents profile creation because users aren't authenticated yet
    - New policy allows INSERT when the user ID matches the authenticated user's ID
    - This enables the signup flow to work properly while maintaining security

  2. Policy Details
    - Replaces the existing INSERT policy with one that works during signup
    - Maintains security by ensuring users can only create profiles for themselves
    - Uses auth.uid() to verify the user is creating their own profile
*/

-- Drop the existing INSERT policy that's causing the issue
DROP POLICY IF EXISTS "Users can insert own profile" ON users;

-- Create a new INSERT policy that allows profile creation during signup
CREATE POLICY "Enable insert for authenticated users during signup"
  ON users
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);