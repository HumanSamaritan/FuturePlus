import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'University Management Preview',
  description: 'Preview of organisation-scoped Indian and international university management.'
};

const PARTNER_NAMES: Record<string, string> = {
  'future-plus': 'Future Plus Education',
  collegeduniya: 'CollegeDuniya',
  'blessing-heart': 'Blessing Heart'
};

const INDIA_ROWS = [
  ['Alliance University', 'Bengaluru', 'Karnataka', 'India', 'Preferred Partner', '6'],
  ['SRM Institute of Science and Technology', 'Kattankulathur', 'Tamil Nadu', 'India', 'Non-Partner', '28'],
  ['UPES', 'Dehradun', 'Uttarakhand', 'India', 'Pipeline Partner', '12']
] as const;

const INTERNATIONAL_ROWS = [
  ['University of Manchester', 'Manchester', 'Greater Manchester', 'United Kingdom', 'Pipeline Partner', '9'],
  ['National University of Singapore', 'Singapore', 'Singapore', 'Singapore', 'Non-Partner', '7'],
  ['Monash University', 'Melbourne', 'Victoria', 'Australia', 'Preferred Partner', '11']
] as const;

type PreviewParams = {
  partner?: string;
  role?: string;
  market?: string;
  level?: string;
};

function hrefFor(partner: string, role: string, market: string, level: string) {
  const query = new URLSearchParams({ partner, role, market, level });
  return `/preview/universities?${query.toString()}`;
}

