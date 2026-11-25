# Deploying MatriMoney on AWS Lightsail

One Ubuntu server runs everything: the Next.js app (with PM2), Nginx with free HTTPS, and PostgreSQL.
It costs about **$12/month** (paid from your AWS free credits at first).

```
Visitor ──HTTPS──► Nginx (:443) ──► Next.js app via PM2 (:3000) ──► PostgreSQL (localhost:5432)
                                         cron: daily backup · weekly digest email
```

| File | What it does |
|---|---|
| `setup-server.sh` | One-time install: swap, Node 22, PM2, Nginx, PostgreSQL 16, Certbot. Creates the database. |
| `env.production.example` | Template for the server's settings file `.env.production`. |
| `deploy.sh` | Every update: pull → install → build → migrate → restart → health check. |
| `ecosystem.config.cjs` | PM2 settings (keeps the app running, restarts after reboot). |
| `nginx-matrimoney.conf` | Nginx site (forwards traffic to the app, 6 MB upload limit). |
| `backup.sh`, `weekly-digest.sh`, `crontab.txt` | Daily database backup and the Sunday match email. |

> **You need a domain name for login to work.** On the live site the login cookie only travels over
> HTTPS, and HTTPS needs a domain. No domain yet? For testing use the free address
> `YOUR-IP-WITH-DASHES.sslip.io` (for example `13-233-45-67.sslip.io`): it points to your IP with no setup.

---

## Step 0 — On your laptop: push the code (5 min)

The server downloads the code from GitHub, so the latest work must be pushed:

```bash
git add -A
git commit -m "Add Lightsail deployment files"
git push
```

If the GitHub repo is **private**, the server needs permission to read it. The easiest way: GitHub →
Settings → Developer settings → **Personal access tokens (fine-grained)** → read-only access to this
repo → use it as the password when `git clone` asks.

