import "server-only";

const publicEnvKeys = [
  "NEXT_PUBLIC_APP_URL",
  "NEXT_PUBLIC_FIREBASE_API_KEY",
  "NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN",
  "NEXT_PUBLIC_FIREBASE_PROJECT_ID",
  "NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET",
  "NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID",
  "NEXT_PUBLIC_FIREBASE_APP_ID",
  "NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID",
  "NEXT_PUBLIC_POSTHOG_KEY",
  "NEXT_PUBLIC_POSTHOG_HOST"
] as const;

const serverEnvKeys = [
  "EMAIL_FROM",
  "FIREBASE_CLIENT_EMAIL",
  "FIREBASE_PRIVATE_KEY",
  "OPENAI_API_KEY",
  "RESEND_API_KEY",
  "STRIPE_SECRET_KEY",
  "STRIPE_WEBHOOK_SECRET",
  "STRIPE_PRICE_ID_PRO_MONTHLY"
] as const;

export type EnvStatus = {
  key: string;
  configured: boolean;
  scope: "public" | "server";
};

export function getEnvironmentStatus(): EnvStatus[] {
  return [
    ...publicEnvKeys.map((key) => ({ key, configured: Boolean(process.env[key]), scope: "public" as const })),
    ...serverEnvKeys.map((key) => ({ key, configured: Boolean(process.env[key]), scope: "server" as const }))
  ];
}

export function isWebhookConfigured() {
  return Boolean(process.env.STRIPE_WEBHOOK_SECRET);
}
