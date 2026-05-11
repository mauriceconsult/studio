# Studio AI — by Maxnovate

**AI-powered content creation for African creators and educators.**

Studio AI is a web platform that lets you generate tutorial videos, clone voices, create images, and write content — all in one place, paid via MTN Mobile Money.

🌍 **Live at [studio.maxnovate.com](https://studio.maxnovate.com)**

---

## What you can do with Studio AI

| Feature | Description |
|---|---|
| **Video tutorials** | Generate step-by-step tutorial videos from text or prompts |
| **Voice cloning** | Clone and customise voices for narration |
| **Image generation** | Create images from text descriptions |
| **Text generation** | Write articles, scripts, captions, and more |

---

## Getting started

### 1. Create an account

Go to [studio.maxnovate.com/sign-up](https://studio.maxnovate.com/sign-up) and sign up with your email. Studio AI uses organisations — you will be prompted to create or join one after signing in.

### 2. Choose a plan

| Plan | Price | Best for |
|---|---|---|
| Starter | UGX 50,000/mo (~$13) | Individuals exploring AI creation |
| Pro | UGX 120,000/mo (~$32) | Creators and educators |
| Studio | UGX 280,000/mo (~$75) | Teams and power users |

Pay securely with **MTN Mobile Money** — no dollar card required.

### 3. Start creating

Once your plan is active, navigate to the dashboard and choose a generation type:

- **Generate** → create a new tutorial video or text piece
- **Images** → generate visuals from a text prompt
- **Voice** → clone or select a voice for narration
- **History** → view and manage all your past generations

---

## Platform suite

Studio AI is part of the Maxnovate platform:

| Product | URL | Description |
|---|---|---|
| Maxnovate | [maxnovate.com](https://maxnovate.com) | Consultancy and platform hub |
| Studio AI | [studio.maxnovate.com](https://studio.maxnovate.com) | AI content creation |
| InstaSkul | [instaskul.com](https://instaskul.com) | EdTech and learning management |
| Vendly | [vendly.com](https://vendly.com) | E-commerce for African sellers |

---

## Tech stack

- **Framework:** Next.js 16 (App Router)
- **Auth:** Clerk (organisations)
- **Database:** PostgreSQL via Prisma
- **Storage:** Cloudflare R2
- **Payments:** MTN Mobile Money (MoMo API)
- **AI:** Chatterbox (voice), custom generation pipeline
- **Deployment:** Vercel

---

## Self-hosting

Studio AI is open source under the MIT licence. To run it locally:

```bash
git clone https://github.com/maxnovate/studio
cd studio
npm install
cp .env.example .env.local   # fill in your env vars
npx prisma migrate dev
npm run dev
```

### Required environment variables

```env
# Database
DATABASE_URL=

# Clerk
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up

# Cloudflare R2
R2_ACCOUNT_ID=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_BUCKET_NAME=

# Polar (billing)
POLAR_ACCESS_TOKEN=
POLAR_SERVER=sandbox
POLAR_PRODUCT_ID=

# MTN Mobile Money
MOMO_BASE_URL=
MOMO_SUBSCRIPTION_KEY=
MOMO_API_USER=
MOMO_API_KEY=

# App
APP_URL=http://localhost:3000
```

---

## Contributing

Pull requests are welcome. For major changes, open an issue first to discuss what you would like to change.

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/your-feature`)
3. Commit your changes
4. Push to the branch and open a pull request

Please follow the existing code style — TypeScript, no `any`, server actions over API routes where possible.

---

## Legal

- [Terms of Service](./TERMS.md)
- [Privacy Policy](./PRIVACY.md)
- Licensed under the [MIT License](./LICENSE)

---

© 2025 Maxnovate Consultancy Company Limited · Kampala, Uganda
