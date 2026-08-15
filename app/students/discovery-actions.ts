'use server';

import { createHash } from 'crypto';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { getCourseCatalog } from '@/lib/data';
import { isAllowedUserEmail } from '@/lib/env';
import { discoverInternationalCollegeInsights } from '@/lib/international-college-discovery';
import { storedStudentToInput } from '@/lib/student-input';
import { createClient } from '@/lib/supabase/server';
import { discoverWebCollegeInsights } from '@/lib/web-college-discovery';

function searchFingerprint(input: ReturnType<typeof storedStudentToInput>, scope: 'national' | 'international', aiSummary?: string | null) {
  const relevant = {
    scope,
    programLevel: input.programLevel,
    subjectsInterest: input.subjectsInterest,
    preferredLocations: input.preferredLocations,
    marksXii: input.marksXii,
    undergraduateDegree: input.undergraduateDegree,
    undergraduateSpecialisation: input.undergraduateSpecialisation,
    undergraduateFinalPercentage: input.undergraduateFinalPercentage,
    budgetMax: input.budgetMax,
    hostelRequired: input.hostelRequired,
    internationalAssessmentContext: scope === 'international' ? (aiSummary || null) : null
  };
  return createHash('sha256').update(JSON.stringify(relevant)).digest('hex');
}

function storedFingerprint(status: any) {
  return typeof status?.profile_fingerprint === 'string' ? status.profile_fingerprint : null;
}

async function getContext(studentId: string) {
  const supabase = await createClient();
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user || !isAllowedUserEmail(user.email)) throw new Error('Authorised staff access is required.');
  const { data: student, error } = await supabase.from('students').select('*').eq('id', studentId).single();
  if (error) throw new Error(error.message);
  return { supabase, student, input: storedStudentToInput(student) };
}

export async function refreshNationalCollegeDiscoveryAction(formData: FormData) {
  const studentId = String(formData.get('studentId') || '');
  const force = String(formData.get('force') || '') === 'true';
  if (!studentId) throw new Error('Student ID is required.');
  const { supabase, student, input } = await getContext(studentId);
  const currentFingerprint = searchFingerprint(input, 'national');
  if (!force && storedFingerprint(student.web_discovery_status) === currentFingerprint) redirect(`/students/${studentId}`);

  const courses = (await getCourseCatalog()).filter((course) => (course.program_level || 'undergraduate') === input.programLevel);
  const result = await discoverWebCollegeInsights(input, courses);
  const existing = student.web_college_insights || [];
  const failed = result.status.providers.some((p) => p.status === 'failed');
  const status = { ...result.status, profile_fingerprint: currentFingerprint };
  const { error } = await supabase.from('students').update({
    web_college_insights: failed && existing.length ? existing : result.insights,
    web_discovery_status: status,
    updated_at: new Date().toISOString()
  }).eq('id', studentId);
  if (error) throw new Error(error.message);
  revalidatePath(`/students/${studentId}`);
  redirect(`/students/${studentId}`);
}

export async function refreshInternationalCollegeDiscoveryAction(formData: FormData) {
  const studentId = String(formData.get('studentId') || '');
  const force = String(formData.get('force') || '') === 'true';
  if (!studentId) throw new Error('Student ID is required.');
  const { supabase, student, input } = await getContext(studentId);
  const currentFingerprint = searchFingerprint(input, 'international', student.ai_summary || null);
  if (!force && storedFingerprint(student.international_discovery_status) === currentFingerprint) redirect(`/students/${studentId}`);

  const result = await discoverInternationalCollegeInsights(input, student.ai_summary || null);
  const existing = student.international_college_insights || [];
  const failed = result.status.providers.some((p) => p.status === 'failed');
  const status = { ...result.status, profile_fingerprint: currentFingerprint };
  const { error } = await supabase.from('students').update({
    international_college_insights: failed && existing.length ? existing : result.insights,
    international_discovery_status: status,
    updated_at: new Date().toISOString()
  }).eq('id', studentId);
  if (error) throw new Error(error.message);
  revalidatePath(`/students/${studentId}`);
  redirect(`/students/${studentId}`);
}
