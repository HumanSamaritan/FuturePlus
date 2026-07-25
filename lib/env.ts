export function getSupabaseConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!url || !publishableKey) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY');
  }

  return { url, publishableKey };
}

// Development/testing access: any user successfully authenticated by Google
// through Supabase may use the application. Replace this with an explicit
// approval check before moving to a production staff rollout.
export function isAllowedUserEmail(email?: string | null) {
  return Boolean(email);
}
