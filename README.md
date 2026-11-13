# The Money Circle

Website, checkout and onboarding automation for The Money Circle, all in one Next.js app. It replaces Make.com/Zapier with code you own.

```
Landing page → /enroll/[package] → Paystack (inline popup) ─┐
                                   Bank transfer → coach approves in /admin ─┤
                                                                            ▼
                       /api/webhooks/paystack  →  lib/onboarding.ts (the "router")
                          1. Duplicate the package's Master Vault in Google Drive, rename every file, share with the student
                          2. Build community invites (WhatsApp links / single-use Telegram links)
                          3. Email the branded acceptance letter + Calendly link (name & email prefilled)
                          4. Ping you: "New student payment received!" (email and/or Telegram)
                          5. Log the student in your Enrollments Google Sheet
```

| Package | Route | Vault template | Communities |
|---|---|---|---|
| Academy Pass (monthly/annual) | `academy` | none | Academy |
| Foundation & Wealth | `wealth` | `VAULT_TEMPLATE_WEALTH_ID` | Wealth & Planning + Academy |
| LaunchPad (Incubator / Sprint) | `launchpad` | `VAULT_TEMPLATE_LAUNCHPAD_ID` | LaunchPad Founders |
| The Billionaire Circle | `full` | `VAULT_TEMPLATE_FULL_ID` | VIP + LaunchPad + Wealth |

**Prices, copy and inclusions live in [`lib/packages.ts`](lib/packages.ts).** The Academy, LaunchPad and Billionaire Circle prices there are placeholders. Set your real ones.

## Run it locally

```bash
npm install
cp .env.example .env.local   # then fill it in
npm run dev                  # http://localhost:3000
```

The site works with an empty `.env.local`. Set `EMAIL_PROVIDER=console` to print emails in the terminal instead of sending them.

## One-time setup

### 1. Paystack
1. Get your **secret key** (Settings → API Keys & Webhooks) → `PAYSTACK_SECRET_KEY`. Start with `sk_test_…`.
2. Set the **Webhook URL** to `https://YOUR-DOMAIN/api/webhooks/paystack`.
3. (Optional) For a recurring Academy subscription, create Plans and put their codes in `PAYSTACK_PLAN_ACADEMY_*`.

Locally, Paystack can't reach your webhook, so set `ONBOARD_ON_CALLBACK=true` to run onboarding from the success page while testing.

### 2. Google Drive master vaults
1. Create a folder per package, e.g. `Master Template Wealth Vault`, with your Docs/Sheets inside (sub-folders are copied too).
2. Name files so they personalise automatically. Any of these work:
   - `{{CLIENT_NAME}}'s Money Tracker`
   - `[Client Name]'s Money Tracker`
   - `Master Money Tracker` / `Master Template Money Tracker`

   Each one becomes **"Ada Obi's Money Tracker"**.
3. Copy each folder's ID (the last part of its URL) into `VAULT_TEMPLATE_*_ID`.
4. Make a "Client Vaults" folder for the copies → `VAULTS_PARENT_FOLDER_ID`.
5. Make a blank Google Sheet for the ledger → `ENROLLMENTS_SHEET_ID`. Headers are added automatically.

### 3. Google authorisation (Drive + Gmail + Sheets)
1. In [Google Cloud Console](https://console.cloud.google.com/), create a project and enable the **Google Drive API**, **Gmail API** and **Google Sheets API**.
2. Set up the OAuth consent screen (External). Add your own Gmail as a test user, or publish the app so the token doesn't expire after 7 days.
3. Create credentials → **OAuth client ID → Desktop app**. Put the ID and secret in `.env.local`.
4. Run `npm run google:auth`, sign in with the account that owns the master vaults, and paste the printed `GOOGLE_REFRESH_TOKEN` into `.env.local`.
5. Set `EMAIL_FROM` to that same Gmail address.

Vaults are created in your Drive and shared with the student as **editor**. If the student uses a non-Gmail address, Google will also send its own "shared with you" email.

### 4. Booking & communities
- Calendly event links go in `BOOKING_*_URL`. The student's name and email are prefilled, and Calendly handles your questionnaire, Meet/Zoom link and reminders.
- WhatsApp group invite links go in `COMMUNITY_*_URL`. WhatsApp doesn't allow adding people automatically, so the link goes in the acceptance letter.
- Telegram (optional): add your bot as an admin of each group and set `TELEGRAM_CHAT_*`. Each student then gets a **single-use** invite link. `TELEGRAM_ADMIN_CHAT_ID` sends you payment pings.

### 5. Coach console: `/admin`
Sign in with `ADMIN_SECRET`. It shows a **system check** of everything configured and lets you **approve bank transfers**. When a student picks "Direct bank transfer", you get an email with a one-click link that pre-fills this form.

## Reliability
- **Idempotent:** each payment reference is recorded in the ledger sheet. A retried webhook won't create a second vault or send a second letter, and each Drive vault is tagged with its reference.
- **Self-healing:** if a step fails, the webhook returns an error so Paystack retries it later, and you get a "needs attention" alert. The acceptance letter is held back until the vault exists, so no student gets a broken welcome.
- **Secure:** webhook signatures are verified with HMAC-SHA512, prices always come from the server, and the paid amount is checked against the package.
- Subscription renewals don't re-run onboarding.

## Deploy
Vercel is the easiest option: import the repo, add every variable from `.env.example`, set `SITE_URL` to your domain, then update the Paystack webhook URL. The webhook allows up to 60s for vault copying. That works on Vercel's free plan; on other hosts make sure functions can run that long.
