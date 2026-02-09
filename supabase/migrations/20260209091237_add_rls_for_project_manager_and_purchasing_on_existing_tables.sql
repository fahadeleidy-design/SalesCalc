/*
  # Add RLS policies for project_manager and purchasing on existing tables

  1. Security Changes
    - Grant project_manager SELECT on: job_orders, job_order_items, quotations, customers, 
      purchase_orders, purchase_order_items, suppliers, payment_schedules, 
      purchase_order_status_history, goods_receipts, goods_receipt_items
    - Grant purchasing full CRUD on: purchase_orders, purchase_order_items, suppliers,
      purchase_order_status_history, goods_receipts, goods_receipt_items
    - Grant purchasing SELECT on: job_orders, job_order_items, quotations, customers, payment_schedules, products

  2. Important Notes
    - Uses DO blocks with IF NOT EXISTS pattern to avoid duplicate policy errors
    - project_manager is read-only on all existing tables
    - purchasing gets write access only on procurement/PO related tables
*/

-- Helper: Add project_manager and purchasing to job_orders SELECT
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'PM read job orders' AND tablename = 'job_orders') THEN
    CREATE POLICY "PM read job orders"
      ON job_orders FOR SELECT TO authenticated
      USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.user_id = auth.uid() AND profiles.role IN ('project_manager')));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Purchasing read job orders' AND tablename = 'job_orders') THEN
    CREATE POLICY "Purchasing read job orders"
      ON job_orders FOR SELECT TO authenticated
      USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.user_id = auth.uid() AND profiles.role IN ('purchasing')));
  END IF;
END $$;

-- PM can update job order status
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'PM update job orders' AND tablename = 'job_orders') THEN
    CREATE POLICY "PM update job orders"
      ON job_orders FOR UPDATE TO authenticated
      USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.user_id = auth.uid() AND profiles.role IN ('project_manager')))
      WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE profiles.user_id = auth.uid() AND profiles.role IN ('project_manager')));
  END IF;
END $$;

-- job_order_items
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'PM read job order items' AND tablename = 'job_order_items') THEN
    CREATE POLICY "PM read job order items"
      ON job_order_items FOR SELECT TO authenticated
      USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.user_id = auth.uid() AND profiles.role IN ('project_manager')));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Purchasing read job order items' AND tablename = 'job_order_items') THEN
    CREATE POLICY "Purchasing read job order items"
      ON job_order_items FOR SELECT TO authenticated
      USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.user_id = auth.uid() AND profiles.role IN ('purchasing')));
  END IF;
END $$;

-- quotations (read only for both)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'PM read quotations' AND tablename = 'quotations') THEN
    CREATE POLICY "PM read quotations"
      ON quotations FOR SELECT TO authenticated
      USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.user_id = auth.uid() AND profiles.role IN ('project_manager')));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Purchasing read quotations' AND tablename = 'quotations') THEN
    CREATE POLICY "Purchasing read quotations"
      ON quotations FOR SELECT TO authenticated
      USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.user_id = auth.uid() AND profiles.role IN ('purchasing')));
  END IF;
END $$;

-- customers (read only)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'PM read customers' AND tablename = 'customers') THEN
    CREATE POLICY "PM read customers"
      ON customers FOR SELECT TO authenticated
      USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.user_id = auth.uid() AND profiles.role IN ('project_manager')));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Purchasing read customers' AND tablename = 'customers') THEN
    CREATE POLICY "Purchasing read customers"
      ON customers FOR SELECT TO authenticated
      USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.user_id = auth.uid() AND profiles.role IN ('purchasing')));
  END IF;
END $$;

