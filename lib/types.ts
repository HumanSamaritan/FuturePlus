export type PartnerStatus = 'preferred_partner' | 'pipeline_partner' | 'non_partner';

export type CourseWithCollege = {
  course_id: string;
  course_name: string;
  subject_area: string;
  duration: string | null;
  total_fee: number | null;
  placement_count: number | null;
  highest_package: number | null;
  average_package: number | null;
  currency: string | null;
  college_id: string;
  college_name: string;
  city: string | null;
  state: string | null;
  country: string | null;
  hostel_available: boolean | null;
  partner_status: PartnerStatus | string | null;
  commission_based: boolean | null;
  source_url: string | null;
};

export type StudentInput = {
  id?: string;
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  grade?: string;
  board?: string;
  city?: string;
  state?: string;
  country?: string;
  targetIntake?: string;
  subjectsInterest: string[];
  preferredLocations: string[];
  budgetMin?: number | null;
  budgetMax?: number | null;
  salaryExpectation?: number | null;
  hostelRequired: boolean;
  passion?: string;
  purpose?: string;
  strengths?: string;
  constraints?: string;
  supportRequired: string[];
  notes?: string;
};

export type RecommendationResult = {
  courseId: string;
  fitScore: number;
  rank: number;
  scoreBreakdown: Record<string, number | string | boolean>;
  reason: string;
  staffHiddenReason: string | null;
};
