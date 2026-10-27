-- =====================================================================
-- RINL Steel Plant Management System - Consolidated Schema & Security
-- Migration: 20261026000000_consolidated_schema_and_fixes.sql
-- Description:
--   1. Ensures all required tables exist with exact frontend-compatible columns
--   2. Enforces Row Level Security without storing plaintext passwords
--   3. Sets up automated profile creation trigger on Supabase Auth
--   4. Creates session tracking RPCs
--   5. Seeds realistic steel plant operations data safely (idempotent)
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. UTILITY FUNCTIONS & EXTENSIONS
-- ---------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  IF (TG_TABLE_NAME = 'inventory') THEN
    NEW.last_updated = NOW();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ---------------------------------------------------------------------
-- 2. USERS TABLE (Linked to auth.users)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.users (
  id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL PRIMARY KEY,
  employee_id TEXT UNIQUE NOT NULL,
  role TEXT NOT NULL DEFAULT 'employee',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Ensure required columns exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'email'
  ) THEN
    ALTER TABLE public.users ADD COLUMN email TEXT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'last_login'
  ) THEN
    ALTER TABLE public.users ADD COLUMN last_login TIMESTAMPTZ;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'login_count'
  ) THEN
    ALTER TABLE public.users ADD COLUMN login_count INTEGER DEFAULT 0;
  END IF;

  -- Security cleanup: Remove plaintext password column if it exists from older migrations
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'password'
  ) THEN
    ALTER TABLE public.users DROP COLUMN password;
  END IF;
END $$;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_users_employee_id ON public.users(employee_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);

-- Enable RLS
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Clean existing policies safely
DROP POLICY IF EXISTS "Users can read own data" ON public.users;
DROP POLICY IF EXISTS "Users can read profiles" ON public.users;
DROP POLICY IF EXISTS "Allow reading user profiles for relationships" ON public.users;
DROP POLICY IF EXISTS "Users can insert own data" ON public.users;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.users;
DROP POLICY IF EXISTS "Allow insert during signup" ON public.users;
DROP POLICY IF EXISTS "Enable insert for authenticated users during signup" ON public.users;
DROP POLICY IF EXISTS "Users can update own data" ON public.users;
DROP POLICY IF EXISTS "Users can update own profile" ON public.users;

-- Safe policies
CREATE POLICY "Users can read profiles"
  ON public.users
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can insert own profile"
  ON public.users
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON public.users
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- ---------------------------------------------------------------------
-- 3. AUTOMATED USER PROFILE TRIGGER ON AUTH.USERS
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  v_employee_id TEXT;
  v_role TEXT;
BEGIN
  v_employee_id := COALESCE(NEW.raw_user_meta_data->>'employee_id', split_part(COALESCE(NEW.email, ''), '@', 1));
  IF v_employee_id IS NULL OR v_employee_id = '' THEN
    v_employee_id := 'EMP' || SUBSTRING(NEW.id::text, 1, 6);
  END IF;

  v_role := COALESCE(NEW.raw_user_meta_data->>'role', 'employee');

  INSERT INTO public.users (id, employee_id, role, email, created_at)
  VALUES (
    NEW.id,
    v_employee_id,
    v_role,
    COALESCE(NEW.email, ''),
    NOW()
  )
  ON CONFLICT (id) DO UPDATE
  SET
    email = EXCLUDED.email,
    employee_id = COALESCE(public.users.employee_id, EXCLUDED.employee_id),
    role = COALESCE(public.users.role, EXCLUDED.role);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ---------------------------------------------------------------------
-- 4. INVENTORY TABLE
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.inventory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 0,
  unit TEXT NOT NULL DEFAULT 'tons',
  status TEXT NOT NULL DEFAULT 'In Stock',
  min_threshold INTEGER DEFAULT 100,
  max_threshold INTEGER DEFAULT 10000,
  location TEXT,
  supplier TEXT,
  cost_per_unit DECIMAL(10,2),
  last_updated TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_inventory_item_id ON public.inventory(item_id);
CREATE INDEX IF NOT EXISTS idx_inventory_category ON public.inventory(category);
CREATE INDEX IF NOT EXISTS idx_inventory_status ON public.inventory(status);
CREATE INDEX IF NOT EXISTS idx_inventory_name ON public.inventory(name);

ALTER TABLE public.inventory ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read inventory data" ON public.inventory;
CREATE POLICY "Anyone can read inventory data"
  ON public.inventory
  FOR SELECT
  TO public
  USING (true);

