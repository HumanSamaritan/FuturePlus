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
  const { data: isAdmin, error } = await supabase.rpc('is_future_plus_admin');
  if (error || !isAdmin) throw new Error('Only a Super User can authorize deletion.');
  return { supabase, user };
}

async function submitDeletionRequest(input: {
  targetType: 'student' | 'university_programme';
  targetId: string;
  programLevel: 'undergraduate' | 'postgraduate' | null;
  targetName: string;
}) {
  const { supabase, user } = await requireUser();
  const { error: rpcError } = await supabase.rpc('submit_deletion_request', {
    p_target_type: input.targetType,
    p_target_id: input.targetId,
    p_program_level: input.programLevel,
    p_target_name: input.targetName
  });
  if (!rpcError) return null;

  const functionUnavailable =
    rpcError.code === 'PGRST202' ||
    rpcError.code === '42883' ||
    /submit_deletion_request|schema cache/i.test(rpcError.message);
  if (!functionUnavailable) return rpcError.message;

  const { error: insertError } = await supabase.from('deletion_requests').insert({
    target_type: input.targetType,
    target_id: input.targetId,
    program_level: input.programLevel,
    target_name: input.targetName,
    requested_by: user.id,
    requested_by_email: user.email
  });
  return insertError?.message || null;
}

export async function requestUniversityDeletionAction(formData: FormData) {
  const collegeId = z.string().uuid().parse(formData.get('collegeId'));
  const programLevel = z.enum(['undergraduate', 'postgraduate']).parse(formData.get('programLevel'));
  const targetName = z.string().min(1).parse(formData.get('targetName'));
  const error = await submitDeletionRequest({
    targetType: 'university_programme',
    targetId: collegeId,
    programLevel,
    targetName
  });
  if (error) redirect(`/colleges?deletionError=${encodeURIComponent(error)}`);
  revalidatePath('/admin');
  redirect(`/colleges?deletionRequested=${Date.now()}`);
}

export async function requestStudentDeletionAction(formData: FormData) {
  const studentId = z.string().uuid().parse(formData.get('studentId'));
  const targetName = z.string().min(1).parse(formData.get('targetName'));
  const error = await submitDeletionRequest({
    targetType: 'student',
    targetId: studentId,
    programLevel: null,
    targetName
  });
  if (error) redirect(`/students/${studentId}?deletionError=${encodeURIComponent(error)}`);
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
