# Flight Operations Training Management Dashboard - PRD

## Original Problem Statement
Dashboard jadwal praktik terbang siswa yang menampilkan Registrasi Pesawat, Nama Instruktur, Nama Siswa, Stage Terbang. Database untuk: Instruktur (Nama, Callsign, Expiry License), Siswa (Nama, Expiry License), Daftar Registrasi Pesawat + status jam, Daftar Stage Fase PPL/CPL/IR/FIC/ME, Daftar Pesawat yang diasuransikan.

## Architecture
- **Frontend**: React + Tailwind + Shadcn UI (port 3000)
- **Backend**: FastAPI + MongoDB (port 8001)
- **Database**: MongoDB

## User Personas
1. **Admin** - Full access: CRUD all entities, delete, import/export
2. **Instructor** - Can create/edit schedules, instructors, students, aircraft
3. **Student** - View only access to schedules and dashboard

## Core Requirements
- Auth system (JWT + bcrypt) with role-based access
- Schedule board per periode (Morning/Afternoon sessions)
- CRUD for Instructors, Students, Aircraft, Stages, Courses
- Import data from CSV/Excel
- Export schedules to Excel
- License expiry notifications (30 days warning)
- Filter aircraft by insurance status

## What's Been Implemented (April 6, 2026)
### Backend
- [x] JWT Authentication with role-based access (admin/instructor/student)
- [x] CRUD endpoints for all entities (instructors, students, aircraft, stages, courses, schedules)
- [x] 10 predefined flight periods (1st-10th Period with UTC times)
- [x] 5 training stages seeded (PPL-19ex, CPL-20ex, IR-10ex, FIC-25ex, ME-10ex)
- [x] Import CSV/Excel endpoints for instructors, students, aircraft
- [x] Export schedules to Excel
- [x] License expiry notification endpoint (30 days)
- [x] Batch schedule upsert endpoint
- [x] Daily summary endpoint

### Frontend
- [x] Login/Register pages with aviation-themed design
- [x] Dashboard with stats cards, license expiry alerts, upcoming schedules
- [x] Schedule Board - spreadsheet-like grid with Morning/Afternoon sessions
- [x] Cell click dialog for adding/editing schedule entries
- [x] Instructors page with CRUD + Import
- [x] Students page with CRUD + Course assignment + Import
- [x] Aircraft page with CRUD + Type/TotalHours/Insurance + Import
- [x] Stages page showing exercises per stage (PPL/CPL/IR/FIC/ME)
- [x] Courses page for student grouping

### Design
- Navy (#0B192C) + Soft Orange (#F4A261) color scheme
- Outfit font for headings, Plus Jakarta Sans for body
- Modern minimalist design

## Testing Results
- Backend: 97.4% pass rate
- Frontend: 90% pass rate
- Overall: 95% pass rate

## Prioritized Backlog
### P0 (Critical)
- None remaining

### P1 (Important)
- Mobile responsive sidebar (hamburger menu)
- Drag & drop schedule entries
- Print-friendly schedule view

### P2 (Nice to have)
- Real-time schedule updates (WebSocket)
- PDF export for schedules
- Instructor workload analytics
- Student progress tracking per stage
