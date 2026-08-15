'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { isAllowedUserEmail } from '@/lib/env';
import { createClient } from '@/lib/supabase/server';

export async function saveLinkedInProfileTextAction(formData: FormData) {
  const supabase = await createClient();
  const studentId = String(formData.get('studentId') || '').trim();
  const linkedinProfileText = String(formData.get('linkedinProfileText') || '').trim();
  if (!studentId) throw new Error('Student ID is required.');

  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user || !isAllowedUserEmail(user.email)) {
    throw new Error('Authorised staff access is required.');
  }

  const { error } = await supabase.from('students').update({
    linkedin_profile_text: linkedinProfileText || null,
    updated_at: new Date().toISOString()
  }).eq('id', studentId);
  if (error) throw new Error(error.message);

  revalidatePath(`/students/${studentId}`);
  redirect(`/students/${studentId}#linkedin-ai-review`);
}
