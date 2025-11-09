export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type UserRole = 'sales' | 'engineering' | 'manager' | 'ceo' | 'finance' | 'admin';

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
          version_number: number;
          parent_version_id: string | null;
          created_at: string;
          updated_at: string;
          quotation_items?: {
            id: string;
            product_id: string | null;
            is_custom: boolean;
            custom_description: string | null;
            quantity: number;
            unit_price: number;
            discount_percentage: number;
            discount_amount: number;
            line_total: number;
            custom_item_status: CustomItemStatus | null;
            notes: string | null;
          }[];
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
    };
    Views: {};
    Functions: {};
    Enums: {
      user_role: UserRole;
      quotation_status: QuotationStatus;
      approval_action: ApprovalAction;
      custom_item_status: CustomItemStatus;
      notification_type: NotificationType;
    };
  };
}
