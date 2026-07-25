'use client';

import { createClient } from '@/lib/supabase/client';

export default function LoginButton() {
  async function signIn() {
    const supabase = createClient();
    const redirectTo = `${window.location.origin}/auth/callback`;
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo,
        queryParams: {
          access_type: 'offline',
          prompt: 'consent'
        }
      }
    });
  }

  return (
    <button className="primary-button" type="button" onClick={signIn}>
      Continue with Google
    </button>
  );
}
