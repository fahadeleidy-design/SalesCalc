# Database Summary - Sales Quotation System

Quick reference for all database tables, configurations, and settings.

---

## Database Tables (15 Total)

### 1. **profiles**
**Purpose:** User accounts extending Supabase auth.users

**Key Columns:**
- `id` - Primary key
- `user_id` - Links to auth.users (unique)
- `email` - User email
- `full_name` - Display name
- `role` - User role (enum: sales, engineering, manager, ceo, finance, admin)
- `department` - Department name
- `sales_target` - Sales target amount
- `notifications_enabled` - Enable/disable notifications

**RLS:** Users can view all profiles, update own profile. Admins can manage all.

---

### 2. **customers**
**Purpose:** Customer/client records

**Key Columns:**
- `id` - Primary key
- `company_name` - Company name
- `contact_person` - Primary contact
- `email` - Contact email
- `phone` - Contact phone
- `address`, `city`, `country` - Address details
- `assigned_sales_rep` - Links to profiles
- `created_by` - Who created the record

**RLS:** Users can view their assigned customers. Managers+ can view all.

---

### 3. **products**
**Purpose:** Product catalog with pricing

**Key Columns:**
- `id` - Primary key
- `sku` - Stock keeping unit (unique)
- `name` - Product name
- `description` - Product description
- `category` - Product category
- `unit_price` - Selling price
- `cost_price` - Cost price
- `unit` - Unit of measure (unit, set, etc.)
- `is_custom` - Custom item flag
- `is_active` - Active status
- `specifications` - JSON specs

**RLS:** All authenticated users can view active products. Admins can manage.

---

### 4. **quotations**
**Purpose:** Main quotation records

**Key Columns:**
- `id` - Primary key
- `quotation_number` - Unique quotation number
- `customer_id` - Links to customers
- `sales_rep_id` - Links to profiles (sales rep)
- `status` - Quotation status (enum: draft, pending_manager, etc.)
- `title` - Quotation title
- `valid_until` - Validity date
- `subtotal`, `discount_percentage`, `discount_amount` - Pricing
- `tax_percentage`, `tax_amount` - Tax calculations
- `total` - Final total
- `notes`, `terms_and_conditions`, `internal_notes` - Text fields
- `submitted_at`, `approved_at`, `deal_won_at` - Timestamps

**RLS:** Sales reps see own quotations. Managers+ see all.

---

### 5. **quotation_items**
**Purpose:** Line items in quotations

**Key Columns:**
- `id` - Primary key
- `quotation_id` - Links to quotations
- `product_id` - Links to products (null for custom items)
- `is_custom` - Custom item flag
- `custom_description` - Description for custom items
- `quantity` - Item quantity
- `unit_price` - Price per unit
- `discount_percentage`, `discount_amount` - Line discounts
- `line_total` - Line total amount
- `custom_item_status` - Status for custom items
- `sort_order` - Display order

**RLS:** Follow parent quotation permissions.

---

### 6. **custom_item_requests**
**Purpose:** Custom item pricing requests to engineering

**Key Columns:**
- `id` - Primary key
- `quotation_item_id` - Links to quotation_items (unique)
- `quotation_id` - Links to quotations
- `requested_by` - Links to profiles (sales rep)
- `description` - Item description
- `specifications` - JSON specifications
- `attachments` - JSON file attachments
- `status` - Request status (enum: pending, priced, cancelled)
- `priced_by` - Links to profiles (engineer)
- `priced_at` - When priced
- `engineering_price` - Price from engineering
- `engineering_notes` - Engineering notes
- `engineering_attachments` - Engineering files

**RLS:** Requester and engineering can view. Engineering can update.

---

### 7. **quotation_approvals**
**Purpose:** Approval workflow history

**Key Columns:**
- `id` - Primary key
- `quotation_id` - Links to quotations
- `approver_id` - Links to profiles
- `approver_role` - Role that approved
- `action` - Approval action (enum: approved, rejected, changes_requested)
- `comments` - Approver comments
- `previous_status`, `new_status` - Status changes
- `created_at` - When approved

