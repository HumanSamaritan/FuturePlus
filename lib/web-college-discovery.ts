import { CourseWithCollege, StudentInput } from './types';

export type WebCollegeInsight = {
  college_name: string;
  course_name?: string;
  subject_area?: string;
  program_level: 'undergraduate' | 'postgraduate';
  ownership?: 'private';
  total_fee?: number | null;
  currency?: string;
  duration?: string | null;
  placement_count?: number | null;
  average_package?: number | null;
  highest_package?: number | null;
  hostel_available?: boolean | null;
  additional_sources?: string[];
  poc_name?: string | null;
  poc_email?: string | null;
  fit_reason?: string;
  city: string | null;
  state: string | null;
  country: 'India';
  fit_level: 'Strong' | 'Good' | 'Moderate' | 'Exploratory';
  fit_score: number;
  fit_feedback: string;
  source_url: string;
  web_verification_status: 'staff_verification_required';
  discovered_by: string[];
};

type ProviderStatus = {
  provider: string;
  status: 'not_configured' | 'failed' | 'no_parseable_results' | 'used';
  detail: string;
};

const BLOCKED_SOURCE_HOSTS = new Set([
  'ouatuniversity.edu.in',
  'www.ouatuniversity.edu.in',
  'shiksha.com',
  'www.shiksha.com',
  'collegedunia.com',
  'www.collegedunia.com',
  'careers360.com',
  'www.careers360.com',
  'getmyuni.com',
  'www.getmyuni.com'
]);

function clean(value?: string) {
  return value?.trim().replace(/^['"]|['"]$/g, '');
}

function providerKey(provider: 'groq' | 'gemini' | 'openrouter') {
  const specific = clean(process.env[`${provider.toUpperCase()}_API_KEY`]);
  const legacyProvider = clean(process.env.AI_PROVIDER)?.toLowerCase();
  return specific || (legacyProvider === provider ? clean(process.env.AI_API_KEY) : undefined);
}

function messageText(content: unknown) {
  if (typeof content === 'string') return content.trim();
  if (!Array.isArray(content)) return '';
  return content.map((part) => {
    if (typeof part === 'string') return part;
    if (part && typeof part === 'object' && 'text' in part) {
      return String((part as { text?: unknown }).text || '');
    }
    return '';
  }).join('').trim();
}

function extractDelimitedRows(text: string): unknown[] {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.startsWith('RESULT|||'))
    .map((line) => {
      const parts = line.split('|||').map((part) => part.trim());
      if (parts.length < 9) return null;
      return {
        college_name: parts[1],
        course_name: parts[2],
        city: parts[3] || null,
        state: parts[4] || null,
        fit_level: parts[5] || 'Exploratory',
        subject_area: parts[6] || null,
        ownership: parts[7]?.toLowerCase(),
        source_url: parts.slice(8).join('|||').trim()
      };
    })
    .filter(Boolean) as unknown[];
}

function extractRows(text: string): unknown[] {
  const delimitedRows = extractDelimitedRows(text);
  if (delimitedRows.length) return delimitedRows;

  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i)?.[1];
  for (const source of [fenced, text].filter(Boolean) as string[]) {
    for (const candidate of [
      source.trim(),
      source.slice(source.indexOf('['), source.lastIndexOf(']') + 1)
    ]) {
      if (!candidate) continue;
      try {
        const parsed = JSON.parse(candidate);
        if (Array.isArray(parsed)) return parsed;
        if (parsed && typeof parsed === 'object') {
          const object = parsed as Record<string, unknown>;
          for (const key of ['results', 'colleges', 'universities', 'data']) {
            if (Array.isArray(object[key])) return object[key] as unknown[];
          }
        }
      } catch {
        // Try the next representation.
      }
    }
  }
  return [];
}

function fitLevel(value: unknown): WebCollegeInsight['fit_level'] {
  const normalized = String(value || '').toLowerCase();
  if (normalized.includes('strong')) return 'Strong';
  if (normalized.includes('good')) return 'Good';
  if (normalized.includes('moderate')) return 'Moderate';
  return 'Exploratory';
}

function fitScore(level: WebCollegeInsight['fit_level']) {
  return level === 'Strong' ? 85 : level === 'Good' ? 70 : level === 'Moderate' ? 55 : 40;
}

