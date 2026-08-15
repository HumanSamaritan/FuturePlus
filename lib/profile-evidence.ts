import { createHash } from 'crypto';
import type { StudentInput } from './types';

export const AI_ASSESSMENT_LOGIC_VERSION = 'future-fit-evidence-v2';

function evidenceExcerpt(...parts: Array<string | undefined>) {
  const joined = parts.filter(Boolean).join('\n\n').replace(/\s+/g, ' ').trim();
  return joined ? joined.slice(0, 1600) : undefined;
}

export function studentAiFingerprint(input: StudentInput) {
  const relevant = {
    assessmentLogicVersion: AI_ASSESSMENT_LOGIC_VERSION,
    programLevel: input.programLevel,
    yearX: input.yearX,
    marksX: input.marksX,
    yearXii: input.yearXii,
    marksXii: input.marksXii,
    board: input.board,
    subjectsInterest: input.subjectsInterest,
    passion: input.passion,
    purpose: input.purpose,
    strengths: input.strengths,
    constraints: input.constraints,
    careerGoals: input.careerGoals,
    supportRequired: input.supportRequired,
    linkedinUrl: input.linkedinUrl,
    linkedinProfileText: input.linkedinProfileText,
    linkedinProfilePdfText: input.linkedinProfilePdfText,
    facebookUrl: input.facebookUrl,
    instagramUrl: input.instagramUrl,
    xUrl: input.xUrl,
    portfolioUrl: input.portfolioUrl,
    accolades: input.accolades,
    extracurricularActivities: input.extracurricularActivities,
    rewards: input.rewards,
    specialSkills: input.specialSkills,
    certifications: input.certifications,
    languages: input.languages,
    workExperience: input.workExperience,
    resumeText: input.resumeText,
    resumeFileText: input.resumeFileText,
    undergraduateDegree: input.undergraduateDegree,
    undergraduateSpecialisation: input.undergraduateSpecialisation,
    undergraduateUniversity: input.undergraduateUniversity,
    undergraduateGraduationYear: input.undergraduateGraduationYear,
    pgApplicantStatus: input.pgApplicantStatus,
    semestersCompleted: input.semestersCompleted,
    semesterMarks: input.semesterMarks,
    undergraduateFinalPercentage: input.undergraduateFinalPercentage,
    currentEmployer: input.currentEmployer,
    currentJobTitle: input.currentJobTitle,
    workExperienceMonths: input.workExperienceMonths
  };
  return createHash('sha256').update(JSON.stringify(relevant)).digest('hex');
}

export function withDocumentEvidence(input: StudentInput): StudentInput {
  const linkedinEvidence = evidenceExcerpt(input.linkedinProfileText, input.linkedinProfilePdfText);
  const resumeEvidence = evidenceExcerpt(input.resumeText, input.resumeFileText);

  // compactStudentProfile currently caps workExperience/specialSkills. Put the
  // newly supplied document evidence first so it is not truncated behind older
  // free-text fields before reaching the AI provider.
  return {
    ...input,
    workExperience: evidenceExcerpt(
      linkedinEvidence ? `LinkedIn profile content supplied by the student/staff for assessment: ${linkedinEvidence}` : undefined,
      input.workExperience
    ),
    specialSkills: evidenceExcerpt(
      resumeEvidence ? `Resume/CV content supplied by the student/staff for assessment: ${resumeEvidence}` : undefined,
      input.specialSkills
    )
  };
}

export function assessmentMetadata(raw: string | null | undefined) {
  if (!raw) return { status: null as string | null, fingerprint: null as string | null };
  try {
    const parsed = JSON.parse(raw);
    return {
      status: typeof parsed?.status === 'string' ? parsed.status : null,
      fingerprint: typeof parsed?.profileFingerprint === 'string' ? parsed.profileFingerprint : null
    };
  } catch {
    return { status: null, fingerprint: null };
  }
}

export function reconcileAssessmentEvidence(raw: string, input: StudentInput) {
  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return raw;

    const evidence: string[] = Array.isArray(parsed.digitalProfileEvidence)
      ? parsed.digitalProfileEvidence.filter((item: unknown) => typeof item === 'string')
      : [];

    const hasLinkedInText = Boolean(input.linkedinProfileText?.trim() || input.linkedinProfilePdfText?.trim());
    const hasResumeText = Boolean(input.resumeText?.trim() || input.resumeFileText?.trim());

    const filtered = evidence.filter((item) => {
      const lower = item.toLowerCase();
      if (hasLinkedInText && lower.includes('linkedin') && (lower.includes('no content') || lower.includes('not supplied') || lower.includes('not provided'))) return false;
      if (hasResumeText && lower.includes('resume') && (lower.includes('no content') || lower.includes('not supplied') || lower.includes('not provided'))) return false;
      return true;
    });

    if (hasLinkedInText) {
      filtered.unshift('LinkedIn profile content was supplied by the student/staff and was considered as self-reported profile evidence. FuturePlus did not independently retrieve or verify the content from LinkedIn.');
    } else if (input.linkedinUrl) {
      filtered.unshift('A LinkedIn URL was supplied as a reference. No LinkedIn profile content was independently retrieved from the URL.');
    }

    if (hasResumeText) {
      filtered.push('Resume/CV content supplied by the student/staff was included as self-reported evidence for this assessment.');
    }

    parsed.digitalProfileEvidence = [...new Set(filtered)].slice(0, 6);
    return JSON.stringify(parsed);
  } catch {
    return raw;
  }
}

export function attachAssessmentMetadata(raw: string, fingerprint: string) {
  try {
    const parsed = JSON.parse(raw);
    parsed.profileFingerprint = fingerprint;
    parsed.assessmentLogicVersion = AI_ASSESSMENT_LOGIC_VERSION;
    parsed.generatedAt = new Date().toISOString();
    return JSON.stringify(parsed);
  } catch {
    return raw;
  }
}