DROP POLICY IF EXISTS "Authenticated users can insert inventory data" ON public.inventory;
CREATE POLICY "Authenticated users can insert inventory data"
  ON public.inventory
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated users can update inventory data" ON public.inventory;
CREATE POLICY "Authenticated users can update inventory data"
  ON public.inventory
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

DROP TRIGGER IF EXISTS update_inventory_updated_at ON public.inventory;
CREATE TRIGGER update_inventory_updated_at
  BEFORE UPDATE ON public.inventory
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- ---------------------------------------------------------------------
-- 5. PRODUCTION TABLE
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.production (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL,
  shift TEXT NOT NULL DEFAULT 'Day',
  steel_production DECIMAL(10,2) NOT NULL DEFAULT 0,
  molten_iron DECIMAL(10,2) NOT NULL DEFAULT 0,
  efficiency DECIMAL(5,2) NOT NULL DEFAULT 0,
  quality_rate DECIMAL(5,2) NOT NULL DEFAULT 0,
  uptime_hours DECIMAL(4,2) NOT NULL DEFAULT 0,
  downtime_hours DECIMAL(4,2) DEFAULT 0,
  downtime_reason TEXT,
  energy_consumption DECIMAL(10,2),
  raw_materials_used JSONB,
  products_breakdown JSONB,
  operator_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  supervisor_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT uq_production_date_shift UNIQUE(date, shift)
);

CREATE INDEX IF NOT EXISTS idx_production_date ON public.production(date);
CREATE INDEX IF NOT EXISTS idx_production_shift ON public.production(shift);
CREATE INDEX IF NOT EXISTS idx_production_operator_id ON public.production(operator_id);

ALTER TABLE public.production ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read production data" ON public.production;
CREATE POLICY "Anyone can read production data"
  ON public.production
  FOR SELECT
  TO public
  USING (true);

DROP POLICY IF EXISTS "Authenticated users can insert production data" ON public.production;
CREATE POLICY "Authenticated users can insert production data"
  ON public.production
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "Users can update production data they created" ON public.production;
DROP POLICY IF EXISTS "Admins and supervisors can update all production data" ON public.production;
CREATE POLICY "Authenticated users can update production data"
  ON public.production
  FOR UPDATE
  TO authenticated
  USING (
    auth.uid() = operator_id OR
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'supervisor')
    )
  );

DROP TRIGGER IF EXISTS update_production_updated_at ON public.production;
CREATE TRIGGER update_production_updated_at
  BEFORE UPDATE ON public.production
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- ---------------------------------------------------------------------
-- 6. MATERIAL_REQUESTS TABLE
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.material_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id TEXT UNIQUE NOT NULL,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  material TEXT NOT NULL,
  quantity INTEGER NOT NULL,
  unit TEXT NOT NULL DEFAULT 'tons',
  priority TEXT NOT NULL DEFAULT 'Medium',
  status TEXT NOT NULL DEFAULT 'Pending',
  request_date DATE NOT NULL DEFAULT CURRENT_DATE,
  required_date DATE,
  estimated_delivery DATE,
  actual_delivery DATE,
  notes TEXT,
  approved_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  approved_at TIMESTAMPTZ,
  total_cost DECIMAL(12,2),
  supplier TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_material_requests_request_id ON public.material_requests(request_id);
CREATE INDEX IF NOT EXISTS idx_material_requests_user_id ON public.material_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_material_requests_status ON public.material_requests(status);
CREATE INDEX IF NOT EXISTS idx_material_requests_priority ON public.material_requests(priority);

ALTER TABLE public.material_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Enable read access for all users" ON public.material_requests;
DROP POLICY IF EXISTS "Users can read their own requests" ON public.material_requests;
DROP POLICY IF EXISTS "Admins can read all requests" ON public.material_requests;
CREATE POLICY "Users and staff can read material requests"
  ON public.material_requests
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() = user_id OR
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'supervisor')
    )
  );

DROP POLICY IF EXISTS "Authenticated users can create requests" ON public.material_requests;
CREATE POLICY "Authenticated users can create requests"
  ON public.material_requests
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own requests" ON public.material_requests;
DROP POLICY IF EXISTS "Admins can update all requests" ON public.material_requests;
CREATE POLICY "Users and staff can update requests"
  ON public.material_requests
  FOR UPDATE
  TO authenticated
  USING (
    auth.uid() = user_id OR
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'supervisor')
    )
  );

DROP TRIGGER IF EXISTS update_material_requests_updated_at ON public.material_requests;
CREATE TRIGGER update_material_requests_updated_at
  BEFORE UPDATE ON public.material_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- ---------------------------------------------------------------------
