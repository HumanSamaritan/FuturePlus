import { generateRecommendations } from './recommendation';
import { CourseWithCollege, StudentInput } from './types';

export type WebCollegeInsight = {
  college_name: string;
  course_name: string;
  subject_area: string;
  duration: string | null;
  total_fee: number | null;
  placement_count: number | null;
  highest_package: number | null;
  average_package: number | null;
  currency: string;
  city: string | null;
  state: string | null;
  country: 'India';
  poc_name: string | null;
  poc_email: string | null;
  hostel_available: boolean | null;
  partner_status: 'non_partner';
  commission_based: false;
  program_level: 'undergraduate' | 'postgraduate';
  source_url: string;
  additional_sources: string[];
  fit_score: number;
  fit_reason: string;
  web_verification_status: 'staff_verification_required';
  discovered_by: string[];
};

type DiscoveryCandidate = Omit<
  WebCollegeInsight,
  'fit_score' | 'fit_reason' | 'web_verification_status' | 'discovered_by'
>;

function clean(value?: string) {
  return value?.trim().replace(/^['"]|['"]$/g, '');
}

function providerKey(provider: 'groq' | 'gemini' | 'openrouter') {
  const specific = clean(process.env[`${provider.toUpperCase()}_API_KEY`]);
  const legacyProvider = clean(process.env.AI_PROVIDER)?.toLowerCase();
  return specific || (legacyProvider === provider ? clean(process.env.AI_API_KEY) : undefined);
}

function extractJsonArray(text: string): unknown[] {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i)?.[1];
  const sources = [fenced, text].filter(Boolean) as string[];
  for (const source of sources) {
    const candidates = [
      source.trim(),
      source.slice(source.indexOf('['), source.lastIndexOf(']') + 1)
    ];
    for (const candidate of candidates) {
      if (!candidate) continue;
      try {
        const parsed = JSON.parse(candidate);
        if (Array.isArray(parsed)) return parsed;
        if (parsed && typeof parsed === 'object') {
          const object = parsed as Record<string, unknown>;
          for (const key of ['results', 'colleges', 'universities', 'recommendations', 'data']) {
            if (Array.isArray(object[key])) return object[key] as unknown[];
          }
        }
      } catch {
        // Try the next likely JSON representation.
      }
    }
  }
  return [];
}

function nullableNumber(value: unknown) {
  if (value === null || value === undefined || value === '') return null;
  const number = Number(String(value).replace(/[^\d.-]/g, ''));
  return Number.isFinite(number) && number >= 0 ? number : null;
}

function normalizeCandidate(value: unknown): DiscoveryCandidate | null {
  if (!value || typeof value !== 'object') return null;
  const row = value as Record<string, unknown>;
  const collegeName = String(row.college_name || '').trim();
  const courseName = String(row.course_name || '').trim();
  const sourceUrl = String(row.source_url || '').trim();
  if (!collegeName || !courseName || !/^https?:\/\//i.test(sourceUrl)) return null;
  const additionalSources = Array.isArray(row.additional_sources)
    ? row.additional_sources.map(String).filter((url) => /^https?:\/\//i.test(url)).slice(0, 4)
    : [];

  return {
    college_name: collegeName,
    course_name: courseName,
    subject_area: String(row.subject_area || '').trim() || courseName,
    duration: row.duration ? String(row.duration).trim() : null,
    total_fee: nullableNumber(row.total_fee),
    placement_count: nullableNumber(row.placement_count),
    highest_package: nullableNumber(row.highest_package),
    average_package: nullableNumber(row.average_package),
    currency: String(row.currency || 'INR').trim().toUpperCase(),
    city: row.city ? String(row.city).trim() : null,
    state: row.state ? String(row.state).trim() : null,
    country: 'India',
    poc_name: row.poc_name ? String(row.poc_name).trim() : null,
    poc_email: row.poc_email ? String(row.poc_email).trim() : null,
    hostel_available: typeof row.hostel_available === 'boolean' ? row.hostel_available : null,
    partner_status: 'non_partner',
    commission_based: false,
    program_level: row.program_level === 'postgraduate' ? 'postgraduate' : 'undergraduate',
    source_url: sourceUrl,
    additional_sources: [...new Set([sourceUrl, ...additionalSources])].slice(1)
  };
}

function buildDiscoveryPrompt(student: StudentInput) {
  const discoveryProfile = {
    programLevel: student.programLevel,
    academicResults: {
      board: student.board,
      classXPercentage: student.marksX,
      classXIIPercentage: student.marksXii,
      undergraduateDegree: student.undergraduateDegree,
      undergraduateSpecialisation: student.undergraduateSpecialisation,
      undergraduateFinalPercentage: student.undergraduateFinalPercentage,
      workExperienceMonths: student.workExperienceMonths
    },
    subjectsInterest: student.subjectsInterest,
    preferredLocations: student.preferredLocations,
    totalCourseBudget: { minimum: student.budgetMin, maximum: student.budgetMax, currency: 'INR' },
    salaryExpectation: student.salaryExpectation,
    hostelRequired: student.hostelRequired,
    passion: student.passion?.slice(0, 500),
    purpose: student.purpose?.slice(0, 500),
    strengths: student.strengths?.slice(0, 500),
    constraints: student.constraints?.slice(0, 500),
    supportRequired: student.supportRequired,
    careerGoals: student.careerGoals?.slice(0, 500)
  };
  return `Search the live World Wide Web for Indian universities or colleges that match this student's requirements and are not present in the supplied Future Plus partner database context.

Return up to 8 strong course-level alternatives from across India. Research current information from official university pages first; use UGC, AICTE, NIRF, NAAC or official placement/admission documents as secondary sources. Do not invent or estimate missing values.

Return ONLY a valid JSON array. Each object must contain exactly:
college_name, course_name, subject_area, duration, total_fee, placement_count, highest_package, average_package, currency, city, state, poc_name, poc_email, hostel_available, source_url, additional_sources.

Rules:
- total_fee means total cost for the complete course in INR, not annual fee. Use null if not explicitly supported.
- placement_count, highest_package and average_package must be numeric INR values or null.
- hostel_available must be true, false or null.
- source_url must be a directly relevant official or authoritative page.
- additional_sources must be an array of directly relevant URLs.
- Include only institutions in India.
- Do not claim this is an exhaustive list of every Indian university.

Student requirement:
${JSON.stringify(discoveryProfile)}`;
}

function messageText(content: unknown) {
  if (typeof content === 'string') return content.trim();
  if (Array.isArray(content)) {
    return content.map((part) => {
      if (typeof part === 'string') return part;
      if (part && typeof part === 'object' && 'text' in part) {
        return String((part as { text?: unknown }).text || '');
      }
      return '';
    }).join('').trim();
  }
  return '';
}

async function formatGroqSearchEvidence(
  apiKey: string,
  originalPrompt: string,
  evidence: string
) {
  const model = clean(process.env.GROQ_MODEL) || 'llama-3.1-8b-instant';
  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model,
      messages: [{
        role: 'user',
        content: `${originalPrompt}

Use only the following web-search evidence. Return a JSON object with one key named "results"; its value must be the requested array. Use null for unsupported fields.

WEB SEARCH EVIDENCE:
${evidence.slice(0, 24000)}`
      }],
      response_format: { type: 'json_object' },
      temperature: 0.1,
      max_completion_tokens: 5000
    })
  });
  const responseText = await response.text();
  if (!response.ok) {
    throw new Error(
      `Groq evidence formatting HTTP ${response.status}: ${responseText.replace(/\s+/g, ' ').slice(0, 300)}`
    );
  }
  const data = JSON.parse(responseText) as {
    choices?: Array<{ message?: { content?: unknown } }>;
  };
  return messageText(data.choices?.[0]?.message?.content);
}

