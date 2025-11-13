# CRM Module - Quick Reference Guide

## 🚀 Quick Actions

### Lead Management
| Action | Icon | Color | When Available |
|--------|------|-------|----------------|
| **Convert to Customer** | ➡️ | Green | Qualified/Proposal/Negotiation status |
| **Log Activity** | 💬 | Purple | Always |
| **View Timeline** | ⏱️ | Amber | Always |
| **Edit Lead** | ✏️ | Blue | Always |
| **Delete Lead** | 🗑️ | Red | Always (with confirmation) |

### Opportunity Management
| Action | Icon | Color | When Available |
|--------|------|-------|----------------|
| **Log Activity** | 💬 | Purple | On hover |
| **Edit Opportunity** | Click name | - | Always |
| **Delete Opportunity** | 🗑️ | Red | On hover (with confirmation) |

---

## 📝 Activity Types

| Type | Icon | When to Use | Key Fields |
|------|------|-------------|-----------|
| **Phone Call** | 📞 | After any phone conversation | Duration, Outcome |
| **Email** | 📧 | When sending important emails | Outcome |
| **Meeting** | 📅 | In-person or virtual meetings | Duration, Outcome |
| **Note** | 💬 | General observations | Description |
| **Task** | ✅ | Action items to track | Follow-up date, Completed |

---

## 🎯 Activity Outcomes

| Outcome | Use When | Next Action |
|---------|----------|-------------|
| **Successful** | Positive result achieved | Move to next stage |
| **No Answer** | Call not answered | Schedule retry |
| **Left Message** | Voicemail left | Wait for callback |
| **Needs Follow-up** | More action required | Set follow-up date |
| **Not Interested** | Lead declined | Mark as lost |
| **Interested** | Positive response | Continue engagement |
| **Meeting Scheduled** | Next step booked | Prepare for meeting |

---

## 🔄 Lead Conversion Workflow

```
┌─────────────────────────────────────────────────┐
│ 1. QUALIFY LEAD                                 │
│    Update status to: Qualified/Proposal/        │
│    Negotiation                                   │
└─────────────────────────────────────────────────┘
                      ↓
┌─────────────────────────────────────────────────┐
│ 2. CLICK CONVERT BUTTON (Green ➡️)              │
│    Available on qualified lead cards             │
└─────────────────────────────────────────────────┘
                      ↓
┌─────────────────────────────────────────────────┐
│ 3. REVIEW DATA MAPPING                          │
│    Lead → Customer                               │
│    All data transferred automatically            │
└─────────────────────────────────────────────────┘
                      ↓
┌─────────────────────────────────────────────────┐
│ 4. CREATE OPPORTUNITY (Optional but Recommended)│
│    ✅ Check "Create opportunity"                │
│    • Set opportunity name                        │
│    • Enter amount                                │
│    • Select stage                                │
│    • Set probability                             │
│    • Define next step                            │
└─────────────────────────────────────────────────┘
                      ↓
┌─────────────────────────────────────────────────┐
│ 5. CONVERT                                      │
│    Customer created ✅                           │
│    Opportunity created ✅ (if selected)          │
│    Activity logged ✅                            │
│    Lead status → Converted                       │
└─────────────────────────────────────────────────┘
```

---

## 💬 Activity Logging Best Practices

### DO:
✅ Log immediately after interaction
✅ Include specific details in description
✅ Always select an outcome
✅ Set follow-up dates when needed
✅ Use appropriate activity type
✅ Track duration for calls/meetings

### DON'T:
❌ Wait to log activities (do it immediately)
❌ Use generic descriptions ("Talked to customer")
❌ Skip outcome selection
❌ Forget to set follow-ups
❌ Log activities you didn't complete

---

## 📊 Pipeline Stages