-- 7. VENDORS & VENDOR_ORDERS TABLES
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.vendors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  contact_person TEXT,
  phone TEXT,
  email TEXT,
  address TEXT,
  rating DECIMAL(3,2) DEFAULT 0.0,
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

DROP POLICY IF EXISTS "Admins can manage vendors" ON public.vendors;
CREATE POLICY "Admins can manage vendors"
  ON public.vendors
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

CREATE TABLE IF NOT EXISTS public.vendor_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id TEXT UNIQUE NOT NULL,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  vendor_id UUID REFERENCES public.vendors(id) ON DELETE SET NULL,
  product TEXT NOT NULL,
  quantity INTEGER NOT NULL,
  unit TEXT NOT NULL DEFAULT 'tons',
  unit_price DECIMAL(10,2) DEFAULT 0,
  total_amount DECIMAL(12,2) NOT NULL,
  specifications TEXT,
  delivery_date DATE,
  actual_delivery_date DATE,
  status TEXT NOT NULL DEFAULT 'Processing',
  payment_status TEXT NOT NULL DEFAULT 'Pending',
  payment_method TEXT,
  tracking_number TEXT,
  delivery_address TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_vendor_orders_order_id ON public.vendor_orders(order_id);
CREATE INDEX IF NOT EXISTS idx_vendor_orders_user_id ON public.vendor_orders(user_id);
CREATE INDEX IF NOT EXISTS idx_vendor_orders_status ON public.vendor_orders(status);

