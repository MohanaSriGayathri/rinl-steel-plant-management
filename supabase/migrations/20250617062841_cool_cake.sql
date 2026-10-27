/*
  # Create production table for RINL steel plant management

  1. New Tables
    - `production`
      - `id` (uuid, primary key)
      - `date` (date, not null) - Production date
      - `shift` (text) - Morning, Evening, Night
      - `steel_production` (decimal, not null) - Steel production in tons
      - `molten_iron` (decimal, not null) - Molten iron production in tons
      - `efficiency` (decimal, not null) - Production efficiency percentage
      - `quality_rate` (decimal, not null) - Quality rate percentage
      - `uptime_hours` (decimal, not null) - Equipment uptime in hours
      - `downtime_hours` (decimal) - Equipment downtime in hours
      - `downtime_reason` (text) - Reason for downtime
      - `energy_consumption` (decimal) - Energy consumption in kWh
      - `raw_materials_used` (jsonb) - Raw materials consumption data
      - `products_breakdown` (jsonb) - Production breakdown by product type
      - `operator_id` (uuid, references users.id) - Operator who recorded data
      - `supervisor_id` (uuid, references users.id) - Supervisor who verified data
      - `notes` (text) - Additional production notes
      - `created_at` (timestamp, default now())
      - `updated_at` (timestamp, default now())

  2. Security
    - Enable RLS on `production` table
    - Add policies for authenticated users to read production data
    - Add policies for operators and supervisors to create/update data
*/

CREATE TABLE IF NOT EXISTS production (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  date date NOT NULL,
  shift text DEFAULT 'Day',
  steel_production decimal(10,2) NOT NULL,
  molten_iron decimal(10,2) NOT NULL,
  efficiency decimal(5,2) NOT NULL,
  quality_rate decimal(5,2) NOT NULL,
  uptime_hours decimal(4,2) NOT NULL,
  downtime_hours decimal(4,2) DEFAULT 0,
  downtime_reason text,
  energy_consumption decimal(10,2),
  raw_materials_used jsonb,
  products_breakdown jsonb,
  operator_id uuid REFERENCES users(id),
  supervisor_id uuid REFERENCES users(id),
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(date, shift)
);

-- Enable Row Level Security
ALTER TABLE production ENABLE ROW LEVEL SECURITY;

-- Create policies for RLS
CREATE POLICY "Anyone can read production data"
  ON production
  FOR SELECT
  TO authenticated, anon
  USING (true);

CREATE POLICY "Authenticated users can insert production data"
  ON production
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users can update production data they created"
  ON production
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = operator_id OR auth.uid() = supervisor_id)
  WITH CHECK (auth.uid() = operator_id OR auth.uid() = supervisor_id);

CREATE POLICY "Admins and supervisors can update all production data"
  ON production
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role IN ('admin', 'supervisor')
    )
  );

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_production_date ON production(date);
CREATE INDEX IF NOT EXISTS idx_production_shift ON production(shift);
CREATE INDEX IF NOT EXISTS idx_production_operator_id ON production(operator_id);
CREATE INDEX IF NOT EXISTS idx_production_supervisor_id ON production(supervisor_id);
CREATE INDEX IF NOT EXISTS idx_production_efficiency ON production(efficiency);

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_production_updated_at 
    BEFORE UPDATE ON production 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();