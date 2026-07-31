const fs = require("fs");
const pdfParse = require("pdf-parse");

async function extractText(filePath) {
  try {
    const dataBuffer = fs.readFileSync(filePath);

    const data = await pdfParse(dataBuffer);

    return data.text;
  } catch (error) {
    console.error("Error extracting PDF:", error);
    throw error;
  }
}

module.exports = { extractText };