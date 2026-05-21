# SmartLease — Deployment Guide

## Overview
- **Frontend** → Vercel (free tier works)
- **Backend API** → Render (Starter plan ~$7/mo)
- **Background Worker** → Render Worker (~$7/mo)
- **MongoDB** → MongoDB Atlas
- **Redis** → Render Redis (~$10/mo) or Upstash (free tier)
- **File Storage** → Cloudflare R2 (free 10GB/mo) or AWS S3
- **Email** → Resend (free 3,000/mo)
- **Payments** → Razorpay

---

## Step 1 — External Services Setup

### 1a. Anthropic API Key
1. Go to https://console.anthropic.com
2. Create API key
3. Save as `ANTHROPIC_API_KEY`

### 1b. Razorpay
1. Go to https://dashboard.razorpay.com
2. Copy your API key ID and secret as `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET`
3. Create two subscription plans:
   - **SmartLease Pro** -> Rs 499/month -> copy Plan ID as `RAZORPAY_PRO_PLAN_ID`
   - **SmartLease Business** -> Rs 2,499/month -> copy Plan ID as `RAZORPAY_BUSINESS_PLAN_ID`
4. Set up webhook:
   - URL: `https://your-render-url.onrender.com/api/webhooks/razorpay`
   - Events: `subscription.authenticated`, `subscription.activated`, `subscription.charged`, `subscription.cancelled`, `subscription.completed`, `subscription.expired`, `payment.captured`, `order.paid`
   - Copy signing secret as `RAZORPAY_WEBHOOK_SECRET`

### 1c. Cloudflare R2 (file storage)
1. Go to https://dash.cloudflare.com → R2
2. Create bucket: `smartlease-uploads`
3. Settings → Public Access → Enable
4. API Tokens → Create token with R2 permissions
5. Copy endpoint, access key, secret key

### 1d. Resend (email)
1. Go to https://resend.com → Create account
2. Add your domain or use their sandbox
3. API Keys → Create key → save as `RESEND_API_KEY`

---

## Step 2 — GitHub Setup

```bash
# In the smartlease/ directory:
git init
git add .
git commit -m "Initial commit — SmartLease full-stack SaaS"

# Create repo on GitHub (github.com/new)
git remote add origin https://github.com/YOUR_USERNAME/smartlease.git
git branch -M main
git push -u origin main
```

---

## Step 3 — Render (Backend)

### 3a. Database
1. Use your MongoDB Atlas cluster.
2. Create or reuse a database named `smartlease`.
3. Save the connection string as `MONGO_URI`.

### 3b. Redis
1. New → Redis
2. Name: `smartlease-redis`, Region: Singapore, Plan: Starter
3. Copy connection string → save as `REDIS_URL`

### 3c. Backend Web Service
1. New → Web Service → Connect GitHub → select `smartlease`
2. Settings:
   - **Name**: `smartlease-api`
   - **Root Directory**: `backend`
   - **Runtime**: Docker
   - **Dockerfile Path**: `./Dockerfile`
   - **Region**: Singapore
   - **Plan**: Starter ($7/mo)
3. Add ALL environment variables from `backend/.env.example`
4. Set:
   - `NODE_ENV=production`
   - `APP_URL=https://your-vercel-url.vercel.app`
   - `API_URL=https://smartlease-api.onrender.com`
   - `CORS_ORIGINS=https://your-vercel-url.vercel.app`
5. Deploy → wait for green ✓
6. Copy service URL (e.g. `https://smartlease-api.onrender.com`)

### 3d. Run Database Migrations
After deploy, go to Render Shell:
```bash
npx prisma db push
npx prisma db seed
```

Or use Render's one-off job feature.

### 3e. Background Worker
1. New → Background Worker → Connect same repo
2. Settings:
   - **Name**: `smartlease-worker`
   - **Root Directory**: `backend`
   - **Runtime**: Docker
   - **Start Command**: `node dist/worker.js`
3. Add same environment variables (only needs DB, Redis, Anthropic, Storage)
4. Deploy

---

## Step 4 — Vercel (Frontend)

