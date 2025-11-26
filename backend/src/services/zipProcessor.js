/**
 * ZIP Processor Service
 * Handles extraction and parsing of uploaded ZIP files
 */

const AdmZip = require('adm-zip');
const path = require('path');

/**
 * Extract contents from a ZIP file
 * @param {string} zipPath - Path to the ZIP file
 * @returns {Promise<Array>} Array of file objects with path and content
 */
async function extractZip(zipPath) {
  const zip = new AdmZip(zipPath);
  const entries = zip.getEntries();
  const files = [];

  // Binary file extensions
  const binaryExtensions = [
    '.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg', '.ico',
    '.mp4', '.webm', '.mp3', '.wav', '.ogg',
    '.woff', '.woff2', '.ttf', '.eot', '.otf',
    '.pdf', '.zip', '.exe', '.bin'
  ];

  for (const entry of entries) {
    // Skip directories
    if (entry.isDirectory) continue;

    const fileName = entry.entryName;
    const ext = path.extname(fileName).toLowerCase();

    // Skip hidden files and system files
    if (path.basename(fileName).startsWith('.')) continue;
    if (fileName.includes('__MACOSX')) continue;

    // Determine if file is binary
    const isBinary = binaryExtensions.includes(ext);

    if (isBinary) {
      // Get file as base64 for binary files
      const buffer = entry.getData();
      files.push({
        path: normalizeFilePath(fileName),
        content: buffer.toString('base64'),
        encoding: 'base64',
        type: getFileType(ext),
      });
    } else {
      // Get file as text
      const content = zip.readAsText(entry);
      files.push({
        path: normalizeFilePath(fileName),
        content,
        encoding: 'utf-8',
        type: getFileType(ext),
      });
    }
  }

  // Validate folder structure
  validateStructure(files);

  return files;
}

/**
 * Normalize file path (remove leading slashes, handle nested folders)
 * @param {string} filePath - Original file path
 * @returns {string} Normalized file path
 */
function normalizeFilePath(filePath) {
  // Remove leading slashes and normalize separators
  let normalized = filePath.replace(/^[\/\\]+/, '').replace(/\\/g, '/');
  
  // If files are in a single root folder, we may keep or remove it based on structure
  return normalized;
}

/**
 * Get file type based on extension
 * @param {string} ext - File extension
 * @returns {string} File type category
 */
function getFileType(ext) {
  const types = {
    // HTML
    '.html': 'html',
    '.htm': 'html',
    // CSS
    '.css': 'css',
    // JavaScript
    '.js': 'javascript',
    '.mjs': 'javascript',
    // Images
    '.png': 'image',
    '.jpg': 'image',
    '.jpeg': 'image',
    '.gif': 'image',
    '.webp': 'image',
    '.svg': 'image',
    '.ico': 'image',
    // Fonts
    '.woff': 'font',
    '.woff2': 'font',
    '.ttf': 'font',
    '.eot': 'font',
    '.otf': 'font',
    // Data
    '.json': 'json',
    '.xml': 'xml',
    // Video
    '.mp4': 'video',
    '.webm': 'video',
    // Audio
    '.mp3': 'audio',
    '.wav': 'audio',
    '.ogg': 'audio',
  };

  return types[ext] || 'other';
}

/**
 * Validate the folder structure of extracted files
 * @param {Array} files - Array of extracted files
 * @throws {Error} If validation fails
 */
function validateStructure(files) {
  if (files.length === 0) {
    throw new Error('ZIP file is empty or contains no valid files');
  }

  // Log extracted files for debugging
  console.log(`📂 Extracted ${files.length} files:`);
  files.slice(0, 10).forEach(f => console.log(`   - ${f.path}`));
  if (files.length > 10) {
    console.log(`   ... and ${files.length - 10} more`);
  }
}

/**
 * Get images from extracted files
 * @param {Array} files - Array of extracted files
 * @returns {Array} Array of image file objects
 */
function getImages(files) {
  return files.filter(f => f.type === 'image');
}

/**
 * Get HTML files from extracted files
 * @param {Array} files - Array of extracted files
 * @returns {Array} Array of HTML file objects
 */
function getHtmlFiles(files) {
  return files.filter(f => f.type === 'html');
}

module.exports = {
  extractZip,
  getImages,
  getHtmlFiles,
  normalizeFilePath,
  getFileType,
};
