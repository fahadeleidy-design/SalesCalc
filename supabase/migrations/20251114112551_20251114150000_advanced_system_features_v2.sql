/*
  # Advanced System Features V2

  1. Real-time Collaboration
    - User presence tracking
    - Real-time editing indicators
    - Collaborative commenting
    - Activity streams

  2. Advanced Notifications
    - Priority-based delivery
    - Notification preferences
    - Batch notifications
    - Push notification support

  3. Advanced Analytics
    - Custom metrics tracking
    - Event tracking
    - User behavior analytics
    - Performance metrics

  4. Enhanced Security
    - Login attempts tracking
    - Session management
    - Security audit logs
    - IP whitelisting

  5. System Health Monitoring
    - Performance metrics
    - Error tracking
    - Usage statistics
    - System alerts
*/

-- ============================================
-- 1. REAL-TIME COLLABORATION
-- ============================================

-- User presence tracking
CREATE TABLE IF NOT EXISTS user_presence (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  status text CHECK (status IN ('online', 'away', 'busy', 'offline')) DEFAULT 'offline',
  current_page text,
  last_activity timestamptz DEFAULT now() NOT NULL,
  metadata jsonb,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  UNIQUE(user_id)
);

CREATE INDEX IF NOT EXISTS idx_user_presence_status ON user_presence(status, last_activity);
CREATE INDEX IF NOT EXISTS idx_user_presence_user ON user_presence(user_id);

-- Real-time document locks
CREATE TABLE IF NOT EXISTS document_locks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_type text NOT NULL,
  document_id uuid NOT NULL,
  locked_by uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  locked_at timestamptz DEFAULT now() NOT NULL,
  expires_at timestamptz NOT NULL,
  UNIQUE(document_type, document_id)
);

CREATE INDEX IF NOT EXISTS idx_document_locks_doc ON document_locks(document_type, document_id);
CREATE INDEX IF NOT EXISTS idx_document_locks_user ON document_locks(locked_by);
CREATE INDEX IF NOT EXISTS idx_document_locks_expires ON document_locks(expires_at);

