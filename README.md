# ProofPoint Dashboard

**Performance Command Center** — A data-driven appraisal platform built for accountability and transparency.

ProofPoint simplify organizational hierarchy and employee appraisals with an evidence-based approach: **No Evidence, No Score.**

---

## 🚀 Overview

ProofPoint Dashboard is a premium performance assessment platform designed for MAD Labs at Millennia World School. It features a hierarchical role system and multi-step approval workflows ensuring every rating is backed by documented proof.

### Key Features
- **Hierarchical Role System**: Global (Director/Admin), Department (Manager), and Sub-department (Supervisor) levels.
- **Evidence-Driven Appraisals**: Mandatory documentation for performance ratings.
- **Visual Org Structure**: Interactive department tree with real-time role holder visualization.
- **Live Scoring Engine**: Weighted calculations and letter grades that update as you assess.
- **Multi-step Workflows**: Customizable approval chains based on the organizational hierarchy.
- **Premium UI**: Modern glassmorphism aesthetic with high-performance dark/light modes.

---

## 🛠️ Technology Stack

- **Core**: [Next.js](https://nextjs.org/) (App Router)
- **Language**: [TypeScript](https://www.typescriptlang.org/)
- **Database**: [PostgreSQL](https://www.postgresql.org/) (Dockerized)
- **Authentication**: [NextAuth.js](https://next-auth.js.org/)
- **Storage**: [MinIO](https://min.io/) (S3-Compatible Evidence Storage)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/) & [shadcn/ui](https://ui.shadcn.com/)
- **Icons**: [Lucide React](https://lucide.dev/)
- **Inspiration**: AI Assisted Codes

---

## ⚙️ Getting Started

### Prerequisites
- Node.js 18+
- Docker & Docker Compose

### Fast Track Local Setup

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd proofpoint-dashboard
   ```

2. **Environment Configuration**
   Copy `.env.example` to `.env` and fill in the required secrets.
   ```bash
   cp .env.example .env
   ```

3. **Start Infrastructure (Databases & Storage)**
   ```bash
   docker-compose up -d
   ```

4. **Install Dependencies**
   ```bash
   npm install
   ```

5. **Run Development Server**
   ```bash
   npm run dev
   ```
   Visit [http://localhost:3000](http://localhost:3000) to see the dashboard.

---

## 🏛️ Organizational Hierarchy

The system enforces a strict hierarchy for role availability:

| Context | Available Roles |
|---------|-----------------|
| **Global** | Director, Admin |
| **Root Department** | Manager, Staff |
| **Sub-Department** | Supervisor, Staff |

---

## 🛡️ License

Copyright by MAD Labs, Millennia World School. All rights reserved.
