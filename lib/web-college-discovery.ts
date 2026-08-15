import { CourseWithCollege, StudentInput } from './types';

export type WebCollegeInsight = {
  college_name: string;
  course_name?: string;
  subject_area?: string;
  program_level: 'undergraduate' | 'postgraduate';
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

function extractRows(text: string): unknown[] {
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
  try {
    const url = new URL(raw);
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
  const sourceUrl = safeSourceUrl(row.source_url);
  if (!collegeName || !sourceUrl) return null;
  const level = fitLevel(row.fit_level);
  return {
    college_name: collegeName,
    program_level: 'undergraduate',
    city: row.city ? String(row.city).trim() : null,
    state: row.state ? String(row.state).trim() : null,
    country: 'India',
    fit_level: level,
    fit_score: fitScore(level),
    fit_feedback: 'Potential profile match. Verify current programme availability, campus, eligibility, fees, approvals/accreditation and other admissions details on the linked official source before advising the student.',
    source_url: sourceUrl,
    web_verification_status: 'staff_verification_required',
    discovered_by: [provider]
  };
}

function buildPrompt(student: StudentInput) {
  const profile = {
    programme: student.programLevel || 'undergraduate',
    subjects: student.subjectsInterest.slice(0, 6),
    preferredLocations: student.preferredLocations.slice(0, 4),
    classXiiPercentage: student.marksXii,
    undergraduateDegree: student.undergraduateDegree,
    undergraduateSpecialisation: student.undergraduateSpecialisation,
    undergraduatePercentage: student.undergraduateFinalPercentage,
    budgetMaximumINR: student.budgetMax,
    hostelRequired: student.hostelRequired,
    careerGoals: student.careerGoals?.slice(0, 160),
    constraints: student.constraints?.slice(0, 160)
  };

  return `Use one web search to find up to 5 Indian universities or colleges that could fit this student and are not already in the supplied Future Plus database.
Use only official institution websites or authoritative government/regulator sources. Never invent a campus or URL. If an official HTTPS source cannot be found, omit that candidate.
Return ONLY JSON in this shape:
{"results":[{"college_name":"", "city":null, "state":null, "fit_level":"Strong|Good|Moderate|Exploratory", "source_url":"https://..."}]}
Do not include fees, accreditation, approvals, eligibility, hostel, placements or scholarships.
Student: ${JSON.stringify(profile)}`;
}

async function searchGroq(prompt: string) {
  const apiKey = providerKey('groq');
  if (!apiKey) return null;

  // College discovery is intentionally a single-search, low-latency workload.
  // Keep it isolated from the heavier general GROQ_SEARCH_MODEL setting.
  const model = clean(process.env.GROQ_DISCOVERY_MODEL) || 'groq/compound-mini';
  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
      'Groq-Model-Version': 'latest'
    },
    body: JSON.stringify({
      model,
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: 'json_object' },
      compound_custom: {
        tools: {
          enabled_tools: ['web_search']
        }
      },
      search_settings: {
        country: 'india',
        exclude_domains: [
          'shiksha.com',
          'collegedunia.com',
          'careers360.com',
          'getmyuni.com',
          'ouatuniversity.edu.in'
        ]
      },
      max_completion_tokens: 700
    }),
    signal: AbortSignal.timeout(18000)
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
  throw new Error('Live search returned no usable structured shortlist.');
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
      const key = `${insight.college_name}|${insight.city || ''}|${insight.state || ''}`.toLowerCase();
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
      ? { provider: 'live-search', status: 'used', detail: `${insights.length} candidate(s) returned for staff verification.` }
      : anyFailure
        ? { provider: 'live-search', status: 'failed', detail: 'Live discovery is temporarily unavailable. Please try again.' }
        : { provider: 'live-search', status: 'no_parseable_results', detail: parsedCount ? 'No candidates passed source validation.' : 'No suitable candidates were returned.' };

  return {
    insights,
    status: { searched_at: new Date().toISOString(), providers: [genericStatus], result_count: insights.length }
  };
}