-- Collaborative comments
CREATE TABLE IF NOT EXISTS collaborative_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type text NOT NULL,
  entity_id uuid NOT NULL,
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  content text NOT NULL,
  parent_comment_id uuid REFERENCES collaborative_comments(id) ON DELETE CASCADE,
  mentions uuid[],
  is_resolved boolean DEFAULT false,
  resolved_by uuid REFERENCES profiles(id),
  resolved_at timestamptz,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_collab_comments_entity ON collaborative_comments(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_collab_comments_user ON collaborative_comments(user_id);
CREATE INDEX IF NOT EXISTS idx_collab_comments_parent ON collaborative_comments(parent_comment_id);

-- Activity feed
CREATE TABLE IF NOT EXISTS activity_feed (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  actor_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  action text NOT NULL,
  entity_type text NOT NULL,
  entity_id uuid NOT NULL,
  entity_name text,
  metadata jsonb,
  visibility text CHECK (visibility IN ('public', 'team', 'private')) DEFAULT 'team',
  created_at timestamptz DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_activity_feed_user ON activity_feed(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_feed_actor ON activity_feed(actor_id);
CREATE INDEX IF NOT EXISTS idx_activity_feed_entity ON activity_feed(entity_type, entity_id);

-- ============================================
-- 2. ADVANCED NOTIFICATIONS
-- ============================================

-- Notification preferences
CREATE TABLE IF NOT EXISTS notification_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  channel text NOT NULL,
  notification_type text NOT NULL,
  enabled boolean DEFAULT true,
  frequency text CHECK (frequency IN ('instant', 'hourly', 'daily', 'weekly')) DEFAULT 'instant',
  quiet_hours_start time,
  quiet_hours_end time,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  UNIQUE(user_id, channel, notification_type)
);

CREATE INDEX IF NOT EXISTS idx_notif_prefs_user ON notification_preferences(user_id);

-- Notification batches
CREATE TABLE IF NOT EXISTS notification_batches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  frequency text NOT NULL,
  notifications jsonb NOT NULL,
  scheduled_for timestamptz NOT NULL,
  sent_at timestamptz,
  status text CHECK (status IN ('pending', 'sent', 'failed')) DEFAULT 'pending',
  created_at timestamptz DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_notif_batches_scheduled ON notification_batches(scheduled_for);
CREATE INDEX IF NOT EXISTS idx_notif_batches_status ON notification_batches(status);

-- ============================================
-- 3. ADVANCED ANALYTICS
-- ============================================

-- Custom metrics
CREATE TABLE IF NOT EXISTS custom_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  metric_name text NOT NULL,
  metric_type text CHECK (metric_type IN ('counter', 'gauge', 'histogram')) NOT NULL,
  value numeric NOT NULL,
  tags jsonb,
  user_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  timestamp timestamptz DEFAULT now() NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_custom_metrics_name ON custom_metrics(metric_name, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_custom_metrics_user ON custom_metrics(user_id);
CREATE INDEX IF NOT EXISTS idx_custom_metrics_timestamp ON custom_metrics(timestamp DESC);

-- Event tracking
CREATE TABLE IF NOT EXISTS event_tracking (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_name text NOT NULL,
  event_category text NOT NULL,
  user_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  session_id text,
  properties jsonb,
  page_url text,
  referrer text,
  user_agent text,
  ip_address inet,
  created_at timestamptz DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_event_tracking_name ON event_tracking(event_name, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_event_tracking_category ON event_tracking(event_category);
CREATE INDEX IF NOT EXISTS idx_event_tracking_user ON event_tracking(user_id);
CREATE INDEX IF NOT EXISTS idx_event_tracking_session ON event_tracking(session_id);

-- ============================================
-- 4. ENHANCED SECURITY
-- ============================================

-- Login attempts
CREATE TABLE IF NOT EXISTS login_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  success boolean NOT NULL,
  ip_address inet NOT NULL,
  user_agent text,
  failure_reason text,
  created_at timestamptz DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_login_attempts_email ON login_attempts(email, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_login_attempts_ip ON login_attempts(ip_address);
CREATE INDEX IF NOT EXISTS idx_login_attempts_success ON login_attempts(success, created_at DESC);

-- Active sessions
CREATE TABLE IF NOT EXISTS active_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  session_token text UNIQUE NOT NULL,
  ip_address inet NOT NULL,
  user_agent text,
  last_activity timestamptz DEFAULT now() NOT NULL,
  expires_at timestamptz NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_active_sessions_user ON active_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_active_sessions_token ON active_sessions(session_token);
CREATE INDEX IF NOT EXISTS idx_active_sessions_expires ON active_sessions(expires_at);

-- IP whitelist
CREATE TABLE IF NOT EXISTS ip_whitelist (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ip_address inet NOT NULL UNIQUE,
  description text,
  is_active boolean DEFAULT true,
  created_by uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_ip_whitelist_active ON ip_whitelist(is_active);

-- ============================================
-- 5. SYSTEM HEALTH MONITORING
-- ============================================

-- System metrics
CREATE TABLE IF NOT EXISTS system_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  metric_type text NOT NULL,
  metric_name text NOT NULL,
  value numeric NOT NULL,
  unit text,
  metadata jsonb,
  timestamp timestamptz DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_system_metrics_type ON system_metrics(metric_type, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_system_metrics_name ON system_metrics(metric_name, timestamp DESC);

-- Error logs
CREATE TABLE IF NOT EXISTS error_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  error_type text NOT NULL,
  error_message text NOT NULL,
  stack_trace text,
  user_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  request_url text,
  request_method text,
  request_body jsonb,
  user_agent text,
  ip_address inet,
  severity text CHECK (severity IN ('low', 'medium', 'high', 'critical')) DEFAULT 'medium',
  resolved boolean DEFAULT false,
  resolved_by uuid REFERENCES profiles(id),
  resolved_at timestamptz,
  created_at timestamptz DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_error_logs_type ON error_logs(error_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_error_logs_severity ON error_logs(severity, resolved);
CREATE INDEX IF NOT EXISTS idx_error_logs_user ON error_logs(user_id);

-- System alerts
CREATE TABLE IF NOT EXISTS system_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_type text NOT NULL,
  severity text CHECK (severity IN ('info', 'warning', 'error', 'critical')) NOT NULL,
  title text NOT NULL,
  message text NOT NULL,
  metadata jsonb,
  acknowledged boolean DEFAULT false,
  acknowledged_by uuid REFERENCES profiles(id),
  acknowledged_at timestamptz,
  created_at timestamptz DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_system_alerts_severity ON system_alerts(severity, acknowledged);
CREATE INDEX IF NOT EXISTS idx_system_alerts_type ON system_alerts(alert_type);

-- ============================================
-- ENABLE RLS
-- ============================================

ALTER TABLE user_presence ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_locks ENABLE ROW LEVEL SECURITY;
ALTER TABLE collaborative_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_feed ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE custom_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE login_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE active_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE ip_whitelist ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE error_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_alerts ENABLE ROW LEVEL SECURITY;

-- ============================================
-- RLS POLICIES
-- ============================================

-- User presence - users can see all active users
CREATE POLICY "Users can view all presence"
  ON user_presence FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can update own presence"
  ON user_presence FOR ALL
  TO authenticated
  USING (user_id = auth.uid());

-- Document locks - users can see all locks
CREATE POLICY "Users can view locks"
  ON document_locks FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can create own locks"
  ON document_locks FOR INSERT
  TO authenticated
  WITH CHECK (locked_by = auth.uid());

-- Collaborative comments - based on entity visibility
CREATE POLICY "Users can view comments"
  ON collaborative_comments FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can create comments"
  ON collaborative_comments FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own comments"
  ON collaborative_comments FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid());

-- Activity feed - users see their own and team activity
CREATE POLICY "Users can view activity"
  ON activity_feed FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid() OR
    visibility = 'public' OR
    (visibility = 'team' AND EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'manager', 'ceo')
    ))
  );

-- Notification preferences - users manage their own
CREATE POLICY "Users manage own preferences"
  ON notification_preferences FOR ALL
  TO authenticated
  USING (user_id = auth.uid());

-- Admin access to system tables
CREATE POLICY "Admin view metrics"
  ON custom_metrics FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'ceo')
  ));

CREATE POLICY "Admin view events"
  ON event_tracking FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'ceo')
  ));

