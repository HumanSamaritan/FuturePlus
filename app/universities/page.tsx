import Link from 'next/link';

const universities = [
  ['Sparsh Global Business School', 'Greater Noida, Uttar Pradesh'],
  ['Bharath Institute of Higher Education and Research', 'Chennai, Tamil Nadu'],
  ['Hindustan Institute of Technology and Science', 'Chennai, Tamil Nadu'],
  ['Sathyabama Institute of Science and Technology', 'Chennai, Tamil Nadu'],
  ['SRM Institute of Science and Technology', 'Chennai, Tamil Nadu'],
  ['International Management Institute Kolkata', 'Kolkata, West Bengal'],
  ['Globsyn Business School', 'Kolkata, West Bengal'],
  ['Calcutta Business School', 'Kolkata, West Bengal'],
  ['Praxis Business School', 'Kolkata, West Bengal'],
  ['IQ City Unitedworld School of Business', 'Kolkata, West Bengal'],
  ['Dr. D. Y. Patil B-School', 'Pune, Maharashtra'],
  ['Lexicon MILE', 'Pune, Maharashtra'],
  ['Kirloskar Institute of Advanced Management Studies', 'Harihar, Karnataka / Pune, Maharashtra'],
  ['International Institute of Management Studies (Sai Balaji)', 'Pune, Maharashtra'],
  ['Indira School of Business Studies', 'Pune, Maharashtra'],
  ['Pune Business School', 'Pune, Maharashtra'],
  ['International School of Management Studies', 'Pune, Maharashtra'],
  ['ITM Business School', 'Mumbai, Maharashtra'],
  ['Universal AI University', 'Karjat, Maharashtra'],
  ["Chetana's Institute of Management and Research", 'Mumbai, Maharashtra'],
  ['Welingkar Institute of Management', 'Mumbai, Maharashtra'],
  ['ATLAS SkillTech University', 'Mumbai, Maharashtra'],
  ['MIT World Peace University', 'Pune, Maharashtra'],
  ['Ramachandran International Institute of Management', 'Pune, Maharashtra'],
  ['Karnataka College of Management', 'Bengaluru, Karnataka'],
  ['Regional College of Management Bangalore', 'Bengaluru, Karnataka'],
  ['GIBS Business School', 'Bengaluru, Karnataka'],
  ['ISBR Business School', 'Bengaluru, Karnataka'],
  ['Alliance University', 'Bengaluru, Karnataka'],
  ['RV University', 'Bengaluru, Karnataka']
] as const;

export default function UniversitiesPage() {
  return (
    <>
      <section className="page-hero universities-page-hero">
        <span className="kicker">Future Plus network</span>
        <h1>University relationships that support informed choices.</h1>
        <p>Explore institutions across India represented within the Future Plus counselling and admissions network. Current partnership and programme availability should be confirmed with our counselling team.</p>
      </section>
      <section className="public-section university-section">
        <div className="section-heading university-heading">
          <div><span className="kicker">Institution directory</span><h2>Our university and college network</h2></div>
          <div><p>Browse the institution and location list, then explore destinations to understand the wider education ecosystem in each city.</p><Link href="/destinations" className="text-link">Explore destinations →</Link></div>
        </div>
        <div className="university-grid">
          {universities.map(([name, location], index) => (
            <article className="university-card" key={name}>
              <span>{String(index + 1).padStart(2, '0')}</span>
              <div><h3>{name}</h3><p>{location}</p></div>
            </article>
          ))}
        </div>
      </section>
    </>
  );
}
