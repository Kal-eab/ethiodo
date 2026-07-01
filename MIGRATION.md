# Migrating Ethiodo off Base44 — self-hosted on Render

This repo now ships with a self-hosted backend (`/server`: Express + Prisma +
PostgreSQL) that replaces every Base44-managed service. The frontend
(`src/api/base44Client.js`) was rewritten to call that backend instead of
Base44's platform, using the same `base44.*` call shape everywhere else in
the app — so almost no other file had to change.

## What changed

| Was (Base44) | Now |
|---|---|
| Hosted Postgres-like entity store | Your own Postgres (Render Postgres / any Postgres), via Prisma — schema in `server/prisma/schema.prisma` |
| Hosted auth + `redirectToLogin` | Email/password auth with JWTs — `server/src/routes/auth.js`, frontend `src/pages/Login.jsx` |
| Row-level security rules (`base44/entities/*.jsonc`) | Re-implemented in `server/src/entityConfig.js`, enforced in `server/src/routes/entities.js` |
| `Core.UploadFile` | `POST /api/upload` (multer, local disk) — `server/src/routes/upload.js` |
| `entities.X.subscribe()` (realtime) | Socket.io — `server/src/realtime.js` + client `src/lib/apiClient.js` |
| Backend functions (Deno) | Ported to `server/src/functions.js` + `server/src/routes/functions.js` |
| `review_insights` managed agent | Direct Claude API call — `server/src/routes/agents.js` |
| Base44 Vite plugin (`@` alias, HMR notifier) | Plain `resolve.alias` in `vite.config.js` |

## Step-by-step: getting this running on your own infrastructure

### 1. Provision Postgres
- Render: create a Postgres instance (or use the one `render.yaml` provisions automatically).
- Copy the connection string into `server/.env` as `DATABASE_URL` (copy `server/.env.example` to `server/.env` first).

### 2. Run the schema migration
```bash
cd server
npm install
npx prisma migrate dev --name init   # local/dev
# or, in production:
npx prisma migrate deploy
```

### 3. Set backend environment variables
Copy `server/.env.example` → `server/.env` and fill in:
- `JWT_SECRET` — generate with `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"`
- `CORS_ORIGIN` — your deployed frontend URL
- `ANTHROPIC_API_KEY` — required for the admin "Review Insights AI" chat page. Get one at https://console.anthropic.com
- `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` / `GOOGLE_REFRESH_TOKEN` / `GA4_PROPERTY_ID` — optional, only needed for the admin Conversion Rates page (GA4). Without these the page returns a clear "not configured" error instead of crashing.
- `SLACK_BOT_TOKEN` — optional, only if you want Slack channel integration back.

### 4. Set frontend environment variables
Create `.env` at the repo root:
```
VITE_API_URL=https://your-api.onrender.com
```
(Leave empty for local dev if you proxy `/api` to `localhost:3001`, or set it to `http://localhost:3001`.)

### 5. Import your existing data (Products, Orders, Reviews, etc.)
1. In your Base44 dashboard: **Data → \<Entity\> → ⋯ → Export** for every entity **except `User`**.
2. Run the importer per entity:
   ```bash
   cd server
   node scripts/import-csv.js Product ./exports/Product.csv
   node scripts/import-csv.js Order ./exports/Order.csv
   # ...repeat for CartItem, Favorite, Review, Message, Notification, ContactRequest,
   #   ProductLike, ProductShare, ProductEvent, UserBehavior, Creator,
   #   CreatorProductLink, CustomerReferral, ReferralLink, UserNotification, CategoryConfig
   ```
3. **Do not import `User.csv`.** Base44 never exports password hashes, so existing
   accounts can't be carried over — customers create a fresh account via the new
   `/login` page's "Create account" tab. If you want to pre-seed known admin
   accounts, use `POST /api/auth/register` once, then manually set
   `role = 'admin'` on that row in the database.

### 6. Re-host hardcoded Base44 CDN assets
`index.html` still references `https://media.base44.com/...` for the site logo/OG
image (these will break once your Base44 account is gone). Download those images
and replace the URLs with your own hosted copies (e.g. in `/public`) before you
fully disconnect from Base44.

### 7. Deploy
`render.yaml` at the repo root defines three services:
- `ethiodo-db` — managed Postgres
- `ethiodo-api` — the Express backend (`/server`)
- `ethiodo-frontend` — the static Vite build

In the Render dashboard: **New → Blueprint**, point it at this repo, and Render
will provision all three from `render.yaml`. Fill in the `sync: false` secrets
(`ANTHROPIC_API_KEY`, Google/Slack keys) in the dashboard after the first deploy.

### 8. File uploads on Render — important limitation
The upload endpoint (`server/src/routes/upload.js`) currently stores files on
local disk. **Render's free/standard web services have an ephemeral
filesystem** — uploaded product images, payment proofs, and review photos will
be wiped on every deploy or restart. Before going to production, either:
- Attach a [Render Disk](https://render.com/docs/disks) to the API service (persists across deploys, but not across region failover), or
- Swap `upload.js` for an S3-compatible client (Cloudflare R2, AWS S3, Backblaze B2) — the route's public interface (`POST /api/upload` → `{ file_url }`) doesn't need to change, only the implementation inside the handler.

## What's already fully working after these steps
- Auth (register/login/me/update), all product/order/cart/favorite/review/message/notification CRUD with the same RLS rules Base44 enforced
- File uploads (subject to the disk caveat above)
- Realtime notification/order-status bells (Socket.io)
- Scheduled trending/popularity score recalculation (node-cron, replacing Base44's scheduled functions)
- "New product published" notifications (replicated as an in-process hook instead of a platform automation)
- Admin Review Insights AI chat (calls the Claude API directly)

## What still needs your own credentials/setup
- **Google Analytics (Conversion Rates page)** — needs your own GA4 property + OAuth client (`GOOGLE_CLIENT_ID`/`SECRET`/`REFRESH_TOKEN`). Until set, the page shows a clear "not configured" message instead of data.
- **Slack integration** — needs your own Slack app + bot token (`SLACK_BOT_TOKEN`).
- **Mobile app publishing** — Base44 published to iOS/Android from the same codebase. Self-hosting this would require wrapping the React app with Capacitor (or React Native) plus your own Apple/Google developer accounts.

## Known simplifications vs. the original Base44 behavior
- `last_login_at` / `login_count` fields referenced in `App.jsx`'s `updateMe` call aren't persisted (no columns for them) — harmless, just not tracked. Add columns to the `User` model in `schema.prisma` if you want this back.
- Realtime uses simple Socket.io rooms (`admins`, `user:<id>`) rather than Base44's generic per-record subscription — sufficient for the 3 places the app actually used `.subscribe()` (Notification, Order, UserNotification).
