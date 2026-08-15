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

export type FutureFitStream = {
  stream: string;
  alignmentScore: number;
  reasoning: string;
};

export type FutureFitAssessment = {
  version: 'future-fit-v1';
  status: 'ready' | 'unavailable';
  studentSnapshot: {
    chosenStream: string;
    programme: string;
    academics: string;
    passion: string;
    purpose: string;
    careerGoal: string;
  };
  observedStrengths: string[];
  observedSkills: string[];
  digitalProfileEvidence: string[];
  predictedStreams: FutureFitStream[];
  chosenStreamAlignment: {
    level: 'Strong' | 'Partial' | 'Different direction' | 'Insufficient evidence';
    score: number | null;
    reasoning: string;
  };
  staffAssessment: string;
  exploreNext: string[];
  studentNote: string;
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
  const maxOutputTokens = Math.min(configured || 1500, 1800);
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
    ? Math.min(configured || 1100, 1300)
    : Math.min(configured || 1500, 1800);
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
          content: 'You are a careful education and career-fit assessment assistant. Use only supplied student data. Never claim to have read an external social profile from a URL alone. Return valid JSON only.'
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

function cleanText(value: unknown, fallback = 'Not provided') {
  const text = String(value ?? '').replace(/\s+/g, ' ').trim();
  return text || fallback;
}

function clampScore(value: unknown) {
  const number = Number(value);
  if (!Number.isFinite(number)) return 0;
  return Math.max(0, Math.min(100, Math.round(number)));
}

function compactStudentProfile(student: StudentInput) {
  return {
    programme: student.programLevel === 'postgraduate' ? 'Post Graduate' : 'Under Graduate',
    chosenStreams: student.subjectsInterest.slice(0, 6),
    academics: {
      classXPercentage: student.marksX ?? null,
      classXYear: student.yearX ?? null,
      classXiiPercentage: student.marksXii ?? null,
      classXiiYear: student.yearXii ?? null,
      board: student.board || null,
      undergraduateDegree: student.undergraduateDegree || null,
      undergraduateSpecialisation: student.undergraduateSpecialisation || null,
      undergraduatePercentage: student.undergraduateFinalPercentage ?? null
    },
    passion: student.passion?.slice(0, 500) || null,
    purpose: student.purpose?.slice(0, 500) || null,
    selfReportedStrengths: student.strengths?.slice(0, 500) || null,
    specialSkills: student.specialSkills?.slice(0, 500) || null,
    accolades: student.accolades?.slice(0, 500) || null,
    extracurricularActivities: student.extracurricularActivities?.slice(0, 500) || null,
    rewards: student.rewards?.slice(0, 400) || null,
    certifications: student.certifications?.slice(0, 500) || null,
    languages: student.languages?.slice(0, 300) || null,
    workExperience: student.workExperience?.slice(0, 500) || null,
    currentJobTitle: student.currentJobTitle || null,
    workExperienceMonths: student.workExperienceMonths ?? null,
    careerGoals: student.careerGoals?.slice(0, 500) || null,
    constraints: student.constraints?.slice(0, 400) || null,
    supportRequired: student.supportRequired.slice(0, 10),
    digitalProfileLinks: {
      linkedin: student.linkedinUrl || null,
      facebook: student.facebookUrl || null,
      instagram: student.instagramUrl || null,
      x: student.xUrl || null,
      portfolio: student.portfolioUrl || null
    }
  };
}

function unavailableAssessment(student: StudentInput): FutureFitAssessment {
  const chosenStream = student.subjectsInterest.join(', ') || 'Not yet selected';
  return {
    version: 'future-fit-v1',
    status: 'unavailable',
    studentSnapshot: {
      chosenStream,
      programme: student.programLevel === 'postgraduate' ? 'Post Graduate' : 'Under Graduate',
      academics: 'Assessment temporarily unavailable.',
      passion: cleanText(student.passion),
      purpose: cleanText(student.purpose),
      careerGoal: cleanText(student.careerGoals)
    },
    observedStrengths: [],
    observedSkills: [],
    digitalProfileEvidence: ['External profile content was not used. Staff can rely on the student-entered profile while AI assessment is unavailable.'],
    predictedStreams: [],
    chosenStreamAlignment: {
      level: 'Insufficient evidence',
      score: null,
      reasoning: 'AI-assisted stream-fit assessment is temporarily unavailable.'
    },
    staffAssessment: 'Use the student-entered profile and deterministic course recommendations until the assessment can be regenerated.',
    exploreNext: ['Review the student’s stated passion, purpose, academics and chosen stream with a counsellor.'],
    studentNote: 'This assessment is guidance only. Your informed education and career decision remains yours.'
  };
}

function extractJson(text: string) {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i)?.[1]?.trim();
  for (const candidate of [fenced, text.trim()].filter(Boolean) as string[]) {
    try {
      return JSON.parse(candidate) as Record<string, unknown>;
    } catch {
      const start = candidate.indexOf('{');
      const end = candidate.lastIndexOf('}');
      if (start >= 0 && end > start) {
        try {
          return JSON.parse(candidate.slice(start, end + 1)) as Record<string, unknown>;
        } catch {
          // Try next candidate.
        }
      }
    }
  }
  return null;
}