ALTER TABLE public.vendor_orders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read their own orders" ON public.vendor_orders;
DROP POLICY IF EXISTS "Admins can read all orders" ON public.vendor_orders;
CREATE POLICY "Users and admins can read orders"
  ON public.vendor_orders
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() = user_id OR
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Authenticated users can create orders" ON public.vendor_orders;
CREATE POLICY "Authenticated users can create orders"
  ON public.vendor_orders
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own orders" ON public.vendor_orders;
DROP POLICY IF EXISTS "Admins can update all orders" ON public.vendor_orders;
CREATE POLICY "Users and admins can update orders"
  ON public.vendor_orders
  FOR UPDATE
  TO authenticated
  USING (
    auth.uid() = user_id OR
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

DROP TRIGGER IF EXISTS update_vendors_updated_at ON public.vendors;
CREATE TRIGGER update_vendors_updated_at
  BEFORE UPDATE ON public.vendors
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_vendor_orders_updated_at ON public.vendor_orders;
CREATE TRIGGER update_vendor_orders_updated_at
  BEFORE UPDATE ON public.vendor_orders
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- ---------------------------------------------------------------------
-- 8. USER SESSIONS & LOGIN TRACKING
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.user_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  login_timestamp TIMESTAMPTZ DEFAULT NOW(),
  logout_timestamp TIMESTAMPTZ,
  ip_address TEXT,
  user_agent TEXT,
  session_duration INTERVAL,
  role_at_login TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON public.user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_login_timestamp ON public.user_sessions(login_timestamp);

ALTER TABLE public.user_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read their own sessions" ON public.user_sessions;
DROP POLICY IF EXISTS "Admins can read all sessions" ON public.user_sessions;
CREATE POLICY "Users and admins can read sessions"
  ON public.user_sessions
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() = user_id OR
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Authenticated users can insert their own sessions" ON public.user_sessions;
CREATE POLICY "Authenticated users can insert their own sessions"
  ON public.user_sessions
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own sessions" ON public.user_sessions;
CREATE POLICY "Users can update their own sessions"
  ON public.user_sessions
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Session Duration Trigger
CREATE OR REPLACE FUNCTION public.update_session_duration()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.logout_timestamp IS NOT NULL AND OLD.logout_timestamp IS NULL THEN
    NEW.session_duration = NEW.logout_timestamp - NEW.login_timestamp;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_user_sessions_duration ON public.user_sessions;
CREATE TRIGGER update_user_sessions_duration
  BEFORE UPDATE ON public.user_sessions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_session_duration();

-- RPCs for logging login and logout
CREATE OR REPLACE FUNCTION public.log_user_login(
  p_user_id UUID,
  p_role TEXT,
  p_ip_address TEXT DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_session_id UUID;
BEGIN
  INSERT INTO public.user_sessions (user_id, role_at_login, ip_address, user_agent)
  VALUES (p_user_id, p_role, p_ip_address, p_user_agent)
  RETURNING id INTO v_session_id;

  UPDATE public.users
  SET
    last_login = NOW(),
    login_count = COALESCE(login_count, 0) + 1
  WHERE id = p_user_id;

  RETURN v_session_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.log_user_logout(p_session_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE public.user_sessions
  SET logout_timestamp = NOW()
  WHERE id = p_session_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ---------------------------------------------------------------------
-- 9. SEED DATA (Idempotent - only inserts if records do not exist)
-- ---------------------------------------------------------------------
-- Inventory items
INSERT INTO public.inventory (item_id, name, category, quantity, unit, status, min_threshold, max_threshold, location, supplier, cost_per_unit)
SELECT 'STL001', 'Carbon Steel Sheets', 'Finished Products', 2500, 'tons', 'In Stock', 500, 5000, 'Warehouse A', 'Steel Supply Co.', 45000.00
WHERE NOT EXISTS (SELECT 1 FROM public.inventory WHERE item_id = 'STL001');

INSERT INTO public.inventory (item_id, name, category, quantity, unit, status, min_threshold, max_threshold, location, supplier, cost_per_unit)
SELECT 'STL002', 'Stainless Steel Rods', 'Finished Products', 180, 'tons', 'Low Stock', 200, 1000, 'Warehouse B', 'Quality Steel Ltd.', 52000.00
WHERE NOT EXISTS (SELECT 1 FROM public.inventory WHERE item_id = 'STL002');

INSERT INTO public.inventory (item_id, name, category, quantity, unit, status, min_threshold, max_threshold, location, supplier, cost_per_unit)
SELECT 'STL003', 'Iron Ore', 'Raw Materials', 5000, 'tons', 'In Stock', 1000, 10000, 'Storage Yard 1', 'Mining Corp', 8000.00
WHERE NOT EXISTS (SELECT 1 FROM public.inventory WHERE item_id = 'STL003');

INSERT INTO public.inventory (item_id, name, category, quantity, unit, status, min_threshold, max_threshold, location, supplier, cost_per_unit)
SELECT 'STL004', 'Alloy Steel Pipes', 'Finished Products', 50, 'tons', 'Critical', 100, 800, 'Warehouse C', 'Pipe Industries', 55000.00
WHERE NOT EXISTS (SELECT 1 FROM public.inventory WHERE item_id = 'STL004');

INSERT INTO public.inventory (item_id, name, category, quantity, unit, status, min_threshold, max_threshold, location, supplier, cost_per_unit)
SELECT 'STL005', 'Steel Coils', 'Finished Products', 800, 'tons', 'In Stock', 300, 2000, 'Warehouse A', 'Coil Manufacturing', 48000.00
WHERE NOT EXISTS (SELECT 1 FROM public.inventory WHERE item_id = 'STL005');

INSERT INTO public.inventory (item_id, name, category, quantity, unit, status, min_threshold, max_threshold, location, supplier, cost_per_unit)
SELECT 'RAW001', 'Coal', 'Raw Materials', 3500, 'tons', 'In Stock', 1000, 8000, 'Coal Storage', 'Coal Mines Ltd.', 5000.00
WHERE NOT EXISTS (SELECT 1 FROM public.inventory WHERE item_id = 'RAW001');

INSERT INTO public.inventory (item_id, name, category, quantity, unit, status, min_threshold, max_threshold, location, supplier, cost_per_unit)
SELECT 'RAW002', 'Limestone', 'Raw Materials', 2200, 'tons', 'In Stock', 500, 5000, 'Storage Yard 2', 'Limestone Quarry', 3000.00
WHERE NOT EXISTS (SELECT 1 FROM public.inventory WHERE item_id = 'RAW002');

INSERT INTO public.inventory (item_id, name, category, quantity, unit, status, min_threshold, max_threshold, location, supplier, cost_per_unit)
SELECT 'RAW003', 'Dolomite', 'Raw Materials', 1800, 'tons', 'In Stock', 400, 4000, 'Storage Yard 3', 'Mineral Suppliers', 3500.00
WHERE NOT EXISTS (SELECT 1 FROM public.inventory WHERE item_id = 'RAW003');

-- Vendors
INSERT INTO public.vendors (name, category, contact_person, phone, email, address, rating, status)
SELECT 'Steel Supply Co.', 'Raw Materials', 'Rajesh Kumar', '+91-891-123-4567', 'contact@steelsupply.com', 'Industrial Area, Visakhapatnam', 4.8, 'Active'
WHERE NOT EXISTS (SELECT 1 FROM public.vendors WHERE name = 'Steel Supply Co.');

INSERT INTO public.vendors (name, category, contact_person, phone, email, address, rating, status)
SELECT 'Industrial Equipment Ltd.', 'Machinery', 'Priya Sharma', '+91-891-987-6543', 'sales@indequip.com', 'Tech Park, Hyderabad', 4.6, 'Active'
WHERE NOT EXISTS (SELECT 1 FROM public.vendors WHERE name = 'Industrial Equipment Ltd.');

INSERT INTO public.vendors (name, category, contact_person, phone, email, address, rating, status)
SELECT 'Quality Tools Inc.', 'Tools & Equipment', 'Amit Patel', '+91-891-456-7890', 'info@qualitytools.com', 'Manufacturing Hub, Chennai', 4.9, 'Active'
WHERE NOT EXISTS (SELECT 1 FROM public.vendors WHERE name = 'Quality Tools Inc.');

INSERT INTO public.vendors (name, category, contact_person, phone, email, address, rating, status)
SELECT 'Mining Corp', 'Raw Materials', 'Suresh Reddy', '+91-891-234-5678', 'orders@miningcorp.com', 'Mining District, Odisha', 4.5, 'Active'
WHERE NOT EXISTS (SELECT 1 FROM public.vendors WHERE name = 'Mining Corp');

INSERT INTO public.vendors (name, category, contact_person, phone, email, address, rating, status)
SELECT 'Coal Mines Ltd.', 'Raw Materials', 'Deepak Singh', '+91-891-345-6789', 'supply@coalmines.com', 'Coal Belt, Jharkhand', 4.7, 'Active'
WHERE NOT EXISTS (SELECT 1 FROM public.vendors WHERE name = 'Coal Mines Ltd.');

-- Seed 14 days of realistic production shifts
DO $$
DECLARE
  v_offset INTEGER;
  v_date DATE;
BEGIN
  FOR v_offset IN 0..13 LOOP
    v_date := CURRENT_DATE - (v_offset || ' days')::INTERVAL;

    -- Day shift
    INSERT INTO public.production (date, shift, steel_production, molten_iron, efficiency, quality_rate, uptime_hours, downtime_hours, energy_consumption, notes)
    VALUES (
      v_date,
      'Day',
      ROUND((2400 + (RANDOM() * 350))::numeric, 1),
      ROUND((1800 + (RANDOM() * 250))::numeric, 1),
      ROUND((92 + (RANDOM() * 6))::numeric, 1),
      ROUND((96 + (RANDOM() * 3))::numeric, 1),
      ROUND((21 + (RANDOM() * 3))::numeric, 1),
      ROUND((RANDOM() * 2)::numeric, 1),
      ROUND((15000 + (RANDOM() * 4000))::numeric, 1),
      'Standard day shift blast furnace operations'
    )
    ON CONFLICT (date, shift) DO NOTHING;

    -- Evening shift
    INSERT INTO public.production (date, shift, steel_production, molten_iron, efficiency, quality_rate, uptime_hours, downtime_hours, energy_consumption, notes)
    VALUES (
      v_date,
      'Evening',
      ROUND((2300 + (RANDOM() * 350))::numeric, 1),
      ROUND((1750 + (RANDOM() * 250))::numeric, 1),
      ROUND((90 + (RANDOM() * 7))::numeric, 1),
      ROUND((95 + (RANDOM() * 4))::numeric, 1),
      ROUND((20 + (RANDOM() * 3))::numeric, 1),
      ROUND((RANDOM() * 3)::numeric, 1),
      ROUND((14500 + (RANDOM() * 4000))::numeric, 1),
      'Evening shift steel melt shop operations'
    )
    ON CONFLICT (date, shift) DO NOTHING;

    -- Night shift
    INSERT INTO public.production (date, shift, steel_production, molten_iron, efficiency, quality_rate, uptime_hours, downtime_hours, energy_consumption, notes)
    VALUES (
      v_date,
      'Night',
      ROUND((2200 + (RANDOM() * 350))::numeric, 1),
      ROUND((1700 + (RANDOM() * 250))::numeric, 1),
      ROUND((88 + (RANDOM() * 8))::numeric, 1),
      ROUND((94 + (RANDOM() * 5))::numeric, 1),
      ROUND((19 + (RANDOM() * 4))::numeric, 1),
      ROUND((RANDOM() * 4)::numeric, 1),
      ROUND((14000 + (RANDOM() * 4000))::numeric, 1),
      'Night shift rolling mill operations'
    )
    ON CONFLICT (date, shift) DO NOTHING;
  END LOOP;
END $$;
