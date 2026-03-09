# DISTRIAI.tech

Functional backend integration for contact flows, Supabase persistence, admin protection, email notifications, analytics events, and Calendly runtime configuration.

## File tree

```text
.
|-- .env.example
|-- admin.html
|-- index.html
|-- package.json
|-- vercel.json
|-- api/
|   |-- _lib/
|   |   |-- admin-auth.js
|   |   |-- env.js
|   |   |-- request.js
|   |   `-- supabase.js
|   |-- admin-login.js
|   |-- admin-logout.js
|   |-- admin-session.js
|   |-- admin.js
|   |-- newsletter.js
|   |-- node-waitlist.js
|   |-- pilot-request.js
|   `-- public-config.js
|-- database/
|   |-- schema.sql
|   `-- migrations/
|       `-- 20260305_contact_forms_and_admin.sql
`-- frontend/public/
    |-- admin.html
    `-- index.html
```

## Environment variables

Required in Vercel Project Settings > Environment Variables:

```bash
SUPABASE_URL=
SUPABASE_ANON_KEY=
SUPABASE_SERVICE_KEY=
SUPABASE_SERVICE_ROLE_KEY=
RESEND_API_KEY=
ADMIN_PASSWORD=
GA_MEASUREMENT_ID=
CALENDLY_URL=
CALENDLY_LINK=
```

Notes:
- `SUPABASE_SERVICE_KEY` is used in server routes (`/api/*`).
- `SUPABASE_SERVICE_ROLE_KEY` is also accepted as fallback if that is the key name used in your dashboard.
- `NEXT_PUBLIC_SUPABASE_URL` is accepted as fallback for server routes if `SUPABASE_URL` is not set.
- `SUPABASE_URL` must be the Supabase project URL (`https://<project-ref>.supabase.co`), not a Postgres connection string.
- `CALENDLY_LINK` and `NEXT_PUBLIC_CALENDLY_URL` are accepted as fallbacks to `CALENDLY_URL`.
- Frontend receives only safe runtime config from `/api/public-config`.
- If `RESEND_API_KEY`, `GA_MEASUREMENT_ID`, or `CALENDLY_URL` are missing, site still works.

## Supabase setup

1. Create a Supabase project.
2. Open SQL editor and run:
   - `database/migrations/20260305_contact_forms_and_admin.sql`
3. Confirm tables:
   - `pilot_requests`
   - `node_waitlist`
   - `newsletter_subscribers`

## API routes

- `POST /api/pilot-request`
- `POST /api/node-waitlist`
- `POST /api/newsletter`
- `POST /api/admin-login`
- `POST /api/admin-logout`
- `GET /api/admin-session`
- `GET /api/admin?action=stats`
- `POST /api/admin` (status updates)
- `GET /api/public-config`

Implemented:
- Input validation
- Empty submission protection
- Honeypot spam protection
- Basic in-memory IP rate limiting
- Safe JSON responses and HTTP status codes
- Server-side error logging only

## Admin panel

- Route: `/admin` (mapped in `vercel.json`)
- Login checks `ADMIN_PASSWORD` via `/api/admin-login`
- Session stored in secure HttpOnly cookie
- Dashboard reads:
  - `pilot_requests`
  - `node_waitlist`
  - `newsletter_subscribers`
- Status update enabled for:
  - `pilot_requests.status`
  - `node_waitlist.status`

## Email notifications (Resend)

On new pilot request:
- To: `partnerships@distriai.tech`
- Subject: `New Pilot Request – DISTRIAI`
- Includes: Name, Email, Company, Message

If `RESEND_API_KEY` is missing, submission still succeeds.

## Calendly integration

- Frontend loads `CALENDLY_URL` from `/api/public-config`
- Sets CTA link dynamically
- Renders Calendly iframe
- Shows fallback button if embed fails or stalls
- Tracks `calendly_click` event (if GA enabled)

## Analytics

If `GA_MEASUREMENT_ID` exists:
- Injects GA4 script dynamically
- Tracks:
  - `pilot_submit`
  - `node_waitlist_submit`
  - `newsletter_submit`
  - `calendly_click`

If missing, no analytics script is injected.

## Vercel deployment

1. Push repository to GitHub.
2. Import project in Vercel.
3. Add all environment variables from `.env.example`.
4. Deploy.
5. Validate:
   - Submit all three forms
   - Login at `/admin`
   - Update statuses
   - Check Supabase rows
   - Confirm pilot email notification

## Local run (Vercel runtime)

```bash
npm install
npx vercel dev
```
