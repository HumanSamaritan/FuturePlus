'use server';

import { createHash } from 'crypto';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { generateCounsellingSummary } from '@/lib/ai';
import { getCourseCatalog } from '@/lib/data';
import { isAllowedUserEmail } from '@/lib/env';
import { generateRecommendations } from '@/lib/recommendation';
import { storedStudentToInput } from '@/lib/student-input';
import { createClient } from '@/lib/supabase/server';

function fingerprint(input: ReturnType<typeof storedStudentToInput>) {
  const relevant = {
    programLevel: input.programLevel,
    yearX: input.yearX, marksX: input.marksX, yearXii: input.yearXii, marksXii: input.marksXii, board: input.board,
    subjectsInterest: input.subjectsInterest, preferredLocations: input.preferredLocations,
    passion: input.passion, purpose: input.purpose, strengths: input.strengths, constraints: input.constraints,
    careerGoals: input.careerGoals, linkedinUrl: input.linkedinUrl, facebookUrl: input.facebookUrl,
    instagramUrl: input.instagramUrl, xUrl: input.xUrl, portfolioUrl: input.portfolioUrl,
    accolades: input.accolades, extracurricularActivities: input.extracurricularActivities, rewards: input.rewards,
    specialSkills: input.specialSkills, certifications: input.certifications, languages: input.languages,
    workExperience: input.workExperience, undergraduateDegree: input.undergraduateDegree,
    undergraduateSpecialisation: input.undergraduateSpecialisation, undergraduateFinalPercentage: input.undergraduateFinalPercentage,
    currentJobTitle: input.currentJobTitle, workExperienceMonths: input.workExperienceMonths
  };
  return createHash('sha256').update(JSON.stringify(relevant)).digest('hex');
}

function existingFingerprint(raw: string | null | undefined) {
  if (!raw) return null;
  try { return JSON.parse(raw)?.profileFingerprint || null; } catch { return null; }
}

export async function regenerateCounsellingSummaryAction(formData: FormData) {
  const supabase = await createClient();
  const studentId = String(formData.get('studentId') || '');
  const force = String(formData.get('force') || '') === 'true';
  if (!studentId) throw new Error('Student ID is required.');

  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user || !isAllowedUserEmail(user.email)) throw new Error('Authorised staff access is required.');

  const { data: student, error: studentError } = await supabase.from('students').select('*').eq('id', studentId).single();
  if (studentError) throw new Error(studentError.message);

  const studentInput = storedStudentToInput(student);
  const currentFingerprint = fingerprint(studentInput);
  if (!force && existingFingerprint(student.ai_summary) === currentFingerprint) {
    redirect(`/students/${studentId}`);
  }

  const allCourses = await getCourseCatalog();
  const courses = allCourses.filter((course) => (course.program_level || 'undergraduate') === studentInput.programLevel);
  const recommendations = generateRecommendations(studentInput, courses);
  const generated = await generateCounsellingSummary(studentInput, courses, recommendations);
  let summary = generated;
  try {
    const parsed = JSON.parse(generated);
    parsed.profileFingerprint = currentFingerprint;
    parsed.generatedAt = new Date().toISOString();
    summary = JSON.stringify(parsed);
  } catch { /* preserve provider fallback text if ever returned */ }

  if (recommendations.length) {
    const { error } = await supabase.from('recommendations').upsert(
      recommendations.map((rec) => ({ student_id: studentId, course_id: rec.courseId, fit_score: rec.fitScore, rank: rec.rank, score_breakdown: rec.scoreBreakdown, reason: rec.reason, staff_hidden_reason: rec.staffHiddenReason })),
      { onConflict: 'student_id,rank' }
    );
    if (error) throw new Error(error.message);
    const { error: staleError } = await supabase.from('recommendations').delete().eq('student_id', studentId).gt('rank', recommendations.length);
    if (staleError) throw new Error(staleError.message);
  } else {
    const { error } = await supabase.from('recommendations').delete().eq('student_id', studentId);
    if (error) throw new Error(error.message);
  }

  const { error: updateError } = await supabase.from('students').update({ score: recommendations[0]?.fitScore ?? null, ai_summary: summary, updated_at: new Date().toISOString() }).eq('id', studentId);
  if (updateError) throw new Error(updateError.message);

  revalidatePath(`/students/${studentId}`);
  revalidatePath('/dashboard');
  redirect(`/students/${studentId}`);
}
