# Selection House launch setup

This guide is for the project folder `C:\Users\kuber\Desktop\E-commerce_Selection_house`. The app is a consumer storefront; quotations and school invoices remain inside the staff admin area. The GitHub repository, Vercel project, and production/preview Supabase projects have already been created. Keep `.env` and provider secrets out of Git and chat.

## Current project accounts

1. **GitHub:** the public repository is [Selection-House/selection-house-e-commerce-platform](https://github.com/Selection-House/selection-house-e-commerce-platform). `main` and `dev` are pushed and tracked. The collaborator `KuberChhabra1105` has accepted Write access. GitHub Actions CI is configured in this repo.
2. **Vercel:** the Vercel project is `selection-house-e-commerce-platform`, linked to that repository, with `main` as Production and Preview deployments from other branches and PRs. The current URL is [selection-house-e-commerce-platform.vercel.app](https://selection-house-e-commerce-platform.vercel.app).
3. **Supabase:** there are separate projects, `selection-house-production` in Mumbai (`ap-south-1`) and `selection-house-preview` in Tokyo (`ap-northeast-1`). Both have Data API and automatic table exposure disabled. The Vercel Supabase integration added extra `SUPABASE_*` / `POSTGRES_*` variables; this app uses only Prisma's `DATABASE_URL` and `DIRECT_URL`. Verify that Production values point to the production database and Preview values to the preview database. Prefer the Supabase transaction pooler for runtime and the direct connection for migrations; never commit either URL. Review current plan limits before launch.
4. **Cloudinary:** create a free account at [cloudinary.com](https://cloudinary.com). The dashboard's **API Environment variable** is a secret; store it only as `CLOUDINARY_URL` in Vercel. Current product editing accepts image URLs and this code does not yet upload to Cloudinary, so that integration still needs implementation before using this variable.
5. **Upstash:** create a Redis database at [upstash.com](https://upstash.com), choose a nearby region, then copy the REST URL and REST token from the database page. OTP and admin rate limits currently use the database and in-memory app state; Upstash-backed shared rate limiting still needs implementation before relying on it across serverless instances.
6. **Razorpay:** create a business account at [razorpay.com](https://razorpay.com), enable **Test Mode**, and find test API keys under **Account & Settings → API Keys**. Current checkout records manual payment and does not connect to Razorpay; Razorpay payments/webhooks need implementation and testing before these keys are useful. Test credentials are separate from live credentials.
7. **Sentry:** create a project at [sentry.io](https://sentry.io) for Next.js and copy its DSN. `SENTRY_DSN` is listed for the planned monitoring integration; Sentry is not initialized in the current code yet.

## GitHub and Vercel workflow

The repository's `main` and `dev` branches both currently point to the initial app commit. Work on `dev` or a `feature/<short-name>` branch; open a PR into `dev` for review, then promote reviewed changes to `main` when they are ready for production. Vercel previews let you inspect a PR before it goes live. Keep Preview connected only to the preview database.

## Environment variables

In Vercel open **Project → Settings → Environment Variables**. Add Production and Preview values separately. The database URLs must point to different Supabase projects (or isolated databases). Set secrets for the environments where each feature is enabled.

| Name | Purpose | Production / Preview |
|---|---|---|
| `DATABASE_URL` | PostgreSQL pooled runtime connection | Production pooled URL / separate preview pooled URL |
| `DIRECT_URL` | Direct PostgreSQL connection for migrations | Corresponding direct URL for each environment |
| `SESSION_SECRET` | Signs staff session cookies; use a different random value, at least 32 characters, per environment | Required in both; currently shared, split before launch |
| `ADMIN_EMAIL` | Admin login email | Set by owner; currently shared across environments |
| `ADMIN_PASSWORD` | Admin login password for the current environment-variable auth implementation | Use a unique strong value per environment; currently shared, split before launch |
| `OTP_WEBHOOK_URL` | OTP delivery provider endpoint | Leave unset until configured; current production OTP login returns unavailable without it |
| `OTP_WEBHOOK_TOKEN` | Bearer token for OTP endpoint | Secret; only when OTP endpoint is configured |
| `STORE_LEGAL_NAME`, `STORE_ADDRESS`, `STORE_PHONE` | Store details on printed documents | Real business values / safe preview values |
| `STORE_GSTIN` | GSTIN for final invoices | Real registered value / test value or unset |
| `CLOUDINARY_URL` | Planned product image uploads | Not used until integration is implemented |
| `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN` | Planned shared rate limiting | Not used until integration is implemented |
| `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET` | Planned online payments | Test keys in Preview; live keys only after KYC and implementation |
| `SENTRY_DSN` | Planned error monitoring | Not used until integration is implemented |

The listed provider placeholders may remain blank until their integrations are implemented. The current app authenticates the admin against `ADMIN_EMAIL` and `ADMIN_PASSWORD`; hashed first-run database credentials are not implemented yet. Split the shared admin and session values between Production and Preview before launch, and replace any weak or previously shared password with a strong owner-controlled password.

## Database migrations and deploys

The baseline migration is now checked in at `prisma/migrations/20260926000000_init`. To apply it, copy `.env.example` to `.env` locally and set the Preview project's direct connection string in `DIRECT_URL` and its runtime connection string in `DATABASE_URL`, then run:

```powershell
pnpm db:generate
pnpm db:migrate:deploy
pnpm db:seed
```

Apply the migration to Preview first, check the site and workflows, then repeat with Production's direct connection string. The seed adds three demo products; use it only for Preview, or remove the demo rows before opening Production. For later schema changes, create a migration with `pnpm db:migrate --name <short-description>` against a development database, commit the resulting folder in `prisma/migrations`, and run `pnpm db:migrate:deploy` against the target database before deploying dependent code. Never run Preview migrations against Production. Vercel is not yet configured to apply database migrations automatically; this guide uses a deliberate manual rollout.

## Test checkout before launch

The current checkout supports BOB transfer and pay-at-pickup only. Place a test order in Preview, verify stock decreased, mark it paid from Admin, and verify order lookup. Razorpay end-to-end checkout, test UPI/card numbers, webhook signature checks, and webhook idempotency are not implemented yet; do not enable live payments until those are built and tested. Razorpay supplies current test payment details in its own dashboard and documentation.

## Razorpay live activation

Start business verification early if online payments are needed. Razorpay may request PAN, bank account proof or a cancelled cheque, business address proof, and GST registration details where applicable. The exact list depends on the business and current onboarding rules; follow the checklist shown in the Razorpay account. Use test mode while KYC is pending.

## Custom domain

In Vercel open **Project → Settings → Domains**, add the domain, and copy the DNS records Vercel displays. At the domain registrar, add the requested A/AAAA or CNAME records exactly. Wait for Vercel to verify the domain and issue HTTPS before sharing it publicly.

## If a deployment fails

Open the project in Vercel, choose **Deployments**, select the failed deployment, and open **Build Logs**. First check that required environment variables exist in the correct environment and that the Preview database is reachable. Then check the first TypeScript, lint, Prisma, or build error in the log. Do not paste secrets into an issue when asking for help.
