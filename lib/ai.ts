import { CourseWithCollege, RecommendationResult, StudentInput } from './types';

type GeminiResponse = {
  candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  promptFeedback?: { blockReason?: string };
};

type ChatCompletionResponse = {
  choices?: Array<{ message?: { content?: string } }>;
  error?: { message?: string; code?: string };
};

type AiProvider = 'gemini' | 'groq' | 'openrouter' | 'deepseek';
type AiConfiguration = {
  provider: AiProvider;
  apiKey: string;
  model: string;
  baseUrl?: string;
};

const PROVIDER_DEFAULTS: Record<AiProvider, { model: string; baseUrl?: string }> = {
  gemini: { model: 'gemini-2.5-flash' },
  groq: {
    model: 'llama-3.1-8b-instant',
    baseUrl: 'https://api.groq.com/openai/v1'
  },
  openrouter: {
    model: 'openrouter/free',
    baseUrl: 'https://openrouter.ai/api/v1'
  },
  deepseek: {
    model: 'deepseek-v4-flash',
    baseUrl: 'https://api.deepseek.com'
  }
};

function cleanEnv(value?: string) {
  return value?.trim().replace(/^['"]|['"]$/g, '');
}

function getAiConfigurations(): AiConfiguration[] {
  const supportedProviders: AiProvider[] = ['gemini', 'groq', 'openrouter', 'deepseek'];
  const requestedOrder = (cleanEnv(process.env.AI_PROVIDERS) || '')
    .split(',')
    .map((item) => item.trim().toLowerCase())
    .filter((item): item is AiProvider => supportedProviders.includes(item as AiProvider));
  const providerOrder = [
    ...new Set(requestedOrder.length ? requestedOrder : supportedProviders)
  ];

  const configurations = providerOrder.flatMap((provider): AiConfiguration[] => {
    const prefix = provider.toUpperCase();
    const apiKey = cleanEnv(process.env[`${prefix}_API_KEY`]);
    if (!apiKey) return [];
    const defaults = PROVIDER_DEFAULTS[provider];
    return [{
      provider,
      apiKey,
      model: (cleanEnv(process.env[`${prefix}_MODEL`]) || defaults.model)
        .replace(/^models\//i, ''),
      baseUrl: (cleanEnv(process.env[`${prefix}_BASE_URL`]) || defaults.baseUrl)
        ?.replace(/\/+$/, '')
    }];
  });

  // Backward-compatible single-provider configuration. Add it when the same
  // provider was not already configured with its provider-specific key.
  const requestedProvider = (cleanEnv(process.env.AI_PROVIDER) || 'gemini').toLowerCase();
  const provider = supportedProviders.includes(requestedProvider as AiProvider)
    ? requestedProvider as AiProvider
    : 'gemini';
  const apiKey = cleanEnv(process.env.AI_API_KEY);
  if (apiKey && !requestedOrder.length && !configurations.some((item) => item.provider === provider)) {
    const defaults = PROVIDER_DEFAULTS[provider];
    configurations.push({
      provider,
      apiKey,
      model: (cleanEnv(process.env.AI_MODEL) || defaults.model).replace(/^models\//i, ''),
      baseUrl: (cleanEnv(process.env.AI_BASE_URL) || defaults.baseUrl)?.replace(/\/+$/, '')
    });
  }
  return configurations;
}

function compactError(errorText: string) {
  try {
    const parsed = JSON.parse(errorText) as {
      error?: { message?: string; status?: string; code?: string };
    };
    return [parsed.error?.status || parsed.error?.code, parsed.error?.message]
      .filter(Boolean)
      .join(': ')
      .slice(0, 350);
  } catch {
    return errorText.replace(/\s+/g, ' ').trim().slice(0, 350);
  }
}

async function callGemini(apiKey: string, model: string, prompt: string) {
  const maxOutputTokens = Number(cleanEnv(process.env.AI_MAX_OUTPUT_TOKENS)) || 3000;
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': apiKey
      },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: { maxOutputTokens, temperature: 0.2 }
      })
    }
  );
  const responseText = await response.text();
  if (!response.ok) throw new Error(`HTTP ${response.status}: ${compactError(responseText)}`);

  const data = JSON.parse(responseText) as GeminiResponse;
  const text = data.candidates?.[0]?.content?.parts
    ?.map((part) => part.text || '')
    .join('')
    .trim();
  if (text) return text;
  if (data.promptFeedback?.blockReason) {
    throw new Error(`Response blocked: ${data.promptFeedback.blockReason}`);
  }
  throw new Error('The provider returned an empty response.');
}

