import Link from 'next/link';
import { notFound } from 'next/navigation';
import { DESTINATIONS } from '@/lib/constants';

export function generateStaticParams() {
  return DESTINATIONS.map((destination) => ({ city: destination.slug }));
}

export default async function DestinationDetailPage({ params }: { params: Promise<{ city: string }> }) {
  const { city } = await params;
  const destination = DESTINATIONS.find((item) => item.slug === city);
  if (!destination) notFound();
  return (
    <>
      <section className="destination-detail-hero">
        <img src={destination.image} alt={`${destination.name} skyline and destination`} />
        <div><span className="kicker">{destination.state}</span><h1>Study in {destination.name}</h1><p>Explore institutions featured by Future Plus for this destination. Programme availability and partnership status should be confirmed with a counsellor.</p></div>
      </section>
      <section className="public-section">
        <div className="section-heading"><span className="kicker">Featured institutions</span><h2>Universities and colleges in {destination.name}</h2></div>
        <div className="destination-institution-grid">
          {destination.institutions.map((institution, index) => <article key={institution}><span>{String(index + 1).padStart(2, '0')}</span><h3>{institution}</h3><p>{destination.name}, {destination.state}</p></article>)}
        </div>
        <div className="destination-actions"><a className="primary-button" href="mailto:enquiry@futureplusedus.com">Discuss this destination</a><a className="secondary-button" href={destination.source} target="_blank" rel="noreferrer">View original Future Plus listing</a><Link className="secondary-button" href="/destinations">All destinations</Link></div>
      </section>
    </>
  );
}
