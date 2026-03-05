# GEMINI.md - Franchise.id Project Context

This document is the **Single Source of Truth** for the Franchise.id project, combining technical implementation details with the strategic roadmap.

## Project Overview
Franchise.id is a high-performance directory platform (franchise.id, franchisee.id, franchisor.id) connecting Franchisors with potential Franchisees. It is a **WordPress-to-Static** conversion hosted on **Cloudflare Pages**, utilizing **Cloudflare Functions** and **GitHub Actions** for dynamic logic and automation.

### Core Tech Stack
- **Hosting:** Cloudflare Pages (Static HTML/CSS/JS).
- **Backend:** Cloudflare Functions (Edge Runtime) for forms and API access.
- **Automation (SSG):** Node.js scripts running via GitHub Actions (CRON: 15m to 3h).
- **CMS:** Google Sheets (Spreadsheet ID: `1p3Ke25SYZx0Yanv2MHy73eCbK_jE-qgzVC7ue5Tu3mU`).
- **Database/Auth:** Supabase (for analytics, user accounts, and dashboards).
- **Assets:** Cloudinary (Direct browser uploads + AI-powered optimization).

## Current Goals & Roadmap
For detailed technical plans, feature requests, and the current to-do list, refer to **[PRD.md](./PRD.md)**.

### Active Priorities
1.  **Hybrid SSG Engine (Phase 1):** Integrate "Unclaimed" brands into the main listing page.
2.  **Franchise Claiming:** Implement the third "Claim Brand" tab in the registration form.
3.  **Action Optimization:** Audit and enhance GitHub Actions for performance and real-time sync.

## Architecture & Data Flow
1.  **Data Tiers:** `UNCLAIMED` (Scraped/Potential), `FREE` (Claimed/Basic), `VERIFIED` (Paid/Priority).
2.  **Claiming Workflow:** Transition brands from `UNCLAIMED` to `FRANCHISOR` upon data completion.
3.  **SSG Engine:** Scripts in `js/` fetch data and inject into `templates/` via GitHub Actions.
4.  **Serverless Logic:** Functions handle API access and form submissions with custom JWT auth.

## Key Technical Components
- **Smart Form Logic (`js/form-franchise.js`):** Real-time calculations (BEP, ROI) and data validation.
- **Cloudinary Module:** Automatic image optimization and direct browser uploads.
- **SEO & Analytics:** Priority sorting and automatic JSON-LD injection for Verified pages.

## Key Directories & Files
- `/functions/`: Serverless edge functions.
- `/js/`: Client-side logic and SSG builder scripts.
- `/templates/`: Source HTML templates for the SSG engine.
- `PRD.md`: Technical project roadmap and feature details.

## Development Conventions
- **Static First:** Pre-generate all content pages for SEO.
- **Surgical HTML Edits:** Protect Elementor's DOM structure.
- **Auth Implementation:** Native Web Crypto API in Functions for speed.
