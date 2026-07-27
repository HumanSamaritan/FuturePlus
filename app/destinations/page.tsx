import Link from 'next/link';
import { DESTINATIONS } from '@/lib/constants';

export default function DestinationsPage() {
  return (
    <>
      <section className="page-hero destination-hero">
        <span className="kicker">Study destinations</span>
        <h1>Unlock your future in India’s leading education cities.</h1>
        <p>Compare institutions by city, explore established academic ecosystems and begin a focused conversation with a Future Plus counsellor.</p>
      </section>
      <section className="public-section destination-card-grid">
        {DESTINATIONS.map((destination) => (
          <Link className="destination-card" href={`/destinations/${destination.slug}`} key={destination.slug}>
            <img src={destination.image} alt={`${destination.name} education destination`} />
            <div><span>{destination.state}</span><h2>{destination.name}</h2><p>{destination.institutions.length} featured institutions</p><strong>Explore destination →</strong></div>
          </Link>
        ))}
      </section>
    </>
  );
}
