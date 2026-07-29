'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { generateCounsellingSummary } from '@/lib/ai';
import { getCourseCatalog } from '@/lib/data';
import { isAllowedUserEmail } from '@/lib/env';
import { generateRecommendations } from '@/lib/recommendation';
import { createClient } from '@/lib/supabase/server';
import { discoverWebCollegeInsights } from '@/lib/web-college-discovery';

const StudentSchema = z.object({
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
  phone: z.string().trim().min(7, 'A valid phone number is required'),
  yearX: z.coerce.number().int().min(1950).max(2100).optional().nullable(),
  marksX: z.coerce.number().min(0).max(100).optional().nullable(),
  yearXii: z.coerce.number().int().min(1950).max(2100).optional().nullable(),
  marksXii: z.coerce.number().min(0).max(100).optional().nullable(),
  board: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  country: z.string().optional(),
  targetIntake: z.string().optional(),
  subjectsInterest: z.array(z.string()).default([]),
  preferredLocations: z.array(z.string()).default([]),
  budgetMin: z.coerce.number().optional().nullable(),
  budgetMax: z.coerce.number().optional().nullable(),
  salaryExpectation: z.coerce.number().optional().nullable(),
  hostelRequired: z.enum(['yes', 'no']).default('no'),
  loanRequired: z.enum(['yes', 'no']).default('no'),
  belowPovertyLine: z.enum(['yes', 'no']).default('no'),
  passion: z.string().optional(),
  purpose: z.string().optional(),
  strengths: z.string().optional(),
  constraints: z.string().optional(),
  supportRequired: z.array(z.string()).default([]),
  notes: z.string().optional(),
  linkedinUrl: z.string().url().optional().or(z.literal('')),
  facebookUrl: z.string().url().optional().or(z.literal('')),
  instagramUrl: z.string().url().optional().or(z.literal('')),
  xUrl: z.string().url().optional().or(z.literal('')),
  portfolioUrl: z.string().url().optional().or(z.literal('')),
  accolades: z.string().optional(),
  extracurricularActivities: z.string().optional(),
  rewards: z.string().optional(),
  specialSkills: z.string().optional(),
  certifications: z.string().optional(),
  languages: z.string().optional(),
  workExperience: z.string().optional(),
  careerGoals: z.string().optional(),
  programLevel: z.enum(['undergraduate', 'postgraduate']).default('undergraduate'),
  undergraduateDegree: z.string().optional(),
  undergraduateSpecialisation: z.string().optional(),
  undergraduateUniversity: z.string().optional(),
  undergraduateGraduationYear: z.coerce.number().int().min(1950).max(2100).optional().nullable(),
  pgApplicantStatus: z.enum(['final_semester', 'passed_out', 'working_professional']).optional(),
  semestersCompleted: z.coerce.number().int().min(1).max(12).optional().nullable(),
  undergraduateFinalPercentage: z.coerce.number().min(0).max(100).optional().nullable(),
  currentEmployer: z.string().optional(),
  currentJobTitle: z.string().optional(),
  workExperienceMonths: z.coerce.number().int().min(0).optional().nullable()
});

function getMulti(formData: FormData, key: string) {
  return formData.getAll(key).map(String).filter(Boolean);
}

function normaliseNumber(value: number | null | undefined) {
  if (typeof value !== 'number' || Number.isNaN(value)) return null;
  return value;
}

