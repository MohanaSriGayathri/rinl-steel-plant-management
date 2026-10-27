-- =====================================================================
-- MMS Steel Plant Management System (RINL)
-- Migration: Create vendors and vendor_orders tables with RLS
-- File: supabase/migrations/20261026120000_create_vendor_orders.sql
-- =====================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. VENDORS TABLE
CREATE TABLE IF NOT EXISTS public.vendors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  contact_person TEXT,
  phone TEXT,
  email TEXT,
  address TEXT,
  rating DECIMAL(3,2) DEFAULT 4.7,
  status TEXT NOT NULL DEFAULT 'Active',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_vendors_name ON public.vendors(name);
CREATE INDEX IF NOT EXISTS idx_vendors_category ON public.vendors(category);

ALTER TABLE public.vendors ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read vendor data" ON public.vendors;
CREATE POLICY "Anyone can read vendor data"
  ON public.vendors
  FOR SELECT
  TO public
  USING (true);

-- Seed Initial Vendors if empty
INSERT INTO public.vendors (name, category, contact_person, phone, email, address, rating, status)
SELECT 'Steel Supply Co.', 'Raw Materials', 'Rajesh Sharma', '+91 (891) 123-4567', 'contact@steelsupply.com', 'Visakhapatnam Port Industrial Area', 4.8, 'Active'
WHERE NOT EXISTS (SELECT 1 FROM public.vendors WHERE name = 'Steel Supply Co.');

INSERT INTO public.vendors (name, category, contact_person, phone, email, address, rating, status)
SELECT 'Industrial Equipment Ltd.', 'Machinery & Spares', 'Anil Verma', '+91 (891) 987-6543', 'sales@indequip.com', 'Auto Nagar, Visakhapatnam', 4.6, 'Active'
WHERE NOT EXISTS (SELECT 1 FROM public.vendors WHERE name = 'Industrial Equipment Ltd.');

INSERT INTO public.vendors (name, category, contact_person, phone, email, address, rating, status)
SELECT 'Safety First Supplies', 'Safety Gear', 'Priya Rao', '+91 (891) 456-7890', 'orders@safetyfirst.com', 'Gajuwaka Industrial Zone', 4.9, 'Active'
WHERE NOT EXISTS (SELECT 1 FROM public.vendors WHERE name = 'Safety First Supplies');

-- 2. VENDOR_ORDERS TABLE
CREATE TABLE IF NOT EXISTS public.vendor_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id TEXT UNIQUE NOT NULL,
  user_id UUID NOT NULL,
  vendor_id UUID REFERENCES public.vendors(id) ON DELETE SET NULL,
  product TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  unit TEXT NOT NULL DEFAULT 'tons',
  unit_price DECIMAL(10,2) DEFAULT 0,
  total_amount DECIMAL(12,2) NOT NULL,
  specifications TEXT,
  delivery_date DATE,
  actual_delivery_date DATE,
  status TEXT NOT NULL DEFAULT 'Processing',
  payment_status TEXT NOT NULL DEFAULT 'Paid',
  payment_method TEXT DEFAULT 'Online NetBanking',
  tracking_number TEXT,
  delivery_address TEXT DEFAULT 'RINL Visakhapatnam Steel Plant, Material Stores Yard 2',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_vendor_orders_order_id ON public.vendor_orders(order_id);
CREATE INDEX IF NOT EXISTS idx_vendor_orders_user_id ON public.vendor_orders(user_id);
CREATE INDEX IF NOT EXISTS idx_vendor_orders_status ON public.vendor_orders(status);

ALTER TABLE public.vendor_orders ENABLE ROW LEVEL SECURITY;

-- Clean existing policies safely
DROP POLICY IF EXISTS "Users can read their own orders" ON public.vendor_orders;
DROP POLICY IF EXISTS "Users and admins can read orders" ON public.vendor_orders;
DROP POLICY IF EXISTS "Users can read own orders" ON public.vendor_orders;
DROP POLICY IF EXISTS "Authenticated users can create orders" ON public.vendor_orders;
DROP POLICY IF EXISTS "Users can insert own orders" ON public.vendor_orders;
DROP POLICY IF EXISTS "Users can update own orders" ON public.vendor_orders;

-- Read policy: authenticated users can strictly read orders belonging to their own user_id
CREATE POLICY "Users can read own orders"
  ON public.vendor_orders
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Insert policy: authenticated users can insert orders where user_id matches their auth.uid()
CREATE POLICY "Users can insert own orders"
  ON public.vendor_orders
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Update policy: users can update their own orders
CREATE POLICY "Users can update own orders"
  ON public.vendor_orders
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
