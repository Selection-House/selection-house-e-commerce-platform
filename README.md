# Selection House

Mobile-friendly sports goods storefront and school quotation tracker for Selection House, Pilibhit.

## Run locally

1. Copy `.env.example` to `.env` and set the database URLs and unique local secrets.
2. Start PostgreSQL with `docker compose up -d db` (Docker Desktop must be installed and running), or use a separate hosted PostgreSQL database.
3. Install dependencies with `pnpm install`.
4. Create the database schema and sample catalog with `pnpm db:migrate --name init`, then `pnpm db:seed`.
5. Start the app with `pnpm dev` and open `http://localhost:3000`.

The admin area is at `/admin`. Set `ADMIN_EMAIL`, `ADMIN_PASSWORD`, and `SESSION_SECRET` in `.env`; the sample values are placeholders. Never reuse the password included in the project brief.

The seed adds three clearly named demo products (four sample varieties) with Shop and Godown quantities. Remove or edit them from the admin product screen after trying the workflow.

## Included workflows

- Public catalog, product variants, cart, pickup or manual-delivery checkout, and order lookup.
- Staff product, variant, category, brand, and stock management with barcode/SKU CSV import/export.
- School records, draft/sent quotations, conversion to GST invoices, due dates, and full-payment recording.
- Shared inventory across online orders and school orders; cancelling a retail order restores its stock.

Prices entered in the catalog include GST. Invoice totals show the included GST amount using the product's configured rate. Product tax rates are staff-managed and must be checked for the actual items before use.

## Production setup notes

- Set `DATABASE_URL`, a unique strong `SESSION_SECRET`, and strong admin credentials in the deployment environment.
- Configure `STORE_GSTIN` and the seller address/phone values before issuing GST invoices. The print view labels an invoice as a draft while GSTIN is missing.
- The app records BOB transfer and pay-at-pickup methods; it does not connect to BOB or Razorpay.
- The OTP provider interface sends through an optional authenticated webhook (`OTP_WEBHOOK_URL` and `OTP_WEBHOOK_TOKEN`). Without it, OTP codes are written only to the development server log.
- CSV uses the app's template columns. Map Busy/Tally files after inspecting a representative export from the store.

## Deploying

See [SETUP.md](SETUP.md) for GitHub, Vercel, Supabase, environment variables, migrations, and launch steps. The cloud payment, image upload, shared rate limit, and monitoring providers described there are not integrated yet; current checkout is manual payment.
