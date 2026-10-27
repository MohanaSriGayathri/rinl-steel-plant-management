# MMS Steel Plant Management System (RINL)

A modern, full-stack Steel Plant Management System for **Rashtriya Ispat Nigam Limited (RINL)** built with **React 18**, **TypeScript**, **Vite**, **Tailwind CSS**, and **Supabase**.

---

## 🚀 Key Features

- **Inventory Management**: Real-time tracking of raw materials (Iron Ore, Coal, Limestone, Dolomite) and finished products (Steel Sheets, Wire Rods, Coils). Edit stock levels, view critical alerts, and add new items.
- **Production Management**: Daily steel production, molten iron output, efficiency metrics, uptime/downtime logging, and historical analytics charts.
- **Materials Request Requisition**: End-to-end procurement requests with status tracking (Pending, Approved, In Transit, Delivered) and Request ID lookup.
- **Vendor Management & Orders**: Vendor directory, product procurement catalog, integrated cart, card payment simulation with OTP verification, and order tracking.
- **Secure Authentication**: Supabase Auth integration with role-based profiles (Admin, Supervisor, Vendor, Employee). Automated profile creation via PostgreSQL database trigger with zero plaintext password storage.
- **AI Chatbot**: Intelligent steel plant operations assistant powered by Groq (`llama-3.3-70b-versatile`) via a secure Supabase Edge Function.

---

## 🛠️ Tech Stack

- **Frontend**: React 18, TypeScript, Vite, Tailwind CSS, Lucide React, Recharts, React Router v6
- **Backend & Database**: Supabase (PostgreSQL, Supabase Auth, Row Level Security, Edge Functions)
- **AI**: Groq API via Supabase Edge Function

---

## 📋 Prerequisites

- Node.js (v18 or higher recommended)
- A free [Supabase](https://supabase.com) account
- (Optional) A [Groq](https://console.groq.com) account for AI chatbot

---

## ⚙️ Setup & Installation

### 1. Install Dependencies
Navigate into the project directory:
```bash
cd MMS/project
npm install
```

### 2. Configure Environment Variables
Create a `.env` file in `MMS/project` by copying `.env.example`:
```bash
cp .env.example .env
```
Open `.env` and fill in your Supabase project credentials:
```env
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key_here

# Optional: for local development chatbot testing
VITE_GROQ_API_KEY=your_groq_api_key_here
```
> ⚠️ **Security Notice**: Never commit `.env` to GitHub. The `.gitignore` file is configured to exclude it automatically.

---

## 🗄️ Database Setup (Supabase)

To populate all required tables, Row Level Security (RLS) policies, session triggers, and sample data:

1. Open your [Supabase Dashboard](https://supabase.com/dashboard).
2. Select your project.
3. In the left navigation, click on **SQL Editor**.
4. Click **New query**.
5. Copy the entire contents of:
   ```
   supabase/migrations/20261026000000_consolidated_schema_and_fixes.sql
   ```
6. Paste into the SQL Editor and click **Run**.
7. The script will safely:
   - Create and verify all tables (`users`, `inventory`, `production`, `material_requests`, `vendors`, `vendor_orders`, `user_sessions`).
   - Remove plaintext password columns and enforce password security via Supabase Auth.
   - Install the automated `handle_new_user` trigger on `auth.users` for seamless profile creation.
   - Configure Row Level Security (RLS) policies.
   - Seed realistic steel plant sample data for inventory, production, and vendors.

---

## 🤖 AI Chatbot Setup (Production)

The chatbot is architected to call a secure server-side Supabase Edge Function so your Groq API secret key is never exposed to the public frontend bundle.

To deploy the function:
1. Install Supabase CLI:
   ```bash
   npm install -g supabase
   ```
2. Login and link your project:
   ```bash
   supabase login
   supabase link --project-ref your-project-ref
   ```
3. Set your Groq API secret:
   ```bash
   supabase secrets set GROQ_API_KEY=your_groq_api_key
   ```
4. Deploy the function:
   ```bash
   supabase functions deploy chat
   ```

*(In local development, if the function is not deployed yet, the chatbot gracefully falls back to `VITE_GROQ_API_KEY` if present in `.env`)*.

---

## 💻 Available Scripts

- `npm run dev`: Start local development server with Hot Module Replacement (HMR).
- `npm run build`: Compile and minify production bundle.
- `npm run lint`: Run ESLint checks across TypeScript and React code.
- `npm run preview`: Preview the production build locally.

---

## 🚢 Preparing for GitHub & Deployment

To upload this repository to GitHub:
```bash
git init
git add .
git commit -m "Initial commit: MMS Steel Plant Management System"
git branch -M main
git remote add origin https://github.com/your-username/mms-steel-plant.git
git push -u origin main
```
> Always verify that `.env` is NOT tracked by git before pushing (`git status`).
