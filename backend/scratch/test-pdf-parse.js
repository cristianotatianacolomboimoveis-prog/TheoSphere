const pdfParse = require('pdf-parse');
console.log('pdfParse type:', typeof pdfParse);
console.log('pdfParse keys:', Object.keys(pdfParse));
try {
  const parser = new pdfParse.PDFParse(new Uint8Array(0));
  console.log('Successfully created PDFParse instance');
} catch (e) {
  console.log('Failed to create PDFParse instance:', e.message);
}
