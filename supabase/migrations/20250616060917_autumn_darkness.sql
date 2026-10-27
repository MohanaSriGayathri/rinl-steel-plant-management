/*
  # Fix RLS policy for user signup

  1. Security Changes
    - Update INSERT policy on `users` table to allow authenticated users to insert their own data
    - The policy checks that the user ID being inserted matches the authenticated user's ID
    - This allows the signup process to work properly while maintaining security

  2. Changes Made
    - Drop the existing INSERT policy that was too restrictive
    - Create a new INSERT policy that properly handles the signup flow
*/

-- Drop the existing INSERT policy
DROP POLICY IF EXISTS "Users can insert own data" ON users;

-- Create a new INSERT policy that allows authenticated users to insert their own profile
CREATE POLICY "Users can insert own profile"
  ON users
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);