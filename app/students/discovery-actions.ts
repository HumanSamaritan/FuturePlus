'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { getCourseCatalog } from '@/lib/data';
import { isAllowedUserEmail } from '@/lib/env';
import { discoverInternationalCollegeInsights } from '@/lib/international-college-discovery';
import { storedStudentToInput } from '@/lib/student-input';
import { createClient } from '@/lib/supabase/server';
import { discoverWebCollegeInsights } from '@/lib/web-college-discovery';

const CACHE_MS = 24 * 60 * 60 * 1000;
const FAILURE_COOLDOWN_MS = 15 * 60 * 1000;

function ageMs(status: any) {
  const searchedAt = status?.searched_at ? new Date(status.searched_at).getTime() : 0;
  return searchedAt > 0 ? Date.now() - searchedAt : Number.POSITIVE_INFINITY;
}
function isFresh(status: any) {
  const providerStatus = status?.providers?.[0]?.status;
  return ['used', 'no_parseable_results'].includes(providerStatus) && ageMs(status) < CACHE_MS;
}
function isFailureCoolingDown(status: any) {
  return status?.providers?.[0]?.status === 'failed' && ageMs(status) < FAILURE_COOLDOWN_MS;
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
  if (!force && (isFresh(student.web_discovery_status) || isFailureCoolingDown(student.web_discovery_status))) redirect(`/students/${studentId}`);

  const courses = (await getCourseCatalog()).filter((course) => (course.program_level || 'undergraduate') === input.programLevel);
  const result = await discoverWebCollegeInsights(input, courses);
  const existing = student.web_college_insights || [];
  const failed = result.status.providers.some((p) => p.status === 'failed');
  const { error } = await supabase.from('students').update({
    web_college_insights: failed && existing.length ? existing : result.insights,
    web_discovery_status: result.status,
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
  if (!force && (isFresh(student.international_discovery_status) || isFailureCoolingDown(student.international_discovery_status))) redirect(`/students/${studentId}`);

  const result = await discoverInternationalCollegeInsights(input, student.ai_summary || null);
  const existing = student.international_college_insights || [];
  const failed = result.status.providers.some((p) => p.status === 'failed');
  const { error } = await supabase.from('students').update({
    international_college_insights: failed && existing.length ? existing : result.insights,
    international_discovery_status: result.status,
    updated_at: new Date().toISOString()
  }).eq('id', studentId);
  if (error) throw new Error(error.message);
  revalidatePath(`/students/${studentId}`);
  redirect(`/students/${studentId}`);
}
