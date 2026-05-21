import pdfParse from 'pdf-parse'
import { logger } from '../config/logger'

export async function extractTextFromFile(buffer: Buffer, filename: string): Promise<string> {
  const ext = filename.toLowerCase().split('.').pop()

  if (ext === 'pdf') {
    return extractFromPDF(buffer)
  } else if (ext === 'doc' || ext === 'docx') {
    return extractFromDoc(buffer)
  }

  throw new Error(`Unsupported file type: ${ext}`)
}

async function extractFromPDF(buffer: Buffer): Promise<string> {
  try {
    const data = await pdfParse(buffer, {
      max: 50, // max pages
    })
    const text = data.text
      .replace(/\s+/g, ' ')
      .replace(/\n{3,}/g, '\n\n')
      .trim()

    logger.info(`PDF extracted: ${data.numpages} pages, ${text.length} chars`)
    return text
  } catch (err) {
    logger.error('PDF extraction failed:', err)
    throw new Error('Failed to extract text from PDF')
  }
}

async function extractFromDoc(buffer: Buffer): Promise<string> {
  // For .docx files, use mammoth (add to package.json if needed)
  // For now basic extraction
  try {
    // Try to extract readable text from docx (which is a zip file)
    const text = buffer.toString('utf8', 0, Math.min(buffer.length, 500000))
    // Extract XML content between tags
    const matches = text.match(/<w:t[^>]*>([^<]+)<\/w:t>/g) || []
    const extracted = matches
      .map(m => m.replace(/<[^>]+>/g, ''))
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim()

    if (extracted.length < 100) {
      throw new Error('Could not extract sufficient text from document')
    }
    return extracted
  } catch (err) {
    logger.error('DOC extraction failed:', err)
    throw new Error('Failed to extract text from Word document. Please convert to PDF.')
  }
}
