/*
  # Add Customer Acceptance Workflow

  1. Changes
    - Add quotation sharing and acceptance tables
    - Create secure links for customers to view/accept quotations
    - Track customer interactions
    - Add digital signature capability

  2. Features
    - Secure shareable links with expiry
    - Customer can view, accept, or reject quotations
    - Track views and interactions
    - Digital acceptance with signature
*/

-- Create quotation shares table
CREATE TABLE IF NOT EXISTS quotation_shares (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quotation_id uuid REFERENCES quotations(id) ON DELETE CASCADE NOT NULL,
  share_token text UNIQUE NOT NULL,
  password_protected boolean DEFAULT false,
  password_hash text,
  expires_at timestamptz,
  view_count integer DEFAULT 0,
  last_viewed_at timestamptz,
  created_by uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_quotation_shares_token ON quotation_shares(share_token);
CREATE INDEX IF NOT EXISTS idx_quotation_shares_quotation ON quotation_shares(quotation_id);

-- Create customer responses table
CREATE TABLE IF NOT EXISTS customer_quotation_responses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quotation_id uuid REFERENCES quotations(id) ON DELETE CASCADE NOT NULL,
  share_id uuid REFERENCES quotation_shares(id),
  customer_name text NOT NULL,
  customer_email text NOT NULL,
  customer_title text,
  response_type text NOT NULL CHECK (response_type IN ('accepted', 'rejected', 'needs_discussion')),
  signature_data text,
  signature_ip text,
  comments text,
  responded_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_customer_responses_quotation ON customer_quotation_responses(quotation_id);

-- Create quotation view tracking
CREATE TABLE IF NOT EXISTS quotation_view_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quotation_id uuid REFERENCES quotations(id) ON DELETE CASCADE NOT NULL,
  share_id uuid REFERENCES quotation_shares(id),
  viewer_ip text,
  viewer_user_agent text,
  view_duration_seconds integer,
  viewed_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_quotation_views ON quotation_view_log(quotation_id, viewed_at DESC);

-- Enable RLS
ALTER TABLE quotation_shares ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_quotation_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE quotation_view_log ENABLE ROW LEVEL SECURITY;

-- RLS Policies for quotation_shares
CREATE POLICY "Users can manage shares for their quotations"
  ON quotation_shares
  FOR ALL
  TO authenticated
  USING (
    quotation_id IN (
      SELECT q.id FROM quotations q
      WHERE q.sales_rep_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM profiles
          WHERE id = auth.uid()
            AND role IN ('admin', 'manager')
        )
    )
  );

-- RLS Policies for customer responses
CREATE POLICY "Users can view responses to their quotations"
  ON customer_quotation_responses
  FOR SELECT
  TO authenticated
  USING (
    quotation_id IN (
      SELECT q.id FROM quotations q
      WHERE q.sales_rep_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM profiles
          WHERE id = auth.uid()
            AND role IN ('admin', 'manager', 'ceo')
        )
    )
  );

-- Allow anon to insert responses (for customer portal)
CREATE POLICY "Anyone can submit responses"
  ON customer_quotation_responses
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- RLS for view log
CREATE POLICY "Users can view logs for their quotations"
  ON quotation_view_log
  FOR SELECT
  TO authenticated
  USING (
    quotation_id IN (
      SELECT q.id FROM quotations q
      WHERE q.sales_rep_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM profiles
          WHERE id = auth.uid()
            AND role IN ('admin', 'manager')
        )
    )
  );

CREATE POLICY "Anyone can log views"
  ON quotation_view_log
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Function to generate secure share link
CREATE OR REPLACE FUNCTION generate_quotation_share_link(
  p_quotation_id uuid,
  p_expires_in_days integer DEFAULT 30,
  p_password text DEFAULT NULL
)
RETURNS jsonb AS $$
DECLARE
  v_share_token text;
  v_share_id uuid;
  v_password_hash text;
BEGIN
  -- Generate secure random token
  v_share_token := encode(gen_random_bytes(32), 'base64url');
  
  -- Hash password if provided
  IF p_password IS NOT NULL THEN
    v_password_hash := extensions.crypt(p_password, extensions.gen_salt('bf'));
  END IF;
  
  -- Create share
  INSERT INTO quotation_shares (
    quotation_id,
    share_token,
    password_protected,
    password_hash,
    expires_at,
    created_by
  ) VALUES (
    p_quotation_id,
    v_share_token,
    p_password IS NOT NULL,
    v_password_hash,
    now() + (p_expires_in_days || ' days')::interval,
    auth.uid()
  )
  RETURNING id INTO v_share_id;
  
  RETURN jsonb_build_object(
    'share_id', v_share_id,
    'share_token', v_share_token,
    'share_url', 'https://your-domain.com/quote/' || v_share_token,
    'expires_at', now() + (p_expires_in_days || ' days')::interval
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to handle customer acceptance
CREATE OR REPLACE FUNCTION handle_customer_acceptance()
RETURNS TRIGGER AS $$
BEGIN
  -- Update quotation status based on customer response
  IF NEW.response_type = 'accepted' THEN
    UPDATE quotations
    SET 
      status = 'deal_won',
      deal_won_at = now()
    WHERE id = NEW.quotation_id;
    
    -- Queue congratulations notification
    PERFORM queue_notification(
      'deal_won',
      (SELECT sales_rep_id FROM quotations WHERE id = NEW.quotation_id),
      'deal_won',
      jsonb_build_object(
        'sales_rep_name', (SELECT full_name FROM profiles WHERE id = (SELECT sales_rep_id FROM quotations WHERE id = NEW.quotation_id)),
        'quotation_number', (SELECT quotation_number FROM quotations WHERE id = NEW.quotation_id),
        'customer_name', NEW.customer_name,
        'total_amount', (SELECT total FROM quotations WHERE id = NEW.quotation_id)::text,
        'link', '/quotations'
      )
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for customer acceptance
DROP TRIGGER IF EXISTS on_customer_acceptance ON customer_quotation_responses;
CREATE TRIGGER on_customer_acceptance
  AFTER INSERT ON customer_quotation_responses
  FOR EACH ROW
  EXECUTE FUNCTION handle_customer_acceptance();
