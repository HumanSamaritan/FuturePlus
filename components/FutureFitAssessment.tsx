import type { FutureFitAssessment } from '@/lib/ai';
import styles from './FutureFitAssessment.module.css';

type Props = {
  rawSummary?: string | null;
};

function parseAssessment(rawSummary?: string | null): FutureFitAssessment | null {
  if (!rawSummary) return null;
  try {
    const parsed = JSON.parse(rawSummary) as FutureFitAssessment;
    return parsed?.version === 'future-fit-v1' ? parsed : null;
  } catch {
    return null;
  }
}

function alignmentClass(level: FutureFitAssessment['chosenStreamAlignment']['level']) {
  if (level === 'Strong') return styles.strong;
  if (level === 'Partial') return styles.partial;
  if (level === 'Different direction') return styles.different;
  return styles.insufficient;
}

export default function FutureFitAssessmentView({ rawSummary }: Props) {
  const assessment = parseAssessment(rawSummary);

  if (!assessment) {
    return (
      <div className={styles.emptyState}>
        <h3>Future-Fit assessment not yet available</h3>
        <p>Regenerate AI Insights to create the structured student assessment. Older narrative summaries are no longer shown as raw console text.</p>
      </div>
    );
  }

  const snapshot = assessment.studentSnapshot;
  const alignment = assessment.chosenStreamAlignment;

  return (
    <div className={styles.wrapper}>
      <div className={styles.heroGrid}>
        <section className={styles.snapshotCard}>
          <span className={styles.eyebrow}>Student snapshot</span>
          <div className={styles.chosenStreamRow}>
            <div>
              <span className={styles.label}>Chosen stream</span>
              <h3>{snapshot.chosenStream}</h3>
            </div>
            <span className={styles.programmeBadge}>{snapshot.programme}</span>
          </div>
          <dl className={styles.snapshotList}>
            <div><dt>Academics</dt><dd>{snapshot.academics}</dd></div>
            <div><dt>Passion</dt><dd>{snapshot.passion}</dd></div>
            <div><dt>Purpose</dt><dd>{snapshot.purpose}</dd></div>
            <div><dt>Career goal</dt><dd>{snapshot.careerGoal}</dd></div>
          </dl>
        </section>

        <section className={`${styles.alignmentCard} ${alignmentClass(alignment.level)}`}>
          <span className={styles.eyebrow}>Chosen-stream alignment</span>
          <div className={styles.alignmentHeader}>
            <h3>{alignment.level}</h3>
            {alignment.score != null ? <span className={styles.scoreBadge}>{alignment.score}/100</span> : null}
          </div>
          <p>{alignment.reasoning}</p>
          <small>Alignment is an advisory evidence-fit indicator, not a probability of success.</small>
        </section>
      </div>

      <div className={styles.twoColumnGrid}>
        <section className={styles.panel}>
          <span className={styles.eyebrow}>Observed strengths</span>
          {assessment.observedStrengths.length ? (
            <div className={styles.chipList}>
              {assessment.observedStrengths.map((strength) => <span className={styles.chip} key={strength}>{strength}</span>)}
            </div>
          ) : <p className={styles.muted}>No additional evidence-based strengths were identified.</p>}
        </section>

        <section className={styles.panel}>
          <span className={styles.eyebrow}>Skills and developing capabilities</span>
          {assessment.observedSkills.length ? (
            <div className={styles.chipList}>
              {assessment.observedSkills.map((skill) => <span className={styles.chip} key={skill}>{skill}</span>)}
            </div>
          ) : <p className={styles.muted}>The current profile does not provide enough evidence to infer additional skills safely.</p>}
        </section>
      </div>

      <section className={styles.panel}>
        <div className={styles.sectionHeading}>
          <div>
            <span className={styles.eyebrow}>Predicted best-fit streams</span>
            <h3>Areas worth exploring</h3>
          </div>
          <span className={styles.guidanceBadge}>Guidance, not a verdict</span>
        </div>
        {assessment.predictedStreams.length ? (
          <div className={styles.streamGrid}>
            {assessment.predictedStreams.map((stream, index) => (
              <article className={styles.streamCard} key={`${stream.stream}-${index}`}>
                <div className={styles.streamHeader}>
                  <span className={styles.streamRank}>#{index + 1}</span>
                  <span className={styles.streamScore}>{stream.alignmentScore}/100</span>
                </div>
                <h4>{stream.stream}</h4>
                <div className={styles.progressTrack} aria-hidden="true">
                  <span className={styles.progressFill} style={{ width: `${Math.max(0, Math.min(100, stream.alignmentScore))}%` }} />
                </div>
                <p>{stream.reasoning}</p>
              </article>
            ))}
          </div>
        ) : <p className={styles.muted}>Not enough evidence is available to rank alternative streams.</p>}
      </section>

      <div className={styles.twoColumnGrid}>
        <section className={styles.panel}>
          <span className={styles.eyebrow}>Digital-profile evidence</span>
          {assessment.digitalProfileEvidence.length ? (
            <ul className={styles.cleanList}>
              {assessment.digitalProfileEvidence.map((item) => <li key={item}>{item}</li>)}
            </ul>
          ) : <p className={styles.muted}>No external profile evidence was independently retrieved.</p>}
        </section>

        <section className={styles.panel}>
          <span className={styles.eyebrow}>What to explore next</span>
          {assessment.exploreNext.length ? (
            <ol className={styles.numberedList}>
              {assessment.exploreNext.map((item) => <li key={item}>{item}</li>)}
            </ol>
          ) : <p className={styles.muted}>Discuss practical exploration steps with the counsellor.</p>}
        </section>
      </div>

      <section className={styles.staffPanel}>
        <span className={styles.eyebrow}>Staff-only assessment</span>
        <p>{assessment.staffAssessment}</p>
      </section>

      <section className={styles.studentNote}>
        <strong>Note for the student</strong>
        <p>{assessment.studentNote}</p>
      </section>
    </div>
  );
}
