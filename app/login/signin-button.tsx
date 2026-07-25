'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';

export default function LoginButton() {
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  async function signIn() {
    setLoading(true);
    setErrorMessage('');
    const supabase = createClient();
    const redirectTo = `${window.location.origin}/auth/callback`;
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo,
        queryParams: {
          access_type: 'offline',
          prompt: 'consent'
        }
      }
    });

    if (error) {
      setErrorMessage(error.message);
      setLoading(false);
    }
  }

  return (
    <>
      {errorMessage ? <p className="alert">{errorMessage}</p> : null}
      <button className="primary-button" type="button" onClick={signIn} disabled={loading}>
        {loading ? 'Opening Google…' : 'Continue with Google'}
      </button>
    </>
  );
}
