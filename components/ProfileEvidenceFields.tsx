type Props = {
  values?: {
    linkedinUrl?: string | null;
    linkedinProfileText?: string | null;
    linkedinProfilePdfName?: string | null;
    linkedinProfilePdfText?: string | null;
    resumeText?: string | null;
    resumeFileName?: string | null;
    resumeFileText?: string | null;
    portfolioUrl?: string | null;
    facebookUrl?: string | null;
    instagramUrl?: string | null;
    xUrl?: string | null;
    languages?: string | null;
    accolades?: string | null;
    extracurricularActivities?: string | null;
    rewards?: string | null;
    specialSkills?: string | null;
    certifications?: string | null;
    workExperience?: string | null;
  };
};

export default function ProfileEvidenceFields({ values = {} }: Props) {
  return (
    <>
      <p className="help-text">Use student-supplied public-profile exports/text only. Do not paste private messages or unnecessary sensitive personal data.</p>
      <div className="grid grid-2">
        <div className="field">
          <label htmlFor="linkedinUrl">LinkedIn profile</label>
          <input id="linkedinUrl" name="linkedinUrl" type="url" defaultValue={values.linkedinUrl || ''} placeholder="https://linkedin.com/in/..." />
          <label htmlFor="linkedinProfileText">LinkedIn profile text for assessment</label>
          <textarea id="linkedinProfileText" name="linkedinProfileText" rows={6} defaultValue={values.linkedinProfileText || ''} placeholder="Paste relevant About, Education, Experience, Projects or Skills text" />
          <label htmlFor="linkedinProfilePdf">LinkedIn profile PDF export</label>
          <input id="linkedinProfilePdf" name="linkedinProfilePdf" type="file" accept="application/pdf,.pdf" />
          <span className="help-text">Optional PDF export, maximum 5 MB.{values.linkedinProfilePdfName ? ` Current file: ${values.linkedinProfilePdfName}.` : ''}{values.linkedinProfilePdfName && !values.linkedinProfilePdfText ? ' No extractable text was found; paste the profile text above if the PDF is scanned.' : ''}</span>
        </div>

        <div className="field">
          <label htmlFor="resumeText">Resume / CV text</label>
          <textarea id="resumeText" name="resumeText" rows={6} defaultValue={values.resumeText || ''} placeholder="Paste resume or CV text" />
          <label htmlFor="resumeFile">Resume / CV file</label>
          <input id="resumeFile" name="resumeFile" type="file" accept="application/pdf,text/plain,.pdf,.txt" />
          <span className="help-text">PDF or plain-text file, maximum 5 MB.{values.resumeFileName ? ` Current file: ${values.resumeFileName}.` : ''}{values.resumeFileName && !values.resumeFileText ? ' No extractable text was found; paste the resume text above if the PDF is scanned.' : ''}</span>
        </div>

        <div className="field"><label htmlFor="portfolioUrl">Portfolio / GitHub / personal site</label><input id="portfolioUrl" name="portfolioUrl" type="url" defaultValue={values.portfolioUrl || ''} placeholder="https://..." /></div>
        <div className="field"><label htmlFor="facebookUrl">Facebook</label><input id="facebookUrl" name="facebookUrl" type="url" defaultValue={values.facebookUrl || ''} /></div>
        <div className="field"><label htmlFor="instagramUrl">Instagram</label><input id="instagramUrl" name="instagramUrl" type="url" defaultValue={values.instagramUrl || ''} /></div>
        <div className="field"><label htmlFor="xUrl">X profile</label><input id="xUrl" name="xUrl" type="url" defaultValue={values.xUrl || ''} /></div>
        <div className="field"><label htmlFor="languages">Languages</label><input id="languages" name="languages" defaultValue={values.languages || ''} /></div>
        <div className="field"><label htmlFor="accolades">Accolades and distinctions</label><textarea id="accolades" name="accolades" defaultValue={values.accolades || ''} /></div>
        <div className="field"><label htmlFor="extracurricularActivities">Extracurricular activities</label><textarea id="extracurricularActivities" name="extracurricularActivities" defaultValue={values.extracurricularActivities || ''} /></div>
        <div className="field"><label htmlFor="rewards">Awards and rewards</label><textarea id="rewards" name="rewards" defaultValue={values.rewards || ''} /></div>
        <div className="field"><label htmlFor="specialSkills">Special skills</label><textarea id="specialSkills" name="specialSkills" defaultValue={values.specialSkills || ''} /></div>
        <div className="field"><label htmlFor="certifications">Certifications</label><textarea id="certifications" name="certifications" defaultValue={values.certifications || ''} /></div>
        <div className="field"><label htmlFor="workExperience">Projects, internships or work experience</label><textarea id="workExperience" name="workExperience" defaultValue={values.workExperience || ''} /></div>
      </div>
    </>
  );
}
