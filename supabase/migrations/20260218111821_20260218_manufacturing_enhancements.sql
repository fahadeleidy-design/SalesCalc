/*
  # Manufacturing Enhancements: Multi-level BOM, Variants, Yield & Finish/Coating Tracking

  ## Summary
  This migration adds comprehensive furniture manufacturing enhancements:

  ## New Tables

  ### 1. `mfg_bom_assemblies` - Multi-level BOM tree structure
  - Supports parent-child relationships between BOM items (unlimited nesting)
  - Each node can be a raw material, sub-assembly, or finished product
  - Tracks level depth, sort order, and quantity multipliers per path

  ### 2. `mfg_product_variants` - Variant management
  - Manages product variants (size, color, material, finish combinations)
  - Links variants to base products
  - Tracks variant-specific BOM overrides and pricing adjustments
  - Supports active/inactive status and default variant designation

  ### 3. `mfg_variant_attributes` - Variant attribute definitions
  - Defines attribute types (dimension, color, finish, material, etc.)
  - Stores attribute values per variant
  - Supports display order and grouping

  ### 4. `mfg_material_yield_records` - Material yield tracking
  - Records actual vs. expected material consumption per production run
  - Calculates yield percentage and waste amount
  - Tracks waste categories (offcut, defect, setup_waste, moisture_loss, other)
  - Links to work orders and BOM items

  ### 5. `mfg_finish_coating_specs` - Finish/coating specifications
  - Defines finish types (paint, lacquer, veneer, laminate, stain, wax, oil, powder_coat)
  - Tracks application method, coat count, drying time
  - Manages color codes, gloss level, and thickness requirements
  - Associates with products or specific variants

  ### 6. `mfg_finish_coating_logs` - Finish application tracking
  - Records actual finish/coating applications per work order
  - Tracks batch numbers, applicator, and QC pass/fail
  - Captures environmental conditions (temperature, humidity)
  - Records actual vs. required coat counts and drying times

  ## Security
  - RLS enabled on all new tables
  - Production, quality, warehouse, and ceo_manufacturing roles have access
  - Admin has full access

  ## Notes
  1. All tables use gen_random_uuid() for primary keys
  2. All tables include created_at / updated_at timestamps
  3. Foreign keys reference existing mfg_bom_headers, mfg_work_orders, products tables
  4. Indexes added for performance on frequently queried columns
*/

-- =====================================================
-- 1. Multi-level BOM Assemblies (tree structure)
-- =====================================================
CREATE TABLE IF NOT EXISTS mfg_bom_assemblies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bom_header_id uuid REFERENCES mfg_bom_headers(id) ON DELETE CASCADE,
  parent_item_id uuid REFERENCES mfg_bom_assemblies(id) ON DELETE CASCADE,
  component_name text NOT NULL,
  component_code text,
  component_type text NOT NULL DEFAULT 'raw_material'
    CHECK (component_type IN ('raw_material','sub_assembly','finished_good','phantom','service')),
  level_depth integer NOT NULL DEFAULT 0,
  sort_order integer NOT NULL DEFAULT 0,
  quantity_per_parent numeric(12,4) NOT NULL DEFAULT 1,
  unit_of_measure text NOT NULL DEFAULT 'unit'
    CHECK (unit_of_measure IN ('unit','piece','meter','sqm','kg','liter','sheet','roll','set','pair','ml','gram','mm','cm')),
  unit_cost numeric(12,4) DEFAULT 0,
  scrap_factor numeric(5,4) DEFAULT 0
    CHECK (scrap_factor >= 0 AND scrap_factor < 1),
  lead_time_days integer DEFAULT 0,
  is_critical boolean DEFAULT false,
  supplier_id uuid REFERENCES suppliers(id),
  notes text,
  product_id uuid REFERENCES products(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE mfg_bom_assemblies ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_mfg_bom_assemblies_bom_header ON mfg_bom_assemblies(bom_header_id);
CREATE INDEX IF NOT EXISTS idx_mfg_bom_assemblies_parent ON mfg_bom_assemblies(parent_item_id);
CREATE INDEX IF NOT EXISTS idx_mfg_bom_assemblies_level ON mfg_bom_assemblies(level_depth);

CREATE POLICY "mfg_bom_assemblies_select"
  ON mfg_bom_assemblies FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin','ceo_manufacturing','production','quality','warehouse','purchasing','project_manager','engineering','manager','group_ceo')
    )
  );

