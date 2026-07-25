'use server';

import { revalidatePath } from 'next/cache';
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
        source_url: parsed.sourceUrl || null
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
