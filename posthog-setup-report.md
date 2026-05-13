<wizard-report>
# PostHog post-wizard report

The wizard has completed a deep integration of PostHog analytics into the **TradeControl** Next.js App Router project. The following changes were made:

- **Environment variables**: Fixed `NEXT_PUBLIC_POSTHOG_HOST` (was pointing to a replay URL; corrected to `https://eu.i.posthog.com`) and confirmed `NEXT_PUBLIC_POSTHOG_KEY` in `.env.local`.
- **`lib/analytics.ts`**: Enabled `capture_exceptions: true` for automatic error tracking; fixed the fallback host to `eu.i.posthog.com`; added `captureException()` export.
- **`lib/posthog-server.ts`** *(new)*: Server-side PostHog client using `posthog-node` for API route tracking.
- **`components/auth-provider.tsx`**: Added `identifyUser()` calls on login and registration so users are immediately identified in PostHog at the moment of authentication.
- **`components/trade-form.tsx`**: Added `trade_added` and `trade_updated` event capture (with instrument, result, session, strategy, setup quality, and rule-followed properties) on successful save.
- **`components/paywall-modal.tsx`**: Added `paywall_shown` event capture (with the locked feature name) when the upgrade modal opens.
- **`app/api/stripe/webhook/route.ts`**: Added server-side events for `checkout_completed`, `subscription_cancelled`, and `payment_failed` — all tied to the resolved Firebase user ID so server and client events correlate correctly.
- **`posthog-node`** installed as a production dependency.

| Event | Description | File |
|---|---|---|
| `user_registered` | New user successfully completes registration | `components/auth-provider.tsx` |
| `user_logged_in` | User successfully logs in | `components/auth-provider.tsx` |
| `user_logged_out` | User signs out | `components/auth-provider.tsx` |
| `onboarding_completed` | User finishes the onboarding wizard | `components/onboarding-client.tsx` |
| `checkout_started` | User initiates Stripe checkout | `components/pricing-client.tsx`, `components/paywall-modal.tsx` |
| `manage_billing_clicked` | Pro user opens billing portal | `components/pricing-client.tsx` |
| `trade_added` | User saves a new trade journal entry | `components/trade-form.tsx` |
| `trade_updated` | User updates an existing trade entry | `components/trade-form.tsx` |
| `paywall_shown` | Upgrade paywall modal is displayed | `components/paywall-modal.tsx` |
| `checkout_completed` | Stripe checkout.session.completed webhook received | `app/api/stripe/webhook/route.ts` |
| `subscription_cancelled` | Stripe subscription deleted webhook received | `app/api/stripe/webhook/route.ts` |
| `payment_failed` | Stripe invoice.payment_failed webhook received | `app/api/stripe/webhook/route.ts` |
| `api_failure` | Any tracked API or async error | `lib/analytics.ts` (via wrapper) |

## Next steps

We've built a dashboard and five insights to monitor the most business-critical behaviour:

- [Analytics basics dashboard](/dashboard/679733)
- [New Signups Over Time](/insights/P6A9qqkU) — daily registration trend
- [Signup → Onboarding → First Trade Funnel](/insights/zmznGx2M) — activation funnel
- [Checkout Conversion Funnel](/insights/43KyhqGM) — checkout start → completion rate
- [Paywall to Paid Conversion](/insights/D6EcYjtg) — paywall exposure → paid conversion
- [Subscription Churn Events](/insights/pUVNDIrI) — cancellations and failed payments

### Agent skill

We've left an agent skill folder in your project. You can use this context for further agent development when using Claude Code. This will help ensure the model provides the most up-to-date approaches for integrating PostHog.

</wizard-report>
