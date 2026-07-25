export function getSupabaseConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!url || !publishableKey) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY');
  }

  return { url, publishableKey };
}

export function getStaffAccessResult(email?: string | null) {
  if (!email) {
    return { allowed: false, reason: 'missing_email' as const };
  }

  const allowList = (process.env.FUTURE_PLUS_STAFF_EMAILS || '')
    .split(/[,\n;]/)
    .map((item) => item.trim().replace(/^['"]|['"]$/g, '').toLowerCase())
    .filter(Boolean);

  if (!allowList.length) {
    return { allowed: false, reason: 'allowlist_not_configured' as const };
  }

  const normalisedEmail = email.trim().toLowerCase();
  const domain = normalisedEmail.split('@')[1];
  const allowed = allowList.some((entry) => {
    if (entry.startsWith('*@')) return domain === entry.slice(2);
    if (entry.startsWith('@')) return domain === entry.slice(1);
    return normalisedEmail === entry;
  });

  return { allowed, reason: allowed ? 'approved' as const : 'not_approved' as const };
}

export function isAllowedUserEmail(email?: string | null) {
  return getStaffAccessResult(email).allowed;
}
