/**
 * API Routes
 * Handles file upload, preview generation, and listing endpoints
 */

const express = require('express');
const multer = require('multer');
const rateLimit = require('express-rate-limit');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const zipProcessor = require('../services/zipProcessor');
const templateGenerator = require('../services/templateGenerator');
const githubService = require('../services/githubService');

const router = express.Router();

// Rate limiting for file upload and generation endpoints
const uploadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // Limit each IP to 20 uploads per window
  message: { error: 'Too many uploads, please try again later' },
  standardHeaders: true,
  legacyHeaders: false,
});

const generateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Limit each IP to 10 preview generations per window
  message: { error: 'Too many preview generations, please try again later' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Configure multer for file uploads
const uploadDir = path.join(__dirname, '../../uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueId = uuidv4();
    const ext = path.extname(file.originalname);
    cb(null, `${uniqueId}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit
  },
  fileFilter: (req, file, cb) => {
    // Only accept ZIP files
    if (file.mimetype === 'application/zip' || 
        file.mimetype === 'application/x-zip-compressed' ||
        path.extname(file.originalname).toLowerCase() === '.zip') {
      cb(null, true);
    } else {
      cb(new Error('Only ZIP files are allowed'), false);
    }
  },
});

// In-memory storage for previews (in production, use a database)
const previews = [];

/**
 * POST /api/upload
 * Handle ZIP file upload
 */
router.post('/upload', uploadLimiter, upload.single('zipFile'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    res.json({
      success: true,
      fileId: path.basename(req.file.filename, '.zip'),
      filename: req.file.originalname,
      size: req.file.size,
    });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: 'Failed to upload file' });
  }
});

/**
 * POST /api/generate-preview
 * Process uploaded ZIP and deploy to GitHub Pages
 */
router.post('/generate-preview', generateLimiter, async (req, res) => {
  const { fileId, creativeName, folderPath, description, clientName } = req.body;

  // Validate required fields
  if (!fileId || !creativeName) {
    return res.status(400).json({ 
      error: 'Missing required fields: fileId and creativeName are required' 
    });
  }

  const zipPath = path.join(uploadDir, `${fileId}.zip`);

  // Check if file exists
  if (!fs.existsSync(zipPath)) {
    return res.status(404).json({ error: 'Uploaded file not found' });
  }

  try {
    // Step 1: Extract and process ZIP file
    console.log('📦 Processing ZIP file...');
    const extractedFiles = await zipProcessor.extractZip(zipPath);

    // Step 2: Generate preview templates
    console.log('📝 Generating templates...');
    const templates = await templateGenerator.generate({
      creativeName,
      folderPath,
      description,
      clientName,
      files: extractedFiles,
    });

    // Step 3: Deploy to GitHub
    console.log('🚀 Deploying to GitHub...');
    const deployResult = await githubService.deploy({
      creativeName,
      folderPath: folderPath || creativeName.toLowerCase().replace(/\s+/g, '-'),
      files: [...extractedFiles, ...templates],
    });

    // Create preview record
    const preview = {
      id: uuidv4(),
      creativeName,
      folderPath,
      description,
      clientName,
      url: deployResult.previewUrl,
      status: 'ready',
      createdAt: new Date().toISOString(),
    };

    // Store preview (in-memory for MVP)
    previews.unshift(preview);

    // Clean up uploaded file
    fs.unlinkSync(zipPath);

    res.json({
      success: true,
      previewUrl: deployResult.previewUrl,
      preview,
    });
  } catch (error) {
    console.error('Generate preview error:', error);
    res.status(500).json({ 
      error: error.message || 'Failed to generate preview' 
    });
  }
});

/**
 * GET /api/previews
 * List all generated previews
 */
router.get('/previews', (req, res) => {
  res.json({
    success: true,
    previews,
    count: previews.length,
  });
});

module.exports = router;
