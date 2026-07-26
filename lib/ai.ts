import { CourseWithCollege, RecommendationResult, StudentInput } from './types';

type GeminiResponse = {
  candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  promptFeedback?: { blockReason?: string };
};

export async function generateCounsellingSummary(
  student: StudentInput,
  courses: CourseWithCollege[],
  recommendations: RecommendationResult[]
) {
  const geminiKey = process.env.GEMINI_API_KEY;
  const model = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
  const programmeLabel = student.programLevel === 'postgraduate' ? 'PG' : 'UG';

  const shortlistedColleges = recommendations.map((rec) => {
    const course = courses.find((item) => item.course_id === rec.courseId);
    return {
      rankFromVerifiedFitScore: rec.rank,
      fitScore: rec.fitScore,
      college: course?.college_name,
      course: course?.course_name,
      subjectArea: course?.subject_area,
      location: [course?.city, course?.state, course?.country].filter(Boolean).join(', '),
      totalCourseFee: course?.total_fee,
      currency: course?.currency,
      placementCount: course?.placement_count,
      averagePackage: course?.average_package,
      highestPackage: course?.highest_package,
      hostelAvailable: course?.hostel_available,
      partnerStatus: course?.partner_status,
      commissionBased: course?.commission_based,
      sourceUrl: course?.source_url,
      verifiedFitReason: rec.reason
    };
  });

  if (!geminiKey) {
    return [
      `${student.firstName} ${student.lastName} is seeking ${programmeLabel} counselling in ${student.subjectsInterest.join(', ') || 'open subjects'}.`,
      `The verified college-fit engine shortlisted ${shortlistedColleges.length} matching course options. The leading score is ${recommendations[0]?.fitScore ?? 'not available'}/100.`,
      'Gemini staff review is not configured. Add GEMINI_API_KEY and GEMINI_MODEL to generate the detailed AI counselling review.',
      'Staff must verify current eligibility, fees, placements, hostel availability and admissions dates directly with each institution before advising the student.'
    ].join('\n\n');
  }

  const prompt = `You are the staff-facing admissions intelligence assistant for Future Plus Education.

Prepare a concise but useful ${programmeLabel} counselling review using ONLY the supplied student profile and college database shortlist. Never invent a college, course, fee, placement figure, admission rule or scholarship. Do not hide or exclude a stronger student-fit option because it is a non-partner. Partner status is provided only so staff understand the available operational relationship.

Use these headings:
1. Student fit overview
2. Best-fit colleges (rank up to five, including course, fit score, total fee, location, hostel, placement evidence and the specific reasons it fits)
3. Partner-network opportunities (identify preferred and pipeline partners separately)
4. Strong non-partner alternatives
5. Financial support and risk flags
6. Questions for the next counselling conversation
7. Data staff must verify before giving final advice

Clearly say when data is missing. Treat every fee as the overall course cost when supplied.

Student profile:
${JSON.stringify(student, null, 2)}

Database-grounded shortlist:
${JSON.stringify(shortlistedColleges, null, 2)}`;

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': geminiKey
        },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          generationConfig: { maxOutputTokens: 4096 }
        })
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[gemini] counselling review failed', {
        status: response.status,
        response: errorText.slice(0, 500)
      });
      return `Gemini counselling review could not be generated (HTTP ${response.status}). The verified college-fit table below is still available for staff review.`;
    }

    const data = await response.json() as GeminiResponse;
    const text = data.candidates?.[0]?.content?.parts
      ?.map((part) => part.text || '')
      .join('')
      .trim();

    if (text) return text;

    return data.promptFeedback?.blockReason
      ? `Gemini did not generate the counselling review (${data.promptFeedback.blockReason}). Use the verified college-fit table below.`
      : 'Gemini returned an empty counselling review. Use the verified college-fit table below.';
  } catch (error) {
    console.error('[gemini] counselling review request error', error);
    return 'Gemini counselling review could not be reached. The verified college-fit table below is still available for staff review.';
  }
}