async function discoverWithGroq(prompt: string) {
  const apiKey = providerKey('groq');
  if (!apiKey) return null;
  const configuredModel = clean(process.env.GROQ_SEARCH_MODEL) || 'groq/compound-mini';
  const models = [...new Set([configuredModel, 'groq/compound-mini'])];
  let lastError = '';
  for (const model of models) {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model,
        messages: [{ role: 'user', content: prompt }],
        max_completion_tokens: 5000
      })
    });
    if (!response.ok) {
      const errorText = (await response.text()).replace(/\s+/g, ' ').slice(0, 300);
      lastError = `${model} HTTP ${response.status}: ${errorText}`;
      if (response.status === 413 && model !== 'groq/compound-mini') continue;
      throw new Error(`Groq web search ${lastError}`);
    }
    const data = await response.json() as {
      choices?: Array<{
        finish_reason?: string;
        message?: {
          content?: unknown;
          executed_tools?: unknown[];
          reasoning?: unknown;
        };
      }>;
    };
    const choice = data.choices?.[0];
    const directContent = messageText(choice?.message?.content);
    if (directContent && extractJsonArray(directContent).length) return directContent;

    const toolEvidence = JSON.stringify(choice?.message?.executed_tools || []);
    if (toolEvidence !== '[]') {
      return formatGroqSearchEvidence(
        apiKey,
        prompt,
        `${directContent ? `COMPOUND RESPONSE:\n${directContent}\n\n` : ''}EXECUTED TOOLS:\n${toolEvidence}`
      );
    }

    const reasoningEvidence = messageText(choice?.message?.reasoning);
    if (reasoningEvidence) {
      return formatGroqSearchEvidence(
        apiKey,
        prompt,
        `${directContent ? `COMPOUND RESPONSE:\n${directContent}\n\n` : ''}REASONING:\n${reasoningEvidence}`
      );
    }

    throw new Error(
      `Groq returned no parseable result or usable search evidence (finish reason: ${choice?.finish_reason || 'unknown'}).`
    );
  }
  throw new Error(`Groq web search failed: ${lastError}`);
}