export async function createStudentAction(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
    error: userError
  } = await supabase.auth.getUser();

  if (userError || !user || !isAllowedUserEmail(user.email)) {
    throw new Error('You must be logged in with a Google account.');
  }

  const { data: staffProfile } = await supabase
    .from('profiles')
    .select('full_name,email')
    .eq('id', user.id)
    .maybeSingle();
  const assignedStaffEmail = staffProfile?.email || user.email || '';
  const assignedStaffName =
    staffProfile?.full_name ||
    user.user_metadata?.full_name ||
    user.user_metadata?.name ||
    assignedStaffEmail.split('@')[0] ||
    'Future Plus Staff';

  const parsed = StudentSchema.parse({
    firstName: formData.get('firstName') || undefined,
    lastName: formData.get('lastName') || undefined,
    email: formData.get('email') || undefined,
    phone: formData.get('phone') || undefined,
    yearX: formData.get('yearX') || undefined,
    marksX: formData.get('marksX') || undefined,
    yearXii: formData.get('yearXii') || undefined,
    marksXii: formData.get('marksXii') || undefined,
    board: formData.get('board') || undefined,
    city: formData.get('city') || undefined,
    state: formData.get('state') || undefined,
    country: formData.get('country') || 'India',
    targetIntake: formData.get('targetIntake') || undefined,
    subjectsInterest: getMulti(formData, 'subjectsInterest'),
    preferredLocations: getMulti(formData, 'preferredLocations'),
    budgetMin: formData.get('budgetMin') || undefined,
    budgetMax: formData.get('budgetMax') || undefined,
    salaryExpectation: formData.get('salaryExpectation') || undefined,
    hostelRequired: formData.get('hostelRequired') || 'no',
    loanRequired: formData.get('loanRequired') || 'no',
    belowPovertyLine: formData.get('belowPovertyLine') || 'no',
    passion: formData.get('passion') || undefined,
    purpose: formData.get('purpose') || undefined,
    strengths: formData.get('strengths') || undefined,
    constraints: formData.get('constraints') || undefined,
    supportRequired: getMulti(formData, 'supportRequired'),
    notes: formData.get('notes') || undefined,
    linkedinUrl: formData.get('linkedinUrl') || undefined,
    facebookUrl: formData.get('facebookUrl') || undefined,
    instagramUrl: formData.get('instagramUrl') || undefined,
    xUrl: formData.get('xUrl') || undefined,
    portfolioUrl: formData.get('portfolioUrl') || undefined,
    accolades: formData.get('accolades') || undefined,
    extracurricularActivities: formData.get('extracurricularActivities') || undefined,
    rewards: formData.get('rewards') || undefined,
    specialSkills: formData.get('specialSkills') || undefined,
    certifications: formData.get('certifications') || undefined,
    languages: formData.get('languages') || undefined,
    workExperience: formData.get('workExperience') || undefined,
    careerGoals: formData.get('careerGoals') || undefined,
    programLevel: formData.get('programLevel') || 'undergraduate',
    undergraduateDegree: formData.get('undergraduateDegree') || undefined,
    undergraduateSpecialisation: formData.get('undergraduateSpecialisation') || undefined,
    undergraduateUniversity: formData.get('undergraduateUniversity') || undefined,
    undergraduateGraduationYear: formData.get('undergraduateGraduationYear') || undefined,
    pgApplicantStatus: formData.get('pgApplicantStatus') || undefined,
    semestersCompleted: formData.get('semestersCompleted') || undefined,
    undergraduateFinalPercentage: formData.get('undergraduateFinalPercentage') || undefined,
    currentEmployer: formData.get('currentEmployer') || undefined,
    currentJobTitle: formData.get('currentJobTitle') || undefined,
    workExperienceMonths: formData.get('workExperienceMonths') || undefined
  });
  if (parsed.budgetMin == null || parsed.budgetMax == null) {
    throw new Error('Select the minimum and maximum total course-cost budget.');
  }
  if (parsed.budgetMin != null && parsed.budgetMax != null && parsed.budgetMin > parsed.budgetMax) {
    throw new Error('Minimum total course cost cannot be higher than the maximum.');
  }

  const semesterMarks: Record<string, number> = {};
  for (let semester = 1; semester <= 12; semester += 1) {
    const value = formData.get(`semester${semester}Marks`);
    if (value) semesterMarks[`semester_${semester}`] = Number(value);
  }
  if (!parsed.firstName || !parsed.lastName) {
    throw new Error('First name and last name are required.');
  }
  if (parsed.programLevel === 'postgraduate') {
    if (!parsed.subjectsInterest.length) throw new Error('Select at least one Post Graduate course interest.');
    if (!parsed.preferredLocations.length) throw new Error('Select at least one preferred location.');
    if (!parsed.supportRequired.length) throw new Error('Select at least one Future Plus support requirement.');
  }
  const student = {
    ...parsed,
    firstName: parsed.firstName,
    lastName: parsed.lastName,
    hostelRequired: parsed.hostelRequired === 'yes',
    loanRequired: parsed.loanRequired === 'yes',
    belowPovertyLine: parsed.belowPovertyLine === 'yes',
    budgetMin: normaliseNumber(parsed.budgetMin),
    budgetMax: normaliseNumber(parsed.budgetMax),
    salaryExpectation: normaliseNumber(parsed.salaryExpectation),
    undergraduateGraduationYear: normaliseNumber(parsed.undergraduateGraduationYear),
    semestersCompleted: normaliseNumber(parsed.semestersCompleted),
    undergraduateFinalPercentage: normaliseNumber(parsed.undergraduateFinalPercentage),
    workExperienceMonths: normaliseNumber(parsed.workExperienceMonths),
    semesterMarks
  };

  const { data: insertedStudent, error: insertError } = await supabase
    .from('students')
    .insert({
      created_by: user.id,
      assigned_staff_name: assignedStaffName,
      assigned_staff_email: assignedStaffEmail,
      first_name: student.firstName,
      last_name: student.lastName,
      email: student.email || null,
      phone: student.phone || null,
      year_x: normaliseNumber(student.yearX),
      marks_x: normaliseNumber(student.marksX),
      year_xii: normaliseNumber(student.yearXii),
      marks_xii: normaliseNumber(student.marksXii),
      board: student.board || null,
      city: student.city || null,
      state: student.state || null,
      country: student.country || 'India',
      desired_program_level: student.programLevel || 'undergraduate',
      target_intake: student.targetIntake || null,
      subjects_interest: student.subjectsInterest,
      preferred_locations: student.preferredLocations,
      budget_min: student.budgetMin,
      budget_max: student.budgetMax,
      salary_expectation: student.salaryExpectation,
      hostel_required: student.hostelRequired,
      loan_required: student.loanRequired,
      below_poverty_line: student.belowPovertyLine,
      financial_aid_required: student.belowPovertyLine,
      passion: student.passion || null,
      purpose: student.purpose || null,
      strengths: student.strengths || null,
      constraints: student.constraints || null,
      support_required: student.supportRequired,
      notes: student.notes || null,
      linkedin_url: student.linkedinUrl || null,
      facebook_url: student.facebookUrl || null,
      instagram_url: student.instagramUrl || null,
      x_url: student.xUrl || null,
      portfolio_url: student.portfolioUrl || null,
      accolades: student.accolades || null,
      extracurricular_activities: student.extracurricularActivities || null,
      rewards: student.rewards || null,
      special_skills: student.specialSkills || null,
      certifications: student.certifications || null,
      languages: student.languages || null,
      work_experience: student.workExperience || null,
      career_goals: student.careerGoals || null,
      undergraduate_degree: student.undergraduateDegree || null,
      undergraduate_specialisation: student.undergraduateSpecialisation || null,
      undergraduate_university: student.undergraduateUniversity || null,
      undergraduate_graduation_year: student.undergraduateGraduationYear,
      pg_applicant_status: student.pgApplicantStatus || null,
      semesters_completed: student.semestersCompleted,
      semester_marks: student.semesterMarks || {},
      undergraduate_final_percentage: student.undergraduateFinalPercentage,
      current_employer: student.currentEmployer || null,
      current_job_title: student.currentJobTitle || null,
      work_experience_months: student.workExperienceMonths
    })
    .select('*')
    .single();

  if (insertError) throw new Error(insertError.message);

  const allCourses = await getCourseCatalog();
  const requestedProgramLevel = student.programLevel || 'undergraduate';
  const courses = allCourses.filter(
    (course) => (course.program_level || 'undergraduate') === requestedProgramLevel
  );
  const recommendations = generateRecommendations({ ...student, id: insertedStudent.id }, courses);
  const summary = await generateCounsellingSummary({ ...student, id: insertedStudent.id }, courses, recommendations);

  if (recommendations.length) {
    const { error: recError } = await supabase.from('recommendations').insert(
      recommendations.map((rec) => ({
        student_id: insertedStudent.id,
        course_id: rec.courseId,
        fit_score: rec.fitScore,
        rank: rec.rank,
        score_breakdown: rec.scoreBreakdown,
        reason: rec.reason,
        staff_hidden_reason: rec.staffHiddenReason
      }))
    );

    if (recError) throw new Error(recError.message);

    const bestScore = recommendations[0]?.fitScore ?? null;
    await supabase.from('students').update({ score: bestScore, ai_summary: summary }).eq('id', insertedStudent.id);
  }

  revalidatePath('/dashboard');
  redirect(`/students/${insertedStudent.id}`);
}

