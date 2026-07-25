import { CourseWithCollege, RecommendationResult, StudentInput } from './types';

function clamp(value: number, min = 0, max = 100) {
  return Math.max(min, Math.min(max, value));
}

function includesAny(source: string | null | undefined, targets: string[]) {
  const lowerSource = (source ?? '').toLowerCase();
  return targets.some((target) => lowerSource.includes(target.toLowerCase()));
}

function locationMatches(course: CourseWithCollege, preferredLocations: string[]) {
  if (!preferredLocations.length || preferredLocations.includes('Anywhere in India')) return true;
  const courseLocation = [course.city, course.state, course.country].filter(Boolean).join(' ').toLowerCase();
  return preferredLocations.some((location) => courseLocation.includes(location.toLowerCase()));
}

function moneyScore(totalFee: number | null, budgetMax: number | null | undefined) {
  if (!budgetMax || !totalFee) return 10;
  if (totalFee <= budgetMax) return 20;
  const overrun = (totalFee - budgetMax) / budgetMax;
  if (overrun <= 0.1) return 14;
  if (overrun <= 0.25) return 8;
  if (overrun <= 0.5) return 4;
  return 0;
}

function salaryScore(avgPackage: number | null, highestPackage: number | null, expected: number | null | undefined) {
  if (!expected) return avgPackage || highestPackage ? 14 : 8;
  const referencePackage = avgPackage || highestPackage || 0;
  if (referencePackage >= expected) return 20;
  if (referencePackage >= expected * 0.8) return 15;
  if (referencePackage >= expected * 0.6) return 9;
  if (referencePackage > 0) return 4;
  return 0;
}

function partnerScore(course: CourseWithCollege) {
  if (course.partner_status === 'preferred_partner') return course.commission_based ? 10 : 8;
  if (course.partner_status === 'pipeline_partner') return 5;
  return 0;
}

function buildReason(student: StudentInput, course: CourseWithCollege, score: number) {
  const reasons: string[] = [];

  if (includesAny(course.subject_area, student.subjectsInterest) || includesAny(course.course_name, student.subjectsInterest)) {
    reasons.push(`matches the student's stated academic interest in ${student.subjectsInterest.join(', ')}`);
  }

  if (student.budgetMax && course.total_fee && course.total_fee <= student.budgetMax) {
    reasons.push('sits within the stated fee expectation');
  }

  if (student.salaryExpectation && course.average_package && course.average_package >= student.salaryExpectation) {
    reasons.push('meets or exceeds the expected placement package');
  } else if (course.average_package) {
    reasons.push('has usable placement package data for counselling discussion');
  }

  if (student.hostelRequired && course.hostel_available) {
    reasons.push('offers hostel availability');
  }

  if (course.partner_status === 'preferred_partner') {
    reasons.push('is a preferred Future Plus partner, so application support can be faster');
  }

  if (student.passion || student.purpose) {
    reasons.push('can be positioned against the student’s passion and purpose narrative');
  }

  const prefix = score >= 80 ? 'Strong fit' : score >= 65 ? 'Good fit' : score >= 50 ? 'Moderate fit' : 'Exploratory fit';
  return `${prefix}: ${course.college_name} - ${course.course_name} ${reasons.length ? reasons.join('; ') : 'requires more information before final counselling recommendation'}.`;
}

function buildHiddenReason(course: CourseWithCollege, score: number) {
  if (course.partner_status === 'preferred_partner') return null;
  const signals: string[] = [];

  if ((course.average_package ?? 0) >= 800000) signals.push('strong average placement package');
  if ((course.highest_package ?? 0) >= 1500000) signals.push('high upside from highest package');
  if ((course.placement_count ?? 0) >= 100) signals.push('large placement count');
  if (course.hostel_available) signals.push('hostel availability');

  if (score >= 72 && signals.length) {
    return `Non-partner standout: ${signals.join(', ')}. Future Plus should evaluate whether this college should be moved into the partner pipeline or use its strengths as a benchmark for existing partners.`;
  }

  if (course.partner_status === 'pipeline_partner') {
    return 'Pipeline partner: review commercial viability, commission status, support SLA and admission conversion potential.';
  }

  return 'Non-partner option: keep visible to staff for unbiased counselling, but do not prioritise commercially unless the fit materially exceeds partner options.';
}

export function generateRecommendations(student: StudentInput, courses: CourseWithCollege[], maxResults = 8): RecommendationResult[] {
  const scored = courses.map((course) => {
    const subjectMatch = includesAny(course.subject_area, student.subjectsInterest) || includesAny(course.course_name, student.subjectsInterest);
    const subjectScore = subjectMatch ? 30 : student.subjectsInterest.length ? 5 : 15;
    const feeScore = moneyScore(course.total_fee, student.budgetMax);
    const packageScore = salaryScore(course.average_package, course.highest_package, student.salaryExpectation);
    const hostelScore = !student.hostelRequired ? 10 : course.hostel_available ? 10 : 0;
    const locScore = locationMatches(course, student.preferredLocations) ? 10 : 2;
    const futurePlusScore = partnerScore(course);
    const supportScore = student.supportRequired.includes('Job creation and deployment') && (course.average_package ?? 0) > 0 ? 5 : 3;

    const raw = subjectScore + feeScore + packageScore + hostelScore + locScore + futurePlusScore + supportScore;
    const fitScore = clamp(Math.round(raw));

    return {
      course,
      fitScore,
      scoreBreakdown: {
        subjectScore,
        feeScore,
        packageScore,
        hostelScore,
        locationScore: locScore,
        futurePlusPartnerScore: futurePlusScore,
        supportScore,
        partnerStatus: course.partner_status ?? 'unknown',
        commissionBased: Boolean(course.commission_based)
      }
    };
  });

  return scored
    .sort((a, b) => {
      if (b.fitScore !== a.fitScore) return b.fitScore - a.fitScore;
      return partnerScore(b.course) - partnerScore(a.course);
    })
    .slice(0, maxResults)
    .map((item, index) => ({
      courseId: item.course.course_id,
      fitScore: item.fitScore,
      rank: index + 1,
      scoreBreakdown: item.scoreBreakdown,
      reason: buildReason(student, item.course, item.fitScore),
      staffHiddenReason: buildHiddenReason(item.course, item.fitScore)
    }));
}