1. Go to https://vercel.com → New Project → Import from GitHub → select `smartlease`
2. Settings:
   - **Root Directory**: `frontend`
   - **Framework**: Vite
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
3. Add environment variable:
   - `VITE_API_URL` = `https://smartlease-api.onrender.com`
4. Deploy → get URL (e.g. `https://smartlease.vercel.app`)
5. Go back to Render → update `APP_URL` and `CORS_ORIGINS` with Vercel URL
6. Go back to Razorpay -> update webhook URL with Render URL

---

## Step 5 — Custom Domain (Optional)

### Frontend (Vercel)
1. Vercel Dashboard → Project → Settings → Domains
2. Add `smartlease.in` → Follow DNS instructions

### Backend (Render)
1. Render Dashboard → Service → Settings → Custom Domain
2. Add `api.smartlease.in` → Follow DNS instructions
3. Update `API_URL` and `CORS_ORIGINS` accordingly

---

## Step 6 — Verify Everything Works

```bash
# Health check
curl https://smartlease-api.onrender.com/health

# Should return:
# {"status":"ok","services":{"database":"ok","redis":"ok"}}
```

1. Visit your Vercel URL
2. Register a new account
3. Check email for verification
4. Upload a test PDF lease
5. Wait for analysis (30-60 seconds)
6. Test Razorpay checkout with your Razorpay test credentials

---

## Environment Variables Reference

### Backend (Render)
| Variable | Description | Required |
|----------|-------------|----------|
| `MONGO_URI` | MongoDB Atlas connection string | ✅ |
| `REDIS_URL` | Redis connection string | ✅ |
| `JWT_SECRET` | 32+ char random string | ✅ |
| `JWT_REFRESH_SECRET` | 32+ char random string | ✅ |
| `ANTHROPIC_API_KEY` | Claude API key | ✅ |
| `RAZORPAY_KEY_ID` | Razorpay key ID | ✅ |
| `RAZORPAY_KEY_SECRET` | Razorpay key secret | ✅ |
| `RAZORPAY_WEBHOOK_SECRET` | Razorpay webhook signing secret | ✅ |
| `RAZORPAY_PRO_PLAN_ID` | Pro plan subscription ID | ✅ |
| `RAZORPAY_BUSINESS_PLAN_ID` | Business plan subscription ID | ✅ |
| `PAYMENT_SIMULATION` | Local checkout simulation flag | optional |
| `STORAGE_BUCKET` | R2/S3 bucket name | ✅ |
| `STORAGE_ENDPOINT` | R2/S3 endpoint URL | ✅ |
| `STORAGE_ACCESS_KEY` | R2/S3 access key | ✅ |
| `STORAGE_SECRET_KEY` | R2/S3 secret key | ✅ |
| `STORAGE_PUBLIC_URL` | Public CDN URL | ✅ |
| `RESEND_API_KEY` | Resend email key | ✅ |
| `APP_URL` | Vercel frontend URL | ✅ |
| `API_URL` | Render backend URL | ✅ |
| `CORS_ORIGINS` | Allowed frontend origins | ✅ |

### Frontend (Vercel)
| Variable | Description | Required |
|----------|-------------|----------|
| `VITE_API_URL` | Backend API URL | ✅ |

---

## Monthly Cost Estimate

| Service | Plan | Cost |
|---------|------|------|
| Vercel | Hobby (free) | $0 |
| Render Web | Starter | $7 |
| Render Worker | Starter | $7 |
| MongoDB Atlas | Free/shared cluster or paid tier | $0+ |
| Render Redis | Starter | $10 |
| Cloudflare R2 | Free (10GB) | $0 |
| Resend | Free (3k/mo) | $0 |
| **Total** | | **~$31/mo** |

Break-even: **7 Pro subscribers** (7 × ₹499 = ₹3,493 ≈ $42/mo)

---

## Scaling Up

When you hit 100+ users:
- Move MongoDB Atlas to a dedicated cluster
- Move Redis to Upstash (consumption-based)
- Add CDN for R2 assets
- Enable Render autoscaling
- Add a staging environment
