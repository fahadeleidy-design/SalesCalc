export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type UserRole = 'sales' | 'engineering' | 'manager' | 'group_ceo' | 'ceo_commercial' | 'ceo_manufacturing' | 'finance' | 'admin' | 'solution_consultant' | 'project_manager' | 'purchasing' | 'production' | 'logistics' | 'quality' | 'warehouse';

export type QuotationStatus =
  | 'draft'
  | 'pending_pricing'
  | 'pending_manager'
  | 'pending_ceo'
  | 'approved'
  | 'pending_finance'
  | 'finance_approved'
  | 'changes_requested'
  | 'rejected'
  | 'rejected_by_finance'
  | 'deal_won';

export type ApprovalAction = 'approved' | 'rejected' | 'changes_requested';
export type CustomItemStatus = 'pending' | 'priced' | 'cancelled';
export type NotificationType =
  | 'quotation_submitted'
  | 'quotation_approved'
  | 'quotation_rejected'
  | 'changes_requested'
  | 'custom_item_priced'
  | 'comment_mention'
  | 'deal_won';

export type LeadStatusType = 'new' | 'contacted' | 'qualified' | 'unqualified' | 'converted';
export type LeadSourceType = 'website' | 'referral' | 'social' | 'email' | 'phone' | 'event' | 'other';
export type ConditionType = 'behavioral' | 'demographic' | 'engagement';
export type OperatorType = 'equals' | 'contains' | 'greater_than' | 'less_than' | 'between' | 'in';
export type AssignmentRuleType = 'round_robin' | 'territory' | 'skill_based' | 'load_balanced';