**RLS:** Related users can view. Approvers can create.

---

### 8. **quotation_comments**
**Purpose:** Internal comments and discussions

**Key Columns:**
- `id` - Primary key
- `quotation_id` - Links to quotations
- `user_id` - Links to profiles (commenter)
- `comment` - Comment text
- `mentions` - Array of user IDs mentioned
- `parent_id` - For threaded comments

**RLS:** Related users can view and comment.

---

### 9. **notifications**
**Purpose:** In-app notification system

**Key Columns:**
- `id` - Primary key
- `user_id` - Links to profiles (recipient)
- `type` - Notification type (enum: quotation_submitted, etc.)
- `title` - Notification title
- `message` - Notification message
- `link` - Link to related page
- `related_quotation_id` - Links to quotations
- `is_read` - Read status

**RLS:** Users can view and update own notifications only.

---

### 10. **activity_log**
**Purpose:** Complete audit trail

**Key Columns:**
- `id` - Primary key
- `user_id` - Who performed the action
- `action` - Action type
- `entity_type` - Type of entity (quotation, customer, etc.)
- `entity_id` - ID of entity
- `details` - JSON details
- `ip_address`, `user_agent` - Request info

**RLS:** Admins can view all. System can insert.

---

### 11. **commission_plans**
**Purpose:** Sales commission configuration

**Key Columns:**
- `id` - Primary key
- `sales_rep_id` - Links to profiles
- `tier_name` - Commission tier name
- `min_amount`, `max_amount` - Value range
- `commission_percentage` - Commission rate
- `is_active` - Active status

**RLS:** Sales reps view own. Managers+ view all. Admins manage.

---

### 12. **discount_matrix**
**Purpose:** Approval threshold configuration

**Key Columns:**
- `id` - Primary key
- `min_quotation_value`, `max_quotation_value` - Value range
- `max_discount_percentage` - Max discount allowed
- `requires_ceo_approval` - CEO approval flag

**Default Rules:**
- $0-$10k: Max 10% discount, no CEO approval
- $10k-$50k: Max 15% discount, no CEO approval
- $50k-$100k: Max 20% discount, requires CEO
- $100k+: Max 25% discount, requires CEO

**RLS:** All authenticated users can view. Admins can manage.

---

### 13. **system_settings**
**Purpose:** Global application configuration

**Key Columns:**
- `id` - Primary key
- `key` - Setting key (unique)
- `value` - JSON value
- `description` - Setting description

**Default Settings:**
1. `company_info` - Company details
2. `tax_settings` - Tax configuration
3. `terms_and_conditions` - Default terms
4. `quotation_settings` - Quotation config
5. `email_settings` - Email templates

**RLS:** All users can view. Admins can manage.

---

### 14. **email_logs**
**Purpose:** Email notification tracking

**Key Columns:**
- `id` - Primary key
- `recipient` - Email recipient
- `subject` - Email subject
- `body` - Email body
- `type` - Email type
- `quotation_number` - Related quotation
- `sent_at` - When sent
- `status` - Send status

**RLS:** Admins can view.

---

### 15. **quotation_attachments**
**Purpose:** File attachments for quotations

**Key Columns:**
- `id` - Primary key
- `quotation_id` - Links to quotations
- `file_name` - Original filename
- `file_path` - Storage path
- `file_size` - File size in bytes
- `file_type` - MIME type
- `uploaded_by` - Links to profiles

**RLS:** Users with quotation access can view/upload.

---

## Enum Types

### user_role
- `sales` - Sales representatives
- `engineering` - Engineering team
- `manager` - Sales managers
- `ceo` - CEO/Executive
- `finance` - Finance team
- `admin` - System administrators

### quotation_status
- `draft` - Being created
- `pending_manager` - Awaiting manager approval
- `pending_ceo` - Awaiting CEO approval
- `approved` - Approved by management
- `pending_finance` - Awaiting finance approval
- `finance_approved` - Approved by finance
- `changes_requested` - Changes requested
- `rejected` - Rejected
- `rejected_by_finance` - Rejected by finance
- `deal_won` - Deal won/closed

