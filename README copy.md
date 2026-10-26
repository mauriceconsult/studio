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

# Fal song generation (APP_URL must be publicly reachable over HTTPS for webhooks)
FAL_KEY=
SONG_WEBHOOK_SECRET=
SONG_FAL_MODEL=fal-ai/ace-step-1.5

# Fal music-video clips
CLIP_WEBHOOK_SECRET=
CLIP_FAL_T2V_MODEL=fal-ai/wan/v2.2-a14b/text-to-video
CLIP_FAL_I2V_MODEL=fal-ai/wan/v2.2-a14b/image-to-video
CLIP_FAL_RESOLUTION=480p
CLIP_FAL_PRICE_PER_SECOND_480P=0.04
CLIP_FAL_PRICE_PER_SECOND_580P=0.06
CLIP_FAL_PRICE_PER_SECOND_720P=0.08
STILL_FAL_MODEL=fal-ai/flux/schnell
PRICING_USD_UGX=5000
PRICING_MOMO_PAYMENT_FEE=0.03
PRICING_POLAR_PAYMENT_FEE=0.04
PRICING_SONG_COST_PER_SECOND_USD=0.0003
PRICING_IMAGE_COST_PER_MEGAPIXEL_USD=0.003
PRICING_SONG_MULTIPLE=3
PRICING_IMAGE_MULTIPLE=3
PRICING_CLIP_MULTIPLE=2
PRICING_POLAR_MIN_PURCHASE_USD=10
```

Generation prices use the provider cost multiplied by the configured product
multiple, grossed up for the payment rail's percentage fee. MoMo prices round
up to the next 100 UGX. These defaults use a 5,000 UGX/USD planning rate as an
FX buffer above the 26 Oct 2026 mid-market rate; review the exchange rate and
payment fees monthly. The MTN fee remains a placeholder pending confirmation
against the provider agreement. Fal FLUX.1 [schnell] is configured at $0.003
per megapixel, rounded up to the next megapixel by the provider.

Before submitting, authenticated clients can query `POST /api/quote` with type
`song`, `image`, `clip`, or `project`; the authenticated tRPC procedures
`pricing.quoteSong`, `pricing.quoteImage`, and `pricing.quoteClip` are also
available. Client-facing quotes include prices, not provider costs. Quotes are
saved on generation jobs. MoMo song and clip failures refund their stored
quoted amount. The music-video scene image endpoint is
`POST /api/music-videos/{id}/scenes/{sceneId}/image`. For projects with many
scenes, submit image requests in small batches to stay within provider and
function limits. Polar's USD minimum is a payment/top-up constraint, not an
individual generation price.

Wan 2.2 generates at 16 fps; the clip adapter derives its frame count from the
requested duration and defaults to 480p. Fal's current listed rates are
$0.04/video-second at 480p, $0.06 at 580p, and $0.08 at 720p, so a 5-second
clip costs about $0.20 at the selected setting. Check the model pages for
current prices before changing the resolution:

- [Wan 2.2 text-to-video](https://fal.ai/models/fal-ai/wan/v2.2-a14b/text-to-video)
- [Wan 2.2 image-to-video](https://fal.ai/models/fal-ai/wan/v2.2-a14b/image-to-video)

Run the durable music-video render worker alongside the Next.js app:

```bash
npm run worker:music-video
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
