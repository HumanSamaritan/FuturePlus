import { CourseWithCollege, RecommendationResult, StudentInput } from './types';

export async function generateCounsellingSummary(
  student: StudentInput,
  courses: CourseWithCollege[],
  recommendations: RecommendationResult[]
) {
  const openAiKey = process.env.OPENAI_API_KEY;
  const model = process.env.OPENAI_MODEL || 'gpt-4.1-mini';

  const topCourses = recommendations.map((rec) => {
    const course = courses.find((item) => item.course_id === rec.courseId);
    return {
      rank: rec.rank,
      fitScore: rec.fitScore,
      college: course?.college_name,
      course: course?.course_name,
      fee: course?.total_fee,
      averagePackage: course?.average_package,
      hostel: course?.hostel_available,
      reason: rec.reason
    };
  });

  if (!openAiKey) {
    return [
      `${student.firstName} ${student.lastName} is looking for undergraduate counselling in ${student.subjectsInterest.join(', ') || 'open subjects'}.`,
      `Top recommendation score is ${recommendations[0]?.fitScore ?? 'not available'}. Use this MVP recommendation as a counselling starting point, then verify latest fees, placement and hostel details before final advice.`,
      student.passion || student.purpose
        ? `Passion/purpose note: ${[student.passion, student.purpose].filter(Boolean).join(' | ')}`
        : 'Passion/purpose note should be completed in the next counselling conversation.'
    ].join('\n\n');
  }

  const prompt = `You are a Future Plus admissions counselling assistant. Create a concise staff-facing counselling summary. Be practical, ethical and student-first. Do not fabricate university data. Mention that latest university data must be verified before final recommendation.\n\nStudent:\n${JSON.stringify(student, null, 2)}\n\nTop course recommendations:\n${JSON.stringify(topCourses, null, 2)}`;

  const response = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${openAiKey}`
    },
    body: JSON.stringify({
      model,
      input: prompt,
      max_output_tokens: 600
    })
  });

  if (!response.ok) {
    return `AI summary could not be generated. Rule-based recommendations are still available. Error: ${response.status}`;
  }

  const data = await response.json();
  return data.output_text || 'AI summary was empty. Please use the rule-based recommendation table.';
}