### approval_action
- `approved` - Approved
- `rejected` - Rejected
- `changes_requested` - Changes requested

### custom_item_status
- `pending` - Awaiting pricing
- `priced` - Priced by engineering
- `cancelled` - Cancelled

### notification_type
- `quotation_submitted` - Quotation submitted
- `quotation_approved` - Quotation approved
- `quotation_rejected` - Quotation rejected
- `changes_requested` - Changes requested
- `custom_item_priced` - Custom item priced
- `comment_mention` - User mentioned
- `deal_won` - Deal won

---

## Indexes (Performance)

### Primary Indexes
- All tables have primary key indexes on `id`

### Foreign Key Indexes
- All foreign key columns automatically indexed

### Custom Indexes
- `profiles`: user_id, role
- `customers`: assigned_sales_rep
- `products`: sku, category
- `quotations`: status, sales_rep_id, customer_id
- `quotation_items`: quotation_id
- `custom_item_requests`: status
- `quotation_approvals`: quotation_id
- `quotation_comments`: quotation_id
- `notifications`: user_id + is_read (composite)
- `activity_log`: user_id, created_at

---

## Row Level Security (RLS)

**All tables have RLS enabled.**

### General Principles
1. **Default Deny** - No access unless explicitly granted
2. **Role-Based** - Permissions based on user role
3. **Data Isolation** - Sales reps see only their data
4. **Hierarchical** - Managers see subordinates' data
5. **Audit Trail** - All actions logged

### Permission Matrix

| Table | Sales | Engineering | Manager | CEO | Finance | Admin |
|-------|-------|-------------|---------|-----|---------|-------|
| profiles | View All, Edit Own | View All, Edit Own | View All, Edit Own | View All, Edit Own | View All, Edit Own | Full |
| customers | View Assigned, Edit Own | View Own | View All | View All | View All | Full |
| products | View Active | View Active | View All | View All | View All | Full |
| quotations | View Own, Edit Own Draft | View All | View All, Edit | View All, Edit | View All, Edit | Full |
| quotation_items | Follow Quotation | Follow Quotation | Follow Quotation | Follow Quotation | Follow Quotation | Full |
| custom_item_requests | Create Own, View Own | View All, Edit | View Related | View Related | View Related | Full |
| quotation_approvals | View Related | View Related | View Related, Create | View Related, Create | View Related, Create | Full |
| quotation_comments | View Related, Create | View Related, Create | View Related, Create | View Related, Create | View Related, Create | Full |
| notifications | View Own, Edit Own | View Own, Edit Own | View Own, Edit Own | View Own, Edit Own | View Own, Edit Own | View Own |
| activity_log | None | None | None | None | None | View All |
| commission_plans | View Own | None | View All | View All | View All | Full |
| discount_matrix | View All | View All | View All | View All | View All | Full |
| system_settings | View All | View All | View All | View All | View All | Full |
| email_logs | None | None | None | None | None | View All |
| quotation_attachments | Follow Quotation | Follow Quotation | Follow Quotation | Follow Quotation | Follow Quotation | Full |

---

## Critical Configuration

### MUST BE CONFIGURED

1. **Disable Email Confirmation**
   - Path: Authentication → Providers → Email
   - Setting: "Confirm email" must be DISABLED
   - Impact: Users cannot login if enabled

2. **Environment Variables**
   ```bash
   VITE_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
   VITE_SUPABASE_ANON_KEY=your_anon_key_here
   ```

3. **First Admin User**
   - Must be created manually via SQL
   - See: `production_setup.sql`

---

## Files Reference

1. **PRODUCTION_DATABASE_SETUP.md** - Complete setup guide
2. **production_setup.sql** - Automated setup script
3. **PRODUCTION_CHECKLIST.md** - Deployment checklist
4. **DATABASE_SUMMARY.md** - This file

---

**Last Updated:** 2025-11-04
**Schema Version:** 1.0.0
**Total Tables:** 15
**Total Enums:** 5
**Total Indexes:** 20+
