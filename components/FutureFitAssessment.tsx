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
  if (!assessment) return <div className={styles.emptyState}><h3>Future-Fit assessment not yet available</h3><p>Click AI Assessment after the student profile is complete. Stored results are reused automatically until assessment evidence changes.</p></div>;

  const snapshot = assessment.studentSnapshot;
  const alignment = assessment.chosenStreamAlignment;
  const chosenKey = normalizeStream(snapshot.chosenStream);
  const rankedStreams: RankedStream[] = [
    ...(alignment.score != null ? [{ stream: snapshot.chosenStream, alignmentScore: alignment.score, reasoning: alignment.reasoning, chosen: true }] : []),
    ...assessment.predictedStreams.filter((stream) => normalizeStream(stream.stream) !== chosenKey).map((stream) => ({ ...stream, chosen: false }))
  ].sort((a, b) => b.alignmentScore - a.alignmentScore).slice(0, 4);

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
          {assessment.digitalProfileEvidence.length ? <ul className={styles.cleanList}>{assessment.digitalProfileEvidence.map((item) => <li key={item}>{item}</li>)}</ul> : <p className={styles.muted}>No additional digital-profile evidence was available for this assessment.</p>}
          <p className={styles.muted}>Profile URLs alone are references only. Future-Fit uses profile text or documents supplied in the student record; it does not claim to scrape private or restricted profile content.</p>
        </section>
        <section className={styles.panel}><span className={styles.eyebrow}>What to explore next</span>{assessment.exploreNext.length ? <ol className={styles.numberedList}>{assessment.exploreNext.map((item) => <li key={item}>{item}</li>)}</ol> : <p className={styles.muted}>Discuss practical exploration steps with the counsellor.</p>}</section>
      </div>

      <section className={styles.panel}>
        <span className={styles.eyebrow}>International application & immigration readiness</span>
        <h3>Digital-footprint review is advisory, not a visa decision</h3>
        <ul className={styles.cleanList}>
          <li>Visa and study-permit requirements differ by destination and can change. Staff should verify the current official immigration authority before advising the student.</li>
          <li>For U.S. F, M and J visa applicants, the U.S. Department of State currently applies online-presence review as part of screening and vetting. FuturePlus should help the student keep application information accurate and consistent, but it must not infer visa eligibility from opinions or social-media content.</li>
          <li>FuturePlus does not scrape private/restricted social accounts, does not assign an automated visa-risk score, and does not make admission or immigration decisions.</li>
        </ul>
        <div className="actions">
          <a className="secondary-button" href="https://travel.state.gov/content/travel/en/News/visas-news/announcement-of-expanded-screening-and-vetting-for-visa-applicants.html" target="_blank" rel="noreferrer">U.S. State Department guidance</a>
          <a className="secondary-button" href="https://www.gov.uk/student-visa" target="_blank" rel="noreferrer">UK Student visa</a>
          <a className="secondary-button" href="https://www.canada.ca/en/immigration-refugees-citizenship/services/study-canada/study-permit.html" target="_blank" rel="noreferrer">Canada study permit</a>
          <a className="secondary-button" href="https://immi.homeaffairs.gov.au/visas/getting-a-visa/visa-listing/student-500" target="_blank" rel="noreferrer">Australia Student visa</a>
        </div>
      </section>

      <section className={styles.staffPanel}><span className={styles.eyebrow}>Staff-only assessment</span><p>{assessment.staffAssessment}</p></section>
    </div>
  );
}
