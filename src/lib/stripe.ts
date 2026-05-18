import Stripe from "stripe";

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error("STRIPE_SECRET_KEY env var is not set");
}

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2026-04-22.dahlia",
  typescript: true,
});

export const STRIPE_PRO_PRICE_ID = process.env.STRIPE_PRO_PRICE_ID!;

export const APP_URL = process.env.NEXTAUTH_URL ?? "https://www.pipely.it";
