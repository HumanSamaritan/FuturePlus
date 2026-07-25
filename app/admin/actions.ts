'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { isAllowedUserEmail } from '@/lib/env';
import { createClient } from '@/lib/supabase/server';

const CollegeCourseSchema = z.object({
  collegeName: z.string().min(1),
  city: z.string().optional(),
  state: z.string().optional(),
  country: z.string().default('India'),
  partnerStatus: z.enum(['preferred_partner', 'pipeline_partner', 'non_partner']).default('non_partner'),
  commissionBased: z.coerce.boolean().default(false),
  hostelAvailable: z.coerce.boolean().default(false),
  sourceUrl: z.string().url().optional().or(z.literal('')),
  pocName: z.string().optional(),
  pocEmail: z.string().email().optional().or(z.literal('')),
  courseName: z.string().min(1),
  subjectArea: z.string().min(1),
  duration: z.string().optional(),
  totalFee: z.coerce.number().optional(),
  placementCount: z.coerce.number().int().optional(),
  highestPackage: z.coerce.number().optional(),
  averagePackage: z.coerce.number().optional(),
  currency: z.string().default('INR')
});

function safeNumber(value: number | undefined) {
  return typeof value === 'number' && !Number.isNaN(value) ? value : null;
}

export async function addCollegeCourseAction(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user || !isAllowedUserEmail(user.email)) throw new Error('Google sign-in is required.');

  const parsed = CollegeCourseSchema.parse({
    collegeName: formData.get('collegeName'),
    city: formData.get('city') || undefined,
    state: formData.get('state') || undefined,
    country: formData.get('country') || 'India',
    partnerStatus: formData.get('partnerStatus') || 'non_partner',
    commissionBased: formData.get('commissionBased') === 'on',
    hostelAvailable: formData.get('hostelAvailable') === 'on',
    sourceUrl: formData.get('sourceUrl') || undefined,
    pocName: formData.get('pocName') || undefined,
    pocEmail: formData.get('pocEmail') || undefined,
    courseName: formData.get('courseName'),
    subjectArea: formData.get('subjectArea'),
    duration: formData.get('duration') || undefined,
    totalFee: formData.get('totalFee') || undefined,
    placementCount: formData.get('placementCount') || undefined,
    highestPackage: formData.get('highestPackage') || undefined,
    averagePackage: formData.get('averagePackage') || undefined,
    currency: formData.get('currency') || 'INR'
  });

  const { data: college, error: collegeError } = await supabase
    .from('colleges')
    .upsert(
      {
        name: parsed.collegeName,
        city: parsed.city || null,
        state: parsed.state || null,
        country: parsed.country,
        partner_status: parsed.partnerStatus,
        commission_based: parsed.commissionBased,
        hostel_available: parsed.hostelAvailable,
        source_url: parsed.sourceUrl || null,
        poc_name: parsed.pocName || null,
        poc_email: parsed.pocEmail || null,
        last_reviewed_at: new Date().toISOString()
      },
      { onConflict: 'name,city,state' }
    )
    .select('*')
    .single();

  if (collegeError) throw new Error(collegeError.message);

  const { error: courseError } = await supabase.from('courses').insert({
    college_id: college.id,
    course_name: parsed.courseName,
    subject_area: parsed.subjectArea,
    duration: parsed.duration || null,
    total_fee: safeNumber(parsed.totalFee),
    placement_count: safeNumber(parsed.placementCount),
    highest_package: safeNumber(parsed.highestPackage),
    average_package: safeNumber(parsed.averagePackage),
    currency: parsed.currency
  });

  if (courseError) throw new Error(courseError.message);

  revalidatePath('/colleges');
  revalidatePath('/admin');
}