| Stage | Probability | What It Means | Typical Actions |
|-------|-------------|---------------|-----------------|
| **Prospecting** | 10% | Initial contact | Log calls, Send intro email |
| **Qualification** | 25% | Determining fit | Needs assessment, Budget discussion |
| **Needs Analysis** | 40% | Understanding requirements | Product demo, Solution design |
| **Proposal** | 60% | Quote submitted | Present proposal, Answer questions |
| **Negotiation** | 80% | Terms discussion | Handle objections, Finalize terms |
| **Closed Won** | 100% | Deal signed ✅ | Onboarding, Celebration |
| **Closed Lost** | 0% | Deal lost ❌ | Log reason, Future opportunity |

---

## 🎨 Color System

### Status Colors:
- 🔵 **Blue** - New
- 🟣 **Purple** - Contacted
- 🟢 **Green** - Qualified
- 🟠 **Orange** - Proposal
- 🟡 **Amber** - Negotiation
- 🟢 **Emerald** - Converted/Won
- 🔴 **Red** - Lost/Unqualified
- ⚪ **Grey** - Prospecting

### Action Colors:
- 🟢 **Green** - Convert/Success
- 🟣 **Purple** - Activity/Communication
- 🟡 **Amber** - Timeline/History
- 🔵 **Blue** - Edit/Modify
- 🔴 **Red** - Delete/Remove

---

## ⌨️ Keyboard Shortcuts (Coming Soon)

| Shortcut | Action |
|----------|--------|
| `Ctrl/Cmd + K` | Open search |
| `L` | Go to Leads |
| `O` | Go to Opportunities |
| `A` | Log Activity |
| `Esc` | Close modal |

---

## 📱 Mobile Tips

### On Mobile Devices:
- Tap and hold for tooltips
- Swipe cards for actions
- Use search for quick access
- Portrait mode recommended
- Timelines scroll smoothly

---

## 🔍 Search Tips

### Lead Search:
- Search by: Company name, Contact name, Email
- Filter by: Status
- Sort by: Date, Score, Value

### Opportunity Search:
- Search by: Name, Company
- Filter by: Stage
- Sort by: Amount, Date, Probability

---

## 📈 KPIs to Track

### Lead Metrics:
- Total leads
- Qualified leads %
- Conversion rate
- Average lead score
- Activities per lead

### Opportunity Metrics:
- Pipeline value
- Win rate %
- Average deal size
- Sales cycle length
- Activities per opportunity

### Activity Metrics:
- Total activities
- Activities per day
- Call-to-meeting ratio
- Follow-up completion rate
- Response time

---

## 🆘 Troubleshooting

### Issue: Can't convert lead
**Solution:** Lead must be in Qualified, Proposal, or Negotiation status

### Issue: Activity not saving
**Solution:** Ensure Subject field is filled (required)

### Issue: Timeline not loading
**Solution:** Check internet connection, refresh page

### Issue: Customer not appearing in dropdown
**Solution:** Clear cache, refresh customer list

---

## 📞 Support

### For Technical Issues:
- Check build status
- Review error messages
- Check network connection
- Clear browser cache

### For Business Questions:
- Review this guide
- Check workflow examples
- Consult sales manager
- Review training materials

---

## 🎓 Training Checklist

### New User Onboarding:
- [ ] Understand lead statuses
- [ ] Learn activity types
- [ ] Practice lead conversion
- [ ] Review timeline features
- [ ] Understand pipeline stages
- [ ] Learn opportunity management
- [ ] Practice activity logging
- [ ] Review best practices

### Advanced Features:
- [ ] Bulk operations (future)
- [ ] Advanced filtering (future)
- [ ] Custom reports (future)
- [ ] Email integration (future)

---

## 🎯 Success Metrics

### Good Performance Indicators:
- ✅ 5+ activities per day
- ✅ 80%+ follow-up completion
- ✅ 30%+ lead conversion rate
- ✅ 50%+ opportunity win rate
- ✅ < 48 hours response time

### Areas for Improvement:
- ⚠️ < 3 activities per day
- ⚠️ < 60% follow-up completion
- ⚠️ < 20% lead conversion rate
- ⚠️ < 30% opportunity win rate
- ⚠️ > 72 hours response time

---

**Version:** 2.0
**Last Updated:** November 2024
**Status:** Production Ready ✅
