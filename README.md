# 🏢 Special Offices - Quotation Management System

A comprehensive, production-ready quotation and approval management system built with React, TypeScript, Vite, and Supabase.

---

## ✨ Features

### 🎯 Core Functionality
- ✅ **Multi-Role System** - 6 user roles (Sales, Engineering, Manager, CEO, Finance, Admin)
- ✅ **Quotation Management** - Create, edit, and track quotations
- ✅ **Approval Workflow** - Multi-level approval based on discount thresholds
- ✅ **Custom Item Pricing** - Request engineering quotes for non-catalog items
- ✅ **Commission Tracking** - Automatic commission calculations
- ✅ **Notifications** - Real-time notifications for important events

### 📊 Advanced Features
- ✅ **Reports & Analytics** - Comprehensive business insights
- ✅ **Email Notifications** - Automated email alerts via Edge Functions
- ✅ **User Management** - Full CRUD operations for admin users
- ✅ **Document Management** - File attachments and PDF export
- ✅ **Global Search** - Search across quotations, customers, and products (⌘K)
- ✅ **Excel Integration** - Import/Export products via CSV

### 🎨 Design & UX
- ✅ **Beautiful UI** - Professional, modern design
- ✅ **Responsive** - Works on desktop, tablet, and mobile
- ✅ **Dark Mode Ready** - Professional color scheme
- ✅ **Keyboard Shortcuts** - Power user features
- ✅ **Loading States** - Smooth user experience

### 🔒 Security
- ✅ **Row Level Security (RLS)** - Database-level access control
- ✅ **Role-Based Access** - Users only see what they should
- ✅ **Audit Trail** - Complete activity logging
- ✅ **Secure Authentication** - Powered by Supabase Auth

---

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ installed
- Supabase account
- Git installed

### Installation

```bash
# Clone the repository
git clone <your-repo-url>
cd project

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your Supabase credentials

# Run database migrations
# (Apply all migrations in supabase/migrations/ via Supabase dashboard)

# Start development server
npm run dev
```

Visit `http://localhost:5173`

### First-Time Setup

1. **Create Demo Users** - Use the built-in account creator on the login page
2. **Import Products** - Upload CSV or add manually via Products page
3. **Configure Settings** - Set up discount matrix and system parameters
4. **Start Using!** - Login and create your first quotation

📖 **Detailed Setup:** See [QUICK_START.md](./QUICK_START.md)

---

## 📦 Tech Stack

### Frontend
- **React 18** - UI library
- **TypeScript** - Type safety
- **Vite** - Build tool
- **Tailwind CSS** - Styling
- **Lucide React** - Icons

### Backend
- **Supabase** - Database, Auth, and Edge Functions
- **PostgreSQL** - Database
- **Row Level Security** - Data access control

### Features
- **Edge Functions** - Serverless functions for emails
- **Real-time** - Live updates across users
- **Storage** - File attachments

---

## 📁 Project Structure

```
project/
├── src/
│   ├── components/          # Reusable UI components
│   │   ├── AttachmentsPanel.tsx
│   │   ├── GlobalSearch.tsx
│   │   ├── Layout.tsx
│   │   └── quotations/      # Quotation-specific components
│   ├── contexts/            # React contexts (Auth, Navigation)
│   ├── lib/                 # Utilities and services
│   │   ├── supabase.ts     # Supabase client
│   │   ├── emailService.ts # Email utilities
│   │   └── pdfExport.ts    # PDF generation
│   ├── pages/              # Page components
│   │   ├── Login.tsx
│   │   ├── SalesDashboard.tsx
│   │   ├── QuotationsPage.tsx
│   │   ├── ReportsPage.tsx
│   │   └── ... (16 pages total)
│   └── main.tsx            # App entry point
├── supabase/
│   ├── migrations/         # Database migrations (13 files)
│   └── functions/          # Edge Functions
│       └── send-notification-email/
├── public/                 # Static assets
├── .env                    # Environment variables (not in git)
└── package.json
```

---

## 🗄️ Database Schema

### Core Tables (13)
1. **profiles** - User profiles and roles
2. **customers** - Customer information
3. **products** - Product catalog
4. **quotations** - Quotation headers
5. **quotation_items** - Line items
6. **custom_item_requests** - Engineering pricing requests
7. **quotation_approvals** - Approval records
8. **quotation_comments** - Comments and feedback
9. **notifications** - User notifications
10. **discount_matrix** - Approval thresholds
11. **activity_log** - Audit trail
12. **email_logs** - Email notification history
13. **quotation_attachments** - File attachments

All tables have Row Level Security (RLS) enabled!

---

## 👥 User Roles

### 1. Sales Representative
- Create and manage quotations
- Add products and custom items
- Submit for approval
- Track commissions

### 2. Engineering
- Price custom items
- Add technical specifications
- Support sales team

### 3. Manager
- Approve quotations (0-20% discount)
- Monitor team performance
- Review reports

### 4. CEO
- Approve high-value deals (>20% discount)
- View executive dashboard
- Strategic oversight

### 5. Finance
- Financial approval
- Revenue tracking
- Commission oversight

### 6. Admin
- User management
- Product catalog management
- System configuration
- Full access

---

## 🌐 Deployment

### Quick Deploy to Netlify (5 minutes)

