'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { generateCounsellingSummary } from '@/lib/ai';
import { getCourseCatalog } from '@/lib/data';
import { isAllowedUserEmail } from '@/lib/env';
import { assessmentMetadata, attachAssessmentMetadata, studentAiFingerprint, withDocumentEvidence } from '@/lib/profile-evidence';
import { generateRecommendations } from '@/lib/recommendation';
import { storedStudentToInput } from '@/lib/student-input';
import { createClient } from '@/lib/supabase/server';

export async function regenerateCounsellingSummaryAction(formData: FormData) {
  const supabase = await createClient();
  const studentId = String(formData.get('studentId') || '').trim();
  if (!studentId) throw new Error('Student ID is required.');

  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user || !isAllowedUserEmail(user.email)) throw new Error('Authorised staff access is required.');

  const { data: student, error: studentError } = await supabase.from('students').select('*').eq('id', studentId).single();
  if (studentError) throw new Error(studentError.message);

  const studentInput = storedStudentToInput(student);
  const currentFingerprint = studentAiFingerprint(studentInput);
  const stored = assessmentMetadata(student.ai_summary);
  if (stored.status === 'ready' && stored.fingerprint === currentFingerprint) {
    redirect(`/students/${studentId}`);
  }

  const allCourses = await getCourseCatalog();
  const courses = allCourses.filter((course) => (course.program_level || 'undergraduate') === studentInput.programLevel);
  const recommendations = generateRecommendations(studentInput, courses);
  const generated = await generateCounsellingSummary(withDocumentEvidence(studentInput), courses, recommendations);
  const summary = attachAssessmentMetadata(generated, currentFingerprint);

  if (recommendations.length) {
    const { error } = await supabase.from('recommendations').upsert(
      recommendations.map((rec) => ({
        student_id: studentId,
        course_id: rec.courseId,
        fit_score: rec.fitScore,
        rank: rec.rank,
        score_breakdown: rec.scoreBreakdown,
        reason: rec.reason,
        staff_hidden_reason: rec.staffHiddenReason
      })),
      { onConflict: 'student_id,rank' }
    );
    if (error) throw new Error(error.message);
    const { error: staleError } = await supabase.from('recommendations').delete().eq('student_id', studentId).gt('rank', recommendations.length);
    if (staleError) throw new Error(staleError.message);
  } else {
    const { error } = await supabase.from('recommendations').delete().eq('student_id', studentId);
    if (error) throw new Error(error.message);
  }

  const { error: updateError } = await supabase.from('students').update({
    score: recommendations[0]?.fitScore ?? null,
    ai_summary: summary,
    ai_profile_dirty: false,
    updated_at: new Date().toISOString()
  }).eq('id', studentId);
  if (updateError) throw new Error(updateError.message);

  revalidatePath(`/students/${studentId}`);
  revalidatePath('/dashboard');
  redirect(`/students/${studentId}`);
}
