const PUBLIC_CLERK_PUBLISHABLE_KEY = "pk_live_Y2xlcmsuZnJhbmNoaXNlZS5pZCQ";

export async function onRequestGet({ env }) {
  const publishableKey =
    env.PUBLIC_CLERK_PUBLISHABLE_KEY ||
    env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY ||
    env.CLERK_PUBLISHABLE_KEY ||
    PUBLIC_CLERK_PUBLISHABLE_KEY;

  return new Response(
    JSON.stringify({
      publishableKey,
      configured: Boolean(publishableKey),
    }),
    {
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-store",
      },
    }
  );
}
