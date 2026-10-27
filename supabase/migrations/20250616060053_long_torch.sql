/*
  # Create users table for RINL steel plant management system

  1. New Tables
    - `users`
      - `id` (uuid, primary key, references auth.users)
      - `employee_id` (text, unique, not null)
      - `role` (text, not null)
      - `created_at` (timestamp with time zone, default now())

  2. Security
    - Enable RLS on `users` table
    - Add policy for authenticated users to read their own data
    - Add policy for authenticated users to insert their own data
    - Add policy for authenticated users to update their own data

  3. Notes
    - The `id` field references Supabase's built-in auth.users table
    - Employee ID must be unique across the system
    - Role field stores user permissions (admin, supervisor, vendor)
*/

-- Create the users table
CREATE TABLE IF NOT EXISTS public.users (
  id UUID REFERENCES auth.users NOT NULL PRIMARY KEY,
  employee_id TEXT UNIQUE NOT NULL,
  role TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Create policies for RLS
CREATE POLICY "Users can read own data"
  ON public.users
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own data"
  ON public.users
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own data"
  ON public.users
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Create index on employee_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_users_employee_id ON public.users(employee_id);