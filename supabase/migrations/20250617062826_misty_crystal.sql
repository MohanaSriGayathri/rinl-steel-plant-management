/*
  # Create material_requests table for RINL steel plant management

  1. New Tables
    - `material_requests`
      - `id` (uuid, primary key)
      - `request_id` (text, unique, not null) - Custom request identifier
      - `user_id` (uuid, references users.id) - User who made the request
      - `material` (text, not null) - Material name
      - `quantity` (integer, not null) - Requested quantity
      - `unit` (text, not null) - tons, kg, etc.
      - `priority` (text, not null) - Low, Medium, High
      - `status` (text, not null) - Pending, Approved, In Transit, Delivered, Rejected
      - `request_date` (date, not null) - Date of request
      - `required_date` (date) - When material is needed
      - `estimated_delivery` (date) - Estimated delivery date
      - `actual_delivery` (date) - Actual delivery date
      - `notes` (text) - Additional notes
      - `approved_by` (uuid, references users.id) - Who approved the request
      - `approved_at` (timestamp) - When it was approved
      - `total_cost` (decimal) - Total cost of the request
      - `supplier` (text) - Supplier information
      - `created_at` (timestamp, default now())
      - `updated_at` (timestamp, default now())

  2. Security
    - Enable RLS on `material_requests` table
    - Add policies for users to read their own requests
    - Add policies for authenticated users to create requests
    - Add policies for admins to manage all requests
*/

CREATE TABLE IF NOT EXISTS material_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id text UNIQUE NOT NULL,
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  material text NOT NULL,
  quantity integer NOT NULL,
  unit text NOT NULL DEFAULT 'tons',
  priority text NOT NULL DEFAULT 'Medium',
  status text NOT NULL DEFAULT 'Pending',
  request_date date NOT NULL DEFAULT CURRENT_DATE,
  required_date date,
  estimated_delivery date,
  actual_delivery date,
  notes text,
  approved_by uuid REFERENCES users(id),
  approved_at timestamptz,
  total_cost decimal(12,2),
  supplier text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE material_requests ENABLE ROW LEVEL SECURITY;

-- Create policies for RLS
CREATE POLICY "Users can read their own requests"
  ON material_requests
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can read all requests"
  ON material_requests
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role = 'admin'
    )
  );

CREATE POLICY "Authenticated users can create requests"
  ON material_requests
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own requests"
  ON material_requests
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

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

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_material_requests_request_id ON material_requests(request_id);
CREATE INDEX IF NOT EXISTS idx_material_requests_user_id ON material_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_material_requests_status ON material_requests(status);
CREATE INDEX IF NOT EXISTS idx_material_requests_priority ON material_requests(priority);
CREATE INDEX IF NOT EXISTS idx_material_requests_material ON material_requests(material);
CREATE INDEX IF NOT EXISTS idx_material_requests_request_date ON material_requests(request_date);

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_material_requests_updated_at 
    BEFORE UPDATE ON material_requests 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();