Also make a fresh database backup now (it goes to `backups\`):

```bash
npm run db:backup
```

## Step 1 — AWS account safety (15 min)

1. Sign in to the AWS console. Turn on **MFA** for the root user (top right → Security credentials).
2. **Billing → Budgets → Create budget → Zero spend budget** (or a $5 monthly budget) so you get an
   email before any real charge.

## Step 2 — Create the server (10 min)

Lightsail console → **Create instance**:

- Region: **Mumbai (ap-south-1)**
- Platform: **Linux/Unix** → Blueprint: **OS Only → Ubuntu 24.04 LTS**
- SSH key: keep the default, and **download it** (`LightsailDefaultKey-ap-south-1.pem`) — you need it to copy files.
- Plan: **2 GB RAM** (about $12). Smaller plans are too small to build the app.
- Name: `matrimoney` → **Create instance**.

## Step 3 — Static IP and firewall (5 min)

1. **Networking → Create static IP** → attach it to `matrimoney`. Note the IP (example: `13.233.45.67`).
2. Open the instance → **Networking** tab → IPv4 firewall:
   - SSH (22) — already there. (Optional: restrict it to your own IP.)
   - HTTP (80) — already there.
   - **Add rule → HTTPS (443)**.
   - Do **not** open 3000 or 5432.

## Step 4 — Connect and install everything (15–20 min, mostly waiting)

Open the instance → **Connect using SSH** (opens a terminal in the browser). Then:

```bash
sudo mkdir -p /var/www/matrimoney && sudo chown ubuntu:ubuntu /var/www/matrimoney
git clone https://github.com/Biswa-2003/Matrimony_Project.git /var/www/matrimoney
cd /var/www/matrimoney
bash deploy/setup-server.sh
```

At the end it prints a line starting with `DATABASE_URL=postgresql://…` — **copy and save it**.

## Step 5 — Settings file (10 min)

```bash
cd /var/www/matrimoney
cp deploy/env.production.example .env.production
openssl rand -hex 32     # run twice: one value for JWT_SECRET, one for CRON_SECRET
nano .env.production
```

Fill in: `DATABASE_URL` (from step 4), `NEXT_PUBLIC_BASE_URL` (`https://your-domain` or
`https://13-233-45-67.sslip.io`), `JWT_SECRET`, `CRON_SECRET`, the Gmail `EMAIL_USER`/`EMAIL_PASS`,
and the AI key if you use it. Keep `PAYMENTS_TEST_MODE=false`.
Save with **Ctrl+O, Enter**, exit with **Ctrl+X**. Then lock the file:

```bash
chmod 600 .env.production
```

## Step 6 — Copy your data to the server (15–20 min)

**On your laptop** (PowerShell, in the project folder). Replace the key path, file name and IP:

```powershell
scp -i C:\path\to\LightsailDefaultKey-ap-south-1.pem backups\matrimoney-YYYY-MM-DD_HHMM.dump ubuntu@13.233.45.67:/tmp/db.dump
# old member photos that are still files on disk:
scp -i C:\path\to\LightsailDefaultKey-ap-south-1.pem -r public\uploads ubuntu@13.233.45.67:/var/www/matrimoney/public/
```

**On the server:**

```bash
cd /var/www/matrimoney
DB=$(grep -E '^DATABASE_URL=' .env.production | cut -d= -f2-)
pg_restore --no-owner --no-privileges -d "$DB" /tmp/db.dump
node --env-file=.env.production scripts/migrate.mjs
rm /tmp/db.dump
```

A few "already exists" messages from `pg_restore` are normal.

**Secure the admin accounts** (your local database has a test admin `debug@example.com`):

```bash
psql "$DB" -c "UPDATE users SET role='user' WHERE email ILIKE 'debug%@example.com';"
ADMIN_EMAIL=admin@matrimony.com ADMIN_PASSWORD='Choose-A-Strong#Password1' \
  NODE_ENV=production node --env-file=.env.production scripts/seed-admin.mjs
```

(Use your own email and a strong password. This replaces the old `Admin@12345!`.)

## Step 7 — First start (10–15 min, the build takes a few minutes)

```bash
cd /var/www/matrimoney
bash deploy/deploy.sh
```

It should end with `OK - the app is running (HTTP 200)`.

## Step 8 — Point your domain at the server (10 min + waiting)

- **Own domain:** in your domain provider's DNS settings add two **A records**: `@` → your static IP,
  and `www` → your static IP. It usually works within an hour (can take up to 24–48 h).
- **sslip.io for testing:** nothing to do — `13-233-45-67.sslip.io` already points to `13.233.45.67`.

Check from your laptop: `nslookup your-domain` should show the static IP.

## Step 9 — Nginx and HTTPS (10 min)

On the server (replace `your-domain.com`):

```bash
cd /var/www/matrimoney
sudo sed "s/YOUR_DOMAIN/your-domain.com/g" deploy/nginx-matrimoney.conf | sudo tee /etc/nginx/sites-available/matrimoney >/dev/null
sudo ln -sf /etc/nginx/sites-available/matrimoney /etc/nginx/sites-enabled/matrimoney
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t && sudo systemctl reload nginx

sudo certbot --nginx -d your-domain.com -d www.your-domain.com
```

With sslip.io, use only one `-d` (no `www`) and remove ` www.YOUR_DOMAIN` from the `server_name` line.
Certbot asks for your email and renews the certificate automatically.

## Step 10 — Scheduled jobs (2 min)

```bash
crontab /var/www/matrimoney/deploy/crontab.txt
crontab -l     # shows the two jobs
bash deploy/backup.sh   # run one backup now to check it works
```

## Step 11 — Test the live site (30–45 min)

- [ ] `https://your-domain` opens with a padlock; `http://` redirects to `https://`
- [ ] Register a new account → the OTP email arrives → login works
- [ ] Forgot password email arrives and its link opens your domain (not localhost)
- [ ] Upload a photo, edit the profile, search, send an interest, accept, chat
- [ ] Admin login with the **new** password works; the old `Admin@12345!` does not
- [ ] Admin → Users: delete the test/demo accounts you don't want live (Priya, Arjun, debug-…, lipisahu@example.com)
- [ ] Login page shows no demo login buttons
- [ ] Lightsail → instance → **Snapshots → Enable automatic snapshots**

---

## Every future update (about 2 minutes)

On your laptop: `git push`. On the server:

```bash
cd /var/www/matrimoney && bash deploy/deploy.sh
```

## Handy commands

| Need | Command |
|---|---|
| App logs | `pm2 logs matrimoney --lines 100` |
| App status / memory | `pm2 status` · `pm2 monit` |
| Restart app | `pm2 reload matrimoney` |
| Nginx errors | `sudo tail -50 /var/log/nginx/error.log` |
| Database shell | `psql "$(grep -E '^DATABASE_URL=' .env.production \| cut -d= -f2-)"` |
| Backups | `ls -lh /var/backups/matrimoney` |
| Restore a backup | `pg_restore --clean --if-exists --no-owner -d "<DATABASE_URL>" /var/backups/matrimoney/<file>.dump` |

## If something goes wrong

| Problem | Fix |
|---|---|
| **502 Bad Gateway** | The app isn't running: `pm2 logs matrimoney`. Often a missing setting in `.env.production`. |
| **Can't stay logged in** | You're on `http://` or a bare IP. Use the domain with `https://`. |
| **Build killed / out of memory** | Check swap is on: `free -h` (should show 2 GB swap). |
| **Certbot fails** | DNS isn't pointing to the server yet (`nslookup`), or port 80 is closed in the Lightsail firewall. |
| **Emails not sending** | Gmail needs an *App password*, not your normal password. Check `pm2 logs`. |
| **Changed `.env.production`** | Settings starting with `NEXT_PUBLIC_` need a rebuild: `bash deploy/deploy.sh`. Others: `pm2 reload matrimoney --update-env`. |
