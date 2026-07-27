import Link from 'next/link';

const programmes = [
  ['MBA & PGDM', 'Management pathways covering leadership, finance, marketing, operations and entrepreneurship.'],
  ['B.Tech', 'Engineering programmes across established and emerging technology disciplines.'],
  ['BBA & BCA', 'Undergraduate pathways in business administration, computing and digital enterprise.'],
  ['MBBS & BDS', 'Guidance for medical and dental education, eligibility, applications and institution selection.'],
  ['Law', 'Integrated and postgraduate legal programmes linked to diverse professional careers.'],
  ['Study Abroad', 'International programme discovery, applications, documentation and destination planning.']
] as const;

export default function ProgrammesPage() {
  return (
    <>
      <section className="page-hero programmes-page-hero">
        <span className="kicker">Academic pathways</span>
        <h1>Choose a programme with your future in view.</h1>
        <p>Explore popular study pathways and work with a Future Plus counsellor to compare eligibility, institutions, fees and career possibilities.</p>
      </section>
      <section className="public-section">
        <div className="section-heading"><span className="kicker">Programme portfolio</span><h2>Focused options for different ambitions</h2></div>
        <div className="programme-grid programme-page-grid">
          {programmes.map(([name, description], index) => (
            <article className="programme-card" key={name}>
              <span>{String(index + 1).padStart(2, '0')}</span>
              <h3>{name}</h3>
              <p>{description}</p>
              <Link href="/destinations" className="text-link">Explore study destinations →</Link>
            </article>
          ))}
        </div>
      </section>
    </>
  );
}
