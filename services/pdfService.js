const pdfParse = require('pdf-parse');

/**
 * Extract text content from a PDF buffer.
 * @param {Buffer} buffer - PDF file buffer
 * @returns {Promise<{ text: string, pages: number }>}
 */
async function extractText(buffer) {
  if (!Buffer.isBuffer(buffer) || buffer.length === 0) {
    throw new Error('Invalid or empty PDF buffer.');
  }

  const data = await pdfParse(buffer);
  return {
    text: data.text?.trim() ?? '',
    pages: data.numpages ?? 0,
  };
}

module.exports = { extractText };