CREATE POLICY "mfg_bom_assemblies_insert"
  ON mfg_bom_assemblies FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin','ceo_manufacturing','production','engineering')
    )
  );

CREATE POLICY "mfg_bom_assemblies_update"
  ON mfg_bom_assemblies FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin','ceo_manufacturing','production','engineering')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin','ceo_manufacturing','production','engineering')
    )
  );

CREATE POLICY "mfg_bom_assemblies_delete"
  ON mfg_bom_assemblies FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin','ceo_manufacturing')
    )
  );

-- =====================================================
-- 2. Product Variants
-- =====================================================
CREATE TABLE IF NOT EXISTS mfg_product_variants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid REFERENCES products(id) ON DELETE CASCADE,
  variant_code text NOT NULL,
  variant_name text NOT NULL,
  description text,
  is_active boolean DEFAULT true,
  is_default boolean DEFAULT false,
  price_adjustment numeric(12,2) DEFAULT 0,
  weight_kg numeric(10,3),
  dimensions_mm jsonb DEFAULT '{}',
  bom_override_id uuid REFERENCES mfg_bom_headers(id),
  image_url text,
  sku_suffix text,
  sort_order integer DEFAULT 0,
  created_by uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(product_id, variant_code)
);

ALTER TABLE mfg_product_variants ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_mfg_product_variants_product ON mfg_product_variants(product_id);
CREATE INDEX IF NOT EXISTS idx_mfg_product_variants_active ON mfg_product_variants(is_active);

CREATE POLICY "mfg_product_variants_select"
  ON mfg_product_variants FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin','ceo_manufacturing','production','quality','warehouse','purchasing','project_manager','engineering','manager','group_ceo','sales','finance','solution_consultant')
    )
  );

CREATE POLICY "mfg_product_variants_insert"
  ON mfg_product_variants FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin','ceo_manufacturing','production','engineering')
    )
  );

CREATE POLICY "mfg_product_variants_update"
  ON mfg_product_variants FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin','ceo_manufacturing','production','engineering')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin','ceo_manufacturing','production','engineering')
    )
  );

CREATE POLICY "mfg_product_variants_delete"
  ON mfg_product_variants FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin','ceo_manufacturing')
    )
  );

-- =====================================================
-- 3. Variant Attributes
-- =====================================================
CREATE TABLE IF NOT EXISTS mfg_variant_attributes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  variant_id uuid REFERENCES mfg_product_variants(id) ON DELETE CASCADE,
  attribute_type text NOT NULL
    CHECK (attribute_type IN ('dimension','color','finish','material','style','grade','configuration','custom')),
  attribute_name text NOT NULL,
  attribute_value text NOT NULL,
  unit text,
  display_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE mfg_variant_attributes ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_mfg_variant_attributes_variant ON mfg_variant_attributes(variant_id);
CREATE INDEX IF NOT EXISTS idx_mfg_variant_attributes_type ON mfg_variant_attributes(attribute_type);

CREATE POLICY "mfg_variant_attributes_select"
  ON mfg_variant_attributes FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin','ceo_manufacturing','production','quality','warehouse','purchasing','project_manager','engineering','manager','group_ceo','sales','finance','solution_consultant')
    )
  );

CREATE POLICY "mfg_variant_attributes_insert"
  ON mfg_variant_attributes FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin','ceo_manufacturing','production','engineering')
    )
  );

CREATE POLICY "mfg_variant_attributes_update"
  ON mfg_variant_attributes FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin','ceo_manufacturing','production','engineering')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin','ceo_manufacturing','production','engineering')
    )
  );

