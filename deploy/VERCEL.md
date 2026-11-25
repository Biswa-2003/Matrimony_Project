# Free deployment: Vercel + Neon

Vercel runs the whole Next.js app — the pages **and** the backend (`src/app/api/*` become serverless
functions). Neon is the PostgreSQL database. No separate backend server is needed.

```
Visitor ──HTTPS──► Vercel (pages + /api functions) ──SSL──► Neon PostgreSQL
                     │                                └────► Vercel Blob (private: photos & site images)
                     Vercel Cron: Sunday weekly digest
```

## Free-plan limits to know

| | Limit | What it means for MatriMoney |
|---|---|---|
| Vercel Hobby | **Personal, non-commercial use only** | Fine for testing and a portfolio. Once you charge members, Vercel's terms require Pro ($20/month). |
| Vercel Hobby | 4.5 MB request size | Photo uploads are capped at 4 MB already — OK. |
| Vercel | No permanent disk | New photos are saved in the database already. Old photos in `public/uploads` must be moved (step 2). |
| Neon Free | ~0.5 GB storage | With Vercel Blob (step 3b) photos don't use database space. Without it they do. |
| Vercel Blob (Hobby) | ~1 GB storage, ~10 GB transfer / month | Thousands of photos (most are 100–500 KB). Check vercel.com/pricing for current limits. |
| Neon Free | Sleeps when idle | First request after a quiet spell takes ~1 second longer. |
| In-memory rate limits | Kept per function instance | Still works, just less strict than on one server. |

## Step 1 — Push the code (laptop)

```bash
git add -A
git commit -m "Prepare Vercel deployment"
git push
```

## Step 2 — Prepare the Neon database (laptop, PowerShell)

In the Neon console → your project → **Connect** → turn on **Connection pooling** → copy the
connection string (the host contains `-pooler`, it ends with `?sslmode=require`).

```powershell
$env:DATABASE_URL = "postgresql://USER:PASSWORD@ep-xxxx-pooler.REGION.aws.neon.tech/neondb?sslmode=require"

# create / update all tables (safe to repeat; never drops anything)
npm run db:migrate

# move old member photos from public/uploads into the database (dry run first, then --apply)
node scripts/move-photos-to-db.mjs
node scripts/move-photos-to-db.mjs --apply

# set a strong admin password (replaces Admin@12345!)
$env:ADMIN_EMAIL = "admin@matrimony.com"; $env:ADMIN_PASSWORD = "Choose-A-Strong#Password1"; $env:NODE_ENV = "production"
node scripts/seed-admin.mjs

# remove admin rights from the old test admin, if it exists in this database
psql $env:DATABASE_URL -c "UPDATE users SET role='user' WHERE email ILIKE 'debug%@example.com';"

# close this PowerShell window afterwards so these values don't stay set
```

> **Which data goes live?** Your laptop's local database has the newest data (recent members, chats,
> settings). If Neon holds older data and you want the local data live instead, copy it over — this
> **replaces** what is in Neon, so back Neon up first:
> ```powershell
> npm run db:backup     # backs up the LOCAL database into backups\
> pg_restore --clean --if-exists --no-owner --no-privileges -d $env:DATABASE_URL backups\matrimoney-<newest>.dump
> ```

## Step 3 — Create the Vercel project (10 min)

1. vercel.com → sign in with GitHub → **Add New → Project** → import `Matrimony_Project`.
2. Framework: **Next.js** (detected). Leave build settings as they are.
3. **Environment Variables** — add these before the first deploy:

| Name | Value |
|---|---|
| `DATABASE_URL` | the Neon **pooled** connection string from step 2 |
| `JWT_SECRET` | a new long random value (`openssl rand -hex 32`, or any 64 random characters) |
| `CRON_SECRET` | another new random value (Vercel sends it to the weekly digest automatically) |
| `NEXT_PUBLIC_BASE_URL` | `https://<your-project>.vercel.app` (or your own domain later) |
| `EMAIL_USER` / `EMAIL_PASS` | Gmail address + 16-character **App password** |
| `SUPPORT_EMAIL` | the email shown for support |
| `NEXT_PUBLIC_SHOW_DEMO_LOGIN` | `false` |
| `REQUIRE_EMAIL_OTP` | `true` |
| `PAYMENTS_TEST_MODE` | `false` — **never** `true` on the live site (it lets anyone activate a plan free) |
| `OPENROUTER_API_KEY`, `OPENROUTER_MODEL` | only if you use the AI assistant |
| `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET` | when you have Razorpay keys |

4. **Settings → Functions → Region**: pick the region **next to your Neon database** — every page makes
   several database calls, so a far-apart app and database make every page slow.
   - Neon in `us-east-1` (current) → Vercel **Washington, D.C. (iad1)**
   - Neon in Singapore / Mumbai → Vercel **Singapore (sin1)** / **Mumbai (bom1)** — faster for Indian visitors
5. **Deploy**. When it finishes, open the `.vercel.app` link.

## Step 3b — Vercel Blob for photos (3 min)

1. Vercel → your project → **Storage → Create → Blob**.
2. Name it (e.g. `matrimoney-photos`), choose **Private** access, pick the region nearest your app, and
   **connect it to the project** (all environments). Vercel adds `BLOB_READ_WRITE_TOKEN` by itself.
3. **Deployments → ⋯ → Redeploy**.

From then on every new member photo and admin image is stored in Blob. Images keep their addresses
(`/api/member-photo/…`, `/api/media/…`), so the photo lock still applies — private blobs are only
read by the server, never linked directly. Images uploaded before Blob was switched on stay in the
database and keep working.

If you ever create a **Public** store instead, also add `BLOB_ACCESS=public`.

If you didn't know the final URL before deploying: set `NEXT_PUBLIC_BASE_URL`, then
**Deployments → ⋯ → Redeploy** (settings starting with `NEXT_PUBLIC_` are baked in at build time).

## Step 4 — Own domain (optional, free HTTPS)

Vercel → project → **Settings → Domains** → add your domain → add the DNS records Vercel shows at
your domain provider. Then update `NEXT_PUBLIC_BASE_URL` and redeploy.

## Step 5 — Test the live site

- [ ] Home page, login, register (OTP email arrives), forgot password (link opens the live URL, not localhost)
- [ ] Upload a photo, edit profile, search, send/accept interest, chat
- [ ] Old member photos show (the ones moved in step 2)
- [ ] Admin login works with the **new** password only
- [ ] Admin → Users: delete test/demo accounts you don't want live
- [ ] Vercel → **Settings → Cron Jobs** shows the weekly digest

## Updating later

Just `git push` — Vercel builds and deploys every push to `main` automatically.
If you add new tables/columns, run `npm run db:migrate` against Neon (step 2) as well.
