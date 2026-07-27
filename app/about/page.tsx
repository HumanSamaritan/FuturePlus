import Link from 'next/link';

export default function AboutPage() {
  return (
    <>
      <section className="page-hero about-page-hero">
        <span className="kicker">About Future Plus Education</span>
        <h1>Guidance that connects education decisions with meaningful careers.</h1>
        <p>Since 2010, Future Plus Education has supported students through personalised counselling, transparent admissions guidance and access to institutions in India and abroad.</p>
        <div className="actions"><a className="primary-button" href="mailto:enquiry@futureplusedus.com">Get free consultation</a><Link className="secondary-button" href="/destinations">Explore destinations</Link></div>
      </section>

      <section className="public-section about-story-grid">
        <div><span className="kicker">Our story</span><h2>Clarity, access and dependable support.</h2></div>
        <div>
          <p>Future Plus helps students understand their strengths, compare programmes and make informed university decisions. Our counsellors support technical, management, healthcare, law and creative pathways while keeping the process practical and transparent.</p>
          <p>We also help eligible students understand education-loan options so financial circumstances do not unnecessarily restrict access to quality education.</p>
        </div>
      </section>

      <section className="public-section about-principles">
        <article><span>01</span><h2>Our mission</h2><p>Give every student personalised guidance, useful resources and steady support to navigate education and career decisions with confidence.</p></article>
        <article><span>02</span><h2>Our vision</h2><p>Help build a future where students from every background can access quality education and develop the capabilities needed to thrive.</p></article>
        <article><span>03</span><h2>University and career</h2><p>Connect academic choices to strengths, interests and realistic career opportunities across technical, management and creative fields.</p></article>
      </section>

      <section className="public-section university-partnership-callout">
        <div><span className="kicker">University partnerships</span><h2>Better information at every decision point.</h2></div>
        <div><p>Our institution network helps counsellors explain programmes, scholarships, application processes and student-support options more clearly.</p><Link className="text-link" href="/universities">View the university network →</Link></div>
      </section>
    </>
  );
}
