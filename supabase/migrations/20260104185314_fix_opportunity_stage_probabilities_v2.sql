/*
  # Fix Opportunity Stage Probabilities
  
  1. Changes
    - Update stage probabilities to match business requirements:
      - Creating Proposition: 35%
      - Proposition Accepted: 60%
      - Going our Way: 80%
      - Closing: 90%
    
  2. Stage Configuration
    - All stages already exist in the enum
    - Just updating the probability values in crm_pipeline_stages table
*/

-- Clear existing pipeline stages
DELETE FROM crm_pipeline_stages;

-- Insert all stages with correct probabilities
INSERT INTO crm_pipeline_stages (
  stage_name,
  stage_order,
  default_probability,
  stage_color,
  is_active,
  velocity_target_days,
  health_weight,
  is_closed_stage
) VALUES 
  ('Prospecting', 1, 10, '#64748b', true, 7, 1.0, false),
  ('Qualification', 2, 25, '#3b82f6', true, 7, 1.0, false),
  ('Creating Proposition', 3, 35, '#8b5cf6', true, 7, 1.0, false),
  ('Proposition Accepted', 4, 60, '#f59e0b', true, 7, 1.0, false),
  ('Going our Way', 5, 80, '#10b981', true, 5, 1.0, false),
  ('Closing', 6, 90, '#16a34a', true, 3, 1.0, false),
  ('Closed Won', 7, 100, '#22c55e', true, 0, 1.0, true),
  ('Closed Lost', 8, 0, '#ef4444', true, 0, 1.0, true);
