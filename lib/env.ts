export function getSupabaseConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!url || !publishableKey) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY');
  }

  return { url, publishableKey };
}

function parseEmailList(value?: string) {
  return (value || '')
    .split(/[,\n;]/)
    .map((item) => {
      const trimmed = item.trim();
      const angleBracketEmail = trimmed.match(/<([^<>]+@[^<>]+)>/)?.[1];
      return (angleBracketEmail || trimmed)
        .replace(/^[\s'"\[\]]+|[\s'"\[\]]+$/g, '')
        .trim()
        .toLowerCase();
    })
    .filter(Boolean);
}

export function getStaffAccessResult(email?: string | null) {
  if (!email) {
    return { allowed: false, reason: 'missing_email' as const };
  }

  const staffEmails = parseEmailList(process.env.FUTURE_PLUS_STAFF_EMAILS);
  const superUserEmails = parseEmailList(process.env.FUTURE_PLUS_SUPER_USER_EMAILS);
  const allowList = [...staffEmails, ...superUserEmails];

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

export function getConfiguredStaffRole(email?: string | null) {
  if (!email) return 'staff' as const;
  const superUsers = parseEmailList(process.env.FUTURE_PLUS_SUPER_USER_EMAILS);
  return superUsers.includes(email.trim().toLowerCase()) ? 'admin' as const : 'staff' as const;
}

export function isAllowedUserEmail(email?: string | null) {
  return getStaffAccessResult(email).allowed;
}
