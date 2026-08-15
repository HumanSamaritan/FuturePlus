'use server';

import { randomUUID } from 'crypto';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { getCourseCatalog } from '@/lib/data';
import { storeStudentDocument } from '@/lib/document-evidence';
import { isAllowedUserEmail } from '@/lib/env';
import { generateRecommendations } from '@/lib/recommendation';
import { createClient } from '@/lib/supabase/server';
import type { StudentInput } from '@/lib/types';

function text(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === 'string' ? value.trim() : '';
}

function multi(formData: FormData, key: string) {
  return formData.getAll(key).map(String).map((value) => value.trim()).filter(Boolean);
}

function numberOrNull(formData: FormData, key: string) {
  const value = text(formData, key);
  if (!value) return null;
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) throw new Error(`${key} must be a valid number.`);
  return parsed;
}

function semesterMarks(formData: FormData) {
  const values: Record<string, number> = {};
  for (let semester = 1; semester <= 12; semester += 1) {
    const value = numberOrNull(formData, `semester${semester}Marks`);
    if (value != null) values[`semester_${semester}`] = value;
  }
  return values;
}

function buildStudentInput(formData: FormData): StudentInput {
  const programLevel = text(formData, 'programLevel') === 'postgraduate' ? 'postgraduate' : 'undergraduate';
  const firstName = text(formData, 'firstName');
  const lastName = text(formData, 'lastName');
  const phone = text(formData, 'phone');
  const subjectsInterest = multi(formData, 'subjectsInterest');
  const preferredLocations = multi(formData, 'preferredLocations');
  const supportRequired = multi(formData, 'supportRequired');
  const budgetMin = numberOrNull(formData, 'budgetMin');
  const budgetMax = numberOrNull(formData, 'budgetMax');

  if (!firstName || !lastName) throw new Error('First name and last name are required.');
  if (phone.length < 7) throw new Error('A valid phone number is required.');
  if (!subjectsInterest.length) throw new Error('Select at least one subject or course interest.');
  if (budgetMin == null || budgetMax == null) throw new Error('Select the minimum and maximum total course-cost budget.');
  if (budgetMin > budgetMax) throw new Error('Minimum total course cost cannot be higher than the maximum.');
  if (programLevel === 'postgraduate' && !preferredLocations.length) throw new Error('Select at least one preferred location.');
  if (programLevel === 'postgraduate' && !supportRequired.length) throw new Error('Select at least one support requirement.');

  const pgApplicantStatusRaw = text(formData, 'pgApplicantStatus');
  const pgApplicantStatus = ['final_semester', 'passed_out', 'working_professional'].includes(pgApplicantStatusRaw)
    ? pgApplicantStatusRaw as 'final_semester' | 'passed_out' | 'working_professional'
    : undefined;

  return {
    programLevel,
    firstName,
    lastName,
    email: text(formData, 'email') || undefined,
    phone,
    yearX: numberOrNull(formData, 'yearX'),
    marksX: numberOrNull(formData, 'marksX'),
    yearXii: numberOrNull(formData, 'yearXii'),
    marksXii: numberOrNull(formData, 'marksXii'),
    board: text(formData, 'board') || undefined,
    city: text(formData, 'city') || undefined,
    state: text(formData, 'state') || undefined,
    country: text(formData, 'country') || 'India',
    targetIntake: text(formData, 'targetIntake') || undefined,
    subjectsInterest,
    preferredLocations,
    budgetMin,
    budgetMax,
    salaryExpectation: numberOrNull(formData, 'salaryExpectation'),
    hostelRequired: text(formData, 'hostelRequired') === 'yes',
    passion: text(formData, 'passion') || undefined,
    purpose: text(formData, 'purpose') || undefined,
    strengths: text(formData, 'strengths') || undefined,
    constraints: text(formData, 'constraints') || undefined,
    supportRequired,
    notes: text(formData, 'notes') || undefined,
    linkedinUrl: text(formData, 'linkedinUrl') || undefined,
    linkedinProfileText: text(formData, 'linkedinProfileText') || undefined,
    facebookUrl: text(formData, 'facebookUrl') || undefined,
    instagramUrl: text(formData, 'instagramUrl') || undefined,
    xUrl: text(formData, 'xUrl') || undefined,
    portfolioUrl: text(formData, 'portfolioUrl') || undefined,
    accolades: text(formData, 'accolades') || undefined,
    extracurricularActivities: text(formData, 'extracurricularActivities') || undefined,
    rewards: text(formData, 'rewards') || undefined,
    specialSkills: text(formData, 'specialSkills') || undefined,
    certifications: text(formData, 'certifications') || undefined,
    languages: text(formData, 'languages') || undefined,
    workExperience: text(formData, 'workExperience') || undefined,
    resumeText: text(formData, 'resumeText') || undefined,
    careerGoals: text(formData, 'careerGoals') || undefined,
    undergraduateDegree: text(formData, 'undergraduateDegree') || undefined,
    undergraduateSpecialisation: text(formData, 'undergraduateSpecialisation') || undefined,
    undergraduateUniversity: text(formData, 'undergraduateUniversity') || undefined,
    undergraduateGraduationYear: numberOrNull(formData, 'undergraduateGraduationYear'),
    pgApplicantStatus,
    semestersCompleted: numberOrNull(formData, 'semestersCompleted'),
    semesterMarks: semesterMarks(formData),
    undergraduateFinalPercentage: numberOrNull(formData, 'undergraduateFinalPercentage'),
    currentEmployer: text(formData, 'currentEmployer') || undefined,
    currentJobTitle: text(formData, 'currentJobTitle') || undefined,
    workExperienceMonths: numberOrNull(formData, 'workExperienceMonths')
  };
}