export async function updateCollegeCourseAction(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !isAllowedUserEmail(user.email)) throw new Error('Approved staff access is required.');

  const collegeId = z.string().uuid().parse(formData.get('collegeId'));
  const courseId = z.string().uuid().parse(formData.get('courseId'));
  const parsed = CollegeCourseSchema.parse({
    collegeName: formData.get('collegeName'),
    city: formData.get('city') || undefined,
    state: formData.get('state') || undefined,
    country: formData.get('country') || 'India',
    partnerStatus: formData.get('partnerStatus') || 'non_partner',
    commissionBased: formData.get('commissionBased') === 'on',
    hostelAvailable: formData.get('hostelAvailable') === 'on',
    sourceUrl: formData.get('sourceUrl') || undefined,
    pocName: formData.get('pocName') || undefined,
    pocEmail: formData.get('pocEmail') || undefined,
    courseName: formData.get('courseName'),
    subjectArea: formData.get('subjectArea'),
    duration: formData.get('duration') || undefined,
    totalFee: formData.get('totalFee') || undefined,
    placementCount: formData.get('placementCount') || undefined,
    highestPackage: formData.get('highestPackage') || undefined,
    averagePackage: formData.get('averagePackage') || undefined,
    currency: formData.get('currency') || 'INR'
  });

  const { error: collegeError } = await supabase.from('colleges').update({
    name: parsed.collegeName,
    city: parsed.city || null,
    state: parsed.state || null,
    country: parsed.country,
    partner_status: parsed.partnerStatus,
    commission_based: parsed.commissionBased,
    hostel_available: parsed.hostelAvailable,
    source_url: parsed.sourceUrl || null,
    poc_name: parsed.pocName || null,
    poc_email: parsed.pocEmail || null,
    last_reviewed_at: new Date().toISOString()
  }).eq('id', collegeId);
  if (collegeError) throw new Error(collegeError.message);

  const { error: courseError } = await supabase.from('courses').update({
    course_name: parsed.courseName,
    subject_area: parsed.subjectArea,
    duration: parsed.duration || null,
    total_fee: safeNumber(parsed.totalFee),
    placement_count: safeNumber(parsed.placementCount),
    highest_package: safeNumber(parsed.highestPackage),
    average_package: safeNumber(parsed.averagePackage),
    currency: parsed.currency
  }).eq('id', courseId).eq('college_id', collegeId);
  if (courseError) throw new Error(courseError.message);

  revalidatePath('/colleges');
  revalidatePath('/admin');
  revalidatePath('/dashboard');
  redirect('/colleges?saved=1');
}

const optionalText = z.preprocess(
  (value) => typeof value === 'string' ? value.trim() : value,
  z.string().optional()
);

function normalisePartnerStatus(value: unknown) {
  const normalised = String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, '_');

  const aliases: Record<string, 'preferred_partner' | 'pipeline_partner' | 'non_partner'> = {
    preferred_partner: 'preferred_partner',
    preferred: 'preferred_partner',
    partner: 'preferred_partner',
    yes: 'preferred_partner',
    pipeline_partner: 'pipeline_partner',
    pipeline: 'pipeline_partner',
    prospective_partner: 'pipeline_partner',
    prospective: 'pipeline_partner',
    non_partner: 'non_partner',
    nonpartner: 'non_partner',
    no: 'non_partner',
    none: 'non_partner',
    na: 'non_partner',
    'n/a': 'non_partner',
    '': 'non_partner'
  };

  // Partner status is optional operational metadata. Unknown spreadsheet labels
  // must not block otherwise valid college/course rows from being imported.
  return aliases[normalised] ?? 'non_partner';
}

const ImportRowSchema = z.object({
  college_name: z.string().trim().min(1),
  city: optionalText,
  state: optionalText,
  country: z.preprocess((value) => String(value || 'India').trim(), z.string().default('India')),
  poc_name: optionalText,
  poc_email: z.preprocess((value) => String(value || '').trim(), z.string().email().optional().or(z.literal(''))),
  partner_status: z.preprocess(
    normalisePartnerStatus,
    z.enum(['preferred_partner', 'pipeline_partner', 'non_partner'])
  ),
  commission_based: z.union([z.boolean(), z.string()]).optional(),
  hostel_available: z.union([z.boolean(), z.string()]).optional(),
  source_url: z.preprocess((value) => String(value || '').trim(), z.string().url().optional().or(z.literal(''))),
  course_name: z.string().trim().min(1),
  subject_area: z.string().trim().min(1),
  duration: optionalText,
  total_fee: z.union([z.number(), z.string()]).optional(),
  placement_count: z.union([z.number(), z.string()]).optional(),
  highest_package: z.union([z.number(), z.string()]).optional(),
  average_package: z.union([z.number(), z.string()]).optional(),
  currency: z.preprocess((value) => String(value || 'INR').trim().toUpperCase(), z.string().default('INR'))
});

const truthy = (value: unknown) => ['true', 'yes', '1', 'y'].includes(String(value).toLowerCase());
const nullableNumber = (value: unknown) => value === '' || value == null ? null : Number(value);