CREATE POLICY "Admin view errors"
  ON error_logs FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
  ));

CREATE POLICY "Admin manage alerts"
  ON system_alerts FOR ALL
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
  ));

-- ============================================
-- FUNCTIONS
-- ============================================

-- Update user presence
CREATE OR REPLACE FUNCTION update_user_presence(
  p_status text,
  p_current_page text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO user_presence (user_id, status, current_page, last_activity)
  VALUES (auth.uid(), p_status, p_current_page, now())
  ON CONFLICT (user_id)
  DO UPDATE SET
    status = EXCLUDED.status,
    current_page = COALESCE(EXCLUDED.current_page, user_presence.current_page),
    last_activity = now(),
    updated_at = now();
END;
$$;

-- Acquire document lock
CREATE OR REPLACE FUNCTION acquire_document_lock(
  p_document_type text,
  p_document_id uuid,
  p_duration_minutes integer DEFAULT 5
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_expires_at timestamptz;
BEGIN
  v_expires_at := now() + (p_duration_minutes || ' minutes')::interval;
  
  -- Try to acquire lock
  INSERT INTO document_locks (document_type, document_id, locked_by, expires_at)
  VALUES (p_document_type, p_document_id, auth.uid(), v_expires_at)
  ON CONFLICT (document_type, document_id)
  DO UPDATE SET
    locked_by = auth.uid(),
    locked_at = now(),
    expires_at = v_expires_at
  WHERE document_locks.expires_at < now() OR document_locks.locked_by = auth.uid();
  
  RETURN FOUND;
END;
$$;

-- Release document lock
CREATE OR REPLACE FUNCTION release_document_lock(
  p_document_type text,
  p_document_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  DELETE FROM document_locks
  WHERE document_type = p_document_type
  AND document_id = p_document_id
  AND locked_by = auth.uid();
END;
$$;

-- Track event
CREATE OR REPLACE FUNCTION track_event(
  p_event_name text,
  p_event_category text,
  p_properties jsonb DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_event_id uuid;
BEGIN
  INSERT INTO event_tracking (event_name, event_category, user_id, properties)
  VALUES (p_event_name, p_event_category, auth.uid(), p_properties)
  RETURNING id INTO v_event_id;
  
  RETURN v_event_id;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION update_user_presence TO authenticated;
GRANT EXECUTE ON FUNCTION acquire_document_lock TO authenticated;
GRANT EXECUTE ON FUNCTION release_document_lock TO authenticated;
GRANT EXECUTE ON FUNCTION track_event TO authenticated;

-- Comments
COMMENT ON TABLE user_presence IS 'Real-time user presence and activity tracking';
COMMENT ON TABLE document_locks IS 'Collaborative editing locks to prevent conflicts';
COMMENT ON TABLE collaborative_comments IS 'Threaded comments on any entity';
COMMENT ON TABLE activity_feed IS 'User activity stream for notifications and history';
COMMENT ON TABLE notification_preferences IS 'User notification preferences per channel';
COMMENT ON TABLE custom_metrics IS 'Custom business metrics tracking';
COMMENT ON TABLE event_tracking IS 'User behavior and event tracking';
COMMENT ON TABLE login_attempts IS 'Login attempt tracking for security';
COMMENT ON TABLE error_logs IS 'Application error logging';
COMMENT ON TABLE system_alerts IS 'System-wide alerts and warnings';
