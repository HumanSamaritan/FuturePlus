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
  grade: z.string().optional(),
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
  notes: z.string().optional()
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

  const parsed = StudentSchema.parse({
    firstName: formData.get('firstName'),
    lastName: formData.get('lastName'),
    email: formData.get('email') || undefined,
    phone: formData.get('phone') || undefined,
    grade: formData.get('grade') || undefined,
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
    notes: formData.get('notes') || undefined
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
      first_name: student.firstName,
      last_name: student.lastName,
      email: student.email || null,
      phone: student.phone || null,
      grade: student.grade || null,
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
      notes: student.notes || null
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