async function discoverWithGemini(prompt: string) {
  const apiKey = providerKey('gemini');
  if (!apiKey) return null;
  const configuredModel = (
    clean(process.env.GEMINI_SEARCH_MODEL) ||
    clean(process.env.GEMINI_MODEL) ||
    'gemini-2.5-flash'
  ).replace(/^models\//i, '');
  const models = [...new Set([configuredModel, 'gemini-2.5-flash-lite'])];
  let lastError = '';
  for (const model of models) {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          tools: [{ google_search: {} }],
          generationConfig: { temperature: 0.1, maxOutputTokens: 5000 }
        })
      }
    );
    if (!response.ok) {
      const errorText = (await response.text()).replace(/\s+/g, ' ').slice(0, 300);
      lastError = `${model} HTTP ${response.status}: ${errorText}`;
      if (response.status === 429 || response.status === 404) continue;
      throw new Error(`Gemini web search ${lastError}`);
    }
    const data = await response.json() as {
      candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
    };
    return data.candidates?.[0]?.content?.parts?.map((part) => part.text || '').join('') || null;
  }
  throw new Error(`Gemini web search failed: ${lastError}`);
}

async function discoverWithOpenRouter(prompt: string) {
  const apiKey = providerKey('openrouter');
  if (!apiKey || clean(process.env.OPENROUTER_WEB_SEARCH) !== 'true') return null;
  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
      'HTTP-Referer': clean(process.env.NEXT_PUBLIC_SITE_URL) || 'https://future-plus.vercel.app',
      'X-Title': 'Future Plus Education'
    },
    body: JSON.stringify({
      model: clean(process.env.OPENROUTER_MODEL) || 'openrouter/free',
      messages: [{ role: 'user', content: prompt }],
      tools: [{
        type: 'openrouter:web_search',
        parameters: { max_results: 10, max_total_results: 20 }
      }],
      temperature: 0.1
    })
  });
  if (!response.ok) throw new Error(`OpenRouter web search HTTP ${response.status}`);
  const data = await response.json() as { choices?: Array<{ message?: { content?: string } }> };
  return data.choices?.[0]?.message?.content || null;
}

