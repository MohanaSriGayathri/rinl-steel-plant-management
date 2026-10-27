/*
  # Create vendor_orders table for RINL steel plant management

  1. New Tables
    - `vendor_orders`
      - `id` (uuid, primary key)
      - `order_id` (text, unique, not null) - Custom order identifier
      - `user_id` (uuid, references users.id) - User who placed the order
      - `vendor_id` (uuid, references vendors.id) - Vendor information
      - `product` (text, not null) - Product name
      - `quantity` (integer, not null) - Order quantity
      - `unit` (text, not null) - tons, kg, etc.
      - `unit_price` (decimal, not null) - Price per unit
      - `total_amount` (decimal, not null) - Total order amount
      - `specifications` (text) - Product specifications
      - `delivery_date` (date) - Requested delivery date
      - `actual_delivery_date` (date) - Actual delivery date
      - `status` (text, not null) - Processing, Shipped, Delivered, Cancelled
      - `payment_status` (text, not null) - Pending, Paid, Failed
      - `payment_method` (text) - Payment method used
      - `tracking_number` (text) - Shipment tracking number
      - `delivery_address` (text) - Delivery address
      - `notes` (text) - Order notes
      - `created_at` (timestamp, default now())
      - `updated_at` (timestamp, default now())

    - `vendors`
      - `id` (uuid, primary key)
      - `name` (text, not null) - Vendor name
      - `category` (text, not null) - Vendor category
      - `contact_person` (text) - Contact person name
      - `phone` (text) - Phone number
      - `email` (text) - Email address
      - `address` (text) - Vendor address
      - `rating` (decimal) - Vendor rating
      - `status` (text, not null) - Active, Inactive, Suspended
      - `created_at` (timestamp, default now())
      - `updated_at` (timestamp, default now())

  2. Security
    - Enable RLS on both tables
    - Add appropriate policies for users and vendors
*/

-- Create vendors table first
CREATE TABLE IF NOT EXISTS vendors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  category text NOT NULL,
  contact_person text,
  phone text,
  email text,
  address text,
  rating decimal(3,2) DEFAULT 0.0,
  status text NOT NULL DEFAULT 'Active',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create vendor_orders table
CREATE TABLE IF NOT EXISTS vendor_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id text UNIQUE NOT NULL,
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  vendor_id uuid REFERENCES vendors(id),
  product text NOT NULL,
  quantity integer NOT NULL,
  unit text NOT NULL DEFAULT 'tons',
  unit_price decimal(10,2) DEFAULT 0,
  total_amount decimal(12,2) NOT NULL,
  specifications text,
  delivery_date date,
  actual_delivery_date date,
  status text NOT NULL DEFAULT 'Processing',
  payment_status text NOT NULL DEFAULT 'Pending',
  payment_method text,
  tracking_number text,
  delivery_address text,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE vendors ENABLE ROW LEVEL SECURITY;
ALTER TABLE vendor_orders ENABLE ROW LEVEL SECURITY;

-- Policies for vendors table
CREATE POLICY "Anyone can read vendor data"
  ON vendors
  FOR SELECT
  TO authenticated, anon
  USING (true);

CREATE POLICY "Admins can manage vendors"
  ON vendors
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role = 'admin'
    )
  );

-- Policies for vendor_orders table
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

CREATE POLICY "Authenticated users can create orders"
  ON vendor_orders
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own orders"
  ON vendor_orders
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can update all orders"
  ON vendor_orders
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
CREATE INDEX IF NOT EXISTS idx_vendors_name ON vendors(name);
CREATE INDEX IF NOT EXISTS idx_vendors_category ON vendors(category);
CREATE INDEX IF NOT EXISTS idx_vendors_status ON vendors(status);

CREATE INDEX IF NOT EXISTS idx_vendor_orders_order_id ON vendor_orders(order_id);
CREATE INDEX IF NOT EXISTS idx_vendor_orders_user_id ON vendor_orders(user_id);
CREATE INDEX IF NOT EXISTS idx_vendor_orders_vendor_id ON vendor_orders(vendor_id);
CREATE INDEX IF NOT EXISTS idx_vendor_orders_status ON vendor_orders(status);
CREATE INDEX IF NOT EXISTS idx_vendor_orders_payment_status ON vendor_orders(payment_status);

-- Create triggers to automatically update updated_at
CREATE TRIGGER update_vendors_updated_at 
    BEFORE UPDATE ON vendors 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_vendor_orders_updated_at 
    BEFORE UPDATE ON vendor_orders 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();