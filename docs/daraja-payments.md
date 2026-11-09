# Daraja (Safaricom M-Pesa) payments

The billing page offers MTN Mobile Money, Safaricom M-Pesa, and Polar as
separate payment choices. The initial selection is suggested from the
organization's `publicMetadata.country` (`UG` → MTN, `KE` → M-Pesa, otherwise
Polar), but the organization may choose either mobile-money rail. The choice is
saved as `publicMetadata.billingProvider`, and server-side billing, subscription
checks, credits, and pricing use that selected rail. Payment records and credit
ledgers remain separate between MTN and M-Pesa.

## Environment

Configure these server-only variables in the deployment environment:

| Variable | Purpose |
| --- | --- |
| `MPESA_CONSUMER_KEY` | Daraja app consumer key |
| `MPESA_CONSUMER_SECRET` | Daraja app consumer secret |
| `MPESA_BUSINESS_SHORTCODE` | Paybill/Till shortcode enabled for STK Push |
| `MPESA_PASSKEY` | STK Push passkey issued for the shortcode |
| `MPESA_CALLBACK_URL` | Public HTTPS URL ending in `/api/webhooks/mpesa` |
| `MPESA_ENVIRONMENT` | `sandbox` or `production` |

Use the sandbox credentials and a publicly reachable callback URL for testing.
Production credentials, shortcode, passkey, and callback configuration must be
the production values issued for the business. Never expose these values to the
browser.

## Payment behavior

Starter and Pro prices use the current UGX plan prices converted at the fixed
rate of **32 UGX per KES**. The calculated KES amount is rounded up to a whole
shilling; the actual KES payment is stored with its UGX-equivalent ledger value.
PAYG metered top-ups use the same conversion. This is a fixed configured
business rule, not a live exchange-rate quote.

Daraja payments, subscriptions, credits, and callback IDs are stored separately
from MTN MoMo. The `/api/webhooks/mpesa` callback is only a notification: the
server verifies successful STK results against Daraja before applying a plan or
top-up. Payment finalization is idempotent, and browser polling is scoped to the
signed-in organization.

Apply the Prisma migration before deploying code that reads the new tables.
