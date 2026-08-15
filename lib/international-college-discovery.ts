import type { StudentInput } from './types';

export type InternationalCollegeInsight = {
  college_name: string;
  course_name?: string;
  subject_area?: string;
  city: string | null;
  country: string;
  fit_level: 'Strong' | 'Good' | 'Moderate' | 'Exploratory';
  fit_score: number;
  fit_feedback: string;
  source_url: string;
  ownership: 'private';
  web_verification_status: 'staff_verification_required';
};

type ProviderStatus = { provider: string; status: 'not_configured' | 'failed' | 'no_parseable_results' | 'used'; detail: string };

function clean(value?: string) { return value?.trim().replace(/^['"]|['"]$/g, ''); }
function providerKey() { return clean(process.env.GROQ_API_KEY) || (clean(process.env.AI_PROVIDER)?.toLowerCase() === 'groq' ? clean(process.env.AI_API_KEY) : undefined); }
function level(value: string) {
  const v = value.toLowerCase();
  if (v.includes('strong')) return 'Strong' as const;
  if (v.includes('good')) return 'Good' as const;
  if (v.includes('moderate')) return 'Moderate' as const;
  return 'Exploratory' as const;
}
function score(v: InternationalCollegeInsight['fit_level']) { return v === 'Strong' ? 85 : v === 'Good' ? 70 : v === 'Moderate' ? 55 : 40; }
function safeUrl(raw: string) {
  const extracted = raw.match(/https:\/\/[^\s<>"'\])}]+/i)?.[0]?.replace(/[.,;:]+$/, '') || raw;
  try { const url = new URL(extracted); return url.protocol === 'https:' ? url.toString() : null; } catch { return null; }
}

function assessmentContext(raw: string | null) {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    return {
      chosenStreamAlignment: parsed?.chosenStreamAlignment || null,
      predictedStreams: Array.isArray(parsed?.predictedStreams) ? parsed.predictedStreams.slice(0, 3) : []
    };
  } catch { return null; }
}

function prompt(student: StudentInput, rawAssessment: string | null) {
  const chosen = student.subjectsInterest.slice(0, 4);
  const assessment = assessmentContext(rawAssessment);
  return `Search current official websites for up to 6 reputable PRIVATE international universities/colleges outside India that offer a DIRECT programme matching the student's chosen stream.

Chosen stream is a HARD FILTER: ${JSON.stringify(chosen)}.
- For Medicine, return direct medical degrees for school-leaver/undergraduate entry (for example MBBS, MBChB, MD where it is a first-entry medical degree). Do not return biomedical science, public health, nursing, pharmacy, business, law or computer science as substitutes.
- For other subjects, apply the same rule: direct chosen-stream degree first; do not pad results with unrelated programmes.
- PRIVATE ownership is required. If ownership is uncertain, omit the institution.
- Prioritise established, highly regarded private institutions with clear official programme pages, but do not claim ranking or admission probability unless the official source supports it.
- Do not use aggregators. Use official institution pages or authoritative regulator/government sources only.
- Return fewer than 6 if fewer reliable matches can be verified.

Student context: ${JSON.stringify({ programme: student.programLevel, chosenStreams: chosen, passion: student.passion, purpose: student.purpose, careerGoals: student.careerGoals, preferredLocations: student.preferredLocations, assessment })}

Return ONLY lines in this format:
RESULT|||College name|||Exact programme|||City|||Country|||Strong|Good|Moderate|||Subject area|||private|||https://official-source-url`;
}

export async function discoverInternationalCollegeInsights(student: StudentInput, rawAssessment: string | null): Promise<{ insights: InternationalCollegeInsight[]; status: { searched_at: string; providers: ProviderStatus[]; result_count: number } }> {
  const apiKey = providerKey();
  const searchedAt = new Date().toISOString();
  if (!apiKey) return { insights: [], status: { searched_at: searchedAt, providers: [{ provider: 'live-search', status: 'not_configured', detail: 'International discovery is not configured.' }], result_count: 0 } };
  try {
    const model = clean(process.env.GROQ_FAST_MODEL) || 'openai/gpt-oss-20b';
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model,
        messages: [{ role: 'user', content: prompt(student, rawAssessment) }],
        tools: [{ type: 'browser_search' }],
        tool_choice: 'required',
        reasoning_effort: 'low',
        include_reasoning: false,
        temperature: 0.1,
        max_completion_tokens: 900,
        stream: false
      }),
      signal: AbortSignal.timeout(22000)
    });
    const text = await response.text();
    if (!response.ok) throw new Error(`International search HTTP ${response.status}`);
    const data = JSON.parse(text) as { choices?: Array<{ message?: { content?: string } }> };
    const content = data.choices?.[0]?.message?.content || '';
    const insights = content
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line.startsWith('RESULT|||'))
      .map((line): InternationalCollegeInsight | null => {
        const p = line.split('|||').map((x) => x.trim());
        if (p.length < 10 || p[8].toLowerCase() !== 'private') return null;
        const url = safeUrl(p.slice(9).join('|||'));
        if (!url) return null;
        const fit = level(p[5]);
        return {
          college_name: p[1],
          course_name: p[2] || undefined,
          city: p[3] || null,
          country: p[4] || 'International',
          fit_level: fit,
          fit_score: score(fit),
          subject_area: p[6] || undefined,
          ownership: 'private',
          fit_feedback: 'Potential international chosen-stream match. Staff must verify programme structure, entry requirements, fees, licensing/recognition and admissions details on the official source.',
          source_url: url,
          web_verification_status: 'staff_verification_required'
        };
      })
      .filter((x): x is InternationalCollegeInsight => x !== null)
      .slice(0, 6);
    return { insights, status: { searched_at: searchedAt, providers: [{ provider: 'live-search', status: insights.length ? 'used' : 'no_parseable_results', detail: insights.length ? `${insights.length} international private candidate(s) returned for staff verification.` : 'No suitable international private chosen-stream candidates were returned.' }], result_count: insights.length } };
  } catch (error) {
    console.error('[international-college-discovery] provider failed', error);
    return { insights: [], status: { searched_at: searchedAt, providers: [{ provider: 'live-search', status: 'failed', detail: 'International discovery is temporarily unavailable. Existing cached results are preserved.' }], result_count: 0 } };
  }
}
