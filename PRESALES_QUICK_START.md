# Presales Role - Quick Start Guide

## Overview

This guide provides a quick reference for implementing the Presales role in your system.

## What is the Presales Role?

Presales Engineers are technical consultants who:
- Qualify opportunities before formal quotations
- Design technical solutions
- Conduct customer demos and presentations
- Provide technical assessments
- Support the sales team with expertise
- Ensure smooth handoff to engineering

## Key Benefits

1. **Better Qualified Deals**: Technical validation before quotation reduces rejection rates
2. **Larger Deal Sizes**: Professional solution design increases average deal value
3. **Faster Sales Cycle**: Pre-qualified opportunities move through pipeline more quickly
4. **Higher Win Rates**: Technical credibility improves close rates
5. **Reduced Rework**: Early technical involvement minimizes changes later

## Core Features

### 1. Opportunity Management
Track potential deals before they become formal quotations:
- Create and manage opportunities
- Track stage progress (Lead → Discovery → Design → Ready for Quote)
- Link to customers and sales representatives
- Set priority and expected value
- Document customer requirements

### 2. Technical Assessment
Evaluate feasibility and complexity:
- Document technical requirements
- Identify risks and challenges
- Estimate effort and resources
- Provide recommendations
- Assess implementation complexity

### 3. Solution Design
Create detailed solution architectures:
- Design technical solutions
- Select components from product catalog
- Build bill of materials (BOM)
- Estimate costs and pricing
- Document architecture and specifications
- Maintain version history

### 4. Customer Engagement
Log all presales activities:
- Meeting notes
- Demo sessions
- Presentations
- Technical calls
- Site visits
- Follow-up actions

### 5. Competitive Analysis
Understand the competitive landscape:
- Identify competitors
- Compare solutions and pricing
- Document strengths/weaknesses
- Develop differentiation strategy
- Estimate win probability

### 6. Quotation Handoff
Convert opportunities to formal quotations:
- One-click conversion
- Auto-populate quotation from solution design
- Attach all technical documentation
- Notify sales representative
- Track conversion metrics

## Workflow

```
1. Lead Identified
   ↓
2. Presales Assigned → Create Opportunity
   ↓
3. Customer Discovery → Log Activities
   ↓
4. Technical Assessment → Document Requirements & Risks
   ↓
5. Solution Design → Build Architecture & BOM
   ↓
6. Customer Presentation → Demo & Proposal
   ↓
7. Opportunity Qualified → Mark "Ready for Quotation"
   ↓
8. Convert to Quotation → Handoff to Sales
   ↓
9. Sales Proceeds → Normal Approval Workflow
   ↓
10. Win/Loss → Track Outcomes
```

## Implementation Timeline

### Phase 1: Foundation (Weeks 1-2)
- Database schema and role setup
- Basic opportunity management
- Activity logging
- Simple dashboard

### Phase 2: Assessment Tools (Weeks 3-4)
- Technical assessment module
- Competitive analysis
- Document management
- Basic reporting

### Phase 3: Solution Design (Weeks 5-6)
- Solution design workspace
- Component library
- BOM generation
- Quotation conversion

### Phase 4: Advanced Features (Weeks 7-8)
- Advanced analytics
- Collaboration tools
- Mobile optimization
- Performance tuning

## Database Tables

**New Tables**:
1. `opportunities` - Core opportunity tracking
2. `technical_assessments` - Technical evaluations
3. `solution_designs` - Solution architectures
4. `solution_components` - Design components/products
5. `presales_activities` - Customer interactions
6. `competitive_analyses` - Competitive intelligence
7. `opportunity_documents` - Technical docs and diagrams
8. `presales_targets` - Performance targets

**Modified Tables**:
1. `profiles` - Add 'presales' role
2. `quotations` - Link to opportunities and presales engineer
3. `commission_plans` - Extend for presales commissions

## User Permissions

### Presales Can:
- Create and edit opportunities
- Log customer activities
- Create technical assessments
- Design solutions
- View all products
- View all customers
- Convert opportunities to quotations
- Upload technical documents
- Create competitive analyses

### Presales Cannot:
- Approve quotations (except their own discount limits)
- Modify product pricing
- Access financial details beyond deal values
- Delete other users' data
- Access admin functions

### Other Roles Can:
- **Sales**: View opportunities assigned to them, collaborate with presales
- **Managers**: View all presales activities, approve designs, assign resources
- **Engineering**: Review technical assessments, provide feedback
- **CEO/Finance**: Monitor pipeline value and presales impact

## Key Metrics to Track

### Activity Metrics
- Opportunities created
- Technical assessments completed
- Solution designs created
- Customer demos conducted
- Meetings logged

### Conversion Metrics
- Opportunity → Quotation conversion rate
- Quotation → Win rate for presales-supported deals
- Average time in each stage
- Pipeline velocity

### Business Impact
- Pipeline value by presales engineer
- Average deal size comparison (with vs without presales)
- Win rate improvement
- Revenue influenced by presales
- Margin impact

## Getting Started

### For Administrators:

1. **Run Database Migration**
   ```bash
   # Apply migration to add presales role and tables
   supabase db push
   ```

2. **Create Presales Users**
   ```sql
   -- In Supabase SQL editor or via Admin UI
   SELECT create_profile_for_user(
     'user-uuid',
     'presales@company.com',
     'Jane Presales',
     'presales'::user_role
   );
   ```

