# SmartLease — Full-Stack SaaS

AI-powered rental lease analyzer. Upload any lease, get instant clause-by-clause risk analysis, tenant rights guidance, and negotiation scripts.

## Architecture

```
smartlease/
├── backend/          # Node.js + Express API
│   └── src/
│       ├── routes/   # Auth, leases, billing, AI
│       ├── middleware/
│       ├── services/ # AI, PDF, email, storage
│       └── models/   # Prisma ORM models
├── frontend/         # React + Vite SPA
│   └── src/
│       ├── components/
│       ├── pages/
│       ├── hooks/
│       ├── lib/      # API client, utils
│       └── store/    # Zustand state
└── shared/           # Types, constants
```

## Tech Stack

### Frontend
- React 18 + TypeScript
- Vite (build)
- Tailwind CSS + custom design tokens
- Zustand (state management)
- React Query (server state + caching)
- React Router v6
- Razorpay Checkout (payments)

### Backend
- Node.js + Express + TypeScript
- Prisma ORM + MongoDB
- Redis (sessions, rate limiting, queue)
- BullMQ (background jobs — PDF processing)
- JWT + httpOnly cookies (auth)
- Razorpay (subscriptions)
- Anthropic Claude API (AI analysis)
- Cloudinary or AWS S3 / Cloudflare R2 (file storage)
- Resend (transactional email)
- pdf-parse + pdfjs-dist (PDF extraction)

### Infrastructure
- Docker + Docker Compose (local dev)
- Railway / Render (backend deployment)
- Vercel (frontend deployment)
- MongoDB Atlas
- Redis (Upstash)
- Cloudinary or Cloudflare R2 (file storage)

## Revenue Model
- Free: 2 analyses/month
- Pro (₹499/mo): 10 analyses, full features, PDF reports
- Business (₹2499/mo): Unlimited, team, API, white-label

## Quick Start
```bash
# 1. Clone and install
npm install

# 2. Set up environment
cp .env.example .env
# Fill in your keys

# 3. Start with Docker
docker-compose up

# 4. Run migrations
cd backend && npx prisma db push

# 5. Start dev servers
npm run dev
```
