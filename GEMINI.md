# GEMINI.md - Franchise.id Project Context

This document provides instructional context for Gemini CLI when working on the **Franchise.id** project.

## Project Overview
Franchise.id is a static site project that originated as a WordPress/Elementor site. It has been converted into a high-performance static site hosted on **Cloudflare Pages**, utilizing **Cloudflare Functions** for serverless backend logic and **Google Sheets** (and **Supabase**) as the data source.

### Core Tech Stack
- **Hosting:** Cloudflare Pages
- **Backend:** Cloudflare Functions (Serverless)
- **Data Source:** Google Sheets API (Spreadsheet ID: `1p3Ke25SYZx0Yanv2MHy73eCbK_jE-qgzVC7ue5Tu3mU`)
- **Database:** Supabase (for extended features and more complex data)
- **Image Optimization:** Cloudinary
- **Frontend:** Static HTML/CSS (exported from WordPress/Elementor) + Custom JavaScript

## Architecture & Data Flow
1.  **Data Management:** Franchise data is managed in a Google Spreadsheet with three key tabs:
    - `FRANCHISOR`: Full details for active, registered, and subscribed franchise members.
    - `FRANCHISEE`: Investor/lead data captured from forms.
    - `UNCLAIMED`: Potential franchise listings for brands that are not yet members/registered.
2.  **Franchise Claiming Workflow:**
    - Potential franchisors in the `UNCLAIMED` tab can "Claim" their page to become active members.
    - **Process:** The brand completes the missing data fields (the schema gap between `UNCLAIMED` and `FRANCHISOR`).
    - **Transition:** Upon successful claim/registration, the record is moved to the `FRANCHISOR` tab and **permanently deleted** from the `UNCLAIMED` tab.
3.  **Build Process:** Static pages are generated using Node.js scripts (`js/build-listing.js`, `js/build-details.js`) that fetch data from Google Sheets and inject it into HTML templates.
4.  **Serverless Logic:**
    - `functions/get-franchises.js`: Fetches and maps franchise data from Google Sheets with 1-hour public caching and Cloudinary optimization.
    - `functions/form-submit.js`: Handles lead generation and franchise registration forms, pushing data to Google Sheets and Supabase.
5.  **Client-side Interactivity:** Custom JS in `js/` handles dynamic listing rendering and form validations.

## Key Directories & Files
- `/functions/`: Serverless functions for Cloudflare Pages.
- `/js/`: Client-side scripts and build-time generation scripts.
- `/templates/`: HTML templates (e.g., `peluang-usaha-tpl.html`, `detail-franchise-tpl.html`) used by build scripts.
- `/wp-content/` & `/wp-includes/`: Assets and core files retained from the original WordPress export.

## Data Schemas (CSV Mappings)
- **FRANCHISOR (`franchisors.csv`):** `id`, `brand_name`, `category`, `fee_license`, `total_investment_value`, `logo_url`, `cover_url`, `estimated_bep_months`, `nib_number`, `full_desc`, etc.
- **FRANCHISEE (`franchisee.csv`):** `id`, `timestamp`, `name`, `whatsapp`, `email`, `location`, `budget`, `interest`.
- **UNCLAIMED (`unclaimed.csv`):** `brand_name`, `category`, `subcategory`, `label`, `min_capital`, `max_capital`, `full_desc`.

## Building and Running
- **Build Listing:** `node js/build-listing.js`
- **Build Details:** `node js/build-details.js`
- **Local Development:** Uses `wrangler pages dev .` for testing Cloudflare Functions and the static site locally.
- **Environment Variables:** Requires `G_CLIENT_EMAIL`, `G_PRIVATE_KEY`, `G_SHEET_ID`, and Supabase credentials.

## Development Conventions
- **Static First:** Always prefer pre-generating HTML during the build phase for SEO. Use Cloudflare Functions only for dynamic/secure operations.
- **Cloudinary Optimization:** Strictly use `e_bgremoval`, `c_pad`, `f_auto`, `q_auto` for all brand assets to ensure visual consistency.
- **Surgical HTML Edits:** Retain the original Elementor DOM structure when modifying static exports to avoid breaking legacy styles.
