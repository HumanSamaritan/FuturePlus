'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { generateCounsellingSummary } from '@/lib/ai';
import { getCourseCatalog } from '@/lib/data';
import { isAllowedUserEmail } from '@/lib/env';
import { generateRecommendations } from '@/lib/recommendation';
import { createClient } from '@/lib/supabase/server';
import { StudentInput } from '@/lib/types';

const StudentSchema = z.object({
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  email: z.string().email().optional().or(z.literal('')),
  phone: z.string().optional(),
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
  hostelRequired: z.coerce.boolean().default(false),
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
  careerGoals: z.string().optional()
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
    firstName: formData.get('firstName'),
    lastName: formData.get('lastName'),
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
    hostelRequired: formData.get('hostelRequired') === 'on',
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
    careerGoals: formData.get('careerGoals') || undefined
  });

  const student: StudentInput = {
    ...parsed,
    budgetMin: normaliseNumber(parsed.budgetMin),
    budgetMax: normaliseNumber(parsed.budgetMax),
    salaryExpectation: normaliseNumber(parsed.salaryExpectation)
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
      desired_program_level: 'undergraduate',
      target_intake: student.targetIntake || null,
      subjects_interest: student.subjectsInterest,
      preferred_locations: student.preferredLocations,
      budget_min: student.budgetMin,
      budget_max: student.budgetMax,
      salary_expectation: student.salaryExpectation,
      hostel_required: student.hostelRequired,
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
      career_goals: student.careerGoals || null
    })
    .select('*')
    .single();

  if (insertError) throw new Error(insertError.message);

  const courses = await getCourseCatalog();
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