export async function updateStudentStatusAction(formData: FormData) {
  const supabase = await createClient();
  const studentId = String(formData.get('studentId'));
  const status = String(formData.get('status'));

  const { error } = await supabase.from('students').update({ status }).eq('id', studentId);
  if (error) throw new Error(error.message);

  revalidatePath(`/students/${studentId}`);
  revalidatePath('/dashboard');
}

export async function updateStudentProfileAction(formData: FormData) {
  const supabase = await createClient();
  const studentId = String(formData.get('studentId') || '');
  const firstName = String(formData.get('firstName') || '').trim();
  const lastName = String(formData.get('lastName') || '').trim();
  if (!studentId || !firstName || !lastName) {
    throw new Error('Student ID, first name and last name are required.');
  }

  const numberOrNull = (key: string) => {
    const value = String(formData.get(key) || '').trim();
    if (!value) return null;
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) throw new Error(`${key} must be a valid number.`);
    return parsed;
  };
  const budgetMin = numberOrNull('budgetMin');
  const budgetMax = numberOrNull('budgetMax');
  if (budgetMin != null && budgetMax != null && budgetMin > budgetMax) {
    throw new Error('Minimum total course cost cannot be higher than the maximum.');
  }

  const semesterMarks: Record<string, number> = {};
  for (let semester = 1; semester <= 12; semester += 1) {
    const value = String(formData.get(`semester${semester}Marks`) || '').trim();
    if (value) semesterMarks[`semester_${semester}`] = Number(value);
  }
  const belowPovertyLine = formData.get('belowPovertyLine') === 'yes';
  const updates = {
    first_name: firstName,
    last_name: lastName,
    email: String(formData.get('email') || '').trim() || null,
    phone: String(formData.get('phone') || '').trim() || null,
    year_x: numberOrNull('yearX'),
    marks_x: numberOrNull('marksX'),
    year_xii: numberOrNull('yearXii'),
    marks_xii: numberOrNull('marksXii'),
    board: String(formData.get('board') || '').trim() || null,
    city: String(formData.get('city') || '').trim() || null,
    state: String(formData.get('state') || '').trim() || null,
    country: String(formData.get('country') || '').trim() || 'India',
    target_intake: String(formData.get('targetIntake') || '').trim() || null,
    subjects_interest: getMulti(formData, 'subjectsInterest'),
    preferred_locations: getMulti(formData, 'preferredLocations'),
    budget_min: budgetMin,
    budget_max: budgetMax,
    salary_expectation: numberOrNull('salaryExpectation'),
    hostel_required: formData.get('hostelRequired') === 'yes',
    loan_required: formData.get('loanRequired') === 'yes',
    below_poverty_line: belowPovertyLine,
    financial_aid_required: belowPovertyLine,
    support_required: getMulti(formData, 'supportRequired'),
    passion: String(formData.get('passion') || '').trim() || null,
    purpose: String(formData.get('purpose') || '').trim() || null,
    strengths: String(formData.get('strengths') || '').trim() || null,
    constraints: String(formData.get('constraints') || '').trim() || null,
    career_goals: String(formData.get('careerGoals') || '').trim() || null,
    notes: String(formData.get('notes') || '').trim() || null,
    linkedin_url: String(formData.get('linkedinUrl') || '').trim() || null,
    facebook_url: String(formData.get('facebookUrl') || '').trim() || null,
    instagram_url: String(formData.get('instagramUrl') || '').trim() || null,
    x_url: String(formData.get('xUrl') || '').trim() || null,
    portfolio_url: String(formData.get('portfolioUrl') || '').trim() || null,
    accolades: String(formData.get('accolades') || '').trim() || null,
    extracurricular_activities: String(formData.get('extracurricularActivities') || '').trim() || null,
    rewards: String(formData.get('rewards') || '').trim() || null,
    special_skills: String(formData.get('specialSkills') || '').trim() || null,
    certifications: String(formData.get('certifications') || '').trim() || null,
    languages: String(formData.get('languages') || '').trim() || null,
    work_experience: String(formData.get('workExperience') || '').trim() || null,
    undergraduate_degree: String(formData.get('undergraduateDegree') || '').trim() || null,
    undergraduate_specialisation: String(formData.get('undergraduateSpecialisation') || '').trim() || null,
    undergraduate_university: String(formData.get('undergraduateUniversity') || '').trim() || null,
    undergraduate_graduation_year: numberOrNull('undergraduateGraduationYear'),
    pg_applicant_status: String(formData.get('pgApplicantStatus') || '').trim() || null,
    semesters_completed: numberOrNull('semestersCompleted'),
    semester_marks: semesterMarks,
    undergraduate_final_percentage: numberOrNull('undergraduateFinalPercentage'),
    current_employer: String(formData.get('currentEmployer') || '').trim() || null,
    current_job_title: String(formData.get('currentJobTitle') || '').trim() || null,
    work_experience_months: numberOrNull('workExperienceMonths'),
    updated_at: new Date().toISOString()
  };

  const { error } = await supabase.from('students').update(updates).eq('id', studentId);
  if (error) throw new Error(error.message);

  revalidatePath(`/students/${studentId}`);
  revalidatePath('/dashboard');
  redirect(`/students/${studentId}`);
}

