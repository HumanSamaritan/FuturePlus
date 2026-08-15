import { CourseWithCollege, RecommendationResult, StudentInput } from './types';

type SubjectTier = 'direct' | 'adjacent' | 'open' | 'none';
type SubjectMatch = { tier: SubjectTier; interest: string | null };

type SubjectRule = {
  direct: string[];
  adjacent?: string[];
};

const SUBJECT_RULES: Record<string, SubjectRule> = {
  accounting: { direct: ['accounting'] },
  agriculture: { direct: ['agriculture', 'agronomy', 'horticulture'] },
  architecture: { direct: ['architecture'] },
  arts: { direct: ['arts', 'humanities', 'english'] },
  'artificial intelligence': { direct: ['artificial intelligence', 'machine learning'] },
  biotechnology: { direct: ['biotechnology', 'biotech'] },
  'b-pharma': { direct: ['b.pharm', 'b pharm', 'pharmacy', 'pharmaceutical', 'pharmaceutics', 'pharmacology', 'pharmacognosy'] },
  'business administration': { direct: ['business administration', 'bba'] },
  chemistry: { direct: ['chemistry'] },
  commerce: { direct: ['commerce', 'b.com'] },
  'computer science': { direct: ['computer science', 'computer applications', 'information technology', 'software engineering'] },
  'data science': { direct: ['data science', 'data analytics', 'business analytics'] },
  design: { direct: ['design'] },
  economics: { direct: ['economics'] },
  engineering: { direct: ['engineering'] },
  finance: { direct: ['finance', 'financial'] },
  hospitality: { direct: ['hospitality', 'hotel management'] },
  law: { direct: ['law', 'll.b', 'llb'] },
  management: { direct: ['management', 'business administration', 'mba', 'bba'] },
  mathematics: { direct: ['mathematics', 'maths'] },
  'media & communication': { direct: ['media', 'communication', 'journalism', 'mass communication'] },
  medicine: {
    direct: ['medicine', 'mbbs', 'medical sciences', 'clinical medicine', 'dentistry', 'dental surgery'],
    adjacent: ['biomedical science', 'biomedical engineering', 'biotechnology', 'health science', 'life science']
  },
  nursing: { direct: ['nursing'] },
  physics: { direct: ['physics'] },
  psychology: { direct: ['psychology'] },
  'public policy': { direct: ['public policy', 'public administration', 'governance'] },
  robotics: { direct: ['robotics', 'automation'] },
  'social sciences': { direct: ['social science', 'sociology', 'political science'] },
  sustainability: { direct: ['sustainability', 'environmental', 'renewable energy', 'climate'] }
};

