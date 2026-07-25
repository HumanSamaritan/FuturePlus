import { createClient } from '@/lib/supabase/server';
import { CourseWithCollege } from './types';

export async function getCourseCatalog(): Promise<CourseWithCollege[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('course_catalog_view')
    .select('*')
    .order('partner_status', { ascending: true })
    .order('average_package', { ascending: false, nullsFirst: false });

  if (error) throw new Error(error.message);
  return (data ?? []) as CourseWithCollege[];
}

export async function getSubjectAreas() {
  const courses = await getCourseCatalog();
  return [...new Set(courses.map((course) => course.subject_area).filter(Boolean))].sort();
}
