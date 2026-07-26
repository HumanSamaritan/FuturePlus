import { createClient } from '@/lib/supabase/server';
import { CourseWithCollege } from './types';
import { unstable_noStore as noStore } from 'next/cache';

export async function getCourseCatalog(programLevel?: 'undergraduate' | 'postgraduate'): Promise<CourseWithCollege[]> {
  noStore();
  const supabase = await createClient();
  let query = supabase
    .from('course_catalog_view')
    .select('*')
    .order('partner_status', { ascending: true })
    .order('average_package', { ascending: false, nullsFirst: false });
  if (programLevel) query = query.eq('program_level', programLevel);
  const { data, error } = await query;

  if (error) throw new Error(error.message);
  return (data ?? []) as CourseWithCollege[];
}

export async function getSubjectAreas(programLevel: 'undergraduate' | 'postgraduate' = 'undergraduate') {
  const courses = await getCourseCatalog(programLevel);
  return [...new Set(courses.map((course) => course.subject_area).filter(Boolean))].sort();
}
