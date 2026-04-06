# Flight Operations Training Management Dashboard - PRD

## Original Problem Statement
Dashboard jadwal praktik terbang siswa. Database: Instruktur, Siswa, Pesawat, Stage (PPL/CPL/IR/FIC/ME), Pesawat Diasuransikan.
Update: Add Flight Notes, Announcements, WhatsApp/Gmail integration, Student Progress Tracker.

## Architecture
- Frontend: React + Tailwind + Shadcn UI (port 3000)
- Backend: FastAPI + MongoDB (port 8001)
- Notifications: Gmail SMTP (pending credentials) + WhatsApp wa.me links

## User Personas
1. Admin - Full CRUD, delete, import/export, manage all
2. Instructor - Create/edit schedules, add flight notes, mark student progress
3. Student - View schedules, view own progress and notes

## Implemented Features (April 6, 2026)
### Core
- [x] JWT Auth with role-based access
- [x] Schedule Board (spreadsheet-style grid, Morning/Afternoon sessions, 10 periods)
- [x] CRUD: Instructors, Students, Aircraft, Stages, Courses, Schedules
- [x] Import CSV/Excel + Export Excel
- [x] License Expiry Notifications (30 days)

### Phase 2 Features
- [x] Flight Notes/Comments - Instructor notes per student per exercise with rating
- [x] Announcements - Priority (normal/important/urgent) + target audience (all/instructor/student)
- [x] Student Progress Tracker - Visual completion per stage with sub-stages
- [x] WhatsApp Share - Generate wa.me links per scheduled person
- [x] Gmail SMTP integration (infrastructure ready, pending credentials)
- [x] Stages with detailed sub-stages from Daftar Stage spreadsheet (PPL:52, CPL:85, IR:33, FIC:23, ME:12)
- [x] Phone fields for WhatsApp on Instructors & Students
- [x] Courses for student grouping

## Testing (Iteration 2)
- Backend: 95%, Frontend: 100%
- 18/18 test cases passed

## Backlog
### P1
- Gmail credentials configuration
- Mobile sidebar hamburger menu
- Print-friendly schedule view

### P2
- Drag & drop schedule entries
- PDF export
- Instructor workload analytics
- Real-time updates (WebSocket)
