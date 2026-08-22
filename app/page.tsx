export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default function FrozenFuturePlusPage() {
  return (
    <section
      style={{
        minHeight: '72vh',
        display: 'grid',
        placeItems: 'center',
        padding: '48px 20px'
      }}
    >
      <div
        style={{
          width: 'min(760px, 100%)',
          background: '#ffffff',
          border: '1px solid #d9e1ee',
          borderRadius: 28,
          padding: '52px 42px',
          boxShadow: '0 24px 70px rgba(16, 38, 74, 0.08)',
          textAlign: 'center'
        }}
      >
        <span className="kicker">Future Plus Education</span>
        <h1 style={{ marginTop: 14 }}>This platform is temporarily unavailable.</h1>
        <p className="muted" style={{ maxWidth: 620, margin: '18px auto 0' }}>
          Public access to the Future Plus platform is currently paused. Existing application code and data are retained so the service can be restored when required.
        </p>
        <p className="help-text" style={{ marginTop: 26 }}>
          Authorised organisational users should use the EduCareer Partner Workspace link supplied by OMNeXa.
        </p>
      </div>
    </section>
  );
}
