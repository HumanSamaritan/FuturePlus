import { NextRequest, NextResponse } from 'next/server';
import { resolveMx } from 'node:dns/promises';
import { isValidEmailAddress } from '@/lib/form-validation';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  const email = request.nextUrl.searchParams.get('email')?.trim() || '';
  if (!email || !isValidEmailAddress(email)) {
    return NextResponse.json({ ok: false, valid: false, reason: 'invalid_format' }, { status: 400 });
  }

  const domain = email.split('@')[1]?.toLowerCase() || '';
  try {
    const mx = await resolveMx(domain);
    const valid = Array.isArray(mx) && mx.length > 0;
    return NextResponse.json({ ok: true, valid, domain });
  } catch {
    return NextResponse.json({ ok: true, valid: false, domain });
  }
}
