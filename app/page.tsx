import Link from 'next/link';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const programmes = ['MBA & PGDM', 'B.Tech', 'BBA & BCA', 'MBBS & BDS', 'Law', 'Study Abroad'];
const cities = ['Pune', 'Bangalore', 'Delhi', 'Mumbai', 'Bhubaneswar', 'Hyderabad'];

export default function HomePage() {
  return (
    <>
      <section className="public-hero">
        <div className="public-hero-copy">
          <span className="kicker">Empowering futures since 2010</span>
          <h1>Your pathway to the right course, college and career.</h1>
          <p>Personalised counselling, transparent admissions support and access to trusted institutions across India and abroad.</p>
          <div className="actions">
            <a href="tel:+917008551071" className="primary-button">Talk to a counsellor</a>
            <a href="#programmes" className="secondary-button">Explore programmes</a>
            <a href="https://futureplusedus.com/" target="_blank" rel="noreferrer" className="secondary-button">Visit Future Plus Website</a>
          </div>
          <div className="trust-row">
            <span><strong>3,500+</strong> students guided</span>
            <span><strong>14+</strong> years of expertise</span>
            <span><strong>4.9/5</strong> trusted by students</span>
          </div>
        </div>
        <div className="public-hero-image">
          <img src="https://futureplusedus.com/wp-content/uploads/2024/10/home-about-2048x2048.webp" alt="Future Plus student counselling" />
          <div className="floating-proof">99% success-led guidance</div>
        </div>
      </section>

      <section id="about" className="public-section split-section">
        <div>
          <span className="kicker">About Future Plus Education</span>
          <h2>Guidance that turns ambition into a practical admissions plan.</h2>
        </div>
        <p>Since 2010, Future Plus has helped students make informed decisions through one-to-one counselling, course discovery, applications, education-loan support and strong institutional partnerships.</p>
      </section>

      <section id="programmes" className="public-section">
        <div className="section-heading"><span className="kicker">Popular pathways</span><h2>Explore programmes built around your future</h2></div>
        <div className="programme-grid">{programmes.map((item, i) => <article className="programme-card" key={item}><span>0{i + 1}</span><h3>{item}</h3><p>Discover colleges, eligibility, fees and career possibilities with a counsellor.</p></article>)}</div>
      </section>

      <section id="colleges" className="public-section dark-section">
        <span className="kicker">Study destinations</span>
        <h2>Unlock your future in top education cities</h2>
        <div className="city-row">{cities.map((city) => <span key={city}>{city}</span>)}</div>
      </section>

      <section id="media" className="public-section media-section">
        <div className="section-heading">
          <span className="kicker">Media coverage & university updates</span>
          <h2>Events, campus stories and education updates</h2>
          <p className="muted">Watch recent Future Plus activities, university updates and videos from our social channels.</p>
        </div>
        <div className="media-grid">
          <article className="media-card media-card-featured">
            <video controls preload="metadata" playsInline>
              <source src="/media/future-plus-event-highlight.mp4" type="video/mp4" />
              Your browser does not support video playback.
            </video>
            <div><span className="media-label">Event video</span><h3>Future Plus event highlights</h3><p>Moments and updates from the Future Plus community.</p></div>
          </article>
          <article className="media-card">
            <div className="video-frame">
              <iframe src="https://www.youtube.com/embed/4zQucrg7mc4" title="Future Plus YouTube update" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen />
            </div>
            <div><span className="media-label">YouTube</span><h3>University and student update</h3></div>
          </article>
          <article className="media-card">
            <div className="video-frame">
              <iframe src="https://www.youtube.com/embed/AAXIhhUcIXw" title="Future Plus university video" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen />
            </div>
            <div><span className="media-label">YouTube</span><h3>Education news and opportunities</h3></div>
          </article>
          <a className="media-card social-media-card" href="https://www.facebook.com/share/r/1CiQEzPbba/" target="_blank" rel="noreferrer">
            <span className="media-label">Facebook video</span>
            <h3>Watch our latest Facebook coverage</h3>
            <p>Open the Future Plus Facebook reel to see the full update.</p>
            <strong>Watch on Facebook →</strong>
          </a>
        </div>
      </section>

      <section className="public-section public-cta">
        <div><span className="kicker">Start your journey</span><h2>Let’s find the right next step together.</h2><p>Call +91 70085 51071 or email enquiry@futureplusedus.com.</p></div>
        <div className="actions"><a className="primary-button" href="mailto:enquiry@futureplusedus.com">Get free consultation</a><Link className="secondary-button" href="/login">Staff workspace</Link></div>
      </section>
    </>
  );
}