const PG_ONLY_TITLE_PATTERNS = [
  /\bmba\b/i,
  /\bmaster(?:'s|s)?\b/i,
  /\bm\.\s*(?:tech|sc|com|a|des|pharm)\b/i,
  /\bmsc\b/i,
  /\bmtech\b/i,
  /\bm\.b\.a\b/i,
  /\bpgdm\b/i,
  /\bpgpm\b/i,
  /\bpost\s*graduate\b/i,
  /\bexecutive\s+mba\b/i
];

const UG_ONLY_TITLE_PATTERNS = [
  /\bbachelor(?:'s|s)?\b/i,
  /\bb\.\s*(?:tech|sc|com|a|des|pharm|arch)\b/i,
  /\bbtech\b/i,
  /\bbsc\b/i,
  /\bbba\b/i,
  /\bmbbs\b/i,
  /\bllb\b/i
];

function clamp(value: number, min = 0, max = 100) {
  return Math.max(min, Math.min(max, value));
}

function normalize(value: string | null | undefined) {
  return (value ?? '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9.+]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function courseText(course: CourseWithCollege) {
  return normalize(`${course.subject_area || ''} ${course.course_name || ''}`);
}

function hasTerm(text: string, term: string) {
  const normalizedTerm = normalize(term);
  return Boolean(normalizedTerm) && text.includes(normalizedTerm);
}

function programmeTitleMatches(course: CourseWithCollege, requestedLevel: 'undergraduate' | 'postgraduate') {
  const title = course.course_name || '';
  if (requestedLevel === 'undergraduate' && PG_ONLY_TITLE_PATTERNS.some((pattern) => pattern.test(title))) {
    return false;
  }
  if (requestedLevel === 'postgraduate' && UG_ONLY_TITLE_PATTERNS.some((pattern) => pattern.test(title))) {
    return false;
  }
  return true;
}

function subjectRelevance(course: CourseWithCollege, interests: string[]): SubjectMatch {
  if (!interests.length) return { tier: 'open', interest: null };
  const text = courseText(course);
  let adjacentInterest: string | null = null;

  for (const interest of interests) {
    const key = normalize(interest);
    const rule = SUBJECT_RULES[key];
    const directTerms = rule?.direct?.length ? rule.direct : [interest];
    if (directTerms.some((term) => hasTerm(text, term))) {
      return { tier: 'direct', interest };
    }
    if (!adjacentInterest && rule?.adjacent?.some((term) => hasTerm(text, term))) {
      adjacentInterest = interest;
    }
  }

  return adjacentInterest
    ? { tier: 'adjacent', interest: adjacentInterest }
    : { tier: 'none', interest: null };
}

function locationMatches(course: CourseWithCollege, preferredLocations: string[]) {
  if (!preferredLocations.length || preferredLocations.includes('Anywhere in India')) return true;
  const courseLocation = normalize([course.city, course.state, course.country].filter(Boolean).join(' '));
  return preferredLocations.some((location) => courseLocation.includes(normalize(location)));
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
  const referencePackage = avgPackage || highestPackage || 0;
  if (!expected) return referencePackage > 0 ? 4 : 2;
  if (referencePackage >= expected) return 5;
  if (referencePackage >= expected * 0.8) return 4;
  if (referencePackage >= expected * 0.6) return 3;
  if (referencePackage > 0) return 1;
  return 0;
}

function partnerScore(course: CourseWithCollege) {
  if (course.partner_status === 'preferred_partner') return course.commission_based ? 5 : 4;
  if (course.partner_status === 'pipeline_partner') return 2;
  return 0;
}

function tierRank(tier: SubjectTier) {
  if (tier === 'direct') return 3;
  if (tier === 'adjacent') return 2;
  if (tier === 'open') return 1;
  return 0;
}

function buildReason(
  student: StudentInput,
  course: CourseWithCollege,
  score: number,
  subjectMatch: SubjectMatch
) {
  const reasons: string[] = [];
  const statedInterest = subjectMatch.interest || student.subjectsInterest.join(', ');

  if (subjectMatch.tier === 'direct') {
    reasons.push(`directly matches the student's stated stream${statedInterest ? `: ${statedInterest}` : ''}`);
  } else if (subjectMatch.tier === 'adjacent') {
    reasons.push(`adjacent pathway to ${statedInterest}; this is not the student's stated stream and should be discussed as an alternative only`);
  }

  if (student.budgetMax && course.total_fee && course.total_fee <= student.budgetMax) {
    reasons.push('total course fee is within the stated maximum budget');
  } else if (!course.total_fee) {
    reasons.push('fee requires verification before financial fit can be confirmed');
  }

  if (locationMatches(course, student.preferredLocations)) {
    reasons.push('matches the stated location preference');
  }

  if (student.hostelRequired && course.hostel_available) {
    reasons.push('offers hostel availability');
  }

  if (course.partner_status === 'preferred_partner') {
    reasons.push('Future Plus partner status may support the application process, but it does not override academic fit');
  }

  const prefix = subjectMatch.tier === 'adjacent'
    ? 'Adjacent pathway'
    : score >= 80
      ? 'Strong fit'
      : score >= 65
        ? 'Good fit'
        : score >= 50
          ? 'Moderate fit'
          : 'Exploratory fit';

  return `${prefix}: ${course.college_name} - ${course.course_name}. ${reasons.join('; ')}.`;
}

function buildHiddenReason(course: CourseWithCollege, score: number, subjectMatch: SubjectMatch) {
  if (subjectMatch.tier === 'adjacent') {
    return 'Adjacent-stream option only. Do not present this as a substitute for the student’s chosen stream without an explicit counselling discussion.';
  }

  if (course.partner_status === 'preferred_partner') return null;
  const signals: string[] = [];
  if ((course.average_package ?? 0) >= 800000) signals.push('strong average placement package');
  if ((course.highest_package ?? 0) >= 1500000) signals.push('high upside from highest package');
  if ((course.placement_count ?? 0) >= 100) signals.push('large placement count');
  if (course.hostel_available) signals.push('hostel availability');

  if (score >= 72 && signals.length) {
    return `Relevant non-partner standout: ${signals.join(', ')}. Future Plus may evaluate this institution for the partner pipeline, but student fit remains the primary criterion.`;
  }

  if (course.partner_status === 'pipeline_partner') {
    return 'Relevant pipeline partner: review commercial viability, support SLA and admission conversion potential only after confirming student fit.';
  }

  return 'Relevant non-partner option: keep visible for unbiased counselling. Commercial status must not change the academic ranking.';
}

export function generateRecommendations(
  student: StudentInput,
  courses: CourseWithCollege[],
  maxResults = 8
): RecommendationResult[] {
  const requestedProgramLevel = student.programLevel || 'undergraduate';

  const scored = courses
    .filter((course) =>
      (course.program_level || 'undergraduate') === requestedProgramLevel
      && programmeTitleMatches(course, requestedProgramLevel)
    )
    .map((course) => {
      const subjectMatch = subjectRelevance(course, student.subjectsInterest);
      if (subjectMatch.tier === 'none') return null;

      const subjectScore = subjectMatch.tier === 'direct'
        ? 55
        : subjectMatch.tier === 'adjacent'
          ? 25
          : 35;
      const feeScore = moneyScore(course.total_fee, student.budgetMax);
      const packageScore = salaryScore(course.average_package, course.highest_package, student.salaryExpectation);
      const hostelScore = !student.hostelRequired ? 5 : course.hostel_available ? 5 : 0;
      const locScore = locationMatches(course, student.preferredLocations) ? 8 : 2;
      const futurePlusScore = partnerScore(course);
      const supportScore = student.supportRequired.includes('Job creation and deployment') && (course.average_package ?? 0) > 0 ? 2 : 1;

      const raw = subjectScore + feeScore + packageScore + hostelScore + locScore + futurePlusScore + supportScore;
      const fitScore = subjectMatch.tier === 'adjacent'
        ? clamp(Math.min(Math.round(raw), 69))
        : clamp(Math.round(raw));

      return {
        course,
        subjectMatch,
        fitScore,
        scoreBreakdown: {
          subjectMatchType: subjectMatch.tier,
          matchedInterest: subjectMatch.interest || 'open',
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
    })
    .filter((item): item is NonNullable<typeof item> => Boolean(item));

  return scored
    .sort((a, b) => {
      const tierDifference = tierRank(b.subjectMatch.tier) - tierRank(a.subjectMatch.tier);
      if (tierDifference !== 0) return tierDifference;
      if (b.fitScore !== a.fitScore) return b.fitScore - a.fitScore;
      const aFee = a.course.total_fee ?? Number.MAX_SAFE_INTEGER;
      const bFee = b.course.total_fee ?? Number.MAX_SAFE_INTEGER;
      if (aFee !== bFee) return aFee - bFee;
      return partnerScore(b.course) - partnerScore(a.course);
    })
    .slice(0, maxResults)
    .map((item, index) => ({
      courseId: item.course.course_id,
      fitScore: item.fitScore,
      rank: index + 1,
      scoreBreakdown: item.scoreBreakdown,
      reason: buildReason(student, item.course, item.fitScore, item.subjectMatch),
      staffHiddenReason: buildHiddenReason(item.course, item.fitScore, item.subjectMatch)
    }));
}