function safeSourceUrl(value: unknown) {
  const raw = String(value || '').trim();
  const extracted = raw.match(/https:\/\/[^\s<>"'\])}]+/i)?.[0]?.replace(/[.,;:]+$/, '') || raw;
  try {
    const url = new URL(extracted);
    if (url.protocol !== 'https:' || BLOCKED_SOURCE_HOSTS.has(url.hostname.toLowerCase())) return null;
    return url.toString();
  } catch {
    return null;
  }
}

function normalizeRow(value: unknown, provider: string): WebCollegeInsight | null {
  if (!value || typeof value !== 'object') return null;
  const row = value as Record<string, unknown>;
  const collegeName = String(row.college_name || row.university_name || '').trim();
  const courseName = String(row.course_name || '').trim();
  const subjectArea = String(row.subject_area || '').trim();
  const ownership = String(row.ownership || '').trim().toLowerCase();
  const sourceUrl = safeSourceUrl(row.source_url);
  if (!collegeName || !sourceUrl || ownership !== 'private') return null;
  const level = fitLevel(row.fit_level);
  return {
    college_name: collegeName,
    course_name: courseName || undefined,
    subject_area: subjectArea || undefined,
    program_level: 'undergraduate',
    ownership: 'private',
    city: row.city ? String(row.city).trim() : null,
    state: row.state ? String(row.state).trim() : null,
    country: 'India',
    fit_level: level,
    fit_score: fitScore(level),
    fit_feedback: 'Potential private chosen-stream match discovered from the web. Staff must verify current programme availability, campus, eligibility, fees, approvals/accreditation and admissions details on the linked official source before advising the student.',
    source_url: sourceUrl,
    web_verification_status: 'staff_verification_required',
    discovered_by: [provider]
  };
}

function buildPrompt(student: StudentInput) {
  const selectedStreams = student.subjectsInterest.slice(0, 4);
  const profile = {
    programme: student.programLevel || 'undergraduate',
    chosenStreams: selectedStreams,
    preferredLocations: student.preferredLocations.slice(0, 4),
    classXiiPercentage: student.marksXii,
    undergraduateDegree: student.undergraduateDegree,
    undergraduateSpecialisation: student.undergraduateSpecialisation,
    undergraduatePercentage: student.undergraduateFinalPercentage,
    budgetMaximumINR: student.budgetMax,
    hostelRequired: student.hostelRequired
  };

  return `Search current official Indian PRIVATE university/college websites for up to 6 institutions offering a course that DIRECTLY matches the student's chosen stream.

The chosen stream is a HARD FILTER. Do not return unrelated courses because of rankings, employability, popularity or partnership potential.
- If chosen stream is Medicine, return direct medicine/MBBS/medical-degree pathways only. Do not return Computer Science, Business, Law or general Engineering.
- Nursing and B-Pharma are separate streams and must not be silently substituted for Medicine.
- If direct chosen-stream results cannot be verified from official sources, return fewer rows rather than unrelated alternatives.

OWNERSHIP IS ALSO A HARD FILTER:
- Return PRIVATE institutions only.
- Exclude central universities, state universities, government colleges, government medical colleges, municipal/public institutions, government-aided institutions and public autonomous institutions.
- If you cannot confidently verify that an institution is private, omit it.

Use only official institution websites or authoritative government/regulator sources. Do not use Shiksha, Collegedunia, Careers360, GetMyUni or other aggregators. Never invent a campus, programme, ownership type or URL.

Return ONLY one line per verified candidate in this exact format, with no prose before or after:
RESULT|||College name|||Exact matching course/programme|||City|||State|||Strong|Good|Moderate|||Subject area|||private|||https://official-source-url

Use the official page that best supports the programme and private institution identity. Do not include fee, eligibility, accreditation, hostel, placement or scholarship claims in the line; Future Plus staff will verify those separately.
Student profile: ${JSON.stringify(profile)}`;
}

async function searchGroq(prompt: string) {
  const apiKey = providerKey('groq');
  if (!apiKey) return null;

  const model = clean(process.env.GROQ_FAST_MODEL) || 'openai/gpt-oss-20b';
  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model,
      messages: [{ role: 'user', content: prompt }],
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

  const responseText = await response.text();
  if (!response.ok) {
    throw new Error(`Live search HTTP ${response.status}: ${responseText.replace(/\s+/g, ' ').slice(0, 250)}`);
  }

  const data = JSON.parse(responseText) as {
    choices?: Array<{ message?: { content?: unknown } }>;
  };
  const content = messageText(data.choices?.[0]?.message?.content);
  if (extractRows(content).length) return content;
  throw new Error('Live search returned no usable private chosen-stream shortlist.');
}

async function searchGemini(prompt: string) {
  const apiKey = providerKey('gemini');
  if (!apiKey) return null;
  const model = (clean(process.env.GEMINI_SEARCH_MODEL) || 'gemini-2.5-flash-lite').replace(/^models\//i, '');
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        tools: [{ google_search: {} }],
        generationConfig: { temperature: 0.1, maxOutputTokens: 900 }
      })
    }
  );
  const responseText = await response.text();
  if (!response.ok) throw new Error(`Search HTTP ${response.status}: ${responseText.replace(/\s+/g, ' ').slice(0, 250)}`);
  const data = JSON.parse(responseText) as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  };
  return data.candidates?.[0]?.content?.parts?.map((part) => part.text || '').join('') || null;
}