async function callOpenAiCompatible(
  provider: Exclude<AiProvider, 'gemini'>,
  apiKey: string,
  baseUrl: string,
  model: string,
  prompt: string
) {
  const configuredMaxTokens = Number(cleanEnv(process.env.AI_MAX_OUTPUT_TOKENS));
  const maxOutputTokens = configuredMaxTokens > 0
    ? configuredMaxTokens
    : provider === 'groq' ? 2600 : 3000;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${apiKey}`
  };
  if (provider === 'openrouter') {
    headers['HTTP-Referer'] = cleanEnv(process.env.NEXT_PUBLIC_SITE_URL) || 'https://future-plus.vercel.app';
    headers['X-Title'] = 'Future Plus Education';
  }

  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      model,
      messages: [
        {
          role: 'system',
          content: 'You are a careful staff-facing education admissions assistant. Use only supplied data.'
        },
        { role: 'user', content: prompt }
      ],
      max_tokens: maxOutputTokens,
      temperature: 0.2,
      stream: false
    })
  });
  const responseText = await response.text();
  if (!response.ok) throw new Error(`HTTP ${response.status}: ${compactError(responseText)}`);

  const data = JSON.parse(responseText) as ChatCompletionResponse;
  const text = data.choices?.[0]?.message?.content?.trim();
  if (text) return text;
  throw new Error(data.error?.message || 'The provider returned an empty response.');
}

async function callProvider(ai: AiConfiguration, prompt: string) {
  return ai.provider === 'gemini'
    ? callGemini(ai.apiKey, ai.model, prompt)
    : callOpenAiCompatible(ai.provider, ai.apiKey, ai.baseUrl!, ai.model, prompt);
}

export async function generateCounsellingSummary(
  student: StudentInput,
  courses: CourseWithCollege[],
  recommendations: RecommendationResult[]
) {
  const configuredProviders = getAiConfigurations();
  const programmeLabel = student.programLevel === 'postgraduate' ? 'Post Graduate' : 'Under Graduate';

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

  if (!configuredProviders.length) {
    return [
      `${student.firstName} ${student.lastName} is seeking ${programmeLabel} counselling in ${student.subjectsInterest.join(', ') || 'open subjects'}.`,
      `The verified college-fit engine shortlisted ${shortlistedColleges.length} matching course options. The leading score is ${recommendations[0]?.fitScore ?? 'not available'}/100.`,
      'AI Insights are not configured. Add one or more provider API keys in Vercel to generate the detailed review.',
      'Staff must verify current eligibility, fees, placements, hostel availability and admissions dates directly with each institution before advising the student.'
    ].join('\n\n');
  }

  const prompt = `Prepare a concise but useful ${programmeLabel} counselling review using ONLY the supplied student profile and college database shortlist. Never invent a college, course, fee, placement figure, admission rule or scholarship. Do not hide or exclude a stronger student-fit option because it is a non-partner. Partner status is provided only so staff understand the available operational relationship.

Use these headings:
1. Student fit overview
2. Best-fit colleges (rank up to five, including course, fit score, total fee, location, hostel, placement evidence and the specific reasons it fits)
3. Partner-network opportunities (identify preferred and pipeline partners separately)
4. Strong verified-database non-partner alternatives (do not describe this as live web research)
5. Financial support and risk flags
6. Questions for the next counselling conversation
7. Data staff must verify before giving final advice

Clearly say when data is missing. Treat every fee as the overall course cost when supplied.

Student profile:
${JSON.stringify(student, null, 2)}

Database-grounded shortlist:
${JSON.stringify(shortlistedColleges, null, 2)}`;

  const providerResults = await Promise.all(configuredProviders.map(async (
    ai
  ): Promise<{ ai: AiConfiguration; text?: string; error?: string }> => {
    try {
      return { ai, text: await callProvider(ai, prompt) };
    } catch (error) {
      console.error('[ai] provider insight request failed', {
        provider: ai.provider,
        model: ai.model,
        error
      });
      return {
        ai,
        error: error instanceof Error ? error.message : 'Unknown provider error'
      };
    }
  }));
  const successfulResults = providerResults.filter(
    (result): result is { ai: AiConfiguration; text: string } => Boolean(result.text)
  );
  const providerStatus = providerResults.map((result) =>
    `${result.ai.provider} (${result.ai.model}): ${result.text ? 'used' : 'unavailable'}`
  ).join(', ');

  if (!successfulResults.length) {
    const failures = providerResults.map((result) =>
      `${result.ai.provider}: ${result.error || 'no response'}`
    ).join('; ');
    return `AI Insights could not be generated (${failures}). The verified college-fit table below is still available for staff review.`;
  }

  if (successfulResults.length === 1) {
    return `${successfulResults[0].text}\n\nAI provider status: ${providerStatus}`;
  }

  const synthesisPrompt = `Create one final Future Plus AI Insights report from the independent model analyses below.

Rules:
- Reconcile the analyses, remove repetition, and preserve useful points supported by the supplied data.
- Do not use majority agreement as proof and do not introduce new facts.
- If analyses disagree, prefer the verified fit scores and explicitly flag the disagreement for staff verification.
- Keep the same seven headings requested in the original task.
- Do not mention model brands inside the report.

Independent analyses:
${successfulResults.map((result, index) =>
    `ANALYSIS ${index + 1}:\n${result.text.slice(0, 3000)}`
  ).join('\n\n')}`;

  try {
    const consolidated = await callProvider(successfulResults[0].ai, synthesisPrompt);
    return `${consolidated}\n\nAI provider status: ${providerStatus}`;
  } catch (error) {
    console.error('[ai] multi-provider synthesis failed', error);
    const combined = successfulResults.map((result, index) =>
      `Independent AI Insight ${index + 1}\n${result.text}`
    ).join('\n\n---\n\n');
    return `${combined}\n\nAI provider status: ${providerStatus}`;
  }
}
