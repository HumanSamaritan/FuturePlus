'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';

async function requireUser() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Staff login is required.');
  return { supabase, user };
}

async function requireAdmin() {
  const { supabase, user } = await requireUser();
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
  if (profile?.role !== 'admin') throw new Error('Only a Super User can authorize deletion.');
  return { supabase, user };
}

export async function requestUniversityDeletionAction(formData: FormData) {
  const { supabase, user } = await requireUser();
  const collegeId = z.string().uuid().parse(formData.get('collegeId'));
  const programLevel = z.enum(['undergraduate', 'postgraduate']).parse(formData.get('programLevel'));
  const targetName = z.string().min(1).parse(formData.get('targetName'));
  const { error } = await supabase.from('deletion_requests').insert({
    target_type: 'university_programme',
    target_id: collegeId,
    program_level: programLevel,
    target_name: targetName,
    requested_by: user.id,
    requested_by_email: user.email
  });
  if (error) throw new Error(error.code === '23505' ? 'A pending deletion request already exists for this university row.' : error.message);
  revalidatePath('/admin');
  redirect(`/colleges?deletionRequested=${Date.now()}`);
}

export async function requestStudentDeletionAction(formData: FormData) {
  const { supabase, user } = await requireUser();
  const studentId = z.string().uuid().parse(formData.get('studentId'));
  const targetName = z.string().min(1).parse(formData.get('targetName'));
  const { error } = await supabase.from('deletion_requests').insert({
    target_type: 'student',
    target_id: studentId,
    target_name: targetName,
    requested_by: user.id,
    requested_by_email: user.email
  });
  if (error) throw new Error(error.code === '23505' ? 'A pending deletion request already exists for this student.' : error.message);
  revalidatePath('/admin');
  redirect(`/students/${studentId}?deletionRequested=1`);
}

export async function decideDeletionRequestAction(formData: FormData) {
  const { supabase, user } = await requireAdmin();
  const requestId = z.string().uuid().parse(formData.get('requestId'));
  const decision = z.enum(['approved', 'rejected']).parse(formData.get('decision'));
  const { data: request, error: requestError } = await supabase
    .from('deletion_requests').select('*').eq('id', requestId).eq('status', 'pending').single();
  if (requestError) throw new Error(requestError.message);

  if (decision === 'approved') {
    if (request.target_type === 'student') {
      const { error } = await supabase.from('students').delete().eq('id', request.target_id);
      if (error) throw new Error(error.message);
    } else {
      const { error } = await supabase.from('courses').delete()
        .eq('college_id', request.target_id).eq('program_level', request.program_level);
      if (error) throw new Error(error.message);
      const { count } = await supabase.from('courses').select('*', { count: 'exact', head: true }).eq('college_id', request.target_id);
      if ((count ?? 0) === 0) {
        const { error: collegeError } = await supabase.from('colleges').delete().eq('id', request.target_id);
        if (collegeError) throw new Error(collegeError.message);
      }
    }
  }

  const { error: updateError } = await supabase.from('deletion_requests').update({
    status: decision,
    decided_by: user.id,
    decided_at: new Date().toISOString()
  }).eq('id', requestId);
  if (updateError) throw new Error(updateError.message);
  revalidatePath('/admin');
  revalidatePath('/dashboard');
  revalidatePath('/colleges');
  redirect(`/admin?decision=${decision}&at=${Date.now()}`);
}
