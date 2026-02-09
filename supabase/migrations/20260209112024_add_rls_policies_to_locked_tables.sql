/*
  # Add RLS policies to tables with RLS enabled but no policies

  1. Tables affected
    - `active_sessions` - session tracking
    - `ip_whitelist` - IP access control
    - `lead_merge_history` - lead merge audit
    - `lead_nurturing_steps` - nurturing workflow
    - `lead_utm_parameters` - UTM tracking
    - `login_attempts` - security logging
    - `notification_batches` - notification grouping
    - `system_metrics` - system monitoring

  2. Security approach
    - All tables restricted to authenticated users
    - Admin-only write access for security/system tables
    - Read access scoped to relevant roles
*/

CREATE POLICY "Authenticated users manage own sessions"
  ON active_sessions FOR ALL
  TO authenticated
  USING (user_id = (SELECT id FROM profiles WHERE user_id = auth.uid() LIMIT 1))
  WITH CHECK (user_id = (SELECT id FROM profiles WHERE user_id = auth.uid() LIMIT 1));

CREATE POLICY "Admins manage IP whitelist"
  ON ip_whitelist FOR ALL
  TO authenticated
  USING (get_user_role() = 'admin')
  WITH CHECK (get_user_role() = 'admin');

CREATE POLICY "Authenticated users view lead merge history"
  ON lead_merge_history FOR SELECT
  TO authenticated
  USING (get_user_role() IN ('admin', 'manager', 'ceo', 'sales'));

CREATE POLICY "Admins manage lead merge history"
  ON lead_merge_history FOR INSERT
  TO authenticated
  WITH CHECK (get_user_role() IN ('admin', 'manager', 'sales'));

CREATE POLICY "Authenticated users view nurturing steps"
  ON lead_nurturing_steps FOR SELECT
  TO authenticated
  USING (get_user_role() IN ('admin', 'manager', 'ceo', 'sales'));

CREATE POLICY "Sales and admins manage nurturing steps"
  ON lead_nurturing_steps FOR INSERT
  TO authenticated
  WITH CHECK (get_user_role() IN ('admin', 'manager', 'sales'));

CREATE POLICY "Authenticated users view UTM parameters"
  ON lead_utm_parameters FOR SELECT
  TO authenticated
  USING (get_user_role() IN ('admin', 'manager', 'ceo', 'sales'));

CREATE POLICY "System inserts UTM parameters"
  ON lead_utm_parameters FOR INSERT
  TO authenticated
  WITH CHECK (get_user_role() IN ('admin', 'sales'));

CREATE POLICY "Admins view login attempts"
  ON login_attempts FOR SELECT
  TO authenticated
  USING (get_user_role() = 'admin');

CREATE POLICY "System inserts login attempts"
  ON login_attempts FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Admins manage notification batches"
  ON notification_batches FOR ALL
  TO authenticated
  USING (get_user_role() = 'admin')
  WITH CHECK (get_user_role() = 'admin');

CREATE POLICY "Admins view system metrics"
  ON system_metrics FOR SELECT
  TO authenticated
  USING (get_user_role() IN ('admin', 'ceo'));

CREATE POLICY "System inserts system metrics"
  ON system_metrics FOR INSERT
  TO authenticated
  WITH CHECK (get_user_role() = 'admin');