async function requireStaff() {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user || !isAllowedUserEmail(user.email)) throw new Error('Authorised staff access is required.');
  return { supabase, user };
}

function studentRow(input: StudentInput, formData: FormData) {
  const belowPovertyLine = text(formData, 'belowPovertyLine') === 'yes';
  return {
    first_name: input.firstName,
    last_name: input.lastName,
    email: input.email || null,
    phone: input.phone || null,
    year_x: input.yearX ?? null,
    marks_x: input.marksX ?? null,
    year_xii: input.yearXii ?? null,
    marks_xii: input.marksXii ?? null,
    board: input.board || null,
    city: input.city || null,
    state: input.state || null,
    country: input.country || 'India',
    desired_program_level: input.programLevel || 'undergraduate',
    target_intake: input.targetIntake || null,
    subjects_interest: input.subjectsInterest,
    preferred_locations: input.preferredLocations,
    budget_min: input.budgetMin ?? null,
    budget_max: input.budgetMax ?? null,
    salary_expectation: input.salaryExpectation ?? null,
    hostel_required: input.hostelRequired,
    loan_required: text(formData, 'loanRequired') === 'yes',
    below_poverty_line: belowPovertyLine,
    financial_aid_required: belowPovertyLine,
    passion: input.passion || null,
    purpose: input.purpose || null,
    strengths: input.strengths || null,
    constraints: input.constraints || null,
    support_required: input.supportRequired,
    notes: input.notes || null,
    linkedin_url: input.linkedinUrl || null,
    linkedin_profile_text: input.linkedinProfileText || null,
    facebook_url: input.facebookUrl || null,
    instagram_url: input.instagramUrl || null,
    x_url: input.xUrl || null,
    portfolio_url: input.portfolioUrl || null,
    accolades: input.accolades || null,
    extracurricular_activities: input.extracurricularActivities || null,
    rewards: input.rewards || null,
    special_skills: input.specialSkills || null,
    certifications: input.certifications || null,
    languages: input.languages || null,
    work_experience: input.workExperience || null,
    resume_text: input.resumeText || null,
    career_goals: input.careerGoals || null,
    undergraduate_degree: input.undergraduateDegree || null,
    undergraduate_specialisation: input.undergraduateSpecialisation || null,
    undergraduate_university: input.undergraduateUniversity || null,
    undergraduate_graduation_year: input.undergraduateGraduationYear ?? null,
    pg_applicant_status: input.pgApplicantStatus || null,
    semesters_completed: input.semestersCompleted ?? null,
    semester_marks: input.semesterMarks || {},
    undergraduate_final_percentage: input.undergraduateFinalPercentage ?? null,
    current_employer: input.currentEmployer || null,
    current_job_title: input.currentJobTitle || null,
    work_experience_months: input.workExperienceMonths ?? null,
    updated_at: new Date().toISOString()
  };
}