export async function regenerateCounsellingSummaryAction(formData: FormData) {
  const supabase = await createClient();
  const studentId = String(formData.get('studentId') || '');
  if (!studentId) throw new Error('Student ID is required.');

  const [{ data: student, error: studentError }, { data: storedRecommendations, error: recommendationError }] =
    await Promise.all([
      supabase.from('students').select('*').eq('id', studentId).single(),
      supabase.from('recommendations').select('*').eq('student_id', studentId).order('rank')
    ]);

  if (studentError) throw new Error(studentError.message);
  if (recommendationError) throw new Error(recommendationError.message);

  const allCourses = await getCourseCatalog();
  const programmeLevel: 'undergraduate' | 'postgraduate' =
    student.desired_program_level === 'postgraduate' ? 'postgraduate' : 'undergraduate';
  const courses = allCourses.filter(
    (course) => (course.program_level || 'undergraduate') === programmeLevel
  );
  const recommendations = (storedRecommendations ?? []).map((recommendation) => ({
    courseId: recommendation.course_id,
    fitScore: Number(recommendation.fit_score),
    rank: recommendation.rank,
    scoreBreakdown: recommendation.score_breakdown || {},
    reason: recommendation.reason,
    staffHiddenReason: recommendation.staff_hidden_reason
  }));
  const studentInput = {
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
    passion: student.passion || undefined,
    purpose: student.purpose || undefined,
    strengths: student.strengths || undefined,
    constraints: student.constraints || undefined,
    supportRequired: student.support_required || [],
    notes: student.notes || undefined,
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

  const [summary, webDiscovery] = await Promise.all([
    generateCounsellingSummary(studentInput, courses, recommendations),
    discoverWebCollegeInsights(studentInput, courses)
  ]);
  const { error: updateError } = await supabase
    .from('students')
    .update({
      ai_summary: summary,
      web_college_insights: webDiscovery.insights,
      web_discovery_status: webDiscovery.status
    })
    .eq('id', studentId);
  if (updateError && /web_college_insights|web_discovery_status/.test(updateError.message)) {
    throw new Error('Run Supabase migration 008_web_college_insights.sql before regenerating AI Insights.');
  }
  if (updateError) throw new Error(updateError.message);

  revalidatePath(`/students/${studentId}`);
  redirect(`/students/${studentId}`);
}
