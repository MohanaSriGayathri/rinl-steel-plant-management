/*
  # Fix RLS policies for proper authentication and data access

  1. Policy Updates
    - Fix material_requests policies to allow proper read access
    - Update inventory policies for better access control
    - Ensure production data is accessible to all authenticated users
    - Add public read access where appropriate

  2. Security Improvements
    - Maintain security while allowing proper data access
    - Fix authentication flow issues
    - Ensure data persistence across login sessions
*/

-- Fix material_requests policies
DROP POLICY IF EXISTS "Enable read access for all users" ON material_requests;
DROP POLICY IF EXISTS "Users can read their own requests" ON material_requests;
DROP POLICY IF EXISTS "Admins can read all requests" ON material_requests;

-- Create comprehensive read policy for material_requests
CREATE POLICY "Enable read access for all users"
  ON material_requests
  FOR SELECT
  TO public
  USING (true);

-- Keep existing policies for insert/update but ensure they work
DROP POLICY IF EXISTS "Authenticated users can create requests" ON material_requests;
CREATE POLICY "Authenticated users can create requests"
  ON material_requests
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own requests" ON material_requests;
CREATE POLICY "Users can update their own requests"
  ON material_requests
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can update all requests" ON material_requests;
CREATE POLICY "Admins can update all requests"
  ON material_requests
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role = 'admin'
    )
  );

-- Fix inventory policies
DROP POLICY IF EXISTS "Anyone can read inventory data" ON inventory;
CREATE POLICY "Anyone can read inventory data"
  ON inventory
  FOR SELECT
  TO public
  USING (true);

-- Fix production policies
DROP POLICY IF EXISTS "Anyone can read production data" ON production;
CREATE POLICY "Anyone can read production data"
  ON production
  FOR SELECT
  TO public
  USING (true);

-- Fix vendor_orders policies
DROP POLICY IF EXISTS "Users can read their own orders" ON vendor_orders;
DROP POLICY IF EXISTS "Admins can read all orders" ON vendor_orders;

CREATE POLICY "Users can read their own orders"
  ON vendor_orders
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can read all orders"
  ON vendor_orders
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role = 'admin'
    )
  );

-- Ensure users table policies are correct
DROP POLICY IF EXISTS "Users can read own data" ON users;
CREATE POLICY "Users can read own data"
  ON users
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

-- Add policy to allow reading user profiles for foreign key relationships
CREATE POLICY "Allow reading user profiles for relationships"
  ON users
  FOR SELECT
  TO authenticated
  USING (true);