async function documentUpdates(
  supabase: Awaited<ReturnType<typeof createClient>>,
  studentId: string,
  formData: FormData,
  previous?: Record<string, any>
) {
  const linkedin = await storeStudentDocument(
    supabase,
    studentId,
    'linkedin-profile',
    formData.get('linkedinProfilePdf'),
    previous?.linkedin_profile_pdf_path || null
  );
  const resume = await storeStudentDocument(
    supabase,
    studentId,
    'resume',
    formData.get('resumeFile'),
    previous?.resume_file_path || null
  );

  return {
    ...(linkedin ? {
      linkedin_profile_pdf_path: linkedin.path,
      linkedin_profile_pdf_name: linkedin.originalName,
      linkedin_profile_pdf_text: linkedin.extractedText
    } : {}),
    ...(resume ? {
      resume_file_path: resume.path,
      resume_file_name: resume.originalName,
      resume_file_text: resume.extractedText
    } : {})
  };
}

export async function createStudentProfileAction(formData: FormData) {
  const { supabase, user } = await requireStaff();
  const input = buildStudentInput(formData);
  const studentId = randomUUID();
  const { data: staffProfile } = await supabase.from('profiles').select('full_name,email').eq('id', user.id).maybeSingle();
  const assignedStaffEmail = staffProfile?.email || user.email || '';
  const assignedStaffName = staffProfile?.full_name || user.user_metadata?.full_name || user.user_metadata?.name || assignedStaffEmail.split('@')[0] || 'Authorised Staff';

  const { error: insertError } = await supabase.from('students').insert({
    id: studentId,
    created_by: user.id,
    assigned_staff_name: assignedStaffName,
    assigned_staff_email: assignedStaffEmail,
    ...studentRow(input, formData),
    ai_profile_dirty: true
  });
  if (insertError) throw new Error(insertError.message);

  const docs = await documentUpdates(supabase, studentId, formData);
  if (Object.keys(docs).length) {
    const { error } = await supabase.from('students').update(docs).eq('id', studentId);
    if (error) throw new Error(error.message);
  }

  const courses = (await getCourseCatalog()).filter((course) => (course.program_level || 'undergraduate') === input.programLevel);
  const recommendations = generateRecommendations({ ...input, id: studentId }, courses);
  if (recommendations.length) {
    const { error } = await supabase.from('recommendations').insert(recommendations.map((rec) => ({
      student_id: studentId,
      course_id: rec.courseId,
      fit_score: rec.fitScore,
      rank: rec.rank,
      score_breakdown: rec.scoreBreakdown,
      reason: rec.reason,
      staff_hidden_reason: rec.staffHiddenReason
    })));
    if (error) throw new Error(error.message);
  }

  const { error: scoreError } = await supabase.from('students').update({
    score: recommendations[0]?.fitScore ?? null,
    ai_summary: null,
    ai_profile_dirty: true
  }).eq('id', studentId);
  if (scoreError) throw new Error(scoreError.message);

  revalidatePath('/dashboard');
  redirect(`/students/${studentId}`);
}

export async function updateStudentProfileWithDocumentsAction(formData: FormData) {
  const { supabase } = await requireStaff();
  const studentId = text(formData, 'studentId');
  if (!studentId) throw new Error('Student ID is required.');
  const input = buildStudentInput(formData);
  const { data: current, error: currentError } = await supabase.from('students').select('*').eq('id', studentId).single();
  if (currentError) throw new Error(currentError.message);

  const docs = await documentUpdates(supabase, studentId, formData, current);
  const { error } = await supabase.from('students').update({
    ...studentRow(input, formData),
    ...docs
  }).eq('id', studentId);
  if (error) throw new Error(error.message);

  revalidatePath(`/students/${studentId}`);
  revalidatePath('/dashboard');
  redirect(`/students/${studentId}`);
}
