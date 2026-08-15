import { createHash } from 'crypto';
import type { StudentInput } from './types';

function evidenceExcerpt(...parts: Array<string | undefined>) {
  const joined = parts.filter(Boolean).join('\n\n').replace(/\s+/g, ' ').trim();
  return joined ? joined.slice(0, 1200) : undefined;
}

export function studentAiFingerprint(input: StudentInput) {
  const relevant = {
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
  return {
    ...input,
    workExperience: evidenceExcerpt(
      input.workExperience,
      linkedinEvidence ? `LinkedIn evidence supplied for review: ${linkedinEvidence}` : undefined
    ),
    specialSkills: evidenceExcerpt(
      input.specialSkills,
      resumeEvidence ? `Resume/CV evidence supplied for review: ${resumeEvidence}` : undefined
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

export function attachAssessmentMetadata(raw: string, fingerprint: string) {
  try {
    const parsed = JSON.parse(raw);
    parsed.profileFingerprint = fingerprint;
    parsed.generatedAt = new Date().toISOString();
    return JSON.stringify(parsed);
  } catch {
    return raw;
  }
}
