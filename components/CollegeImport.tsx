'use client';

import { useState } from 'react';
import { importCollegeRowsAction } from '@/app/admin/actions';

const headers = ['college_name','city','state','country','poc_name','poc_email','partner_status','commission_based','hostel_available','source_url','course_name','subject_area','duration','total_fee','placement_count','highest_package','average_package','currency'];
const sample = ['Example University','Bhubaneswar','Odisha','India','Priya Das','priya@example.edu','preferred_partner','yes','yes','https://example.edu','B.Tech CSE','Engineering','4 years','600000','250','1800000','650000','INR'];

export default function CollegeImport() {
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  function downloadTemplate() {
    const csv = [headers, sample].map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(',')).join('\n');
    const link = document.createElement('a');
    link.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    link.download = 'future-plus-college-import-template.csv';
    link.click();
    URL.revokeObjectURL(link.href);
  }

  async function upload(file?: File) {
    if (!file) return;
    setBusy(true);
    setMessage('Reading file...');
    try {
      const text = await file.text();
      const lines = text.replace(/^\uFEFF/, '').split(/\r?\n/).filter(Boolean);
      const parseLine = (line: string) => {
        const values: string[] = [];
        let value = '';
        let quoted = false;
        for (let i = 0; i < line.length; i += 1) {
          const char = line[i];
          if (char === '"' && quoted && line[i + 1] === '"') { value += '"'; i += 1; }
          else if (char === '"') quoted = !quoted;
          else if (char === ',' && !quoted) { values.push(value); value = ''; }
          else value += char;
        }
        values.push(value);
        return values;
      };
      if (lines.length < 2) throw new Error('The CSV is empty or has no data rows.');
      const columns = parseLine(lines[0]).map((column) => column.trim().toLowerCase());
      const missing = headers.filter((header) => !columns.includes(header));
      if (missing.length) throw new Error(`Missing required CSV columns: ${missing.join(', ')}`);
      const rows = lines.slice(1).map((line) => Object.fromEntries(
        parseLine(line).map((value, index) => [columns[index], value.trim()])
      ));
      const result = await importCollegeRowsAction(rows);
      setMessage(`${result.updated} college/course rows saved. Refreshing the College Database will show the updates.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Import failed. Please check the template.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="import-panel">
      <div><h2>Bulk college upload</h2><p className="muted">Download the template, complete it in Excel or Google Sheets, save as CSV, then upload it here. Existing matching colleges and courses are updated.</p></div>
      <div className="actions">
        <button type="button" className="secondary-button" onClick={downloadTemplate}>Download Excel-compatible template</button>
        <label className="primary-button file-button">{busy ? 'Importing...' : 'Choose CSV file'}<input type="file" accept=".csv,text/csv" disabled={busy} onChange={(event) => upload(event.target.files?.[0])} /></label>
      </div>
      {message ? <p className="import-message">{message}</p> : null}
    </div>
  );
}
