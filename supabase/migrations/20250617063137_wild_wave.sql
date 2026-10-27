/*
  # Insert sample data for RINL steel plant management system

  1. Sample Data
    - Insert inventory items with realistic steel plant data
    - Insert vendor information for suppliers
    - Insert 30 days of production data with realistic metrics
    - All inserts use conditional logic to avoid duplicates

  2. Data Categories
    - Raw materials (Iron Ore, Coal, Limestone, Dolomite)
    - Finished products (Steel sheets, rods, pipes, coils)
    - Vendor directory with contact information
    - Historical production data with shifts and metrics

  3. Notes
    - Uses INSERT with subqueries to check for existing data
    - Generates realistic production data for the last 30 days
    - Includes proper data ranges for steel plant operations
*/

-- Insert sample inventory data only if not exists
INSERT INTO inventory (item_id, name, category, quantity, unit, status, min_threshold, max_threshold, location, supplier, cost_per_unit)
SELECT 'STL001', 'Carbon Steel Sheets', 'Finished Products', 2500, 'tons', 'In Stock', 500, 5000, 'Warehouse A', 'Steel Supply Co.', 45000.00
WHERE NOT EXISTS (SELECT 1 FROM inventory WHERE item_id = 'STL001');

INSERT INTO inventory (item_id, name, category, quantity, unit, status, min_threshold, max_threshold, location, supplier, cost_per_unit)
SELECT 'STL002', 'Stainless Steel Rods', 'Finished Products', 180, 'tons', 'Low Stock', 200, 1000, 'Warehouse B', 'Quality Steel Ltd.', 52000.00
WHERE NOT EXISTS (SELECT 1 FROM inventory WHERE item_id = 'STL002');

INSERT INTO inventory (item_id, name, category, quantity, unit, status, min_threshold, max_threshold, location, supplier, cost_per_unit)
SELECT 'STL003', 'Iron Ore', 'Raw Materials', 5000, 'tons', 'In Stock', 1000, 10000, 'Storage Yard 1', 'Mining Corp', 8000.00
WHERE NOT EXISTS (SELECT 1 FROM inventory WHERE item_id = 'STL003');

INSERT INTO inventory (item_id, name, category, quantity, unit, status, min_threshold, max_threshold, location, supplier, cost_per_unit)
SELECT 'STL004', 'Alloy Steel Pipes', 'Finished Products', 50, 'tons', 'Critical', 100, 800, 'Warehouse C', 'Pipe Industries', 55000.00
WHERE NOT EXISTS (SELECT 1 FROM inventory WHERE item_id = 'STL004');

INSERT INTO inventory (item_id, name, category, quantity, unit, status, min_threshold, max_threshold, location, supplier, cost_per_unit)
SELECT 'STL005', 'Steel Coils', 'Finished Products', 800, 'tons', 'In Stock', 300, 2000, 'Warehouse A', 'Coil Manufacturing', 48000.00
WHERE NOT EXISTS (SELECT 1 FROM inventory WHERE item_id = 'STL005');

INSERT INTO inventory (item_id, name, category, quantity, unit, status, min_threshold, max_threshold, location, supplier, cost_per_unit)
SELECT 'RAW001', 'Coal', 'Raw Materials', 3500, 'tons', 'In Stock', 1000, 8000, 'Coal Storage', 'Coal Mines Ltd.', 5000.00
WHERE NOT EXISTS (SELECT 1 FROM inventory WHERE item_id = 'RAW001');

INSERT INTO inventory (item_id, name, category, quantity, unit, status, min_threshold, max_threshold, location, supplier, cost_per_unit)
SELECT 'RAW002', 'Limestone', 'Raw Materials', 2200, 'tons', 'In Stock', 500, 5000, 'Storage Yard 2', 'Limestone Quarry', 3000.00
WHERE NOT EXISTS (SELECT 1 FROM inventory WHERE item_id = 'RAW002');

INSERT INTO inventory (item_id, name, category, quantity, unit, status, min_threshold, max_threshold, location, supplier, cost_per_unit)
SELECT 'RAW003', 'Dolomite', 'Raw Materials', 1800, 'tons', 'In Stock', 400, 4000, 'Storage Yard 3', 'Mineral Suppliers', 3500.00
WHERE NOT EXISTS (SELECT 1 FROM inventory WHERE item_id = 'RAW003');

-- Insert sample vendor data only if not exists
INSERT INTO vendors (name, category, contact_person, phone, email, address, rating, status)
SELECT 'Steel Supply Co.', 'Raw Materials', 'Rajesh Kumar', '+91-891-123-4567', 'contact@steelsupply.com', 'Industrial Area, Visakhapatnam', 4.8, 'Active'
WHERE NOT EXISTS (SELECT 1 FROM vendors WHERE name = 'Steel Supply Co.');

