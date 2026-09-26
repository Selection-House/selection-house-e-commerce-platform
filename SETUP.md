# Selection House launch setup

This guide is for the project folder `C:\Users\kuber\Desktop\E-commerce_Selection_house`. The app is a consumer storefront; quotations and school invoices remain inside the staff admin area. Create the accounts below under the business owner's control and enable two-factor sign-in wherever offered. Do not commit `.env` or share API secrets in chat.

## Create the accounts

1. **GitHub:** create an account at [github.com](https://github.com) if you do not already have one. Create a private repository named `selection-house` and leave “Add a README” unchecked because this folder already has one. Git is installed but not initialized in this folder, and this environment has no GitHub CLI. After creating the empty GitHub repository, open PowerShell in this folder and run the commands below. Replace `<your-github-name>` with your GitHub username. GitHub will ask you to sign in when pushing; never put a password or token in the remote URL.
2. **Vercel:** create an account at [vercel.com](https://vercel.com) and choose **Continue with GitHub**. Import the `selection-house` repository after its first push. Vercel should detect Next.js automatically.
3. **Supabase:** create a project at [supabase.com](https://supabase.com), choose a strong database password and a region near Uttar Pradesh, and wait until the project says it is ready. Open **Connect → ORMs → Prisma** (or **Database → Connect**) and copy the PostgreSQL connection string. Use the **transaction pooler / pooled** string for the deployed app if available; use the **direct** connection for Prisma schema migrations. Replace the password placeholder in both strings; never commit either URL. Supabase free-plan quotas and terms can change, so review the current plan before launch.
4. **Cloudinary:** create a free account at [cloudinary.com](https://cloudinary.com). The dashboard's **API Environment variable** is a secret; store it only as `CLOUDINARY_URL` in Vercel. Current product editing accepts image URLs and this code does not yet upload to Cloudinary, so that integration still needs implementation before using this variable.
5. **Upstash:** create a Redis database at [upstash.com](https://upstash.com), choose a nearby region, then copy the REST URL and REST token from the database page. OTP and admin rate limits currently use the database and in-memory app state; Upstash-backed shared rate limiting still needs implementation before relying on it across serverless instances.
6. **Razorpay:** create a business account at [razorpay.com](https://razorpay.com), enable **Test Mode**, and find test API keys under **Account & Settings → API Keys**. Current checkout records manual payment and does not connect to Razorpay; Razorpay payments/webhooks need implementation and testing before these keys are useful. Test credentials are separate from live credentials.
7. **Sentry:** create a project at [sentry.io](https://sentry.io) for Next.js and copy its DSN. `SENTRY_DSN` is listed for the planned monitoring integration; Sentry is not initialized in the current code yet.

## Connect GitHub and Vercel

In PowerShell, run this once to create the local repository and upload the existing app:

```powershell
git init -b main
git add .
git commit -m "Initial Selection House app"
git remote add origin https://github.com/<your-github-name>/selection-house.git
git push -u origin main
git switch -c dev
git push -u origin dev
```

Git, GitHub CLI, and write access to `.git` are not available to this Codex workspace, so these local and remote repository commands must be run in your Windows PowerShell after Git for Windows is installed.

In Vercel, select **Add New → Project → Import Git Repository**, choose `selection-house`, and deploy. Set `main` as the Production Branch. Push feature changes to a PR first; use Preview deployments to check them before merging. Keep Preview pointed at a separate Supabase database so test orders cannot alter production data.

## Environment variables

In Vercel open **Project → Settings → Environment Variables**. Add Production and Preview values separately. The database URLs must point to different Supabase projects (or isolated databases). Set secrets for the environments where each feature is enabled.

| Name | Purpose | Production / Preview |
|---|---|---|
| `DATABASE_URL` | PostgreSQL pooled runtime connection | Production pooled URL / separate preview pooled URL |
| `DIRECT_URL` | Direct PostgreSQL connection for migrations | Corresponding direct URL for each environment |
| `SESSION_SECRET` | Signs staff session cookies; use a different random value, at least 32 characters, per environment | Required in both |
| `ADMIN_EMAIL` | Admin login email | Set by owner in both |
| `ADMIN_PASSWORD` | Admin login password for the current environment-variable auth implementation | Set a unique strong value per environment; rotate the shared example credentials before production |
| `OTP_WEBHOOK_URL` | OTP delivery provider endpoint | Leave unset until configured; current production OTP login returns unavailable without it |
| `OTP_WEBHOOK_TOKEN` | Bearer token for OTP endpoint | Secret; only when OTP endpoint is configured |
| `STORE_LEGAL_NAME`, `STORE_ADDRESS`, `STORE_PHONE` | Store details on printed documents | Real business values / safe preview values |
| `STORE_GSTIN` | GSTIN for final invoices | Real registered value / test value or unset |
| `CLOUDINARY_URL` | Planned product image uploads | Not used until integration is implemented |
| `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN` | Planned shared rate limiting | Not used until integration is implemented |
| `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET` | Planned online payments | Test keys in Preview; live keys only after KYC and implementation |
| `SENTRY_DSN` | Planned error monitoring | Not used until integration is implemented |

For the first Preview, you can keep optional provider variables blank. Do not use the published example password as a live credential. The current app authenticates the admin against `ADMIN_EMAIL` and `ADMIN_PASSWORD`; hashed first-run database credentials are not implemented yet, so treat changing this to a strong owner-controlled password as a launch prerequisite.

## Database migrations and deploys

There is not an initial Prisma migration in this folder yet. First, from this folder, copy `.env.example` to `.env`, set the direct database URL in `DIRECT_URL` and a runtime URL in `DATABASE_URL`, then create and apply the baseline migration against your Preview database:

```powershell
pnpm install
pnpm db:generate
pnpm prisma migrate dev --name init
pnpm db:seed
```

The seed creates three demo products. Remove or edit these in Admin before launch. Commit the generated `prisma/migrations` folder to GitHub. For later schema changes, create and commit a Prisma migration, then apply it to the target database with `pnpm prisma migrate deploy` before deploying code that requires it. Do not run Preview migrations against Production. Automating production migrations safely in the deploy pipeline still needs environment-specific migration wiring. The current workspace's installed modules are incomplete, so the baseline migration must be generated after dependencies are restored.

## Test checkout before launch

The current checkout supports BOB transfer and pay-at-pickup only. Place a test order in Preview, verify stock decreased, mark it paid from Admin, and verify order lookup. Razorpay end-to-end checkout, test UPI/card numbers, webhook signature checks, and webhook idempotency are not implemented yet; do not enable live payments until those are built and tested. Razorpay supplies current test payment details in its own dashboard and documentation.

## Razorpay live activation

Start business verification early if online payments are needed. Razorpay may request PAN, bank account proof or a cancelled cheque, business address proof, and GST registration details where applicable. The exact list depends on the business and current onboarding rules; follow the checklist shown in the Razorpay account. Use test mode while KYC is pending.

## Custom domain

In Vercel open **Project → Settings → Domains**, add the domain, and copy the DNS records Vercel displays. At the domain registrar, add the requested A/AAAA or CNAME records exactly. Wait for Vercel to verify the domain and issue HTTPS before sharing it publicly.

## If a deployment fails

Open the project in Vercel, choose **Deployments**, select the failed deployment, and open **Build Logs**. First check that required environment variables exist in the correct environment and that the Preview database is reachable. Then check the first TypeScript, lint, Prisma, or build error in the log. Do not paste secrets into an issue when asking for help.
