/*
  # Add Project Manager and Purchasing roles

  1. Enum Changes
    - Add 'project_manager' to user_role enum
    - Add 'purchasing' to user_role enum
    - Add new job_order_status values: pending_material, in_production, quality_check, ready_to_ship, on_hold

  2. Important Notes
    - These roles are for internal factory operations
    - project_manager oversees job orders as projects with milestones and tasks
    - purchasing manages procurement, POs, suppliers, and goods receiving
*/

ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'project_manager';
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'purchasing';

ALTER TYPE job_order_status ADD VALUE IF NOT EXISTS 'pending_material';
ALTER TYPE job_order_status ADD VALUE IF NOT EXISTS 'in_production';
ALTER TYPE job_order_status ADD VALUE IF NOT EXISTS 'quality_check';
ALTER TYPE job_order_status ADD VALUE IF NOT EXISTS 'ready_to_ship';
ALTER TYPE job_order_status ADD VALUE IF NOT EXISTS 'on_hold';
