import type { SupabaseClient } from '@supabase/supabase-js';
import { PDFParse } from 'pdf-parse';

const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;
const MAX_EXTRACTED_CHARS = 30000;

export type StudentDocumentKind = 'linkedin-profile' | 'resume';

export type StoredDocumentEvidence = {
  path: string;
  originalName: string;
  extractedText: string | null;
  extractionStatus: 'extracted' | 'text_file' | 'no_text';
};

function cleanName(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]+/g, '-').replace(/-+/g, '-').slice(0, 120) || 'document';
}

function normalizeExtractedText(value: string) {
  return value.replace(/\u0000/g, '').replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim().slice(0, MAX_EXTRACTED_CHARS);
}

async function extractPdfText(buffer: Buffer) {
  const parser = new PDFParse({ data: buffer });
  try {
    const result = await parser.getText();
    return normalizeExtractedText(result.text || '');
  } finally {
    await parser.destroy();
  }
}

export async function storeStudentDocument(
  supabase: SupabaseClient,
  studentId: string,
  kind: StudentDocumentKind,
  fileValue: FormDataEntryValue | null,
  previousPath?: string | null
): Promise<StoredDocumentEvidence | null> {
  if (!(fileValue instanceof File) || fileValue.size === 0) return null;
  if (fileValue.size > MAX_UPLOAD_BYTES) throw new Error('Uploaded profile documents must be 5 MB or smaller.');

  const lowerName = fileValue.name.toLowerCase();
  const isPdf = fileValue.type === 'application/pdf' || lowerName.endsWith('.pdf');
  const isText = fileValue.type === 'text/plain' || lowerName.endsWith('.txt');
  if (kind === 'linkedin-profile' && !isPdf) throw new Error('LinkedIn profile upload must be a PDF export.');
  if (kind === 'resume' && !isPdf && !isText) throw new Error('Resume upload must be a PDF or plain-text (.txt) file.');

  const buffer = Buffer.from(await fileValue.arrayBuffer());
  let extractedText = '';
  let extractionStatus: StoredDocumentEvidence['extractionStatus'] = 'no_text';
  if (isText) {
    extractedText = normalizeExtractedText(buffer.toString('utf8'));
    extractionStatus = extractedText ? 'text_file' : 'no_text';
  } else {
    try {
      extractedText = await extractPdfText(buffer);
      extractionStatus = extractedText ? 'extracted' : 'no_text';
    } catch (error) {
      console.error('[student-document] PDF text extraction failed', { kind, name: fileValue.name, error });
      extractionStatus = 'no_text';
    }
  }

  const extension = isText ? 'txt' : 'pdf';
  const path = `${studentId}/${kind}-${Date.now()}-${cleanName(fileValue.name.replace(/\.[^.]+$/, ''))}.${extension}`;
  const { error: uploadError } = await supabase.storage.from('student-documents').upload(path, buffer, {
    contentType: isText ? 'text/plain' : 'application/pdf',
    upsert: false
  });
  if (uploadError) throw new Error(`Document upload failed: ${uploadError.message}`);

  if (previousPath && previousPath !== path) {
    const { error: deleteError } = await supabase.storage.from('student-documents').remove([previousPath]);
    if (deleteError) console.error('[student-document] previous file cleanup failed', { previousPath, deleteError });
  }

  return {
    path,
    originalName: fileValue.name,
    extractedText: extractedText || null,
    extractionStatus
  };
}
