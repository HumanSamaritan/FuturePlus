import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Partner Workspace Preview',
  description: 'Design preview for organisation-scoped counsellor access.'
};

const PARTNERS = [
  ['future-plus', 'Future Plus Education'],
  ['collegeduniya', 'CollegeDuniya'],
  ['blessing-heart', 'Blessing Heart']
] as const;

export default function PartnerWorkspacePreviewPage() {
  return (
    <section className="grid">
      <div className="form-card">
        <span className="kicker">Preview only · no authentication or database changes</span>
        <h1>Authorised Partner Workspace</h1>
        <p className="muted">
          Select the organisation you are authorised to represent. Your Google account will then be checked against EduCareer&apos;s approved membership for that organisation. Your Admin or User role will be determined by the database and will not be selectable at login.
        </p>

        <form action="/preview/universities" method="get">
          <div className="form-section">
            <h2>Partner organisation</h2>
            <div className="grid grid-2">
              <div className="field">
                <label htmlFor="partner">Partner Organisation *</label>
                <select id="partner" name="partner" defaultValue="future-plus" required>
                  {PARTNERS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                </select>
                <span className="help-text">Only organisations activated by OMNeXa under the relevant partnership/MOU would appear here.</span>
              </div>
              <div className="field">
                <label>Identity provider</label>
                <div className="login-assurance">
                  <span>Google account</span>
                  <span>Approved email only</span>
                  <span>Organisation membership required</span>
                </div>
              </div>
            </div>
          </div>

          <input type="hidden" name="role" value="partner_admin" />
          <input type="hidden" name="market" value="india" />
          <input type="hidden" name="level" value="undergraduate" />
          <button className="primary-button" type="submit">Continue with Google — Preview</button>
        </form>

        <div className="form-section">
          <h2>Access model shown in this preview</h2>
          <div className="grid grid-2">
            <div>
              <strong>Partner Admin</strong>
              <p className="muted">Works only inside the selected organisation. Admin status never grants visibility into another partner&apos;s data.</p>
            </div>
            <div>
              <strong>Partner User</strong>
              <p className="muted">Can upload, add and maintain the organisation&apos;s authorised university/course data, subject to the final permission policy.</p>
            </div>
          </div>
        </div>

        <p className="help-text">
          This route is a visual workflow preview. It does not perform Google OAuth, create memberships, alter RLS policies, or write to Supabase.
        </p>
      </div>
    </section>
  );
}