export async function discoverWebCollegeInsights(
  student: StudentInput,
  databaseCourses: CourseWithCollege[]
): Promise<{
  insights: WebCollegeInsight[];
  status: {
    searched_at: string;
    providers: Array<{ provider: string; status: 'not_configured' | 'failed' | 'no_parseable_results' | 'used'; detail: string }>;
    result_count: number;
  };
}> {
  const prompt = buildDiscoveryPrompt(student);
  const searches = [
    { provider: 'groq-web', run: () => discoverWithGroq(prompt) },
    { provider: 'gemini-search', run: () => discoverWithGemini(prompt) },
    { provider: 'openrouter-web', run: () => discoverWithOpenRouter(prompt) }
  ];
  const results = await Promise.all(searches.map(async ({ provider, run }) => {
    try {
      const text = await run();
      return {
        provider,
        text,
        error: null,
        configured: text !== null || (
          provider === 'groq-web' ? Boolean(providerKey('groq')) :
          provider === 'gemini-search' ? Boolean(providerKey('gemini')) :
          Boolean(providerKey('openrouter') && clean(process.env.OPENROUTER_WEB_SEARCH) === 'true')
        )
      };
    } catch (error) {
      console.error('[web-college-discovery] provider failed', { provider, error });
      return {
        provider,
        text: null,
        error: error instanceof Error ? error.message : 'Unknown search error',
        configured: true
      };
    }
  }));

  const databaseKeys = new Set(databaseCourses.map((course) =>
    `${course.college_name}|${course.course_name}`.toLowerCase()
  ));
  const merged = new Map<string, { candidate: DiscoveryCandidate; providers: string[] }>();
  const parsedCounts = new Map<string, number>();
  for (const result of results) {
    if (!result.text) continue;
    const parsedRows = extractJsonArray(result.text);
    parsedCounts.set(result.provider, parsedRows.length);
    for (const rawCandidate of parsedRows) {
      const candidate = normalizeCandidate(rawCandidate);
      if (!candidate) continue;
      const key = `${candidate.college_name}|${candidate.course_name}`.toLowerCase();
      if (databaseKeys.has(key)) continue;
      const existing = merged.get(key);
      if (existing) {
        existing.providers.push(result.provider);
        existing.candidate.additional_sources = [...new Set([
          ...existing.candidate.additional_sources,
          candidate.source_url,
          ...candidate.additional_sources
        ])].filter((url) => url !== existing.candidate.source_url).slice(0, 4);
      } else {
        merged.set(key, { candidate, providers: [result.provider] });
      }
    }
  }

  const candidates = [...merged.values()];
  const courses: CourseWithCollege[] = candidates.map(({ candidate }, index) => ({
    course_id: `web-${index}`,
    college_id: `web-college-${index}`,
    next_review_at: null,
    ...candidate,
    program_level: student.programLevel || 'undergraduate'
  }));
  const scored = generateRecommendations(student, courses, 8);
  const courseById = new Map(courses.map((course) => [course.course_id, course]));
  const providersById = new Map(courses.map((course, index) => [
    course.course_id,
    candidates[index].providers
  ]));

  const insights: WebCollegeInsight[] = scored.map((recommendation): WebCollegeInsight => {
    const course = courseById.get(recommendation.courseId)!;
    return {
      college_name: course.college_name,
      course_name: course.course_name,
      subject_area: course.subject_area,
      duration: course.duration,
      total_fee: course.total_fee,
      placement_count: course.placement_count,
      highest_package: course.highest_package,
      average_package: course.average_package,
      currency: course.currency || 'INR',
      city: course.city,
      state: course.state,
      country: 'India',
      poc_name: course.poc_name,
      poc_email: course.poc_email,
      hostel_available: course.hostel_available,
      partner_status: 'non_partner',
      commission_based: false,
      program_level: student.programLevel || 'undergraduate',
      source_url: course.source_url!,
      additional_sources: candidates[Number(course.course_id.replace('web-', ''))].candidate.additional_sources,
      fit_score: recommendation.fitScore,
      fit_reason: recommendation.reason,
      web_verification_status: 'staff_verification_required',
      discovered_by: providersById.get(course.course_id) || []
    };
  });
  const providerStatuses = results.map((result) => {
    const parsedCount = parsedCounts.get(result.provider) || 0;
    if (!result.configured) {
      return { provider: result.provider, status: 'not_configured' as const, detail: 'No enabled API key was found.' };
    }
    if (result.error) {
      return { provider: result.provider, status: 'failed' as const, detail: result.error };
    }
    if (!parsedCount) {
      return {
        provider: result.provider,
        status: 'no_parseable_results' as const,
        detail: result.text ? 'The provider responded, but no valid college rows could be parsed.' : 'The provider returned no response.'
      };
    }
    return { provider: result.provider, status: 'used' as const, detail: `${parsedCount} row(s) returned before validation and ranking.` };
  });

  return {
    insights,
    status: {
      searched_at: new Date().toISOString(),
      providers: providerStatuses,
      result_count: insights.length
    }
  };
}
