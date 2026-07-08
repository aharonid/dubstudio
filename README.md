# DubStudio

DubStudio is a portfolio case study for an AI video dubbing product: upload a video, choose a target language, track processing, manage credits, organize completed dubs, and share finished clips without requiring every viewer to create an account.

The repo is public to show product engineering, UX judgment, and full-stack implementation patterns. Production credentials, deployment runbooks, and private operating details are intentionally excluded.

## What It Demonstrates

- A React/Vite application with authenticated user flows, protected routes, and responsive product UI.
- A media workflow that tracks long-running AI dubbing jobs from upload through completion.
- Dashboard surfaces for organizing generated clips by status, language, duration, and share state.
- Credit and purchase flows designed around usage-based AI processing.
- Admin and analytics views for monitoring users, conversion, activity, contact submissions, feedback, and job health.
- Share links that let recipients view completed output without needing a full account.
- Database migrations and serverless functions that document how the product model evolved over time.

## Product Surfaces

- **Landing and upload flow:** creator-focused onboarding with language selection and job submission.
- **Dashboard:** job history, download actions, audio-only options, sharing, and status monitoring.
- **Account:** profile, credits, privacy controls, purchase history, and achievement-style engagement.
- **Pricing:** packaged credit purchase flow backed by a checkout integration.
- **Admin:** operational views for product feedback, customer support, analytics, and abuse monitoring.

## Technical Shape

The app uses a client-heavy React architecture with serverless boundaries for sensitive operations:

- **Frontend:** React, Vite, TypeScript, Tailwind CSS, React Router, Lucide icons.
- **Data/auth:** Supabase client, protected routes, row-level-security-oriented migrations.
- **Payments:** Stripe checkout integration for credit purchases.
- **AI media workflow:** Supabase Edge Functions coordinate dubbing job creation, status polling, download access, and webhook updates.
- **Messaging:** serverless email forwarding and transactional email support.
- **Analytics/admin:** internal product dashboards built from application events, user profiles, purchases, quiz responses, and feedback.

## Public Repo Boundaries

This repository is intentionally not a deployment manual. The public code keeps implementation structure visible while avoiding private operational details:

- Real secrets and service credentials are not committed.
- Environment files are examples only.
- Webhook secrets, provider keys, and production project configuration are not documented here.
- Internal business operations and private contact details are removed or generalized.

## Local Development

```bash
npm install
npm run dev
```

Useful checks:

```bash
npm run typecheck
npm run lint
npm run build
```

For local experimentation, create an `.env` from `.env.example` and supply your own test project credentials. Do not use production credentials in a public fork.

## Live Demo

https://usedubstudio.vercel.app
