export function getSupabaseConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!url || !publishableKey) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY');
  }

  return { url, publishableKey };
}

export function getAllowedStaffDomain() {
  return (process.env.ALLOWED_STAFF_DOMAIN || 'omnexagoc.com').toLowerCase();
}

export function isAllowedStaffEmail(email?: string | null) {
  if (!email) return false;
  return email.toLowerCase().endsWith(`@${getAllowedStaffDomain()}`);
}
