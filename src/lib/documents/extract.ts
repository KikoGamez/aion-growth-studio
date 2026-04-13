/**
 * Text extraction from uploaded documents.
 * Supports PDF, DOCX, TXT, CSV. Images return empty (no OCR in MVP).
 */

const MAX_CHARS = 50_000;

export interface ExtractionResult {
  text: string;
  charCount: number;
  truncated: boolean;
}

export async function extractText(
  buffer: Buffer,
  fileType: string,
): Promise<ExtractionResult> {
  let raw = '';

  const type = fileType.toLowerCase();

  if (type === 'application/pdf' || type.endsWith('.pdf')) {
    raw = await extractPdf(buffer);
  } else if (
    type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
    type.endsWith('.docx')
  ) {
    raw = await extractDocx(buffer);
  } else if (
    type.startsWith('text/') ||
    type.endsWith('.txt') ||
    type.endsWith('.csv') ||
    type === 'text/csv'
  ) {
    raw = buffer.toString('utf-8');
  } else if (type.startsWith('image/')) {
    // No OCR in MVP — images contribute metadata only
    raw = '';
  } else {
    // Fallback: try as text
    try { raw = buffer.toString('utf-8'); } catch { raw = ''; }
  }

  // Clean up: collapse whitespace, remove null chars
  raw = raw.replace(/\0/g, '').replace(/\s+/g, ' ').trim();

  const truncated = raw.length > MAX_CHARS;
  const text = truncated ? raw.slice(0, MAX_CHARS) : raw;

  return { text, charCount: raw.length, truncated };
}

async function extractPdf(buffer: Buffer): Promise<string> {
  try {
    // pdf-parse bundles a test PDF that can cause issues on serverless.
    // Import the core module directly to avoid the test file.
    const pdfParse = (await import('pdf-parse')).default;
    const result = await pdfParse(buffer);
    return result.text || '';
  } catch (err) {
    console.error('[documents:extract] PDF extraction failed:', (err as Error).message);
    return '';
  }
}

async function extractDocx(buffer: Buffer): Promise<string> {
  try {
    const mammoth = await import('mammoth');
    const result = await mammoth.extractRawText({ buffer });
    return result.value || '';
  } catch (err) {
    console.error('[documents:extract] DOCX extraction failed:', (err as Error).message);
    return '';
  }
}
