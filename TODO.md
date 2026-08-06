# SkillBridge AI — Production Admin Panel Build Plan

Approach: Keep existing JSX + axios + recharts + framer-motion architecture to preserve the premium dark UI. Build feature-by-feature, fully connected to MongoDB.

## ✅ Completed
- [x] Fixed MongoDB Atlas connection (`.env` updated with valid credentials, verified connection)

## Phase 1 — Backend Foundation (Models + APIs)
- [x] Enhance User model: status (active/suspended/banned), role, warnings, avatar, lastLogin, banReason
- [x] Create Company model
- [x] Create Report model (moderation: users, jobs, companies)
- [x] Create Notification model
- [x] Create ActivityLog model
- [x] Create Session model
- [x] Create adminController with full CRUD: users, jobs, companies, applications, tests, analytics, reports, notifications, settings
- [x] Expand admin routes
- [x] Create validation middleware
- [ ] Create admin seed script for first admin user

## Phase 2 — Admin Dashboard (Frontend)
- [ ] Dashboard: live stats, charts, recent activity, monthly growth, loading skeletons, error/empty states, auto-refresh
- [ ] Users management: table (avatar/name/email/role/status/date/actions), search, pagination, sorting, filtering, export CSV
- [ ] User actions: view, edit, delete, suspend, activate, ban, unban, reset password, role change
- [ ] Bulk actions: delete, suspend, activate
- [ ] Job management: list, create, edit, delete, approve, reject, feature, hide, close, reopen, applicants, analytics
- [ ] Applications: list, filter, search, candidate/recruiter profile, download resume, status, timeline, analytics
- [ ] Companies: approval, profile, documents, verification, suspend, activate, delete
- [ ] Moderation: reported users/jobs/companies, review, approve, reject, delete, suspend, warning, notes, history
- [ ] Skill tests: view tests, scores, leaderboard, average score, top performers, question analytics
- [ ] Analytics: Recharts daily/weekly/monthly users, trends, top skills/companies/recruiters, export CSV/PDF
- [ ] Settings: admin profile, image, change password, notifications, theme, security, 2FA-ready, sessions, activity logs
- [ ] Notifications: realtime, toast, unread badge, mark read, delete
- [ ] Global search: users, jobs, companies, applications

## Phase 3 — Polish
- [ ] Routing/navigation updates in App.jsx + DashboardLayout
- [ ] Build verification (no errors, no warnings)
- [ ] End-to-end testing