export interface LeadScoringRule {
  id: string;
  name: string;
  condition_type: ConditionType;
  field_name: string | null;
  operator: OperatorType;
  value: string | null;
  points: number;
  is_active: boolean;
  priority: number;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface LeadAssignmentRule {
  id: string;
  name: string;
  rule_type: AssignmentRuleType;
  conditions: Json;
  assign_to_team_id: string | null;
  assign_to_user_id: string | null;
  fallback_user_id: string | null;
  is_active: boolean;
  priority: number;
  created_at: string;
  updated_at: string;
}

export interface LeadScoreHistory {
  id: string;
  lead_id: string;
  old_score: number | null;
  new_score: number | null;
  reason: string | null;
  rule_applied: Json;
  scored_at: string;
}

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          user_id: string;
          email: string;
          full_name: string;
          role: UserRole;
          department: string | null;
          phone: string | null;
          avatar_url: string | null;
          sales_target: number;
          language: string;
          theme: string;
          notifications_enabled: boolean;
          preferred_language: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          email: string;
          full_name: string;
          role?: UserRole;
          department?: string | null;
          phone?: string | null;
          avatar_url?: string | null;
          sales_target?: number;
          language?: string;
          theme?: string;
          notifications_enabled?: boolean;
          preferred_language?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          email?: string;
          full_name?: string;
          role?: UserRole;
          department?: string | null;
          phone?: string | null;
          avatar_url?: string | null;
          sales_target?: number;
          language?: string;
          theme?: string;
          notifications_enabled?: boolean;
          preferred_language?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      customers: {
        Row: {
          id: string;
          company_name: string;
          contact_person: string;
          email: string;
          phone: string | null;
          address: string | null;
          city: string | null;
          country: string | null;
          tax_id: string | null;
          assigned_sales_rep: string | null;
          notes: string | null;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          company_name: string;
          contact_person: string;
          email: string;
          phone?: string | null;
          address?: string | null;
          city?: string | null;
          country?: string | null;
          tax_id?: string | null;
          assigned_sales_rep?: string | null;
          notes?: string | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          company_name?: string;
          contact_person?: string;
          email?: string;
          phone?: string | null;
          address?: string | null;
          city?: string | null;
          country?: string | null;
          tax_id?: string | null;
          assigned_sales_rep?: string | null;
          notes?: string | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      crm_opportunity_teams: {
        Row: {
          id: string;
          opportunity_id: string;
          user_id: string;
          role: string;
          access_level: string;
          can_edit: boolean;
          created_at: string;
          removed_at: string | null;
        };
        Insert: {
          id?: string;
          opportunity_id: string;
          user_id: string;
          role: string;
          access_level?: string;
          can_edit?: boolean;
          created_at?: string;
          removed_at?: string | null;
        };
        Update: {
          id?: string;
          opportunity_id?: string;
          user_id?: string;
          role?: string;
          access_level?: string;
          can_edit?: boolean;
          created_at?: string;
          removed_at?: string | null;
        };
      };
      products: {
        Row: {
          id: string;
          sku: string;
          name: string;
          description: string | null;
          category: string | null;
          unit_price: number;
          cost_price: number | null;
          unit: string;
          is_custom: boolean;
          is_active: boolean;
          image_url: string | null;
          specifications: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          sku: string;
          name: string;
          description?: string | null;
          category?: string | null;
          unit_price: number;
          cost_price?: number | null;
          unit?: string;
          is_custom?: boolean;
          is_active?: boolean;
          image_url?: string | null;
          specifications?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          sku?: string;
          name?: string;
          description?: string | null;
          category?: string | null;
          unit_price?: number;
          cost_price?: number | null;
          unit?: string;
          is_custom?: boolean;
          is_active?: boolean;
          image_url?: string | null;
          specifications?: Json;
          created_at?: string;
          updated_at?: string;
        };
      };
      quotations: {
        Row: {
          id: string;
          quotation_number: string;
          customer_id: string;
          sales_rep_id: string;
          status: QuotationStatus;
          title: string;
          valid_until: string | null;
          subtotal: number;
          discount_percentage: number;
          discount_amount: number;
          tax_percentage: number;
          tax_amount: number;
          total: number;
          notes: string | null;
          terms_and_conditions: string | null;
          internal_notes: string | null;
          submitted_at: string | null;
          approved_at: string | null;
          finance_approved_at: string | null;
          deal_won_at: string | null;
          pricing_submitted_at: string | null;
          pricing_completed_at: string | null;
          submitted_to_customer_at: string | null;
          version_number: number;
          parent_id: string | null;
          total_cost: number;
          margin_percentage: number;
          currency_code: string;
          exchange_rate: number;
          loss_reason: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          quotation_number: string;
          customer_id: string;
          sales_rep_id: string;
          status?: QuotationStatus;
          title: string;
          valid_until?: string | null;
          subtotal?: number;
          discount_percentage?: number;
          discount_amount?: number;
          tax_percentage?: number;
          tax_amount?: number;
          total?: number;
          notes?: string | null;
          terms_and_conditions?: string | null;
          internal_notes?: string | null;
          submitted_at?: string | null;
          approved_at?: string | null;
          finance_approved_at?: string | null;
          deal_won_at?: string | null;
          version_number?: number;
          parent_id?: string | null;
          total_cost?: number;
          margin_percentage?: number;
          currency_code?: string;
          exchange_rate?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          quotation_number?: string;
          customer_id?: string;
          sales_rep_id?: string;
          status?: QuotationStatus;
          title?: string;
          valid_until?: string | null;
          subtotal?: number;
          discount_percentage?: number;
          discount_amount?: number;
          tax_percentage?: number;
          tax_amount?: number;
          total?: number;
          notes?: string | null;
          terms_and_conditions?: string | null;
          internal_notes?: string | null;
          submitted_at?: string | null;
          approved_at?: string | null;
          finance_approved_at?: string | null;
          deal_won_at?: string | null;
          version_number?: number;
          parent_id?: string | null;
          total_cost?: number;
          margin_percentage?: number;
          currency_code?: string;
          exchange_rate?: number;
          created_at?: string;
          updated_at?: string;
        };
      };
      quotation_items: {
        Row: {
          id: string;
          quotation_id: string;
          product_id: string | null;
          is_custom: boolean;
          custom_description: string | null;
          quantity: number;
          unit_price: number;
          discount_percentage: number;
          discount_amount: number;
          line_total: number;
          unit_cost: number;
          is_optional: boolean;
          custom_item_status: CustomItemStatus | null;
          notes: string | null;
          modifications: string | null;
          sort_order: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          quotation_id: string;
          product_id?: string | null;
          is_custom?: boolean;
          custom_description?: string | null;
          quantity: number;
          unit_price: number;
          discount_percentage?: number;
          discount_amount?: number;
          line_total: number;
          unit_cost?: number;
          is_optional?: boolean;
          custom_item_status?: CustomItemStatus | null;
          notes?: string | null;
          modifications?: string | null;
          sort_order?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          quotation_id?: string;
          product_id?: string | null;
          is_custom?: boolean;
          custom_description?: string | null;
          quantity?: number;
          unit_price?: number;
          discount_percentage?: number;
          discount_amount?: number;
          line_total?: number;
          unit_cost?: number;
          is_optional?: boolean;
          custom_item_status?: CustomItemStatus | null;
          notes?: string | null;
          modifications?: string | null;
          sort_order?: number;
          created_at?: string;
          updated_at?: string;
        };
      };
      custom_item_requests: {
        Row: {
          id: string;
          quotation_item_id: string;
          quotation_id: string;
          requested_by: string;
          description: string;
          specifications: Json;
          attachments: Json;
          status: CustomItemStatus;
          priced_by: string | null;
          priced_at: string | null;
          engineering_price: number | null;
          engineering_notes: string | null;
          engineering_attachments: Json;
          requested_by_date: string | null;
          committed_date: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          quotation_item_id: string;
          quotation_id: string;
          requested_by: string;
          description: string;
          specifications?: Json;
          attachments?: Json;
          status?: CustomItemStatus;
          priced_by?: string | null;
          priced_at?: string | null;
          engineering_price?: number | null;
          engineering_notes?: string | null;
          engineering_attachments?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          quotation_item_id?: string;
          quotation_id?: string;
          requested_by?: string;
          description?: string;
          specifications?: Json;
          attachments?: Json;
          status?: CustomItemStatus;
          priced_by?: string | null;
          priced_at?: string | null;
          engineering_price?: number | null;
          engineering_notes?: string | null;
          engineering_attachments?: Json;
          created_at?: string;
          updated_at?: string;
        };
      };
      quotation_approvals: {
        Row: {
          id: string;
          quotation_id: string;
          approver_id: string;
          approver_role: UserRole;
          action: ApprovalAction;
          comments: string | null;
          previous_status: QuotationStatus | null;
          new_status: QuotationStatus | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          quotation_id: string;
          approver_id: string;
          approver_role: UserRole;
          action: ApprovalAction;
          comments?: string | null;
          previous_status?: QuotationStatus | null;
          new_status?: QuotationStatus | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          quotation_id?: string;
          approver_id?: string;
          approver_role?: UserRole;
          action?: ApprovalAction;
          comments?: string | null;
          previous_status?: QuotationStatus | null;
          new_status?: QuotationStatus | null;
          created_at?: string;
        };
      };
      quotation_comments: {
        Row: {
          id: string;
          quotation_id: string;
          user_id: string;
          comment: string;
          mentions: string[];
          parent_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          quotation_id: string;
          user_id: string;
          comment: string;
          mentions?: string[];
          parent_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          quotation_id?: string;
          user_id?: string;
          comment?: string;
          mentions?: string[];
          parent_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      notifications: {
        Row: {
          id: string;
          user_id: string;
          type: NotificationType;
          title: string;
          message: string;
          link: string | null;
          related_quotation_id: string | null;
          is_read: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          type: NotificationType;
          title: string;
          message: string;
          link?: string | null;
          related_quotation_id?: string | null;
          is_read?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          type?: NotificationType;
          title?: string;
          message?: string;
          link?: string | null;
          related_quotation_id?: string | null;
          is_read?: boolean;
          created_at?: string;
        };
      };
      activity_log: {
        Row: {
          id: string;
          user_id: string | null;
          action: string;
          entity_type: string;
          entity_id: string | null;
          details: Json;
          ip_address: string | null;
          user_agent: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string | null;
          action: string;
          entity_type: string;
          entity_id?: string | null;
          details?: Json;
          ip_address?: string | null;
          user_agent?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string | null;
          action?: string;
          entity_type?: string;
          entity_id?: string | null;
          details?: Json;
          ip_address?: string | null;
          user_agent?: string | null;
          created_at?: string;
        };
      };
      commission_plans: {
        Row: {
          id: string;
          sales_rep_id: string;
          tier_name: string;
          min_amount: number;
          max_amount: number | null;
          commission_percentage: number;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          sales_rep_id: string;
          tier_name: string;
          min_amount: number;
          max_amount?: number | null;
          commission_percentage: number;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          sales_rep_id?: string;
          tier_name?: string;
          min_amount?: number;
          max_amount?: number | null;
          commission_percentage?: number;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      discount_matrix: {
        Row: {
          id: string;
          min_quotation_value: number;
          max_quotation_value: number | null;
          max_discount_percentage: number;
          requires_ceo_approval: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          min_quotation_value: number;
          max_quotation_value?: number | null;
          max_discount_percentage: number;
          requires_ceo_approval?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          min_quotation_value?: number;
          max_quotation_value?: number | null;
          max_discount_percentage?: number;
          requires_ceo_approval?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      system_settings: {
        Row: {
          id: string;
          key: string;
          value: Json;
          description: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          key: string;
          value: Json;
          description?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          key?: string;
          value?: Json;
          description?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      email_logs: {
        Row: {
          id: string;
          recipient: string;
          subject: string;
          body: string;
          type: string;
          quotation_number: string | null;
          sent_at: string;
          status: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          recipient: string;
          subject: string;
          body: string;
          type: string;
          quotation_number?: string | null;
          sent_at?: string;
          status?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          recipient?: string;
          subject?: string;
          body?: string;
          type?: string;
          quotation_number?: string | null;
          sent_at?: string;
          status?: string;
          created_at?: string;
        };
      };
      quotation_attachments: {
        Row: {
          id: string;
          quotation_id: string;
          file_name: string;
          file_path: string;
          file_size: number;
          file_type: string;
          uploaded_by: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          quotation_id: string;
          file_name: string;
          file_path: string;
          file_size?: number;
          file_type: string;
          uploaded_by: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          quotation_id?: string;
          file_name?: string;
          file_path?: string;
          file_size?: number;
          file_type?: string;
          uploaded_by?: string;
          created_at?: string;
        };
      };
      audit_logs: {
        Row: {
          id: string;
          quotation_id: string;
          event_type: string;
          event_description: string;
          performed_by: string | null;
          metadata: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          quotation_id: string;
          event_type: string;
          event_description: string;
          performed_by?: string | null;
          metadata?: Json;
          created_at?: string;
        };
      };
      quotation_versions: {
        Row: {
          id: string;
          quotation_id: string;
          version_number: number;
          snapshot: Json;
          changed_by: string | null;
          change_summary: string | null;
          created_at: string;
        };
      };
      quotation_templates: {
        Row: {
          id: string;
          name: string;
          description: string | null;
          category: string | null;
          is_active: boolean;
          default_title: string | null;
          default_valid_days: number;
          default_discount_percentage: number;
          default_tax_percentage: number;
          default_terms_and_conditions: string | null;
          default_notes: string | null;
          template_items: Json;
          metadata: Json;
          created_by: string | null;
          usage_count: number;
          created_at: string;
          updated_at: string;
        };
      };
      quotation_shares: {
        Row: {
          id: string;
          quotation_id: string;
          share_token: string;
          password_protected: boolean;
          expires_at: string | null;
          view_count: number;
          last_viewed_at: string | null;
          created_by: string | null;
          created_at: string;
        };
      };
      job_orders: {
        Row: {
          id: string;
          job_order_number: string;
          quotation_id: string;
          customer_id: string;
          priority: string;
          status: string;
          due_date: string | null;
          production_notes: string | null;
          is_production_ready: boolean;
          engineering_accepted_at: string | null;
          generated_by: string;
          generated_at: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          job_order_number: string;
          quotation_id: string;
          customer_id: string;
          priority?: string;
          status?: string;
          due_date?: string | null;
          production_notes?: string | null;
          is_production_ready?: boolean;
          engineering_accepted_at?: string | null;
          generated_by: string;
          generated_at?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          job_order_number?: string;
          quotation_id?: string;
          customer_id?: string;
          priority?: string;
          status?: string;
          due_date?: string | null;
          production_notes?: string | null;
          is_production_ready?: boolean;
          engineering_accepted_at?: string | null;
          generated_by?: string;
          generated_at?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      job_order_items: {
        Row: {
          id: string;
          job_order_id: string;
          product_id: string | null;
          description: string;
          quantity: number;
          unit: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          job_order_id: string;
          product_id?: string | null;
          description: string;
          quantity: number;
          unit: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          job_order_id?: string;
          product_id?: string | null;
          description?: string;
          quantity?: number;
          unit?: string;
          created_at?: string;
        };
      };
      customer_quotation_responses: {
        Row: {
          id: string;
          quotation_id: string;
          share_id: string | null;
          customer_name: string;
          customer_email: string;
          customer_title: string | null;
          response_type: string;
          signature_data: string | null;
          comments: string | null;
          responded_at: string;
        };
      };
      follow_up_tasks: {
        Row: {
          id: string;
          quotation_id: string;
          assigned_to: string;
          task_type: string;
          priority: string;
          due_date: string;
          completed: boolean;
          completed_at: string | null;
          completed_by: string | null;
          notes: string | null;
          reminder_sent: boolean;
          created_at: string;
        };
      };
      notification_queue: {
        Row: {
          id: string;
          notification_type: string;
          recipient_id: string | null;
          recipient_email: string;
          subject: string;
          body: string;
          metadata: Json;
          status: string;
          attempts: number;
          last_attempt_at: string | null;
          sent_at: string | null;
          error_message: string | null;
          created_at: string;
        };
      };
      quotation_pricing_comments: {
        Row: {
          id: string;
          quotation_id: string;
          user_id: string;
          comment: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          quotation_id: string;
          user_id: string;
          comment: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          quotation_id?: string;
          user_id?: string;
          comment?: string;
          created_at?: string;
        };
      };
      crm_leads: {
        Row: {
          id: string;
          company_name: string;
          contact_name: string;
          contact_email: string | null;
          contact_phone: string | null;
          position: string | null;
          industry: string | null;
          country: string | null;
          city: string | null;
          address: string | null;
          website: string | null;
          lead_source: string | null;
          lead_status: string | null;
          lead_score: number;
          estimated_value: number | null;
          expected_close_date: string | null;
          assigned_to: string | null;
          notes: string | null;
          created_by: string | null;
          created_at: string;
          updated_at: string;
          converted_to_customer_id: string | null;
          converted_at: string | null;
          lost_reason: string | null;
          last_contact_date: string | null;
          temperature: string | null;
          engagement_score: number;
          demographic_score: number;
          behavioral_score: number;
          last_engagement_date: string | null;
          engagement_count: number;
          lead_grade: string | null;
          lead_source_id: string | null;
          assigned_by_rule_id: string | null;
          mql_date: string | null;
          sql_date: string | null;
          utm_parameters: Json;
          score_calculated_at: string | null;
          assignment_rule_id: string | null;
          assigned_at: string | null;
          owner_id: string | null;
          enrichment_data: Json | null;
          lead_type: string | null;
          contact_person_title: string | null;
          project_details: string | null;
          budget: number | null;
          timeline: string | null;
          company_details: string | null;
          past_projects: string | null;
          partnership_interest: string | null;
          distribution_regions: string | null;
          current_product_lines: string | null;
          target_market: string | null;
          annual_volume_potential: number | null;
          priority: string | null;
        };
        Insert: {
          id?: string;
          company_name: string;
          contact_name: string;
          contact_email?: string | null;
          contact_phone?: string | null;
          position?: string | null;
          industry?: string | null;
          country?: string | null;
          city?: string | null;
          lead_source?: string | null;
          lead_status?: string | null;
          lead_score?: number;
          estimated_value?: number | null;
          expected_close_date?: string | null;
          assigned_to?: string | null;
          notes?: string | null;
          created_by?: string | null;
          lead_type?: string | null;
          priority?: string | null;
          [key: string]: any;
        };
        Update: {
          [key: string]: any;
        };
      };
      crm_opportunities: {
        Row: {
          id: string;
          name: string;
          customer_id: string | null;
          lead_id: string | null;
          stage: string | null;
          amount: number;
          probability: number;
          expected_close_date: string | null;
          actual_close_date: string | null;
          assigned_to: string | null;
          description: string | null;
          next_step: string | null;
          notes: string | null;
          created_by: string | null;
          created_at: string;
          updated_at: string;
          closed_won: boolean;
          won_reason: string | null;
          lost_reason: string | null;
          last_contact_date: string | null;
          competitors: string[] | null;
          our_strength: string | null;
          competitor_strength: string | null;
          deal_source: string | null;
          channel: string | null;
          products_interested: string[] | null;
          weighted_amount: number | null;
          discount_percentage: number;
          final_amount: number | null;
          days_in_stage: number;
          stage_changed_at: string | null;
          total_sales_cycle_days: number;
          budget_confirmed: boolean;
          authority_identified: boolean;
          need_identified: boolean;
          timeline_established: boolean;
          forecast_category: string | null;
          pipeline_id: string | null;
          custom_stage_id: string | null;
          ai_recommendation: string | null;
          risk_level: string | null;
          last_activity_at: string | null;
          health_score: number;
          health_status: string | null;
          is_stalled: boolean;
          stalled_since: string | null;
          velocity_score: number | null;
        };
        Insert: {
          id?: string;
          name: string;
          customer_id?: string | null;
          lead_id?: string | null;
          stage?: string | null;
          amount?: number;
          probability?: number;
          expected_close_date?: string | null;
          assigned_to?: string | null;
          description?: string | null;
          [key: string]: any;
        };
        Update: {
          [key: string]: any;
        };
      };
      crm_activities: {
        Row: {
          id: string;
          activity_type: string;
          subject: string;
          description: string | null;
          lead_id: string | null;
          opportunity_id: string | null;
          customer_id: string | null;
          assigned_to: string | null;
          completed: boolean;
          due_date: string | null;
          completed_at: string | null;
          duration_minutes: number | null;
          outcome: string | null;
          follow_up_required: boolean;
          follow_up_date: string | null;
          created_by: string | null;
          created_at: string;
          updated_at: string;
          priority: string | null;
          status: string | null;
          result: string | null;
          attendees: string[] | null;
          location: string | null;
          meeting_link: string | null;
          actual_duration_minutes: number | null;
          reminder_sent: boolean;
          parent_activity_id: string | null;
          sentiment_score: number | null;
          sentiment_label: string | null;
          sentiment_summary: string | null;
        };
        Insert: {
          id?: string;
          activity_type: string;
          subject: string;
          description?: string | null;
          lead_id?: string | null;
          opportunity_id?: string | null;
          customer_id?: string | null;
          assigned_to?: string | null;
          [key: string]: any;
        };
        Update: {
          [key: string]: any;
        };
      };
      crm_contacts: {
        Row: {
          id: string;
          customer_id: string | null;
          lead_id: string | null;
          first_name: string;
          last_name: string;
          email: string | null;
          phone: string | null;
          mobile: string | null;
          title: string | null;
          department: string | null;
          is_primary: boolean;
          is_decision_maker: boolean;
          linkedin_url: string | null;
          twitter_handle: string | null;
          birth_date: string | null;
          notes: string | null;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          first_name: string;
          last_name: string;
          customer_id?: string | null;
          lead_id?: string | null;
          email?: string | null;
          phone?: string | null;
          [key: string]: any;
        };
        Update: {
          [key: string]: any;
        };
      };
      crm_notes: {
        Row: {
          id: string;
          title: string | null;
          content: string;
          note_type: string | null;
          is_private: boolean;
          lead_id: string | null;
          opportunity_id: string | null;
          customer_id: string | null;
          contact_id: string | null;
          mentioned_users: string[] | null;
          tags: string[] | null;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          content: string;
          [key: string]: any;
        };
        Update: {
          [key: string]: any;
        };
      };
      crm_documents: {
        Row: {
          id: string;
          title: string;
          file_name: string;
          file_path: string;
          file_size_bytes: number | null;
          mime_type: string | null;
          document_type: string | null;
          lead_id: string | null;
          opportunity_id: string | null;
          customer_id: string | null;
          uploaded_by: string | null;
          uploaded_at: string;
          last_accessed_at: string | null;
          access_count: number;
          is_favorite?: boolean;
        };
        Insert: {
          id?: string;
          title: string;
          file_name: string;
          file_path: string;
          [key: string]: any;
        };
        Update: {
          [key: string]: any;
        };
      };
      crm_email_templates: {
        Row: {
          id: string;
          name: string;
          subject: string;
          body: string;
          category: string | null;
          tags: string[] | null;
          is_active: boolean;
          usage_count: number;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          subject: string;
          body: string;
          [key: string]: any;
        };
        Update: {
          [key: string]: any;
        };
      };
      crm_follow_up_tasks: {
        Row: {
          id: string;
          [key: string]: any;
        };
        Insert: {
          [key: string]: any;
        };
        Update: {
          [key: string]: any;
        };
      };
      crm_deal_health_scores: {
        Row: {
          id: string;
          opportunity_id: string | null;
          overall_score: number | null;
          health_status: string | null;
          activity_score: number | null;
          engagement_score: number | null;
          timeline_score: number | null;
          qualification_score: number | null;
          competitor_score: number | null;
          risk_factors: string[] | null;
          warning_signs: string[] | null;
          next_best_actions: Json | null;
          calculated_at: string;
        };
        Insert: {
          id?: string;
          [key: string]: any;
        };
        Update: {
          [key: string]: any;
        };
      };
      crm_deal_insights: {
        Row: {
          id: string;
          opportunity_id: string | null;
          insight_type: string;
          insight_title: string;
          insight_description: string | null;
          priority: string | null;
          action_required: boolean;
          action_description: string | null;
          is_dismissed: boolean;
          dismissed_by: string | null;
          dismissed_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          insight_type: string;
          insight_title: string;
          [key: string]: any;
        };
        Update: {
          [key: string]: any;
        };
      };
      crm_accounts: {
        Row: {
          id: string;
          name: string;
          industry: string | null;
          type: string | null;
          website: string | null;
          phone: string | null;
          address: string | null;
          city: string | null;
          country: string | null;
          annual_revenue: number | null;
          employee_count: number | null;
          domain: string | null;
          parent_account_id: string | null;
          owner_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          [key: string]: any;
        };
        Update: {
          [key: string]: any;
        };
      };
      suppliers: {
        Row: {
          id: string;
          supplier_name: string;
          supplier_code: string | null;
          supplier_type: string | null;
          contact_person: string | null;
          email: string | null;
          phone: string | null;
          mobile: string | null;
          fax: string | null;
          website: string | null;
          address_line1: string | null;
          address_line2: string | null;
          city: string | null;
          state: string | null;
          postal_code: string | null;
          country: string | null;
          tax_number: string | null;
          commercial_registration: string | null;
          bank_name: string | null;
          bank_account_number: string | null;
          iban: string | null;
          swift_code: string | null;
          payment_terms: string | null;
          delivery_terms: string | null;
          minimum_order_value: number | null;
          rating: number | null;
          is_active: boolean;
          is_preferred: boolean;
          product_categories: string[] | null;
          notes: string | null;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          supplier_name: string;
          [key: string]: any;
        };
        Update: {
          [key: string]: any;
        };
      };
      sales_teams: {
        Row: {
          id: string;
          name: string;
          description: string | null;
          manager_id: string;
          supervisor_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          manager_id: string;
          [key: string]: any;
        };
        Update: {
          [key: string]: any;
        };
      };
      team_members: {
        Row: {
          id: string;
          team_id: string;
          sales_rep_id: string;
          added_by: string;
          added_at: string;
        };
        Insert: {
          id?: string;
          team_id: string;
          sales_rep_id: string;
          added_by: string;
          [key: string]: any;
        };
        Update: {
          [key: string]: any;
        };
      };
      purchase_orders: {
        Row: {
          id: string;
          po_number: string;
          quotation_id: string;
          supplier_name: string;
          supplier_contact_person: string | null;
          supplier_email: string | null;
          supplier_phone: string | null;
          supplier_address: string | null;
          po_date: string;
          required_delivery_date: string | null;
          expected_delivery_date: string | null;
          actual_delivery_date: string | null;
          subtotal: number;
          tax_percentage: number | null;
          tax_amount: number | null;
          shipping_cost: number | null;
          total: number;
          payment_terms: string | null;
          payment_status: string | null;
          status: string | null;
          notes: string | null;
          internal_notes: string | null;
          terms_and_conditions: string | null;
          attachments: Json | null;
          created_by: string | null;
          created_at: string;
          updated_at: string;
          sent_at: string | null;
          acknowledged_at: string | null;
          version: number;
          supplier_id: string | null;
        };
        Insert: {
          id?: string;
          po_number: string;
          quotation_id: string;
          supplier_name: string;
          [key: string]: any;
        };
        Update: {
          [key: string]: any;
        };
      };
      purchase_order_items: {
        Row: {
          id: string;
          purchase_order_id: string;
          quotation_item_id: string;
          product_id: string | null;
          description: string;
          specifications: Json | null;
          quantity: number;
          unit_of_measure: string | null;
          quotation_unit_price: number;
          unit_cost: number;
          discount_percentage: number | null;
          line_total: number;
          requested_delivery_date: string | null;
          notes: string | null;
          sort_order: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          purchase_order_id: string;
          quotation_item_id: string;
          description: string;
          quantity: number;
          quotation_unit_price: number;
          unit_cost: number;
          line_total: number;
          [key: string]: any;
        };
        Update: {
          [key: string]: any;
        };
      };
      payment_schedules: {
        Row: {
          id: string;
          quotation_id: string;
          milestone_name: string;
          milestone_description: string | null;
          percentage: number;
          amount: number;
          due_date: string;
          status: string;
          paid_amount: number | null;
          payment_date: string | null;
          notes: string | null;
          created_at: string;
          updated_at: string;
          reminder_sent: boolean;
          last_reminder_date: string | null;
          auto_reminder_enabled: boolean;
          collected_by: string | null;
        };
        Insert: {
          id?: string;
          quotation_id: string;
          milestone_name: string;
          percentage: number;
          amount: number;
          due_date: string;
          [key: string]: any;
        };
        Update: {
          [key: string]: any;
        };
      };
      payments: {
        Row: {
          id: string;
          payment_number: string;
          invoice_id: string | null;
          quotation_id: string | null;
          customer_id: string;
          payment_schedule_id: string | null;
          amount: number;
          payment_date: string;
          payment_method: string;
          reference_number: string | null;
          bank_name: string | null;
          notes: string | null;
          recorded_by: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          payment_number: string;
          customer_id: string;
          amount: number;
          payment_method: string;
          recorded_by: string;
          [key: string]: any;
        };
        Update: {
          [key: string]: any;
        };
      };
      sales_targets: {
        Row: {
          id: string;
          sales_rep_id: string;
          manager_id: string;
          period_type: string;
          period_start: string;
          period_end: string;
          target_amount: number;
          status: string;
          approved_by: string | null;
          approved_at: string | null;
          rejection_reason: string | null;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          sales_rep_id: string;
          manager_id: string;
          period_type: string;
          period_start: string;
          period_end: string;
          target_amount: number;
          [key: string]: any;
        };
        Update: {
          [key: string]: any;
        };
      };
      commission_tiers: {
        Row: {
          id: string;
          role: string;
          min_achievement: number;
          max_achievement: number;
          commission_rate: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          role: string;
          min_achievement: number;
          max_achievement: number;
          commission_rate: number;
          [key: string]: any;
        };
        Update: {
          [key: string]: any;
        };
      };
      collection_activities: {
        Row: {
          id: string;
          customer_id: string | null;
          payment_schedule_id: string | null;
          invoice_id: string | null;
          activity_type: string;
          activity_date: string;
          performed_by: string | null;
          contact_person: string | null;
          outcome: string | null;
          amount_discussed: number | null;
          amount_collected: number | null;
          promise_date: string | null;
          next_action: string | null;
          next_action_date: string | null;
          priority: string | null;
          notes: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          activity_type: string;
          notes: string;
          [key: string]: any;
        };
        Update: {
          [key: string]: any;
        };
      };
      project_timeline_events: {
        Row: {
          id: string;
          job_order_id: string;
          event_type: string;
          description: string;
          triggered_by: string | null;
          event_data: Json | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          job_order_id: string;
          event_type: string;
          description: string;
          [key: string]: any;
        };
        Update: {
          [key: string]: any;
        };
      };
      [key: string]: {
        Row: { [key: string]: any };
        Insert?: { [key: string]: any };
        Update?: { [key: string]: any };
      };
    };
    Views: {
      [key: string]: {
        Row: { [key: string]: any };
      };
    };
    Functions: {
      amend_quotation: {
        Args: {
          p_quotation_id: string;
          p_user_id: string;
        };
        Returns: string;
      };
      create_job_order_from_quotation: {
        Args: {
          p_quotation_id: string;
          p_priority: string;
          p_due_date: string | null;
          p_production_notes: string | null;
        };
        Returns: string;
      };
      convert_lead_to_customer: {
        Args: {
          p_lead_id: string;
        };
        Returns: Json;
      };
      get_profit_analytics: {
        Args: {
          p_start_date: string;
          p_end_date: string;
        };
        Returns: Json;
      };
      create_overdue_reminders: {
        Args: Record<string, never>;
        Returns: void;
      };
      generate_smart_reminders: {
        Args: Record<string, never>;
        Returns: void;
      };
      [key: string]: {
        Args: { [key: string]: any };
        Returns: any;
      };
    };
    Enums: {
      user_role: UserRole;
      quotation_status: QuotationStatus;
      approval_action: ApprovalAction;
      custom_item_status: CustomItemStatus;
      notification_type: NotificationType;
      [key: string]: any;
    };
  };
}
