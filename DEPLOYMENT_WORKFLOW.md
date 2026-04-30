# LeadCop Deployment Workflow & Architecture

This document outlines the environment structure and deployment process for the LeadCop project. Future AI assistants should refer to this to avoid environment confusion.

## 🏗️ Environment Structure

The project is split into two isolated environments on the same VPS, each with its own code directory, database, and domain.

### 1. Testing / Development Environment
- **Domain:** [https://email-verifier.benwil.store/](https://email-verifier.benwil.store/)
- **Local Directory:** `/var/www/Temp-Email-SDK`
- **Git Branch:** `development`
- **Database:** `tempshield` (PostgreSQL)
- **PM2 Process ID:** `11` (or named `temp-email-sdk`)
- **Port:** `5001`

### 2. Live / Production Environment
- **Domain:** [https://leadcop.io/](https://leadcop.io/)
- **Local Directory:** `/var/www/leadcop.io`
- **Git Branch:** `main`
- **Database:** `leadcop_prod` (PostgreSQL)
- **PM2 Process ID:** `9` (or named `leadcop-next`)
- **Port:** `8080` (Internal) / `5002` (Configured in some scripts)

---

## 🚀 Deployment Workflow

### Step 1: Development & Testing
1.  All new features and fixes are pushed to the **`development`** branch.
2.  GitHub Actions (`deploy-development.yml`) automatically deploys these changes to the **Testing Environment**.
3.  Verification is performed on `email-verifier.benwil.store`.

### Step 2: Production Release
1.  Once tested, the `development` branch is merged into the **`main`** branch.
2.  The **🚀 Deploy to Production** GitHub Action is triggered manually from the Actions tab.
3.  This action pulls the code into `/var/www/leadcop.io` and updates the live site.

---

## ⚙️ Automated CI/CD Steps

Both deployment workflows (`deploy-development.yml` and `deploy-production.yml`) execute the following steps automatically via SSH on the server:

1.  **Git Pull:** Fetches the latest code for the specific branch.
2.  **Dependencies:** Runs `pnpm install --frozen-lockfile`.
3.  **Build:** Runs `pnpm run build` (Next.js build).
4.  **Database Sync:** Runs `npx drizzle-kit push` to ensure the isolated database schema matches the new code.
5.  **Restart:** Restarts the specific PM2 process to apply changes.

---

## ⚠️ Important Notes
- **Isolated Databases:** Never run migrations or schema pushes against the production database while testing in the development directory.
- **Environment Variables:** Each directory has its own `.env` file. The Testing environment uses `tempshield` DB credentials, and the Production environment uses `leadcop_prod` DB credentials.
- **PM2 Caching:** If environment variables are changed in `.env`, use `pm2 delete [id] && pm2 start ecosystem.config.cjs` to force PM2 to reload them.