function normalizeAssessment(value: Record<string, unknown> | null, student: StudentInput): FutureFitAssessment | null {
  if (!value) return null;
  const snapshot = (value.studentSnapshot || {}) as Record<string, unknown>;
  const alignment = (value.chosenStreamAlignment || {}) as Record<string, unknown>;
  const validAlignmentLevels = ['Strong', 'Partial', 'Different direction', 'Insufficient evidence'] as const;
  const rawLevel = cleanText(alignment.level, 'Insufficient evidence');
  const alignmentLevel = validAlignmentLevels.includes(rawLevel as typeof validAlignmentLevels[number])
    ? rawLevel as typeof validAlignmentLevels[number]
    : 'Insufficient evidence';
  const streams = Array.isArray(value.predictedStreams) ? value.predictedStreams : [];

  return {
    version: 'future-fit-v1',
    status: 'ready',
    studentSnapshot: {
      chosenStream: cleanText(snapshot.chosenStream, student.subjectsInterest.join(', ') || 'Not yet selected'),
      programme: cleanText(snapshot.programme, student.programLevel === 'postgraduate' ? 'Post Graduate' : 'Under Graduate'),
      academics: cleanText(snapshot.academics),
      passion: cleanText(snapshot.passion, cleanText(student.passion)),
      purpose: cleanText(snapshot.purpose, cleanText(student.purpose)),
      careerGoal: cleanText(snapshot.careerGoal, cleanText(student.careerGoals))
    },
    observedStrengths: (Array.isArray(value.observedStrengths) ? value.observedStrengths : [])
      .slice(0, 6)
      .map((item) => cleanText(item))
      .filter((item) => item !== 'Not provided'),
    observedSkills: (Array.isArray(value.observedSkills) ? value.observedSkills : [])
      .slice(0, 8)
      .map((item) => cleanText(item))
      .filter((item) => item !== 'Not provided'),
    digitalProfileEvidence: (Array.isArray(value.digitalProfileEvidence) ? value.digitalProfileEvidence : [])
      .slice(0, 5)
      .map((item) => cleanText(item))
      .filter((item) => item !== 'Not provided'),
    predictedStreams: streams.slice(0, 3).map((item) => {
      const stream = (item || {}) as Record<string, unknown>;
      return {
        stream: cleanText(stream.stream, 'Explore further'),
        alignmentScore: clampScore(stream.alignmentScore),
        reasoning: cleanText(stream.reasoning, 'Discuss this option with a counsellor before drawing a conclusion.')
      };
    }),
    chosenStreamAlignment: {
      level: alignmentLevel,
      score: alignment.score == null ? null : clampScore(alignment.score),
      reasoning: cleanText(alignment.reasoning, 'Discuss the chosen stream against the full profile with a counsellor.')
    },
    staffAssessment: cleanText(value.staffAssessment, 'Review the chosen stream against the full student profile.'),
    exploreNext: (Array.isArray(value.exploreNext) ? value.exploreNext : [])
      .slice(0, 6)
      .map((item) => cleanText(item))
      .filter((item) => item !== 'Not provided'),
    studentNote: cleanText(
      value.studentNote,
      'This assessment is guidance rather than a verdict. Your informed education and career decision remains yours.'
    )
  };
}

