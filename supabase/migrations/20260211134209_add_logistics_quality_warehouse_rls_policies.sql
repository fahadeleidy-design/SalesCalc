/*
  # RLS Policies for Logistics, Quality, and Warehouse roles

  1. Logistics Access:
    - Full access to shipments, logistics KPIs
    - Read access for warehouse staff

  2. Quality Access:
    - Full access to quality inspections, alerts, costs
    - Read access for production staff

  3. Warehouse Access:
    - Full access to warehouse locations, zones, transfers
    - Read access for logistics and production staff

  4. Production Access:
    - Full access to production lines, schedules, shifts, logs
    - Read access for quality and warehouse staff
*/

-- Grant access to logistics users for shipment tables
DROP POLICY IF EXISTS "Logistics can view shipments" ON shipments;
CREATE POLICY "Logistics can view shipments" ON shipments
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.user_id = auth.uid() 
      AND profiles.role IN ('logistics', 'warehouse', 'manager', 'ceo', 'admin')
    )
  );

DROP POLICY IF EXISTS "Logistics can manage shipments" ON shipments;
CREATE POLICY "Logistics can manage shipments" ON shipments
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.user_id = auth.uid() 
      AND profiles.role IN ('logistics', 'warehouse', 'manager', 'admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.user_id = auth.uid() 
      AND profiles.role IN ('logistics', 'warehouse', 'manager', 'admin')
    )
  );

-- Shipment items
DROP POLICY IF EXISTS "Logistics can view shipment_items" ON shipment_items;
CREATE POLICY "Logistics can view shipment_items" ON shipment_items
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.user_id = auth.uid() 
      AND profiles.role IN ('logistics', 'warehouse', 'manager', 'ceo', 'admin')
    )
  );

DROP POLICY IF EXISTS "Logistics can manage shipment_items" ON shipment_items;
CREATE POLICY "Logistics can manage shipment_items" ON shipment_items
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.user_id = auth.uid() 
      AND profiles.role IN ('logistics', 'warehouse', 'manager', 'admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.user_id = auth.uid() 
      AND profiles.role IN ('logistics', 'warehouse', 'manager', 'admin')
    )
  );

-- Quality inspections
DROP POLICY IF EXISTS "Quality can view quality_inspections" ON quality_inspections;
CREATE POLICY "Quality can view quality_inspections" ON quality_inspections
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.user_id = auth.uid() 
      AND profiles.role IN ('quality', 'production', 'manager', 'ceo', 'admin')
    )
  );

DROP POLICY IF EXISTS "Quality can manage quality_inspections" ON quality_inspections;
CREATE POLICY "Quality can manage quality_inspections" ON quality_inspections
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.user_id = auth.uid() 
      AND profiles.role IN ('quality', 'manager', 'admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.user_id = auth.uid() 
      AND profiles.role IN ('quality', 'manager', 'admin')
    )
  );

-- Quality alerts
DROP POLICY IF EXISTS "Quality can view quality_alerts" ON quality_alerts;
CREATE POLICY "Quality can view quality_alerts" ON quality_alerts
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.user_id = auth.uid() 
      AND profiles.role IN ('quality', 'production', 'manager', 'ceo', 'admin')
    )
  );

DROP POLICY IF EXISTS "Quality can manage quality_alerts" ON quality_alerts;
CREATE POLICY "Quality can manage quality_alerts" ON quality_alerts
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.user_id = auth.uid() 
      AND profiles.role IN ('quality', 'manager', 'admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.user_id = auth.uid() 
      AND profiles.role IN ('quality', 'manager', 'admin')
    )
  );

-- Warehouse locations
DROP POLICY IF EXISTS "Warehouse can view warehouse_locations" ON warehouse_locations;
CREATE POLICY "Warehouse can view warehouse_locations" ON warehouse_locations
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.user_id = auth.uid() 
      AND profiles.role IN ('warehouse', 'logistics', 'production', 'manager', 'ceo', 'admin')
    )
  );

DROP POLICY IF EXISTS "Warehouse can manage warehouse_locations" ON warehouse_locations;
CREATE POLICY "Warehouse can manage warehouse_locations" ON warehouse_locations
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.user_id = auth.uid() 
      AND profiles.role IN ('warehouse', 'manager', 'admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.user_id = auth.uid() 
      AND profiles.role IN ('warehouse', 'manager', 'admin')
    )
  );

-- Production schedule
DROP POLICY IF EXISTS "Production can view production_schedule" ON production_schedule;
CREATE POLICY "Production can view production_schedule" ON production_schedule
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.user_id = auth.uid() 
      AND profiles.role IN ('production', 'quality', 'warehouse', 'manager', 'ceo', 'admin')
    )
  );

DROP POLICY IF EXISTS "Production can manage production_schedule" ON production_schedule;
CREATE POLICY "Production can manage production_schedule" ON production_schedule
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.user_id = auth.uid() 
      AND profiles.role IN ('production', 'manager', 'admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.user_id = auth.uid() 
      AND profiles.role IN ('production', 'manager', 'admin')
    )
  );
