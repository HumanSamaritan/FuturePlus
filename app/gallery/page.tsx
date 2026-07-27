import { GALLERY_IMAGES } from '@/lib/constants';

export default function GalleryPage() {
  return (
    <>
      <section className="page-hero gallery-hero">
        <span className="kicker">Future Plus gallery</span>
        <h1>Students, counsellors and moments from our education community.</h1>
        <p>A selection of photographs published by Future Plus Education from counselling, campus and community activities.</p>
      </section>
      <section className="public-section gallery-grid">
        {GALLERY_IMAGES.map((image, index) => (
          <figure key={image} className={index % 5 === 0 ? 'gallery-feature' : ''}>
            <img src={image} alt={`Future Plus education activity ${index + 1}`} loading="lazy" />
          </figure>
        ))}
      </section>
    </>
  );
}
