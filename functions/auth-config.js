export async function onRequestGet({ env }) {
  const publishableKey = env.CLERK_PUBLISHABLE_KEY || "";

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