function assessmentPrompt(student: StudentInput) {
  return `Create a Future Plus Student Future-Fit Assessment using ONLY the supplied profile data.

Important rules:
- Respect the student's stated education choice. This assessment advises; it does not overrule the student.
- Predict up to 3 best-fit academic/career streams from the evidence, even if they differ from the chosen stream.
- Separately assess the chosen stream as Strong, Partial, Different direction, or Insufficient evidence.
- Explain any mismatch to staff neutrally and constructively.
- Do not infer personality, achievements, skills or interests merely from a LinkedIn/social-media URL.
- A supplied URL proves only that a link was provided. Unless actual profile text is supplied in this payload, say that external profile content was not independently retrieved.
- You MAY use student-entered accolades, extracurriculars, special skills, certifications, languages, work experience, passion, purpose, strengths and career goals as evidence.
- Do not diagnose mental health, aptitude or intelligence. Do not make admissions-eligibility claims.
- Alignment scores are advisory evidence-fit indicators, not probabilities of success.
- Keep every field concise and student-shareable except staffAssessment, which is staff-facing.

Return VALID JSON ONLY, no Markdown, matching exactly this shape:
{
  "studentSnapshot": {
    "chosenStream": "string",
    "programme": "string",
    "academics": "1 concise sentence",
    "passion": "string",
    "purpose": "string",
    "careerGoal": "string"
  },
  "observedStrengths": ["up to 6 evidence-based strengths"],
  "observedSkills": ["up to 8 evidence-based skills or developing capabilities"],
  "digitalProfileEvidence": ["what can and cannot be concluded from supplied digital-profile information"],
  "predictedStreams": [
    {"stream":"stream 1","alignmentScore":0,"reasoning":"concise evidence-based reason"},
    {"stream":"stream 2","alignmentScore":0,"reasoning":"concise evidence-based reason"},
    {"stream":"stream 3","alignmentScore":0,"reasoning":"concise evidence-based reason"}
  ],
  "chosenStreamAlignment": {
    "level":"Strong|Partial|Different direction|Insufficient evidence",
    "score":0,
    "reasoning":"why the chosen stream does or does not align with the supplied profile"
  },
  "staffAssessment":"staff-only explanation of the key alignment or mismatch and what to discuss",
  "exploreNext":["up to 6 practical next steps such as projects, shadowing, subject choices, informational interviews or courses"],
  "studentNote":"respectful note affirming that this is guidance and the student's informed choice remains primary"
}

Student profile: ${JSON.stringify(compactStudentProfile(student))}`;
}

export async function generateCounsellingSummary(
  student: StudentInput,
  _courses: CourseWithCollege[],
  _recommendations: RecommendationResult[]
) {
  const configuredProviders = getAiConfigurations();
  if (!configuredProviders.length) {
    return JSON.stringify(unavailableAssessment(student));
  }

  const prompt = assessmentPrompt(student);
  const providerResults = await Promise.all(configuredProviders.map(async (
    ai
  ): Promise<{ ai: AiConfiguration; assessment?: FutureFitAssessment; error?: string }> => {
    try {
      const text = await callProvider(ai, prompt);
      const assessment = normalizeAssessment(extractJson(text), student);
      if (!assessment) throw new Error('Provider returned an invalid Future-Fit JSON payload.');
      return { ai, assessment };
    } catch (error) {
      console.error('[ai] provider Future-Fit request failed', {
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

  const successful = providerResults.filter(
    (result): result is { ai: AiConfiguration; assessment: FutureFitAssessment } => Boolean(result.assessment)
  );

  if (!successful.length) {
    console.error('[ai] all configured Future-Fit providers failed', providerResults.map((result) => ({
      provider: result.ai.provider,
      model: result.ai.model,
      error: result.error || 'no response'
    })));
    return JSON.stringify(unavailableAssessment(student));
  }

  // The Preview currently uses one provider. If multiple providers are enabled,
  // prefer the configured primary provider's normalized assessment rather than
  // spending a second LLM call on synthesis and increasing latency/token pressure.
  return JSON.stringify(successful[0].assessment);
}
