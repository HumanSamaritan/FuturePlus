'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { generateCounsellingSummary } from '@/lib/ai';
import { getCourseCatalog } from '@/lib/data';
import { isAllowedUserEmail } from '@/lib/env';
import { generateRecommendations } from '@/lib/recommendation';
import { createClient } from '@/lib/supabase/server';
import type { StudentInput } from '@/lib/types';
import { discoverWebCollegeInsights } from '@/lib/web-college-discovery';

function storedStudentToInput(student: Record<string, any>): StudentInput {
  const programmeLevel: 'undergraduate' | 'postgraduate' =
    student.desired_program_level === 'postgraduate' ? 'postgraduate' : 'undergraduate';

  return {
    id: student.id,
    programLevel: programmeLevel,
    firstName: student.first_name,
    lastName: student.last_name,
    email: student.email || undefined,
    phone: student.phone || undefined,
    yearX: student.year_x,
    marksX: student.marks_x,
    yearXii: student.year_xii,
    marksXii: student.marks_xii,
    board: student.board || undefined,
    city: student.city || undefined,
    state: student.state || undefined,
    country: student.country || 'India',
    targetIntake: student.target_intake || undefined,
    subjectsInterest: student.subjects_interest || [],
    preferredLocations: student.preferred_locations || [],
    budgetMin: student.budget_min,
    budgetMax: student.budget_max,
    salaryExpectation: student.salary_expectation,
    hostelRequired: Boolean(student.hostel_required),
    loanRequired: Boolean(student.loan_required),
    belowPovertyLine: Boolean(student.below_poverty_line),
    passion: student.passion || undefined,
    purpose: student.purpose || undefined,
    strengths: student.strengths || undefined,
    constraints: student.constraints || undefined,
    careerGoals: student.career_goals || undefined,
    supportRequired: student.support_required || [],
    notes: student.notes || undefined,
    linkedinUrl: student.linkedin_url || undefined,
    facebookUrl: student.facebook_url || undefined,
    instagramUrl: student.instagram_url || undefined,
    xUrl: student.x_url || undefined,
    portfolioUrl: student.portfolio_url || undefined,
    accolades: student.accolades || undefined,
    extracurricularActivities: student.extracurricular_activities || undefined,
    rewards: student.rewards || undefined,
    specialSkills: student.special_skills || undefined,
    certifications: student.certifications || undefined,
    languages: student.languages || undefined,
    workExperience: student.work_experience || undefined,
    undergraduateDegree: student.undergraduate_degree || undefined,
    undergraduateSpecialisation: student.undergraduate_specialisation || undefined,
    undergraduateUniversity: student.undergraduate_university || undefined,
    undergraduateGraduationYear: student.undergraduate_graduation_year,
    pgApplicantStatus: student.pg_applicant_status || undefined,
    semestersCompleted: student.semesters_completed,
    semesterMarks: student.semester_marks || {},
    undergraduateFinalPercentage: student.undergraduate_final_percentage,
    currentEmployer: student.current_employer || undefined,
    currentJobTitle: student.current_job_title || undefined,
    workExperienceMonths: student.work_experience_months
  };
}

export async function regenerateCounsellingSummaryAction(formData: FormData) {
  const supabase = await createClient();
  const studentId = String(formData.get('studentId') || '');
  if (!studentId) throw new Error('Student ID is required.');

  const {
    data: { user },
    error: userError
  } = await supabase.auth.getUser();
  if (userError || !user || !isAllowedUserEmail(user.email)) {
    throw new Error('You must be logged in with an authorised Future Plus staff account.');
  }

  const { data: student, error: studentError } = await supabase
    .from('students')
    .select('*')
    .eq('id', studentId)
    .single();
  if (studentError) throw new Error(studentError.message);

  const studentInput = storedStudentToInput(student);
  const allCourses = await getCourseCatalog();
  const courses = allCourses.filter(
    (course) => (course.program_level || 'undergraduate') === studentInput.programLevel
  );

  // Always recalculate recommendations from the latest student profile and
  // current catalogue. Never reuse stale recommendation rows after a profile
  // or scoring-model change.
  const recommendations = generateRecommendations(studentInput, courses);
  const [summary, webDiscovery] = await Promise.all([
    generateCounsellingSummary(studentInput, courses, recommendations),
    discoverWebCollegeInsights(studentInput, courses)
  ]);

  if (recommendations.length) {
    const { error: recommendationUpsertError } = await supabase
      .from('recommendations')
      .upsert(
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
    if (recommendationUpsertError) throw new Error(recommendationUpsertError.message);

    const { error: staleRecommendationError } = await supabase
      .from('recommendations')
      .delete()
      .eq('student_id', studentId)
      .gt('rank', recommendations.length);
    if (staleRecommendationError) throw new Error(staleRecommendationError.message);
  } else {
    const { error: clearRecommendationError } = await supabase
      .from('recommendations')
      .delete()
      .eq('student_id', studentId);
    if (clearRecommendationError) throw new Error(clearRecommendationError.message);
  }

  const { error: updateError } = await supabase
    .from('students')
    .update({
      score: recommendations[0]?.fitScore ?? null,
      ai_summary: summary,
      web_college_insights: webDiscovery.insights,
      web_discovery_status: webDiscovery.status,
      updated_at: new Date().toISOString()
    })
    .eq('id', studentId);

  if (updateError && /web_college_insights|web_discovery_status/.test(updateError.message)) {
    throw new Error('Run Supabase migration 008_web_college_insights.sql before regenerating AI Insights.');
  }
  if (updateError) throw new Error(updateError.message);

  revalidatePath(`/students/${studentId}`);
  revalidatePath('/dashboard');
  redirect(`/students/${studentId}`);
}
