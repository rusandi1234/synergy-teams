# SYNERGY – Intelligent Student Team Formation & Task Allocation System

## Overview

SYNERGY is a web-based intelligent student team formation and task allocation system developed for the CIPHER 2.0 Prototype & Solution Development Phase.

The system assists faculty members in creating balanced project teams by analyzing student skills, availability, workload, and preferred roles. It automates team formation, identifies potential conflicts, and supports faculty decision-making through compatibility analysis and conflict detection.

---

## Problem Statement

In academic project modules, faculty members often form teams manually. This process is time-consuming and can result in:

* Skill imbalances between teams
* Duplicate role preferences
* Scheduling conflicts
* Uneven workload distribution
* Missing project roles
* Students being assigned inefficiently

These issues can negatively impact collaboration, productivity, and project success.

---

## Proposed Solution

SYNERGY automates the team formation process by evaluating student profiles and generating balanced teams based on:

* Skills
* Availability
* Workload
* Preferred Roles

The system provides compatibility analysis, conflict detection, faculty review, and final team publication.

---

## Key Features

### Student Features

* Student Registration & Login
* Student Dashboard
* View Profile Information
* Submit Availability
* Set Role Preferences
* View Assigned Team
* View Assigned Tasks

### Faculty Features

* Faculty Dashboard
* Review Generated Teams
* View Student Profiles
* View Conflict Reports
* Modify Team Allocations
* Approve Final Teams
* Publish Final Teams

### Intelligent Features

* Compatibility Analysis
* Balanced Team Generation
* Conflict Detection
* Workload Balancing
* Role Assignment Support
* Faculty Decision Support

---

## System Workflow

Student Registration
↓
Profile Validation
↓
Compatibility Analysis
↓
Team Generation
↓
Role Assignment
↓
Conflict Detection
↓
Faculty Review
↓
Team Approval
↓
Final Team Publication

---

## Compatibility Analysis

The system evaluates student compatibility using multiple factors:

| Factor               | Purpose                      |
| -------------------- | ---------------------------- |
| Skill Diversity      | Creates balanced teams       |
| Availability Overlap | Reduces scheduling conflicts |
| Role Compatibility   | Minimizes role clashes       |
| Workload Balance     | Prevents overloading members |

Higher compatibility scores indicate stronger team suitability.

---

## Conflict Detection

The system identifies:

* Availability conflicts
* Missing project roles
* Duplicate role preferences
* Workload imbalances
* Team composition issues

Conflicts are flagged for faculty review before final publication.

---

## Technology Stack

### Frontend

* Lovable
* React
* TypeScript

### Backend & Database

* Supabase
* PostgreSQL

### Authentication

* Supabase Authentication
* Role-Based Access Control

### Deployment

* Lovable Hosting
* GitHub Pages

---

## Project Structure

```text
src/
├── pages/
├── components/
├── hooks/
├── integrations/
├── services/

supabase/
├── migrations/
├── policies/

README.md
```

---

## Setup Instructions

### Prerequisites

* Node.js
* npm
* Supabase Account
* GitHub Account

### Installation

1. Clone the repository

```bash
git clone <repository-url>
```

2. Navigate to the project

```bash
cd synergy-teams
```

3. Install dependencies

```bash
npm install
```

4. Configure Supabase environment variables

5. Run the development server

```bash
npm run dev
```

6. Open the application in your browser

---

## Live Demo

Prototype URL:

https://synergy-teams.lovable.app

---

## GitHub Repository

Source code for the SYNERGY prototype developed for CIPHER 2.0.

---

## Limitations

Current prototype limitations include:

* Uses sample datasets for demonstration
* Basic compatibility scoring model
* Limited real-world validation
* No machine-learning-based recommendations
* Team chemistry cannot be fully predicted

---

## Future Improvements

* AI-powered team recommendations
* Advanced compatibility algorithms
* Mid-semester team rebalancing
* Automated task allocation
* Notification system
* Student self-service profile management
* Enhanced analytics and reporting

---

## Team

### TitanMinds

Developed for:

**CIPHER 2.0 – Prototype & Solution Development Phase**

Informatics Institute of Technology (IIT)
