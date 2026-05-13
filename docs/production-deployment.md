# TradeControl Production Deployment

This is a launch checklist for deploying TradeControl on Vercel with Firebase and Stripe. Treat it as a starter operational guide and review legal/security requirements before a public launch.

## Environment Variables

Public browser variables:

- `NEXT_PUBLIC_APP_URL`: production URL, for example `https://tradecontrol.app`
- `NEXT_PUBLIC_FIREBASE_API_KEY`
- `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
- `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
- `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`
- `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
- `NEXT_PUBLIC_FIREBASE_APP_ID`
- `NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID`

Server-only variables:

- `FIREBASE_CLIENT_EMAIL`
- `FIREBASE_PRIVATE_KEY`
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `STRIPE_PRICE_ID_PRO_MONTHLY`
- `OPENAI_API_KEY`

Optional server variables:

- `OPENAI_MODEL`: defaults to `gpt-5-mini`

Do not place Stripe secret keys, webhook secrets, or Firebase Admin private keys in client components or `NEXT_PUBLIC_` variables.

## Firebase

- Enable Email/Password authentication.
- Deploy `firestore.rules`.
- Deploy `storage.rules`.
- Confirm users can only access their own `users/{userId}` document and subcollections.
- Confirm subscription fields can only be changed by trusted server code.
- Confirm screenshots upload only under `users/{userId}/trade-screenshots/{tradeId}/{fileName}`.

## Stripe

- Create the Pro monthly price in Stripe.
- Set `STRIPE_PRICE_ID_PRO_MONTHLY` in Vercel.
- Configure the webhook endpoint: `/api/stripe/webhook`.
- Subscribe to checkout session, customer subscription, and invoice payment events.
- Use Stripe test mode first, then switch Vercel variables to live keys before launch.

## Vercel

- Set every required environment variable for Production and Preview.
- Set `OPENAI_API_KEY` for AI Coach before launch.
- Run `npm run build` locally before deploying.
- Confirm `/dev/checklist` while signed in.
- Confirm `/pricing` checkout opens Stripe Checkout.
- Confirm successful checkout syncs the user profile after redirect or webhook.
- Confirm canceled or failed subscriptions remove Pro access.

## Launch Notes

- TradeControl is a journaling, analytics, and discipline tool. It is not financial advice and does not provide trading signals.
- Legal pages are starter templates and should be reviewed by a lawyer before broad launch.
- Keep Firebase and Stripe dashboard access limited to trusted operators.