async function importCollegeRows(rows: unknown[]) {
  const importId = crypto.randomUUID();
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !isAllowedUserEmail(user.email)) throw new Error('Approved staff access is required.');

  let parsedRows: z.infer<typeof ImportRowSchema>[];
  try {
    parsedRows = z.array(ImportRowSchema).min(1, 'The CSV contains no data rows.').max(1000).parse(rows);
  } catch (error) {
    console.error('[college-import] validation failed', { importId, user: user.email, error });
    throw error;
  }
  if (parsedRows.length === 1 && parsedRows[0].college_name === 'Example University' && parsedRows[0].course_name === 'B.Tech CSE') {
    console.warn('[college-import] unchanged example template rejected', { importId, user: user.email });
    throw new Error('The uploaded file is the unchanged example template. Replace the Example University row with the actual college data.');
  }
  console.info('[college-import] started', {
    importId,
    user: user.email,
    rows: parsedRows.length,
    records: parsedRows.map((row) => `${row.college_name} / ${row.course_name}`)
  });
  const savedCourseIds: string[] = [];
  for (const row of parsedRows) {
    const { data: college, error: collegeError } = await supabase.from('colleges').upsert({
      name: row.college_name,
      city: row.city || null,
      state: row.state || null,
      country: row.country || 'India',
      poc_name: row.poc_name || null,
      poc_email: row.poc_email || null,
      partner_status: row.partner_status || 'non_partner',
      commission_based: truthy(row.commission_based),
      hostel_available: truthy(row.hostel_available),
      source_url: row.source_url || null,
      last_reviewed_at: new Date().toISOString()
    }, { onConflict: 'name,city,state' }).select('id').single();
    if (collegeError) {
      console.error('[college-import] college write failed', { importId, college: row.college_name, error: collegeError });
      throw new Error(`${row.college_name}: ${collegeError.message}`);
    }

    const { data: course, error: courseError } = await supabase.from('courses').upsert(
      {
        college_id: college.id,
        course_name: row.course_name,
        subject_area: row.subject_area,
        duration: row.duration || null,
        total_fee: nullableNumber(row.total_fee),
        placement_count: nullableNumber(row.placement_count),
        highest_package: nullableNumber(row.highest_package),
        average_package: nullableNumber(row.average_package),
        currency: row.currency || 'INR'
      },
      { onConflict: 'college_id,course_name' }
    ).select('id').single();
    if (courseError) {
      console.error('[college-import] course write failed', { importId, college: row.college_name, course: row.course_name, error: courseError });
      throw new Error(`${row.college_name} / ${row.course_name}: ${courseError.message}`);
    }
    if (!course?.id) throw new Error(`${row.college_name} / ${row.course_name}: saved row could not be verified.`);
    savedCourseIds.push(course.id);
  }

  const { data: verifiedCourses, error: verifyError } = await supabase
    .from('course_catalog_view')
    .select('course_id')
    .in('course_id', savedCourseIds);
  if (verifyError) {
    console.error('[college-import] catalogue verification query failed', { importId, error: verifyError });
    throw new Error(`Upload verification failed: ${verifyError.message}`);
  }
  if ((verifiedCourses?.length ?? 0) !== savedCourseIds.length) {
    console.error('[college-import] catalogue verification count mismatch', {
      importId,
      saved: savedCourseIds.length,
      visible: verifiedCourses?.length ?? 0
    });
    throw new Error(`Upload verification failed: saved ${savedCourseIds.length} row(s), but only ${verifiedCourses?.length ?? 0} are visible in the College Database.`);
  }

  revalidatePath('/colleges');
  revalidatePath('/admin');
  revalidatePath('/dashboard');
  const records = parsedRows.map((row) => `${row.college_name} / ${row.course_name}`);
  console.info('[college-import] completed', { importId, user: user.email, rows: records.length, records });
  return { imported: parsedRows.length, updated: verifiedCourses?.length ?? 0, records, importId };
}

export async function importCollegeRowsAction(rows: unknown[]) {
  try {
    const result = await importCollegeRows(rows);
    return { ok: true as const, ...result };
  } catch (error) {
    const importId = crypto.randomUUID();
    const message = error instanceof z.ZodError
      ? error.issues.map((issue) => `${issue.path.join('.') || 'CSV'}: ${issue.message}`).join('; ')
      : error instanceof Error
        ? error.message
        : 'The upload could not be completed.';
    console.error('[college-import] request failed', { importId, message, error });
    return {
      ok: false as const,
      imported: 0,
      updated: 0,
      records: [] as string[],
      importId,
      error: message
    };
  }
}