3. **Configure Permissions**
   - Verify RLS policies are active
   - Test presales user access
   - Configure commission structure (if applicable)

4. **Set Up Integrations**
   - Configure document storage
   - Set up notifications
   - Enable email integration (optional)

### For Presales Users:

1. **Log In**
   - Use your credentials
   - You'll see the Presales Dashboard

2. **Create Your First Opportunity**
   - Click "New Opportunity"
   - Link to existing customer or create new
   - Set expected value and priority
   - Assign to yourself

3. **Log Customer Interaction**
   - Open the opportunity
   - Click "Log Activity"
   - Record meeting notes, demos, calls

4. **Create Technical Assessment**
   - Document requirements
   - Identify risks
   - Assess feasibility
   - Provide recommendations

5. **Design Solution**
   - Create solution design
   - Add components from product catalog
   - Document architecture
   - Generate BOM

6. **Convert to Quotation**
   - When ready, click "Convert to Quotation"
   - Review auto-populated data
   - Submit to sales representative

## Best Practices

### Opportunity Management
- Update stage regularly
- Log all customer interactions
- Document decision makers
- Keep expected close date current
- Set realistic priorities

### Technical Assessment
- Be thorough and honest about feasibility
- Identify all risks early
- Provide clear recommendations
- Get engineering input when needed
- Document assumptions

### Solution Design
- Start with customer requirements
- Consider scalability and maintenance
- Document all design decisions
- Provide alternative options
- Include implementation notes

### Customer Engagement
- Prepare thoroughly for demos
- Follow up promptly after meetings
- Document all commitments
- Track action items
- Build technical relationships

### Collaboration
- Keep sales team informed
- Share insights with engineering
- Escalate issues to managers
- Document competitive intelligence
- Transfer knowledge at handoff

## Common Scenarios

### Scenario 1: New Inbound Lead
1. Presales receives lead from sales/marketing
2. Create opportunity in system
3. Schedule discovery call
4. Log call notes and requirements
5. Create preliminary assessment
6. If qualified, proceed to solution design
7. If not qualified, update status and provide feedback

### Scenario 2: Complex Technical Deal
1. Sales requests presales support
2. Presales assigned to existing opportunity
3. Conduct detailed technical discovery
4. Create comprehensive assessment with risks
5. Design solution with multiple options
6. Present to customer with demos
7. Refine design based on feedback
8. Create formal proposal
9. Convert to quotation when approved

### Scenario 3: Competitive Situation
1. Identify competitors in opportunity
2. Create competitive analysis
3. Document competitor strengths/weaknesses
4. Develop differentiation strategy
5. Prepare battle card for sales team
6. Conduct competitive demo
7. Address objections proactively
8. Track win/loss with competitive notes

## Training Resources

### Documentation
- Full BRD: `PRESALES_ROLE_BRD.md`
- Implementation Plan: `PRESALES_IMPLEMENTATION_PLAN.md`
- User Manual: (To be created post-implementation)

### Video Tutorials (Planned)
1. Presales Dashboard Overview (5 min)
2. Creating and Managing Opportunities (8 min)
3. Conducting Technical Assessments (10 min)
4. Building Solution Designs (12 min)
5. Converting to Quotations (6 min)

### Support
- In-app help documentation
- FAQ section
- Support email: support@company.com
- Training sessions: Weekly office hours

## Troubleshooting

### Issue: Cannot create opportunity
**Solution**: Verify presales role is assigned to your profile

### Issue: Cannot see certain customers
**Solution**: Customers are visible based on role permissions. Contact admin if needed.

### Issue: Cannot convert opportunity to quotation
**Solution**: Ensure opportunity status is "Ready for Quotation" and all required fields completed

### Issue: Documents not uploading
**Solution**: Check file size limits and format. Verify storage permissions.

### Issue: Dashboard not loading data
**Solution**: Refresh browser. Clear cache. Contact support if persists.

## FAQ

**Q: Can presales users approve quotations?**
A: No, presales users follow the same approval workflow as sales reps.

**Q: Can multiple presales engineers work on one opportunity?**
A: One primary presales engineer is assigned, but collaboration is possible through comments and shared access.

**Q: What happens to opportunities when converted to quotations?**
A: Opportunities are marked as "Converted" and maintain a link to the quotation. All documentation is preserved.

**Q: Can presales see commission information?**
A: Presales can see commission structure but not detailed financial breakdowns.

**Q: How are presales engineers measured?**
A: Key metrics include conversion rate, pipeline value, activity volume, and win rate of supported deals.

**Q: Can opportunities be linked to CRM leads?**
A: Yes, opportunities can be created from CRM leads or linked to existing CRM records.

## Next Steps

### For Project Team:
1. Review BRD and Implementation Plan
2. Approve scope and timeline
3. Assign development resources
4. Begin Phase 1 implementation
5. Set up staging environment for testing

### For Stakeholders:
1. Review business case
2. Approve budget and resources
3. Identify pilot users
4. Plan training schedule
5. Define success metrics

### For Presales Team:
1. Participate in requirements validation
2. Attend training sessions
3. Provide feedback during UAT
4. Prepare for go-live
5. Adopt system and best practices

## Contact

**Project Manager**: [Name]
**Technical Lead**: [Name]
**Training Coordinator**: [Name]
**Support**: support@company.com

---

**Last Updated**: 2025-12-23
**Version**: 1.0
