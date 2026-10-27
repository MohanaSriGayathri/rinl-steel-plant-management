/*
  # Create inventory table for RINL steel plant management

  1. New Tables
    - `inventory`
      - `id` (uuid, primary key)
      - `item_id` (text, unique, not null) - Custom item identifier
      - `name` (text, not null) - Product name
      - `category` (text, not null) - Raw Materials, Finished Products, etc.
      - `quantity` (integer, not null) - Current stock quantity
      - `unit` (text, not null) - tons, kg, etc.
      - `status` (text, not null) - In Stock, Low Stock, Critical
      - `min_threshold` (integer, default 100) - Minimum stock level
      - `max_threshold` (integer, default 10000) - Maximum stock level
      - `location` (text) - Storage location
      - `supplier` (text) - Supplier information
      - `cost_per_unit` (decimal) - Cost per unit
      - `last_updated` (timestamp) - Last inventory update
      - `created_at` (timestamp, default now())
      - `updated_at` (timestamp, default now())

  2. Security
    - Enable RLS on `inventory` table
    - Add policies for authenticated users to read inventory data
    - Add policies for authenticated users to update inventory data
*/

CREATE TABLE IF NOT EXISTS inventory (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id text UNIQUE NOT NULL,
  name text NOT NULL,
  category text NOT NULL,
  quantity integer NOT NULL DEFAULT 0,
  unit text NOT NULL DEFAULT 'tons',
  status text NOT NULL DEFAULT 'In Stock',
  min_threshold integer DEFAULT 100,
  max_threshold integer DEFAULT 10000,
  location text,
  supplier text,
  cost_per_unit decimal(10,2),
  last_updated timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE inventory ENABLE ROW LEVEL SECURITY;

-- Create policies for RLS
CREATE POLICY "Anyone can read inventory data"
  ON inventory
  FOR SELECT
  TO authenticated, anon
  USING (true);

CREATE POLICY "Authenticated users can insert inventory data"
  ON inventory
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update inventory data"
  ON inventory
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_inventory_item_id ON inventory(item_id);
CREATE INDEX IF NOT EXISTS idx_inventory_category ON inventory(category);
CREATE INDEX IF NOT EXISTS idx_inventory_status ON inventory(status);
CREATE INDEX IF NOT EXISTS idx_inventory_name ON inventory(name);

-- Create function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    NEW.last_updated = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_inventory_updated_at 
    BEFORE UPDATE ON inventory 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();