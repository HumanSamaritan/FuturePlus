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

function normalizeRow(value: unknown, provider: string): WebCollegeInsight | null {
  if (!value || typeof value !== 'object') return null;
  const row = value as Record<string, unknown>;
  const collegeName = String(row.college_name || row.university_name || '').trim();
  const sourceUrl = String(row.source_url || '').trim();
  if (!collegeName || !/^https?:\/\//i.test(sourceUrl)) return null;
  const level = fitLevel(row.fit_level);
  return {
    college_name: collegeName,
    program_level: 'undergraduate',
    city: row.city ? String(row.city).trim() : null,
    state: row.state ? String(row.state).trim() : null,
    country: 'India',
    fit_level: level,
    fit_score: fitScore(level),
    fit_feedback: String(row.fit_feedback || row.feedback || 'Potential fit; staff should verify current programme details.')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 350),
    source_url: sourceUrl,
    web_verification_status: 'staff_verification_required',
    discovered_by: [provider]
  };
}

function buildPrompt(student: StudentInput) {
  const profile = {
    programme: student.programLevel || 'undergraduate',
    subjects: student.subjectsInterest,
    preferredLocations: student.preferredLocations,
    classXiiPercentage: student.marksXii,
    undergraduateDegree: student.undergraduateDegree,
    undergraduateSpecialisation: student.undergraduateSpecialisation,
    undergraduatePercentage: student.undergraduateFinalPercentage,
    budgetMaximumINR: student.budgetMax,
    hostelRequired: student.hostelRequired,
    careerGoals: student.careerGoals?.slice(0, 250),
    constraints: student.constraints?.slice(0, 250)
  };
  return `Search the live web for up to 6 Indian universities or colleges that fit this student.
Prefer official institution, UGC, AICTE, NAAC or NIRF sources.

Return only:
{"results":[{"college_name":"", "city":null, "state":null, "fit_level":"Strong|Good|Moderate|Exploratory", "fit_feedback":"one short sentence", "source_url":"https://..."}]}

Do not invent missing facts. Keep feedback under 35 words.
Student: ${JSON.stringify(profile)}`;
}

async function formatGroqEvidence(apiKey: string, evidence: string) {
  const model = clean(process.env.GROQ_MODEL) || 'llama-3.1-8b-instant';
  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model,
      messages: [{
        role: 'user',
        content: `Convert this search evidence to {"results":[...]}. Return at most 6 rows with only college_name, city, state, fit_level, fit_feedback and source_url. Use only supplied evidence.\n${evidence.slice(0, 3000)}`
      }],
      response_format: { type: 'json_object' },
      temperature: 0.1,
      max_completion_tokens: 1200
    })
  });
  const responseText = await response.text();
  if (!response.ok) throw new Error(`Groq formatter HTTP ${response.status}: ${responseText.replace(/\s+/g, ' ').slice(0, 250)}`);
  const data = JSON.parse(responseText) as {
    choices?: Array<{ finish_reason?: string; message?: { content?: unknown } }>;
  };
  const content = messageText(data.choices?.[0]?.message?.content);
  if (!content) throw new Error(`Groq formatter returned empty content (${data.choices?.[0]?.finish_reason || 'unknown'}).`);
  return content;
}

async function searchGroq(prompt: string) {
  const apiKey = providerKey('groq');
  if (!apiKey) return null;
  const model = clean(process.env.GROQ_SEARCH_MODEL) || 'groq/compound-mini';
  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model,
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: 'json_object' },
      max_completion_tokens: 1400
    })
  });
  const responseText = await response.text();
  if (!response.ok) throw new Error(`Groq web search HTTP ${response.status}: ${responseText.replace(/\s+/g, ' ').slice(0, 250)}`);
  const data = JSON.parse(responseText) as {
    choices?: Array<{ message?: { content?: unknown; executed_tools?: unknown[] } }>;
  };
  const content = messageText(data.choices?.[0]?.message?.content);
  if (extractRows(content).length) return content;
  const evidence = JSON.stringify(data.choices?.[0]?.message?.executed_tools || []);
  if (evidence !== '[]') return formatGroqEvidence(apiKey, evidence);
  throw new Error('Groq returned no usable search evidence.');
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
        generationConfig: { temperature: 0.1, maxOutputTokens: 1400 }
      })
    }
  );
  const responseText = await response.text();
  if (!response.ok) throw new Error(`Gemini search HTTP ${response.status}: ${responseText.replace(/\s+/g, ' ').slice(0, 250)}`);
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
      tools: [{ type: 'openrouter:web_search', parameters: { max_results: 6, max_total_results: 8 } }],
      max_tokens: 1400,
      temperature: 0.1
    })
  });
  const responseText = await response.text();
  if (!response.ok) throw new Error(`OpenRouter search HTTP ${response.status}: ${responseText.replace(/\s+/g, ' ').slice(0, 250)}`);
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
  const searches = [
    { provider: 'groq-web', configured: Boolean(providerKey('groq')), run: () => searchGroq(prompt) },
    { provider: 'gemini-search', configured: Boolean(providerKey('gemini')), run: () => searchGemini(prompt) },
    {
      provider: 'openrouter-web',
      configured: Boolean(providerKey('openrouter') && clean(process.env.OPENROUTER_WEB_SEARCH) === 'true'),
      run: () => searchOpenRouter(prompt)
    }
  ];
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
  const parsedCounts = new Map<string, number>();
  for (const response of responses) {
    if (!response.text) continue;
    const rows = extractRows(response.text);
    parsedCounts.set(response.provider, rows.length);
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
          existing.fit_feedback = insight.fit_feedback;
        }
      } else {
        merged.set(key, insight);
      }
    }
  }
  const insights = [...merged.values()].sort((a, b) => b.fit_score - a.fit_score).slice(0, 8);
  const providers: ProviderStatus[] = responses.map((response) => {
    if (!response.configured) return { provider: response.provider, status: 'not_configured', detail: 'No enabled API key was found.' };
    if (response.error) return { provider: response.provider, status: 'failed', detail: response.error };
    const count = parsedCounts.get(response.provider) || 0;
    if (!count) return { provider: response.provider, status: 'no_parseable_results', detail: 'No valid shortlist rows were returned.' };
    return { provider: response.provider, status: 'used', detail: `${count} lightweight row(s) returned.` };
  });
  return {
    insights,
    status: { searched_at: new Date().toISOString(), providers, result_count: insights.length }
  };
}