INSERT INTO vendors (name, category, contact_person, phone, email, address, rating, status)
SELECT 'Industrial Equipment Ltd.', 'Machinery', 'Priya Sharma', '+91-891-987-6543', 'sales@indequip.com', 'Tech Park, Hyderabad', 4.6, 'Active'
WHERE NOT EXISTS (SELECT 1 FROM vendors WHERE name = 'Industrial Equipment Ltd.');

INSERT INTO vendors (name, category, contact_person, phone, email, address, rating, status)
SELECT 'Quality Tools Inc.', 'Tools & Equipment', 'Amit Patel', '+91-891-456-7890', 'info@qualitytools.com', 'Manufacturing Hub, Chennai', 4.9, 'Active'
WHERE NOT EXISTS (SELECT 1 FROM vendors WHERE name = 'Quality Tools Inc.');

INSERT INTO vendors (name, category, contact_person, phone, email, address, rating, status)
SELECT 'Mining Corp', 'Raw Materials', 'Suresh Reddy', '+91-891-234-5678', 'orders@miningcorp.com', 'Mining District, Odisha', 4.5, 'Active'
WHERE NOT EXISTS (SELECT 1 FROM vendors WHERE name = 'Mining Corp');

INSERT INTO vendors (name, category, contact_person, phone, email, address, rating, status)
SELECT 'Coal Mines Ltd.', 'Raw Materials', 'Deepak Singh', '+91-891-345-6789', 'supply@coalmines.com', 'Coal Belt, Jharkhand', 4.7, 'Active'
WHERE NOT EXISTS (SELECT 1 FROM vendors WHERE name = 'Coal Mines Ltd.');

-- Insert sample production data for the last 30 days
DO $$
DECLARE
    day_offset INTEGER;
    shift_type TEXT;
    production_date DATE;
BEGIN
    FOR day_offset IN 0..29 LOOP
        production_date := CURRENT_DATE - INTERVAL '1 day' * day_offset;
        
        -- Insert Day shift
        IF NOT EXISTS (SELECT 1 FROM production WHERE date = production_date AND shift = 'Day') THEN
            INSERT INTO production (date, shift, steel_production, molten_iron, efficiency, quality_rate, uptime_hours, downtime_hours, energy_consumption, notes)
            VALUES (
                production_date,
                'Day',
                (2400 + (random() * 400))::decimal(10,2),
                (1800 + (random() * 300))::decimal(10,2),
                (90 + (random() * 10))::decimal(5,2),
                (95 + (random() * 5))::decimal(5,2),
                (20 + (random() * 4))::decimal(4,2),
                (random() * 4)::decimal(4,2),
                (15000 + (random() * 5000))::decimal(10,2),
                CASE 
                    WHEN random() > 0.8 THEN 'Maintenance performed on furnace #2'
                    WHEN random() > 0.6 THEN 'Quality inspection completed successfully'
                    ELSE 'Normal production operations'
                END
            );
        END IF;
        
        -- Insert Evening shift
        IF NOT EXISTS (SELECT 1 FROM production WHERE date = production_date AND shift = 'Evening') THEN
            INSERT INTO production (date, shift, steel_production, molten_iron, efficiency, quality_rate, uptime_hours, downtime_hours, energy_consumption, notes)
            VALUES (
                production_date,
                'Evening',
                (2300 + (random() * 400))::decimal(10,2),
                (1750 + (random() * 300))::decimal(10,2),
                (88 + (random() * 12))::decimal(5,2),
                (94 + (random() * 6))::decimal(5,2),
                (19 + (random() * 5))::decimal(4,2),
                (random() * 5)::decimal(4,2),
                (14500 + (random() * 5500))::decimal(10,2),
                CASE 
                    WHEN random() > 0.8 THEN 'Equipment calibration completed'
                    WHEN random() > 0.6 THEN 'Raw material quality check passed'
                    ELSE 'Standard evening shift operations'
                END
            );
        END IF;
        
        -- Insert Night shift
        IF NOT EXISTS (SELECT 1 FROM production WHERE date = production_date AND shift = 'Night') THEN
            INSERT INTO production (date, shift, steel_production, molten_iron, efficiency, quality_rate, uptime_hours, downtime_hours, energy_consumption, notes)
            VALUES (
                production_date,
                'Night',
                (2200 + (random() * 400))::decimal(10,2),
                (1700 + (random() * 300))::decimal(10,2),
                (85 + (random() * 15))::decimal(5,2),
                (93 + (random() * 7))::decimal(5,2),
                (18 + (random() * 6))::decimal(4,2),
                (random() * 6)::decimal(4,2),
                (14000 + (random() * 6000))::decimal(10,2),
                CASE 
                    WHEN random() > 0.8 THEN 'Night shift maintenance window'
                    WHEN random() > 0.6 THEN 'Reduced production for equipment rest'
                    ELSE 'Night shift operations'
                END
            );
        END IF;
    END LOOP;
END $$;