CREATE POLICY "mfg_variant_attributes_delete"
  ON mfg_variant_attributes FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin','ceo_manufacturing','production')
    )
  );

-- =====================================================
-- 4. Material Yield Records
-- =====================================================
CREATE TABLE IF NOT EXISTS mfg_material_yield_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  work_order_id uuid REFERENCES mfg_work_orders(id) ON DELETE CASCADE,
  bom_assembly_id uuid REFERENCES mfg_bom_assemblies(id),
  material_name text NOT NULL,
  material_code text,
  expected_quantity numeric(12,4) NOT NULL,
  actual_quantity_used numeric(12,4) NOT NULL,
  waste_quantity numeric(12,4) GENERATED ALWAYS AS (actual_quantity_used - expected_quantity) STORED,
  unit_of_measure text NOT NULL DEFAULT 'unit',
  yield_percentage numeric(7,4) GENERATED ALWAYS AS (
    CASE WHEN actual_quantity_used > 0
    THEN (expected_quantity / actual_quantity_used) * 100
    ELSE 100 END
  ) STORED,
  waste_category text DEFAULT 'offcut'
    CHECK (waste_category IN ('offcut','defect','setup_waste','moisture_loss','contamination','other')),
  waste_reason text,
  unit_cost numeric(12,4) DEFAULT 0,
  waste_cost numeric(12,4) GENERATED ALWAYS AS (
    GREATEST(0, actual_quantity_used - expected_quantity) * unit_cost
  ) STORED,
  is_recyclable boolean DEFAULT false,
  recycled_quantity numeric(12,4) DEFAULT 0,
  recorded_by uuid REFERENCES profiles(id),
  production_date date DEFAULT CURRENT_DATE,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE mfg_material_yield_records ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_mfg_yield_work_order ON mfg_material_yield_records(work_order_id);
CREATE INDEX IF NOT EXISTS idx_mfg_yield_date ON mfg_material_yield_records(production_date);
CREATE INDEX IF NOT EXISTS idx_mfg_yield_material ON mfg_material_yield_records(material_code);

CREATE POLICY "mfg_material_yield_select"
  ON mfg_material_yield_records FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin','ceo_manufacturing','production','quality','warehouse','purchasing','manager','group_ceo')
    )
  );

CREATE POLICY "mfg_material_yield_insert"
  ON mfg_material_yield_records FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin','ceo_manufacturing','production','quality')
    )
  );

CREATE POLICY "mfg_material_yield_update"
  ON mfg_material_yield_records FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin','ceo_manufacturing','production','quality')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin','ceo_manufacturing','production','quality')
    )
  );

CREATE POLICY "mfg_material_yield_delete"
  ON mfg_material_yield_records FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin','ceo_manufacturing')
    )
  );

-- =====================================================
-- 5. Finish/Coating Specifications
-- =====================================================
CREATE TABLE IF NOT EXISTS mfg_finish_coating_specs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid REFERENCES products(id),
  variant_id uuid REFERENCES mfg_product_variants(id),
  spec_code text NOT NULL,
  spec_name text NOT NULL,
  finish_type text NOT NULL
    CHECK (finish_type IN ('paint','lacquer','veneer','laminate','stain','wax','oil','powder_coat','anodize','plating','none','custom')),
  application_method text NOT NULL DEFAULT 'spray'
    CHECK (application_method IN ('spray','brush','roller','dip','electrostatic','vacuum_press','hand_rub','automated')),
  color_name text,
  color_code text,
  gloss_level text DEFAULT 'satin'
    CHECK (gloss_level IN ('matte','satin','semi_gloss','gloss','high_gloss')),
  number_of_coats integer NOT NULL DEFAULT 1,
  coat_thickness_microns numeric(8,2),
  drying_time_minutes integer,
  curing_time_hours numeric(8,2),
  surface_prep_required text,
  primer_required boolean DEFAULT false,
  primer_spec text,
  topcoat_required boolean DEFAULT false,
  topcoat_spec text,
  temperature_range_min numeric(6,2),
  temperature_range_max numeric(6,2),
  humidity_range_min numeric(5,2),
  humidity_range_max numeric(5,2),
  safety_notes text,
  is_active boolean DEFAULT true,
  created_by uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(spec_code)
);