export default async function UniversitiesPreviewPage({ searchParams }: { searchParams: Promise<PreviewParams> }) {
  const params = await searchParams;
  const partner = PARTNER_NAMES[params.partner || 'future-plus'] ? (params.partner || 'future-plus') : 'future-plus';
  const partnerName = PARTNER_NAMES[partner];
  const role = params.role === 'partner_user' ? 'partner_user' : 'partner_admin';
  const market = params.market === 'international' ? 'international' : 'india';
  const level = params.level === 'postgraduate' ? 'postgraduate' : 'undergraduate';
  const isAdmin = role === 'partner_admin';
  const isInternational = market === 'international';
  const rows = isInternational ? INTERNATIONAL_ROWS : INDIA_ROWS;
  const programmeLabel = level === 'postgraduate' ? 'Post Graduate' : 'Under Graduate';

  return (
    <section className="grid">
      <div className="form-card">
        <span className="kicker">Preview only · isolated branch · no Supabase writes</span>
        <h1>University & Course Management</h1>
        <p className="muted">
          This preview shows the proposed partner tenant boundary. In the production design, every read/write will also be enforced by Supabase RLS using the authenticated user&apos;s approved organisation membership.
        </p>
        <div className="grid grid-2">
          <div className="field">
            <label>Partner Organisation</label>
            <input value={partnerName} readOnly />
            <span className="help-text">Locked to the organisation verified during login.</span>
          </div>
          <div className="field">
            <label>Authenticated role</label>
            <input value={isAdmin ? 'Partner Admin' : 'Partner User'} readOnly />
            <span className="help-text">Role is determined by EduCareer access records, never selected by the user.</span>
          </div>
        </div>
        <div className="actions">
          <a className="secondary-button" href="/preview/partner-workspace">Back to login preview</a>
          <a className="secondary-button" href={hrefFor(partner, isAdmin ? 'partner_user' : 'partner_admin', market, level)}>
            Preview as {isAdmin ? 'Partner User' : 'Partner Admin'}
          </a>
          {isAdmin ? <button className="secondary-button" type="button" disabled>Manage organisation users — final phase</button> : null}
        </div>
      </div>

      <div className="form-card">
        <span className="kicker">Catalogue scope</span>
        <h2>{programmeLabel} universities</h2>
        <div className="grid grid-2">
          <div className="field">
            <label>Programme Level</label>
            <div className="actions">
              <a className={level === 'undergraduate' ? 'primary-button' : 'secondary-button'} href={hrefFor(partner, role, market, 'undergraduate')}>Under Graduate</a>
              <a className={level === 'postgraduate' ? 'primary-button' : 'secondary-button'} href={hrefFor(partner, role, market, 'postgraduate')}>Post Graduate</a>
            </div>
          </div>
          <div className="field">
            <label>University Market</label>
            <div className="actions">
              <a className={!isInternational ? 'primary-button' : 'secondary-button'} href={hrefFor(partner, role, 'india', level)}>Indian Colleges</a>
              <a className={isInternational ? 'primary-button' : 'secondary-button'} href={hrefFor(partner, role, 'international', level)}>International Colleges</a>
            </div>
          </div>
        </div>
        <p className="help-text">
          {isInternational
            ? 'Country is mandatory for every international university row. Blank country values will be rejected rather than defaulted to India.'
            : 'Country is system-controlled as India for domestic university records.'}
        </p>
      </div>

      <div className="table-card">
        <span className="kicker">Illustrative preview data only</span>
        <h2>{partnerName} · {isInternational ? 'International' : 'Indian'} catalogue</h2>
        <p className="muted">Only records belonging to this partner organisation would be visible. Another partner&apos;s catalogue will not be queryable through the UI or the database policy.</p>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>University Name</th>
                <th>Location</th>
                <th>Country</th>
                <th>Courses</th>
                <th>Partner Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(([name, city, region, country, status, courses]) => (
                <tr key={`${name}-${country}`}>
                  <td><strong>{name}</strong></td>
                  <td>{city}, {region}</td>
                  <td>{country}</td>
                  <td>{courses} course(s)</td>
                  <td>{status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="form-card">
        <span className="kicker">Bulk upload preview</span>
        <h2>{programmeLabel} {isInternational ? 'international university' : 'Indian college'} upload</h2>
        <p className="muted">
          Partner Admin and Partner User will both be permitted to upload. The organisation identifier will be attached by the authenticated session and will not appear as an editable spreadsheet column.
        </p>
        <div className="grid grid-2">
          <div>
            <strong>Template behaviour</strong>
            <p className="muted">University, course, POC, fees, placement and verification fields remain available.</p>
            <p className="muted">Country: {isInternational ? 'required for each row' : 'fixed to India by the workflow'}.</p>
          </div>
          <div>
            <strong>Tenant control</strong>
            <p className="muted">Partner: {partnerName} (derived from login).</p>
            <p className="muted">Uploads cannot assign or override another organisation&apos;s partner ID.</p>
          </div>
        </div>
        <div className="actions">
          <button className="secondary-button" type="button" disabled>Download {programmeLabel} template — Preview</button>
          <button className="primary-button" type="button" disabled>Choose CSV file — Preview</button>
        </div>
      </div>

      <div className="form-card">
        <span className="kicker">Manual capture preview</span>
        <h2>Add University / Course</h2>
        <div className="form-section">
          <h3>University details</h3>
          <div className="grid grid-2">
            <div className="field"><label>Partner Organisation</label><input value={partnerName} readOnly /></div>
            <div className="field"><label>Programme Level</label><input value={programmeLabel} readOnly /></div>
            <div className="field"><label>University Market</label><input value={isInternational ? 'International College' : 'Indian College'} readOnly /></div>
            <div className="field">
              <label htmlFor="previewCountry">Country {isInternational ? '*' : ''}</label>
              <input id="previewCountry" name="previewCountry" value={isInternational ? '' : 'India'} placeholder={isInternational ? 'Select / enter country' : undefined} readOnly={!isInternational} required={isInternational} />
            </div>
            <div className="field"><label>University name *</label><input placeholder="University name" /></div>
            <div className="field"><label>City</label><input /></div>
            <div className="field"><label>State / Region</label><input /></div>
            <div className="field"><label>Partner Status</label><select defaultValue="non_partner"><option value="preferred_partner">Preferred Partner</option><option value="pipeline_partner">Pipeline Partner</option><option value="non_partner">Non-Partner</option></select></div>
            <div className="field"><label>Source URL / verification link</label><input type="url" placeholder="https://..." /></div>
            <div className="field"><label>University POC email</label><input type="email" /></div>
          </div>
        </div>
        <div className="form-section">
          <h3>Course and placement details</h3>
          <div className="grid grid-2">
            <div className="field"><label>Course name *</label><input placeholder={level === 'postgraduate' ? 'MBA, M.Sc, M.Tech' : 'BBA, B.Tech, B.Pharm'} /></div>
            <div className="field"><label>Subject area *</label><input placeholder="Subject area" /></div>
            <div className="field"><label>Duration</label><input placeholder="3 years / 4 years" /></div>
            <div className="field"><label>Currency</label><input value={isInternational ? '' : 'INR'} placeholder={isInternational ? 'GBP, USD, SGD...' : undefined} readOnly={!isInternational} /></div>
            <div className="field"><label>Total fee</label><input type="number" min="0" /></div>
            <div className="field"><label>Average package</label><input type="number" min="0" /></div>
          </div>
        </div>
        <button className="primary-button" type="button" disabled>Save University / Course — Preview only</button>
      </div>
    </section>
  );
}
