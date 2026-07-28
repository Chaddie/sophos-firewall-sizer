# Sophos Firewall Sizer

Customer-facing firewall sizing questionnaire with vanity URLs and a presales dashboard for Sophos XGS appliance recommendations.

## Features

- **Vanity URLs** — presales creates `/r/{slug}` links to send to customers
- **Multi-step questionnaire** — environment, WAN traffic, protection level, VPN, authentication, HA
- **Sizing engine** — recommends physical XGS, virtual SFv, AWS, or Azure models from public Sophos specs
- **Presales dashboard** — view submissions, recommendations, and copyable quote summaries

## Stack

- Next.js 16 (App Router)
- PostgreSQL via Neon + Drizzle ORM
- Auth.js (credentials) for presales login
- Tailwind CSS + shadcn/ui

## Local development

### 1. Clone and install

```bash
cd ~/Projects/sophos-firewall-sizer
npm install
```

### 2. Configure environment

```bash
cp .env.example .env.local
```

Set these values in `.env.local`:

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | Neon Postgres connection string |
| `AUTH_SECRET` | Random secret (`openssl rand -base64 32`) |
| `AUTH_URL` | `http://localhost:3000` for local dev |
| `NEXT_PUBLIC_APP_URL` | `http://localhost:3000` for local vanity links |

### 3. Set up the database

Create a free database at [neon.tech](https://neon.tech), then push the schema:

```bash
npm run db:push
```

Seed the presales admin user:

```bash
npm run db:seed
```

Default credentials (override via env vars in `.env.local`):

- Email: `admin@example.com`
- Password: `changeme123`

### 4. Run the dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000), sign in, and create a sizing link.

## Deploy to Vercel + Neon

### Neon

1. Create a project at [neon.tech](https://neon.tech)
2. Copy the **pooled** connection string

### Vercel

1. Import the repository in [vercel.com](https://vercel.com)
2. Set environment variables:

| Variable | Value |
|----------|-------|
| `DATABASE_URL` | Neon connection string |
| `AUTH_SECRET` | Production secret |
| `AUTH_URL` | `https://your-domain.vercel.app` |
| `NEXT_PUBLIC_APP_URL` | `https://your-domain.vercel.app` |

3. Deploy, then run migrations and seed against production:

```bash
DATABASE_URL="your-neon-url" npm run db:push
DATABASE_URL="your-neon-url" SEED_ADMIN_EMAIL=you@company.com SEED_ADMIN_PASSWORD=secure-password npm run db:seed
```

### Custom domain

1. Add your domain in Vercel → Project → Settings → Domains
2. Update `AUTH_URL` and `NEXT_PUBLIC_APP_URL` to your custom domain
3. Redeploy

Example vanity URL: `https://sizer.yourcompany.com/r/acme-corp-jul2026`

## Sizing logic

The engine lives in `lib/sizing/engine.ts` with product specs in `lib/sizing/catalog.json`. To tune recommendations after MVP:

1. Edit throughput formulas in `engine.ts`
2. Update model specs in `catalog.json`
3. Redeploy (no UI changes required)

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Production build |
| `npm run db:push` | Push schema to Postgres |
| `npm run db:generate` | Generate Drizzle migrations |
| `npm run db:seed` | Create/update admin user |

## Project structure

```
app/
  dashboard/          Presales dashboard
  login/              Presales sign-in
  r/[slug]/           Customer questionnaire
lib/
  sizing/             Engine + catalog
  db/                 Drizzle schema
  actions.ts          Server actions
```
