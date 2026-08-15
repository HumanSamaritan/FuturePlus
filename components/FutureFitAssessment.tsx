import type { FutureFitAssessment } from '@/lib/ai';
import styles from './FutureFitAssessment.module.css';

type Props = { rawSummary?: string | null };
type RankedStream = { stream: string; alignmentScore: number; reasoning: string; chosen: boolean };

function parseAssessment(rawSummary?: string | null): FutureFitAssessment | null {
  if (!rawSummary) return null;
  try {
    const parsed = JSON.parse(rawSummary) as FutureFitAssessment;
    return parsed?.version === 'future-fit-v1' ? parsed : null;
  } catch { return null; }
}

function alignmentClass(level: FutureFitAssessment['chosenStreamAlignment']['level']) {
  if (level === 'Strong') return styles.strong;
  if (level === 'Partial') return styles.partial;
  if (level === 'Different direction') return styles.different;
  return styles.insufficient;
}

function normalizeStream(value: string) { return value.trim().toLowerCase().replace(/\s+/g, ' '); }

export default function FutureFitAssessmentView({ rawSummary }: Props) {
  const assessment = parseAssessment(rawSummary);
  if (!assessment) {
    return <div className={styles.emptyState}><h3>Future-Fit assessment not yet available</h3><p>Generate the structured assessment after the profile is complete. Stored results are reused until AI-relevant profile data changes.</p></div>;
  }

  const snapshot = assessment.studentSnapshot;
  const alignment = assessment.chosenStreamAlignment;
  const chosenKey = normalizeStream(snapshot.chosenStream);
  const rankedStreams: RankedStream[] = [
    ...(alignment.score != null ? [{ stream: snapshot.chosenStream, alignmentScore: alignment.score, reasoning: alignment.reasoning, chosen: true }] : []),
    ...assessment.predictedStreams.filter((stream) => normalizeStream(stream.stream) !== chosenKey).map((stream) => ({ ...stream, chosen: false }))
  ].sort((a, b) => b.alignmentScore - a.alignmentScore).slice(0, 4);

  const hasLinkedInReference = assessment.digitalProfileEvidence.some((item) => item.toLowerCase().includes('linkedin'));
  const otherDigitalEvidence = assessment.digitalProfileEvidence.filter((item) => !item.toLowerCase().includes('linkedin'));

  return (
    <div className={styles.wrapper}>
      <div className={styles.heroGrid}>
        <section className={styles.snapshotCard}>
          <span className={styles.eyebrow}>Student snapshot</span>
          <div className={styles.chosenStreamRow}><div><span className={styles.label}>Chosen stream</span><h3>{snapshot.chosenStream}</h3></div><span className={styles.programmeBadge}>{snapshot.programme}</span></div>
          <dl className={styles.snapshotList}>
            <div><dt>Academics</dt><dd>{snapshot.academics}</dd></div><div><dt>Passion</dt><dd>{snapshot.passion}</dd></div><div><dt>Purpose</dt><dd>{snapshot.purpose}</dd></div><div><dt>Career goal</dt><dd>{snapshot.careerGoal}</dd></div>
          </dl>
        </section>
        <section className={`${styles.alignmentCard} ${alignmentClass(alignment.level)}`}>
          <span className={styles.eyebrow}>Chosen-stream alignment</span><div className={styles.alignmentHeader}><h3>{alignment.level}</h3>{alignment.score != null ? <span className={styles.scoreBadge}>{alignment.score}/100</span> : null}</div><p>{alignment.reasoning}</p><small>Alignment is an advisory evidence-fit indicator, not a probability of success.</small>
        </section>
      </div>

      <div className={styles.twoColumnGrid}>
        <section className={styles.panel}><span className={styles.eyebrow}>Observed strengths</span>{assessment.observedStrengths.length ? <div className={styles.chipList}>{assessment.observedStrengths.map((strength) => <span className={styles.chip} key={strength}>{strength}</span>)}</div> : <p className={styles.muted}>No additional evidence-based strengths were identified.</p>}</section>
        <section className={styles.panel}><span className={styles.eyebrow}>Skills and developing capabilities</span>{assessment.observedSkills.length ? <div className={styles.chipList}>{assessment.observedSkills.map((skill) => <span className={styles.chip} key={skill}>{skill}</span>)}</div> : <p className={styles.muted}>The current profile does not provide enough evidence to infer additional skills safely.</p>}</section>
      </div>

      <section className={styles.panel}>
        <div className={styles.sectionHeading}><div><span className={styles.eyebrow}>Ranked stream fit</span><h3>Chosen stream and evidence-based alternatives</h3></div><span className={styles.guidanceBadge}>Guidance, not a verdict</span></div>
        {rankedStreams.length ? <div className={styles.streamGrid}>{rankedStreams.map((stream, index) => <article className={`${styles.streamCard} ${stream.chosen ? styles.chosenStreamCard : ''}`} key={`${stream.stream}-${index}`}>
          <div className={styles.streamHeader}><span className={styles.streamRank}>#{index + 1}</span><div className={styles.streamMeta}>{stream.chosen ? <span className={styles.chosenBadge}>Chosen</span> : null}<span className={styles.streamScore}>{stream.alignmentScore}/100</span></div></div>
          <h4>{stream.stream}</h4><div className={styles.progressTrack} aria-hidden="true"><span className={styles.progressFill} style={{ width: `${Math.max(0, Math.min(100, stream.alignmentScore))}%` }} /></div><p>{stream.reasoning}</p>
        </article>)}</div> : <p className={styles.muted}>Not enough evidence is available to rank streams.</p>}
      </section>

      <div className={styles.twoColumnGrid}>
        <section className={styles.panel}>
          <span className={styles.eyebrow}>Digital-profile evidence</span>
          {hasLinkedInReference ? <div className={styles.linkedinReview}><p><strong>LinkedIn URL recorded.</strong> The URL itself is not scraped. Staff can review the profile from the LinkedIn link in the Student Profile section, or paste profile text into the dedicated LinkedIn review field so it becomes part of the next Future-Fit assessment.</p></div> : null}
          {otherDigitalEvidence.length ? <ul className={styles.cleanList}>{otherDigitalEvidence.map((item) => <li key={item}>{item}</li>)}</ul> : !hasLinkedInReference ? <p className={styles.muted}>No external profile evidence was independently retrieved.</p> : null}
        </section>
        <section className={styles.panel}><span className={styles.eyebrow}>What to explore next</span>{assessment.exploreNext.length ? <ol className={styles.numberedList}>{assessment.exploreNext.map((item) => <li key={item}>{item}</li>)}</ol> : <p className={styles.muted}>Discuss practical exploration steps with the counsellor.</p>}</section>
      </div>

      <section className={styles.staffPanel}><span className={styles.eyebrow}>Staff-only assessment</span><p>{assessment.staffAssessment}</p></section>
      <section className={styles.studentNote}><strong>Note for the student</strong><p>{assessment.studentNote}</p></section>
    </div>
  );
}
