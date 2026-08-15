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
    model: 'openai/gpt-oss-120b',
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

function providerModel(provider: AiProvider) {
  if (provider === 'groq') {
    return cleanEnv(process.env.GROQ_PRIMARY_MODEL)
      || cleanEnv(process.env.GROQ_MODEL)
      || PROVIDER_DEFAULTS.groq.model;
  }
  return cleanEnv(process.env[`${provider.toUpperCase()}_MODEL`])
    || PROVIDER_DEFAULTS[provider].model;
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
      model: providerModel(provider).replace(/^models\//i, ''),
      baseUrl: (cleanEnv(process.env[`${prefix}_BASE_URL`]) || defaults.baseUrl)
        ?.replace(/\/+$/, '')
    }];
  });

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
      model: (cleanEnv(process.env.AI_MODEL) || providerModel(provider)).replace(/^models\//i, ''),
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

function configuredOutputLimit() {
  const configured = Number(cleanEnv(process.env.AI_MAX_OUTPUT_TOKENS));
  return configured > 0 ? configured : null;
}

async function callGemini(apiKey: string, model: string, prompt: string) {
  const configured = configuredOutputLimit();
  const maxOutputTokens = Math.min(configured || 1800, 2000);
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
  const configured = configuredOutputLimit();
  const maxOutputTokens = provider === 'groq'
    ? Math.min(configured || 1200, 1400)
    : Math.min(configured || 1800, 2000);
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${apiKey}`
  };
  if (provider === 'openrouter') {
    headers['HTTP-Referer'] = cleanEnv(process.env.NEXT_PUBLIC_SITE_URL) || 'https://future-plus.vercel.app';
    headers['X-Title'] = 'Future Plus Education';
  }

  const groqGptOss = provider === 'groq' && model.startsWith('openai/gpt-oss-');
  const tokenLimit = provider === 'groq'
    ? { max_completion_tokens: maxOutputTokens }
    : { max_tokens: maxOutputTokens };
  const reasoning = groqGptOss
    ? { reasoning_effort: 'low', reasoning_format: 'hidden' }
    : {};

  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      model,
      messages: [
        {
          role: 'system',
          content: 'You are a careful education counselling assistant. Use only supplied data, keep the report concise, and never invent admissions facts.'
        },
        { role: 'user', content: prompt }
      ],
      ...tokenLimit,
      ...reasoning,
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

function compactStudentProfile(student: StudentInput) {
  return {
    programme: student.programLevel === 'postgraduate' ? 'Post Graduate' : 'Under Graduate',
    classX: student.marksX ?? null,
    classXii: student.marksXii ?? null,
    board: student.board || null,
    subjects: student.subjectsInterest.slice(0, 8),
    preferredLocations: student.preferredLocations.slice(0, 6),
    budget: [student.budgetMin ?? null, student.budgetMax ?? null],
    hostelRequired: student.hostelRequired,
    passion: student.passion?.slice(0, 350) || null,
    purpose: student.purpose?.slice(0, 350) || null,
    strengths: student.strengths?.slice(0, 300) || null,
    constraints: student.constraints?.slice(0, 300) || null,
    careerGoals: student.careerGoals?.slice(0, 350) || null,
    supportRequired: student.supportRequired.slice(0, 8),
    undergraduateDegree: student.undergraduateDegree || null,
    undergraduateSpecialisation: student.undergraduateSpecialisation || null,
    undergraduatePercentage: student.undergraduateFinalPercentage ?? null,
    currentJobTitle: student.currentJobTitle || null,
    workExperienceMonths: student.workExperienceMonths ?? null
  };
}

export async function generateCounsellingSummary(
  student: StudentInput,
  courses: CourseWithCollege[],
  recommendations: RecommendationResult[]
) {
  const configuredProviders = getAiConfigurations();
  const programmeLabel = student.programLevel === 'postgraduate' ? 'Post Graduate' : 'Under Graduate';

  const shortlistedColleges = recommendations.slice(0, 5).map((rec) => {
    const course = courses.find((item) => item.course_id === rec.courseId);
    return {
      rank: rec.rank,
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
      sourceUrl: course?.source_url,
      verifiedFitReason: rec.reason?.slice(0, 450)
    };
  });

  if (!configuredProviders.length) {
    return [
      `${student.firstName} ${student.lastName} is seeking ${programmeLabel} counselling in ${student.subjectsInterest.join(', ') || 'open subjects'}.`,
      `The verified college-fit engine shortlisted ${recommendations.length} matching course options. The leading score is ${recommendations[0]?.fitScore ?? 'not available'}/100.`,
      'AI-assisted counselling is temporarily unavailable. The verified college-fit recommendations remain available for staff review.',
      'Staff must verify current eligibility, fees, placements, hostel availability and admissions dates directly with each institution before advising the student.'
    ].join('\n\n');
  }

  const prompt = `Prepare a concise ${programmeLabel} counselling review from ONLY the supplied profile and verified database shortlist. Never invent a college, course, fee, placement figure, eligibility rule, deadline or scholarship. The deterministic fit score remains authoritative.

Use exactly these headings:
1. Student fit overview
2. Best-fit colleges
3. Partner-network opportunities
4. Strong database alternatives
5. Financial support and risk flags
6. Questions for the next counselling conversation
7. What staff must verify

For best-fit colleges, use at most five rows and mention only supplied evidence. Clearly state when data is missing. Keep the full report concise enough for a counsellor to review quickly.

Student: ${JSON.stringify(compactStudentProfile(student))}
Shortlist: ${JSON.stringify(shortlistedColleges)}`;

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

  if (!successfulResults.length) {
    console.error('[ai] all configured insight providers failed', providerResults.map((result) => ({
      provider: result.ai.provider,
      model: result.ai.model,
      error: result.error || 'no response'
    })));
    return 'AI-assisted counselling is temporarily unavailable. Please try again shortly. The verified college-fit recommendations remain available for staff review.';
  }

  if (successfulResults.length === 1) {
    return successfulResults[0].text;
  }

  const synthesisPrompt = `Consolidate the analyses below into one concise Future Plus report. Preserve only supplied facts, prefer deterministic fit scores when analyses disagree, keep the same seven headings, and do not mention provider/model brands.\n\n${successfulResults.map((result, index) =>
    `ANALYSIS ${index + 1}:\n${result.text.slice(0, 1800)}`
  ).join('\n\n')}`;

  try {
    return await callProvider(successfulResults[0].ai, synthesisPrompt);
  } catch (error) {
    console.error('[ai] multi-provider synthesis failed', error);
    return successfulResults.map((result, index) =>
      `Independent AI Insight ${index + 1}\n${result.text}`
    ).join('\n\n---\n\n');
  }
}
