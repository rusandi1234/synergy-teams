# SYNERGY – Intelligent Student Team Formation & Task Allocation System

## Team TitanMinds

### Team Members
- Rusandi Wijesinghe
- Arulrasa Anajan
- Shangika Pavanesan

**CIPHER 2.0 – Prototype & Solution Development Phase**

---

# Overview

SYNERGY is an AI-assisted web application developed to automate student project team formation in universities. Instead of manually assigning students to groups, SYNERGY analyses student skills, availability, workload, role preferences, and supporting evidence to generate balanced project teams.

The system helps lecturers reduce administrative work while ensuring students are allocated fairly based on compatibility.

---

# Problem Statement

Universities often form project groups manually, which can result in:

- Skill imbalance across teams
- Duplicate role assignments
- Poor workload distribution
- Availability conflicts
- High administrative effort for faculty
- Subjective decision making

SYNERGY solves these problems using intelligent team generation and faculty review.

---

# Objectives

- Automate project team formation
- Improve team compatibility
- Balance workload fairly
- Detect team conflicts automatically
- Assist faculty in decision making
- Provide analytics for monitoring team quality

---

# Key Features

## Authentication
- Student Registration
- Faculty Registration
- Secure Login
- Role-based access

---

## Student Dashboard

Students can:

- Update profile
- Enter technical skills
- Select preferred role
- Set availability
- Define workload capacity
- View assigned team
- View assigned tasks
- Track compatibility score

---

## Student Profile Management

Each profile includes:

- Name
- Email
- Skills
- Availability
- Preferred Role
- Workload Capacity
- Soft Skills
- Previous Projects
- Portfolio Link
- GitHub Profile
- Certificates

---

## Skill Evidence Submission

Students may submit evidence to verify their skills including:

- GitHub Repository
- Portfolio
- Previous Coursework
- Certificates
- Project Files

Faculty members can verify or reject submitted evidence before it contributes to compatibility analysis.

---

## Student Management

Faculty can:

- Search students
- Filter by role
- View skills
- Monitor workload
- Review availability
- Manage student records

---

## AI Compatibility Analysis

SYNERGY calculates compatibility using:

- Skill Diversity
- Role Coverage
- Availability Matching
- Workload Balance
- Evidence Verification
- Preferred Roles

Each generated team receives a compatibility score.

---

## Intelligent Team Generation

The AI automatically:

- Forms balanced teams
- Assigns suitable members
- Prevents duplicate roles
- Balances workload
- Maximises compatibility

---

## Team Review

Faculty can:

- Review generated teams
- View compatibility scores
- Edit team members
- Rebalance teams
- Approve teams
- Publish teams

---

## Conflict Detection

The system automatically detects:

- Availability clashes
- Missing required roles
- Duplicate roles
- Workload imbalance
- Low compatibility teams

Each conflict includes suggested fixes.

---

## Faculty Approval Workflow

The approval process follows:

Student Registration

↓

Evidence Verification

↓

AI Team Generation

↓

Conflict Detection

↓

Faculty Review

↓

Approval

↓

Publishing

---

## AI Recommendations

The recommendation engine identifies:

- High-risk teams
- Poor compatibility
- Low skill diversity
- Workload imbalance

Faculty can:

- Accept recommendations
- Dismiss recommendations
- Open rebalancing

---

## Team Rebalancing

If issues are detected, SYNERGY recommends replacement candidates based on:

- Compatibility Score
- Skills
- Availability
- Role Preference
- Current Workload

Faculty can approve or reject these changes.

---

## Analytics Dashboard

Provides real-time analytics including:

- Student distribution
- Role distribution
- Skill distribution
- Team compatibility
- Workload distribution
- Conflict statistics
- Team performance metrics

---

# Technologies Used

## Frontend
- React
- TypeScript
- Tailwind CSS
- Lovable

## Backend
- Supabase

## Database
- PostgreSQL (Supabase)

## Authentication
- Supabase Auth

## Deployment
- Lovable
- GitHub

---

# System Workflow

Student Registration

↓

Profile Completion

↓

Evidence Upload

↓

Evidence Verification

↓

Compatibility Analysis

↓

AI Team Generation

↓

Conflict Detection

↓

AI Recommendations

↓

Faculty Review

↓

Team Approval

↓

Publishing

↓

Analytics Dashboard

---

# Project Structure

```
src/
components/
pages/
hooks/
lib/
public/
README.md
package.json
```

---

# Future Improvements

- Machine Learning based compatibility prediction
- Integration with Moodle and Canvas LMS
- Real-time notifications
- Dynamic team rebalancing
- Attendance integration
- Project performance prediction
- Mobile application
- Calendar integration

---

# Limitations

- Prototype uses demonstration data
- Compatibility scoring is currently rule-based
- Limited real-world testing
- AI recommendations require faculty approval
- Dynamic rebalancing is prototype level

---

# Benefits

### Students
- Fair team allocation
- Balanced workload
- Better collaboration
- Transparent process

### Faculty
- Reduced administrative workload
- Faster team generation
- Better decision support
- Automated conflict detection

---

# Live Demo

**Prototype**
(https://preview--synergy-teams.lovable.app/auth)

---

# GitHub Repository

()

---

# License

This project was developed for **CIPHER 2.0 – Prototype & Solution Development Phase** and is intended for academic demonstration purposes.

---

© Team TitanMinds – 2026
