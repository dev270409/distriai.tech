# DISTRIAI Infrastructure Portal

Distributed AI Compute Network - Enterprise-ready infrastructure for decentralized AI inference at scale.

## Project Structure

```
/
├── index.html              # Main landing page
├── admin.html              # Admin dashboard (password protected)
├── privacy.html            # Privacy policy
├── terms.html              # Terms of use
├── logo.png                # DISTRIAI logo
├── trees-bg.jpg            # Background image
├── api/                    # Vercel serverless functions
│   ├── pilot-request.js    # POST /api/pilot-request
│   ├── node-waitlist.js    # POST /api/node-waitlist
│   ├── newsletter.js       # POST /api/newsletter
│   └── admin.js            # Admin API endpoints
├── database/
│   └── schema.sql          # PostgreSQL/Supabase schema
├── package.json
├── vercel.json
├── .env.example
└── README.md
```

## Setup Instructions

### 1. Supabase Database

1. Create a free account at [supabase.com](https://supabase.com)
2. Create a new project
3. Go to SQL Editor and run the contents of `database/schema.sql`
4. Go to Project Settings > API to get your credentials:
   - `SUPABASE_URL` - Project URL
   - `SUPABASE_ANON_KEY` - anon/public key
   - `SUPABASE_SERVICE_KEY` - service_role key (keep secret!)

### 2. Resend Email (Optional)

1. Create account at [resend.com](https://resend.com)
2. Add and verify your domain (distriai.tech)
3. Create an API key
4. Set `RESEND_API_KEY` in environment variables

### 3. Environment Variables

Copy `.env.example` to `.env` and fill in your values:

```bash
# Supabase Database
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_ANON_KEY=eyJhbGc...
SUPABASE_SERVICE_KEY=eyJhbGc...

# Resend Email (optional)
RESEND_API_KEY=re_xxxxx

# Admin Panel
ADMIN_PASSWORD=your-secure-password-here

# Analytics (optional)
GA_MEASUREMENT_ID=G-XXXXXXXXXX

# Calendly (optional)
CALENDLY_URL=https://calendly.com/your-link
```

### 4. Deploy to Vercel

1. Push code to GitHub
2. Import repository on [vercel.com](https://vercel.com)
3. Add environment variables in Vercel dashboard:
   - Go to Project Settings > Environment Variables
   - Add all variables from `.env`
4. Deploy!

### 5. Custom Domain

1. Go to Vercel Project Settings > Domains
2. Add `distriai.tech`
3. Follow DNS configuration instructions

## Database Schema

### pilot_requests
| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| name | VARCHAR | Contact name |
| email | VARCHAR | Contact email |
| role | VARCHAR | Job role |
| company | VARCHAR | Company name |
| message | TEXT | Request message |
| created_at | TIMESTAMP | Submission time |
| status | VARCHAR | new/contacted/in_call/closed |

### node_waitlist
| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| name | VARCHAR | Operator name |
| email | VARCHAR | Contact email |
| gpu_type | VARCHAR | GPU model |
| country | VARCHAR | Location |
| created_at | TIMESTAMP | Submission time |
| status | VARCHAR | new/contacted/approved/active/inactive |

### newsletter_subscribers
| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| email | VARCHAR | Subscriber email |
| created_at | TIMESTAMP | Subscription time |

## API Endpoints

### POST /api/pilot-request
Submit pilot program application.

```json
{
  "name": "John Doe",
  "email": "john@company.com",
  "role": "CTO",
  "company": "Acme Inc",
  "message": "Interested in pilot..."
}
```

### POST /api/node-waitlist
Join node operator waitlist.

```json
{
  "name": "Jane Doe",
  "email": "jane@email.com",
  "gpu_type": "RTX 4090",
  "country": "USA"
}
```

### POST /api/newsletter
Subscribe to newsletter.

```json
{
  "email": "subscriber@email.com"
}
```

### GET /api/admin?action=stats
Get all data (requires authorization header).

```bash
curl -H "Authorization: Bearer YOUR_ADMIN_PASSWORD" \
  https://distriai.tech/api/admin?action=stats
```

## Admin Panel

Access at `/admin.html` with the password set in `ADMIN_PASSWORD`.

Features:
- View all pilot requests
- View node waitlist
- View newsletter subscribers
- Update status fields

## Security Features

- Honeypot anti-spam fields
- Rate limiting (5 requests/minute per IP)
- Server-side validation
- No secrets exposed client-side
- Password-protected admin panel

## Contact

partnerships@distriai.tech
