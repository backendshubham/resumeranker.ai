const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const pdf = require('pdf-parse');
const mammoth = require('mammoth');

/**
 * Extract text from a PDF or Word file and convert it to JSON format.
 * @param {Buffer} buffer - Buffer containing the file data.
 * @param {string} fileType - Type of the file ('pdf' or 'docx').
 * @returns {Promise<Object>} - A promise that resolves to an object containing the file text.
 */
async function fileToJson(buffer, fileType) {
  try {
    if (fileType === 'application/pdf') {
      // Parse PDF file
      const data = await pdf(buffer);
      return {
        text: data.text,
        numPages: data.numpages,
        numRenderedPages: data.numrender,
        info: data.info,
        metadata: data.metadata,
        version: data.version,
      };
    } else {
      // Parse DOCX file
      const result = await mammoth.extractRawText({ buffer });
      return {
        text: result.value,
      };
    
    }
  } catch (error) {
    console.error('Error extracting file content:', error);
    throw error;
  }
}


/**
 * Generate a unique filename using a timestamp and random string.
 * @param {string} originalName - The original file name.
 * @returns {string} - The unique file name.
 */
function generateUniqueFilename(originalName) {
  const ext = path.extname(originalName); // Get the file extension
  const baseName = path.basename(originalName, ext); // Get the base name without extension
  const uniqueSuffix = crypto.randomBytes(8).toString('hex'); // Generate a unique suffix
  return `${baseName}-${Date.now()}-${uniqueSuffix}${ext}`;
}

/**
 * Middleware to handle file uploads with unique filenames.
 * @param {string} uploadDir - Directory to save uploaded files.
 * @returns {Function} Express middleware function.
 */
function fileUploadMiddleware(uploadDir) {
  return (req, res, next) => {
    if (!req.files || !req.files.file) {
      return res.status(400).send('No files were uploaded.');
    }

    const file = req.files.file;
    const uniqueFilename = generateUniqueFilename(file.name);
    const uploadPath = path.join(uploadDir, uniqueFilename);

    // Ensure the upload directory exists
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    file.mv(uploadPath, (err) => {
      if (err) {
        return res.status(500).send(err);
      }
      res.send(`File uploaded successfully as ${uniqueFilename}!`);
    });
  };
}

// Export the fileUploadMiddleware function
module.exports = { fileUploadMiddleware, fileToJson };