```bash
# 1. Build
npm run build

# 2. Push to GitHub
git push

# 3. Connect Netlify to your GitHub repo
# 4. Add environment variables
# 5. Deploy!
```

### Environment Variables Required

```bash
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

📖 **Full Deployment Guide:** See [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md)
✅ **Quick Checklist:** See [PRODUCTION_CHECKLIST.md](./PRODUCTION_CHECKLIST.md)

---

## 📊 Key Features by Role

### Admin Features
- ✅ Create and manage users with passwords
- ✅ Import products via CSV (bulk upload)
- ✅ Export products to CSV
- ✅ Configure discount matrix
- ✅ View audit logs
- ✅ System settings

### Sales Features
- ✅ Create quotations
- ✅ Add products from catalog
- ✅ Request custom item pricing
- ✅ Submit for approval
- ✅ Track commissions
- ✅ Upload attachments

### Manager Features
- ✅ Review pending quotations
- ✅ Approve/Reject/Request changes
- ✅ View team performance
- ✅ Access reports and analytics
- ✅ Monitor conversion rates

### Analytics & Reports
- ✅ Total revenue tracking
- ✅ Conversion rate analysis
- ✅ Sales rep performance
- ✅ Top products by revenue
- ✅ Monthly revenue trends
- ✅ Status distribution

---

## 🔍 Advanced Features

### Global Search (⌘K)
Search across:
- Quotations
- Customers
- Products

Press `Cmd+K` (Mac) or `Ctrl+K` (Windows) anywhere in the app!

### Email Notifications
Automatic emails sent for:
- Quotation approved
- Quotation rejected
- Changes requested
- Custom item priced
- Deal won

### PDF Export
Export quotations as professional PDFs with:
- Company branding
- Customer details
- Itemized line items
- Discount and tax breakdown
- Terms and conditions

### File Attachments
Upload files to quotations:
- PDF documents
- Images
- Excel files
- Word documents
- Max 5MB per file

---

## 🧪 Testing

```bash
# Run type checking
npm run typecheck

# Build for production
npm run build

# Preview production build
npm run preview
```

---

## 📈 Performance

### Bundle Size
- CSS: ~25 KB (gzipped: 5 KB)
- JS: ~448 KB (gzipped: 112 KB)

### Features
- ✅ Code splitting
- ✅ Lazy loading
- ✅ Optimized images
- ✅ Minimal dependencies
- ✅ Fast page loads

---

## 🔐 Security Best Practices

✅ Row Level Security on all tables
✅ Server-side validation
✅ JWT authentication
✅ HTTPS only
✅ XSS protection
✅ CSRF protection
✅ API key rotation support
✅ Audit logging

---

## 🛠️ Development

### Available Scripts

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run preview      # Preview production build
npm run lint         # Run ESLint
npm run typecheck    # Check TypeScript types
```

### Adding a New Page

1. Create component in `src/pages/`
2. Add route in `src/App.tsx`
3. Add navigation item in `src/components/Layout.tsx`
4. Add to user role permissions

### Adding a New Database Table

1. Create migration in `supabase/migrations/`
2. Add RLS policies
3. Update TypeScript types
4. Create CRUD operations

---

## 📚 Documentation

- [QUICK_START.md](./QUICK_START.md) - Get started in 5 minutes
- [SETUP.md](./SETUP.md) - Detailed setup instructions
- [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md) - Production deployment
- [PRODUCTION_CHECKLIST.md](./PRODUCTION_CHECKLIST.md) - Pre-launch checklist

---

## 🤝 Contributing

This is a production application. For changes:

1. Create a feature branch
2. Test thoroughly
3. Update documentation
4. Submit for review

---

## 📄 License

Proprietary - All rights reserved

---

## 🆘 Support

### Documentation
- Check the documentation files in this repository
- Review Supabase dashboard for database issues
- Check browser console for frontend errors

### Common Issues

**Can't login?**
- Verify environment variables are set
- Check Supabase project is active
- Ensure user exists in database

**Features not working?**
- Check browser console for errors
- Verify database migrations applied
- Check RLS policies are correct

**Need help deploying?**
- See [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md)
- Check hosting provider documentation
- Verify environment variables in hosting dashboard

---

## 🎯 Roadmap

### Completed ✅
- [x] Phase 1-10: Core quotation workflow
- [x] Phase 11: Reports & Analytics
- [x] Phase 12: Email Notifications
- [x] Phase 13: User Management
- [x] Phase 14: Document Management
- [x] Phase 15: Global Search
- [x] Admin Enhancements (User creation, Excel import/export)

### Future Enhancements
- [ ] Mobile app (React Native)
- [ ] Advanced reporting with charts
- [ ] Integration with accounting software
- [ ] Multi-language support
- [ ] Customer portal
- [ ] API for external integrations

---

## 📞 Contact

For questions or support, contact your system administrator.

---

## 🏆 Credits

Built with:
- React + TypeScript + Vite
- Supabase (Database + Auth + Edge Functions)
- Tailwind CSS (Styling)
- Lucide React (Icons)

---

## 🎉 Thank You!

Thank you for using Special Offices Quotation Management System!

**Current Version:** 1.0.0
**Last Updated:** 2025-11-03
**Status:** Production Ready ✅

---

**Ready to deploy?** See [PRODUCTION_CHECKLIST.md](./PRODUCTION_CHECKLIST.md) to get started!