ALTER TABLE mfg_finish_coating_specs ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_mfg_finish_specs_product ON mfg_finish_coating_specs(product_id);
CREATE INDEX IF NOT EXISTS idx_mfg_finish_specs_variant ON mfg_finish_coating_specs(variant_id);
CREATE INDEX IF NOT EXISTS idx_mfg_finish_specs_type ON mfg_finish_coating_specs(finish_type);

CREATE POLICY "mfg_finish_specs_select"
  ON mfg_finish_coating_specs FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin','ceo_manufacturing','production','quality','warehouse','purchasing','project_manager','engineering','manager','group_ceo','sales','solution_consultant')
    )
  );

CREATE POLICY "mfg_finish_specs_insert"
  ON mfg_finish_coating_specs FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin','ceo_manufacturing','production','quality','engineering')
    )
  );

CREATE POLICY "mfg_finish_specs_update"
  ON mfg_finish_coating_specs FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin','ceo_manufacturing','production','quality','engineering')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin','ceo_manufacturing','production','quality','engineering')
    )
  );

CREATE POLICY "mfg_finish_specs_delete"
  ON mfg_finish_coating_specs FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin','ceo_manufacturing')
    )
  );

-- =====================================================
-- 6. Finish/Coating Application Logs
-- =====================================================
CREATE TABLE IF NOT EXISTS mfg_finish_coating_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  work_order_id uuid REFERENCES mfg_work_orders(id) ON DELETE CASCADE,
  finish_spec_id uuid REFERENCES mfg_finish_coating_specs(id),
  application_date date DEFAULT CURRENT_DATE,
  batch_number text,
  coat_number integer NOT NULL DEFAULT 1,
  applied_by uuid REFERENCES profiles(id),
  application_start_time timestamptz,
  application_end_time timestamptz,
  actual_drying_time_minutes integer,
  actual_temperature numeric(6,2),
  actual_humidity numeric(5,2),
  material_used_liters numeric(10,4),
  surface_area_sqm numeric(10,4),
  coverage_rate_sqm_per_liter numeric(10,4) GENERATED ALWAYS AS (
    CASE WHEN material_used_liters > 0 AND surface_area_sqm > 0
    THEN surface_area_sqm / material_used_liters
    ELSE NULL END
  ) STORED,
  qc_passed boolean,
  qc_checked_by uuid REFERENCES profiles(id),
  qc_notes text,
  defects_found text,
  rework_required boolean DEFAULT false,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE mfg_finish_coating_logs ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_mfg_finish_logs_work_order ON mfg_finish_coating_logs(work_order_id);
CREATE INDEX IF NOT EXISTS idx_mfg_finish_logs_spec ON mfg_finish_coating_logs(finish_spec_id);
CREATE INDEX IF NOT EXISTS idx_mfg_finish_logs_date ON mfg_finish_coating_logs(application_date);

CREATE POLICY "mfg_finish_logs_select"
  ON mfg_finish_coating_logs FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin','ceo_manufacturing','production','quality','warehouse','manager','group_ceo')
    )
  );

CREATE POLICY "mfg_finish_logs_insert"
  ON mfg_finish_coating_logs FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin','ceo_manufacturing','production','quality')
    )
  );

CREATE POLICY "mfg_finish_logs_update"
  ON mfg_finish_coating_logs FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin','ceo_manufacturing','production','quality')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin','ceo_manufacturing','production','quality')
    )
  );

CREATE POLICY "mfg_finish_logs_delete"
  ON mfg_finish_coating_logs FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin','ceo_manufacturing')
    )
  );