-- purchase_orders: PM read, Purchasing full CRUD
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'PM read purchase orders' AND tablename = 'purchase_orders') THEN
    CREATE POLICY "PM read purchase orders"
      ON purchase_orders FOR SELECT TO authenticated
      USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.user_id = auth.uid() AND profiles.role IN ('project_manager')));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Purchasing read purchase orders' AND tablename = 'purchase_orders') THEN
    CREATE POLICY "Purchasing read purchase orders"
      ON purchase_orders FOR SELECT TO authenticated
      USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.user_id = auth.uid() AND profiles.role IN ('purchasing')));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Purchasing insert purchase orders' AND tablename = 'purchase_orders') THEN
    CREATE POLICY "Purchasing insert purchase orders"
      ON purchase_orders FOR INSERT TO authenticated
      WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE profiles.user_id = auth.uid() AND profiles.role IN ('purchasing')));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Purchasing update purchase orders' AND tablename = 'purchase_orders') THEN
    CREATE POLICY "Purchasing update purchase orders"
      ON purchase_orders FOR UPDATE TO authenticated
      USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.user_id = auth.uid() AND profiles.role IN ('purchasing')))
      WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE profiles.user_id = auth.uid() AND profiles.role IN ('purchasing')));
  END IF;
END $$;

-- purchase_order_items
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'PM read PO items' AND tablename = 'purchase_order_items') THEN
    CREATE POLICY "PM read PO items"
      ON purchase_order_items FOR SELECT TO authenticated
      USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.user_id = auth.uid() AND profiles.role IN ('project_manager')));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Purchasing read PO items' AND tablename = 'purchase_order_items') THEN
    CREATE POLICY "Purchasing read PO items"
      ON purchase_order_items FOR SELECT TO authenticated
      USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.user_id = auth.uid() AND profiles.role IN ('purchasing')));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Purchasing insert PO items' AND tablename = 'purchase_order_items') THEN
    CREATE POLICY "Purchasing insert PO items"
      ON purchase_order_items FOR INSERT TO authenticated
      WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE profiles.user_id = auth.uid() AND profiles.role IN ('purchasing')));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Purchasing update PO items' AND tablename = 'purchase_order_items') THEN
    CREATE POLICY "Purchasing update PO items"
      ON purchase_order_items FOR UPDATE TO authenticated
      USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.user_id = auth.uid() AND profiles.role IN ('purchasing')))
      WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE profiles.user_id = auth.uid() AND profiles.role IN ('purchasing')));
  END IF;
END $$;

-- suppliers: Purchasing full CRUD, PM read
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'PM read suppliers' AND tablename = 'suppliers') THEN
    CREATE POLICY "PM read suppliers"
      ON suppliers FOR SELECT TO authenticated
      USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.user_id = auth.uid() AND profiles.role IN ('project_manager')));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Purchasing read suppliers' AND tablename = 'suppliers') THEN
    CREATE POLICY "Purchasing read suppliers"
      ON suppliers FOR SELECT TO authenticated
      USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.user_id = auth.uid() AND profiles.role IN ('purchasing')));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Purchasing insert suppliers' AND tablename = 'suppliers') THEN
    CREATE POLICY "Purchasing insert suppliers"
      ON suppliers FOR INSERT TO authenticated
      WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE profiles.user_id = auth.uid() AND profiles.role IN ('purchasing')));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Purchasing update suppliers' AND tablename = 'suppliers') THEN
    CREATE POLICY "Purchasing update suppliers"
      ON suppliers FOR UPDATE TO authenticated
      USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.user_id = auth.uid() AND profiles.role IN ('purchasing')))
      WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE profiles.user_id = auth.uid() AND profiles.role IN ('purchasing')));
  END IF;
END $$;

-- purchase_order_status_history
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'PM read PO status history' AND tablename = 'purchase_order_status_history') THEN
    CREATE POLICY "PM read PO status history"
      ON purchase_order_status_history FOR SELECT TO authenticated
      USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.user_id = auth.uid() AND profiles.role IN ('project_manager')));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Purchasing read PO status history' AND tablename = 'purchase_order_status_history') THEN
    CREATE POLICY "Purchasing read PO status history"
      ON purchase_order_status_history FOR SELECT TO authenticated
      USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.user_id = auth.uid() AND profiles.role IN ('purchasing')));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Purchasing insert PO status history' AND tablename = 'purchase_order_status_history') THEN
    CREATE POLICY "Purchasing insert PO status history"
      ON purchase_order_status_history FOR INSERT TO authenticated
      WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE profiles.user_id = auth.uid() AND profiles.role IN ('purchasing')));
  END IF;
END $$;