async function searchOpenRouter(prompt: string) {
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
      tools: [{ type: 'openrouter:web_search', parameters: { max_results: 5, max_total_results: 6 } }],
      max_tokens: 900,
      temperature: 0.1
    })
  });
  const responseText = await response.text();
  if (!response.ok) throw new Error(`Search HTTP ${response.status}: ${responseText.replace(/\s+/g, ' ').slice(0, 250)}`);
  const data = JSON.parse(responseText) as { choices?: Array<{ message?: { content?: unknown } }> };
  return messageText(data.choices?.[0]?.message?.content) || null;
}

export async function discoverWebCollegeInsights(
  student: StudentInput,
  databaseCourses: CourseWithCollege[]
): Promise<{
  insights: WebCollegeInsight[];
  status: { searched_at: string; providers: ProviderStatus[]; result_count: number };
}> {
  const prompt = buildPrompt(student);
  const enabledProviders = new Set(
    (clean(process.env.WEB_DISCOVERY_PROVIDERS) || 'groq')
      .split(',')
      .map((provider) => provider.trim().toLowerCase())
      .filter(Boolean)
  );
  const searches = [
    { provider: 'groq-web', configured: Boolean(providerKey('groq')), run: () => searchGroq(prompt) },
    { provider: 'gemini-search', configured: Boolean(providerKey('gemini')), run: () => searchGemini(prompt) },
    {
      provider: 'openrouter-web',
      configured: Boolean(providerKey('openrouter') && clean(process.env.OPENROUTER_WEB_SEARCH) === 'true'),
      run: () => searchOpenRouter(prompt)
    }
  ].filter((search) => enabledProviders.has(search.provider.replace(/-web$|-search$/, '')));

  const responses = await Promise.all(searches.map(async (search) => {
    if (!search.configured) return { ...search, text: null, error: null };
    try {
      return { ...search, text: await search.run(), error: null };
    } catch (error) {
      console.error('[web-college-discovery] provider failed', { provider: search.provider, error });
      return { ...search, text: null, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }));

  const existingNames = new Set(databaseCourses.map((course) => course.college_name.toLowerCase()));
  const merged = new Map<string, WebCollegeInsight>();
  let parsedCount = 0;
  for (const response of responses) {
    if (!response.text) continue;
    const rows = extractRows(response.text);
    parsedCount += rows.length;
    for (const row of rows) {
      const insight = normalizeRow(row, response.provider);
      if (!insight || existingNames.has(insight.college_name.toLowerCase())) continue;
      insight.program_level = student.programLevel || 'undergraduate';
      const key = `${insight.college_name}|${insight.course_name || ''}|${insight.city || ''}`.toLowerCase();
      const existing = merged.get(key);
      if (existing) {
        existing.discovered_by = [...new Set([...existing.discovered_by, response.provider])];
        if (insight.fit_score > existing.fit_score) {
          existing.fit_level = insight.fit_level;
          existing.fit_score = insight.fit_score;
        }
      } else {
        merged.set(key, insight);
      }
    }
  }

  const insights = [...merged.values()].sort((a, b) => b.fit_score - a.fit_score).slice(0, 6);
  const anyConfigured = responses.some((response) => response.configured);
  const anyFailure = responses.some((response) => Boolean(response.error));
  const genericStatus: ProviderStatus = !anyConfigured
    ? { provider: 'live-search', status: 'not_configured', detail: 'Live discovery is temporarily unavailable.' }
    : insights.length
      ? { provider: 'live-search', status: 'used', detail: `${insights.length} private chosen-stream candidate(s) returned for staff verification.` }
      : anyFailure
        ? { provider: 'live-search', status: 'failed', detail: 'Live discovery is temporarily unavailable. Please try again.' }
        : { provider: 'live-search', status: 'no_parseable_results', detail: parsedCount ? 'No private candidates passed source validation.' : 'No suitable private chosen-stream candidates were returned.' };

  return {
    insights,
    status: { searched_at: new Date().toISOString(), providers: [genericStatus], result_count: insights.length }
  };
}