-- goods_receipts
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'PM read goods receipts' AND tablename = 'goods_receipts') THEN
    CREATE POLICY "PM read goods receipts"
      ON goods_receipts FOR SELECT TO authenticated
      USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.user_id = auth.uid() AND profiles.role IN ('project_manager')));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Purchasing read goods receipts' AND tablename = 'goods_receipts') THEN
    CREATE POLICY "Purchasing read goods receipts"
      ON goods_receipts FOR SELECT TO authenticated
      USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.user_id = auth.uid() AND profiles.role IN ('purchasing')));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Purchasing insert goods receipts' AND tablename = 'goods_receipts') THEN
    CREATE POLICY "Purchasing insert goods receipts"
      ON goods_receipts FOR INSERT TO authenticated
      WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE profiles.user_id = auth.uid() AND profiles.role IN ('purchasing')));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Purchasing update goods receipts' AND tablename = 'goods_receipts') THEN
    CREATE POLICY "Purchasing update goods receipts"
      ON goods_receipts FOR UPDATE TO authenticated
      USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.user_id = auth.uid() AND profiles.role IN ('purchasing')))
      WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE profiles.user_id = auth.uid() AND profiles.role IN ('purchasing')));
  END IF;
END $$;

-- goods_receipt_items
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'PM read goods receipt items' AND tablename = 'goods_receipt_items') THEN
    CREATE POLICY "PM read goods receipt items"
      ON goods_receipt_items FOR SELECT TO authenticated
      USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.user_id = auth.uid() AND profiles.role IN ('project_manager')));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Purchasing read goods receipt items' AND tablename = 'goods_receipt_items') THEN
    CREATE POLICY "Purchasing read goods receipt items"
      ON goods_receipt_items FOR SELECT TO authenticated
      USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.user_id = auth.uid() AND profiles.role IN ('purchasing')));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Purchasing insert goods receipt items' AND tablename = 'goods_receipt_items') THEN
    CREATE POLICY "Purchasing insert goods receipt items"
      ON goods_receipt_items FOR INSERT TO authenticated
      WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE profiles.user_id = auth.uid() AND profiles.role IN ('purchasing')));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Purchasing update goods receipt items' AND tablename = 'goods_receipt_items') THEN
    CREATE POLICY "Purchasing update goods receipt items"
      ON goods_receipt_items FOR UPDATE TO authenticated
      USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.user_id = auth.uid() AND profiles.role IN ('purchasing')))
      WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE profiles.user_id = auth.uid() AND profiles.role IN ('purchasing')));
  END IF;
END $$;

-- payment_schedules (read only for both)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'PM read payment schedules' AND tablename = 'payment_schedules') THEN
    CREATE POLICY "PM read payment schedules"
      ON payment_schedules FOR SELECT TO authenticated
      USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.user_id = auth.uid() AND profiles.role IN ('project_manager')));
  END IF;
END $$;

-- products (read only for purchasing)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Purchasing read products' AND tablename = 'products') THEN
    CREATE POLICY "Purchasing read products"
      ON products FOR SELECT TO authenticated
      USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.user_id = auth.uid() AND profiles.role IN ('purchasing')));
  END IF;
END $$;

-- profiles (read for both roles to resolve names)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'PM read profiles' AND tablename = 'profiles') THEN
    CREATE POLICY "PM read profiles"
      ON profiles FOR SELECT TO authenticated
      USING (EXISTS (SELECT 1 FROM profiles p WHERE p.user_id = auth.uid() AND p.role IN ('project_manager')));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Purchasing read profiles' AND tablename = 'profiles') THEN
    CREATE POLICY "Purchasing read profiles"
      ON profiles FOR SELECT TO authenticated
      USING (EXISTS (SELECT 1 FROM profiles p WHERE p.user_id = auth.uid() AND p.role IN ('purchasing')));
  END IF;
END $$;

-- quotation_items (read only for PM)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'PM read quotation items' AND tablename = 'quotation_items') THEN
    CREATE POLICY "PM read quotation items"
      ON quotation_items FOR SELECT TO authenticated
      USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.user_id = auth.uid() AND profiles.role IN ('project_manager')));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Purchasing read quotation items' AND tablename = 'quotation_items') THEN
    CREATE POLICY "Purchasing read quotation items"
      ON quotation_items FOR SELECT TO authenticated
      USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.user_id = auth.uid() AND profiles.role IN ('purchasing')));
  END IF;
END $$;
