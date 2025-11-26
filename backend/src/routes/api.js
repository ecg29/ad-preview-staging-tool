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
  max: 50, // Limit each IP to 50 uploads per window (increased for batch)
  message: { error: 'Too many uploads, please try again later' },
  standardHeaders: true,
  legacyHeaders: false,
});

const generateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // Limit each IP to 20 preview generations per window
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
    fileSize: 50 * 1024 * 1024, // 50MB limit per file
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

// In-memory storage for previews and clients (in production, use a database)
const previews = [];
const clients = [
  { id: 'coca-cola', name: 'Coca-Cola', slug: 'coca-cola' },
  { id: 'verizon', name: 'Verizon', slug: 'verizon' },
  { id: 'google', name: 'Google', slug: 'google' },
  { id: 'meta', name: 'Meta', slug: 'meta' },
  { id: 'amazon', name: 'Amazon', slug: 'amazon' },
  { id: 'nike', name: 'Nike', slug: 'nike' },
  { id: 'apple', name: 'Apple', slug: 'apple' },
];
const campaigns = {};

/**
 * GET /api/clients
 * Get list of clients
 */
router.get('/clients', (req, res) => {
  res.json({
    success: true,
    clients,
  });
});

/**
 * POST /api/clients
 * Add a new client
 */
router.post('/clients', (req, res) => {
  const { name } = req.body;
  if (!name) {
    return res.status(400).json({ error: 'Client name is required' });
  }
  
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  const id = slug;
  
  // Check if client already exists
  if (clients.find(c => c.id === id)) {
    return res.status(400).json({ error: 'Client already exists' });
  }
  
  const client = { id, name, slug };
  clients.push(client);
  
  res.json({ success: true, client });
});

/**
 * GET /api/clients/:clientId/campaigns
 * Get campaigns for a client
 */
router.get('/clients/:clientId/campaigns', (req, res) => {
  const { clientId } = req.params;
  const clientCampaigns = campaigns[clientId] || [];
  
  res.json({
    success: true,
    campaigns: clientCampaigns,
  });
});

/**
 * POST /api/clients/:clientId/campaigns
 * Add a new campaign for a client
 */
router.post('/clients/:clientId/campaigns', (req, res) => {
  const { clientId } = req.params;
  const { name } = req.body;
  
  if (!name) {
    return res.status(400).json({ error: 'Campaign name is required' });
  }
  
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  const id = `${clientId}-${slug}`;
  
  if (!campaigns[clientId]) {
    campaigns[clientId] = [];
  }
  
  // Check if campaign already exists
  if (campaigns[clientId].find(c => c.slug === slug)) {
    return res.status(400).json({ error: 'Campaign already exists for this client' });
  }
  
  const campaign = { 
    id, 
    name, 
    slug,
    clientId,
    createdAt: new Date().toISOString(),
  };
  campaigns[clientId].push(campaign);
  
  res.json({ success: true, campaign });
});

/**
 * POST /api/upload
 * Handle single ZIP file upload
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
 * POST /api/upload-batch
 * Handle multiple ZIP file uploads (batch)
 */
router.post('/upload-batch', uploadLimiter, upload.array('zipFiles', 10), (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'No files uploaded' });
    }

    const uploadedFiles = req.files.map(file => ({
      fileId: path.basename(file.filename, '.zip'),
      filename: file.originalname,
      size: file.size,
    }));

    res.json({
      success: true,
      files: uploadedFiles,
      count: uploadedFiles.length,
    });
  } catch (error) {
    console.error('Batch upload error:', error);
    res.status(500).json({ error: 'Failed to upload files' });
  }
});

/**
 * POST /api/generate-preview
 * Process uploaded ZIP and deploy to GitHub Pages
 */
router.post('/generate-preview', generateLimiter, async (req, res) => {
  const { fileId, creativeName, folderPath, description, clientName, clientId, campaignId } = req.body;

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
    // Build folder path based on client/campaign structure
    let targetPath = folderPath;
    if (!targetPath && clientId && campaignId) {
      const client = clients.find(c => c.id === clientId);
      const campaign = campaigns[clientId]?.find(c => c.id === campaignId);
      if (client && campaign) {
        targetPath = `${client.slug}/${campaign.slug}/${creativeName.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
      }
    }
    if (!targetPath) {
      targetPath = creativeName.toLowerCase().replace(/\s+/g, '-');
    }

    // Step 1: Extract and process ZIP file
    console.log('📦 Processing ZIP file...');
    const extractedFiles = await zipProcessor.extractZip(zipPath);

    // Step 2: Generate preview templates
    console.log('📝 Generating templates...');
    const templates = await templateGenerator.generate({
      creativeName,
      folderPath: targetPath,
      description,
      clientName: clientName || clients.find(c => c.id === clientId)?.name || '',
      files: extractedFiles,
    });

    // Step 3: Deploy to GitHub
    console.log('🚀 Deploying to GitHub...');
    const deployResult = await githubService.deploy({
      creativeName,
      folderPath: targetPath,
      files: [...extractedFiles, ...templates],
    });

    // Create preview record
    const preview = {
      id: uuidv4(),
      creativeName,
      folderPath: targetPath,
      description,
      clientName: clientName || clients.find(c => c.id === clientId)?.name || '',
      clientId,
      campaignId,
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
 * POST /api/generate-batch
 * Process multiple ZIP files and deploy as a campaign
 */
router.post('/generate-batch', generateLimiter, async (req, res) => {
  const { files, campaignName, description, clientId, campaignId } = req.body;

  if (!files || !Array.isArray(files) || files.length === 0) {
    return res.status(400).json({ error: 'No files provided for batch processing' });
  }

  if (!clientId || !campaignId) {
    return res.status(400).json({ error: 'Client and Campaign are required for batch upload' });
  }

  const client = clients.find(c => c.id === clientId);
  const campaign = campaigns[clientId]?.find(c => c.id === campaignId);

  if (!client || !campaign) {
    return res.status(400).json({ error: 'Invalid client or campaign' });
  }

  const results = [];
  const errors = [];

  console.log(`📦 Starting batch processing of ${files.length} files...`);

  for (const file of files) {
    const { fileId, filename } = file;
    const zipPath = path.join(uploadDir, `${fileId}.zip`);

    if (!fs.existsSync(zipPath)) {
      errors.push({ fileId, filename, error: 'File not found' });
      continue;
    }

    try {
      // Extract creative name from filename (remove .zip extension)
      const creativeName = path.basename(filename, '.zip');
      const creativeSlug = creativeName.toLowerCase().replace(/[^a-z0-9]+/g, '-');
      const targetPath = `${client.slug}/${campaign.slug}/${creativeSlug}`;

      // Step 1: Extract ZIP
      console.log(`📦 Processing: ${filename}`);
      const extractedFiles = await zipProcessor.extractZip(zipPath);

      // Step 2: Generate templates
      const templates = await templateGenerator.generate({
        creativeName,
        folderPath: targetPath,
        description,
        clientName: client.name,
        files: extractedFiles,
      });

      // Step 3: Deploy to GitHub
      const deployResult = await githubService.deploy({
        creativeName,
        folderPath: targetPath,
        files: [...extractedFiles, ...templates],
      });

      // Create preview record
      const preview = {
        id: uuidv4(),
        creativeName,
        folderPath: targetPath,
        description,
        clientName: client.name,
        clientId,
        campaignId,
        url: deployResult.previewUrl,
        status: 'ready',
        createdAt: new Date().toISOString(),
      };

      previews.unshift(preview);
      results.push({
        fileId,
        filename,
        creativeName,
        previewUrl: deployResult.previewUrl,
        success: true,
      });

      // Clean up
      fs.unlinkSync(zipPath);
      console.log(`✅ Deployed: ${creativeName}`);

    } catch (error) {
      console.error(`❌ Failed to process ${filename}:`, error.message);
      errors.push({ fileId, filename, error: error.message });
    }
  }

  // Generate campaign index page
  const campaignUrl = `https://${process.env.GITHUB_OWNER}.github.io/${process.env.GITHUB_REPO}/${client.slug}/${campaign.slug}/`;
  
  // Create campaign index
  try {
    await generateCampaignIndex(client, campaign, results);
  } catch (err) {
    console.error('Failed to generate campaign index:', err);
  }

  res.json({
    success: true,
    campaignUrl,
    processed: results.length,
    failed: errors.length,
    results,
    errors: errors.length > 0 ? errors : undefined,
  });
});

/**
 * Parse creative name to extract size, locale, and base name
 */
function parseCreativeName(name) {
  // Match size pattern like 300x250, 728x90, etc.
  const sizeMatch = name.match(/(\d{2,4})x(\d{2,4})/i);
  const width = sizeMatch ? parseInt(sizeMatch[1]) : null;
  const height = sizeMatch ? parseInt(sizeMatch[2]) : null;
  
  // Match locale patterns like EN-US, DE-DE, UK-EN, FR, ES, etc.
  const localeMatch = name.match(/[_\-]([A-Z]{2}(?:[_\-][A-Z]{2})?)[_\-]/i) ||
                      name.match(/[_\-]([A-Z]{2}(?:[_\-][A-Z]{2})?)$/i);
  const locale = localeMatch ? localeMatch[1].toUpperCase() : 'Default';
  
  // Create base name by removing size and locale for grouping
  let baseName = name;
  if (sizeMatch) baseName = baseName.replace(sizeMatch[0], '');
  if (localeMatch) baseName = baseName.replace(new RegExp(`[_\\-]?${localeMatch[1]}`, 'i'), '');
  baseName = baseName.replace(/[_\-]+/g, '_').replace(/^[_\-]+|[_\-]+$/g, '') || 'Creative';
  
  return { width, height, locale, baseName, sizeStr: sizeMatch ? `${width}×${height}` : null };
}

/**
 * Group creatives by size for tabbed display
 */
function groupCreativesBySize(creatives) {
  const groups = {};
  
  creatives.forEach(c => {
    const parsed = parseCreativeName(c.creativeName);
    const sizeKey = parsed.sizeStr || 'Other';
    
    if (!groups[sizeKey]) {
      groups[sizeKey] = {
        size: sizeKey,
        width: parsed.width,
        height: parsed.height,
        creatives: []
      };
    }
    
    groups[sizeKey].creatives.push({
      ...c,
      locale: parsed.locale,
      baseName: parsed.baseName,
      slug: c.creativeName.toLowerCase().replace(/[^a-z0-9]+/g, '-')
    });
  });
  
  // Sort by size (larger first)
  return Object.values(groups).sort((a, b) => {
    if (!a.width) return 1;
    if (!b.width) return -1;
    return (b.width * b.height) - (a.width * a.height);
  });
}

/**
 * Generate campaign index page listing all creatives with inline previews and tabs
 */
async function generateCampaignIndex(client, campaign, creatives) {
  const sizeGroups = groupCreativesBySize(creatives);
  const locales = [...new Set(creatives.map(c => parseCreativeName(c.creativeName).locale))];
  
  const indexHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${campaign.name} - ${client.name}</title>
  <style>
    * { margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #111;
      min-height: 100vh;
      color: #888;
      padding: 20px;
    }
    
    /* Minimal Header */
    header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 30px;
      padding-bottom: 15px;
      border-bottom: 1px solid #222;
    }
    .header-left a { color: #555; text-decoration: none; font-size: 0.8rem; }
    .header-left a:hover { color: #888; }
    .header-center { text-align: center; flex: 1; }
    .header-center h1 { font-size: 1rem; font-weight: 400; color: #aaa; }
    .header-center span { font-size: 0.75rem; color: #555; }
    .header-right { font-size: 0.75rem; color: #444; }
    
    /* Locale Filter */
    .filters {
      display: flex;
      justify-content: center;
      gap: 6px;
      margin-bottom: 30px;
    }
    .filter-btn {
      padding: 5px 12px;
      background: transparent;
      border: 1px solid #333;
      color: #666;
      border-radius: 3px;
      cursor: pointer;
      font-size: 0.75rem;
    }
    .filter-btn:hover { border-color: #555; color: #999; }
    .filter-btn.active { border-color: #0af; color: #0af; }
    
    /* Size Section */
    .size-section { margin-bottom: 50px; }
    .size-label {
      font-size: 0.7rem;
      color: #444;
      text-transform: uppercase;
      letter-spacing: 1px;
      margin-bottom: 20px;
    }
    
    /* Creatives Grid - align to bottom for mixed heights */
    .creatives-grid {
      display: flex;
      flex-wrap: wrap;
      gap: 30px;
      align-items: flex-end;
    }
    
    /* Each creative wrapper */
    .creative {
      display: inline-flex;
      flex-direction: column;
      align-items: center;
    }
    .creative.hidden { display: none !important; }
    
    /* Info bar below - separate from iframe */
    .creative-info {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-top: 10px;
      gap: 8px;
    }
    .creative-info .locale {
      font-size: 0.65rem;
      color: #0af;
      text-transform: uppercase;
      flex-shrink: 0;
    }
    .creative-info .name {
      font-size: 0.6rem;
      color: #444;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      flex: 1;
      text-align: center;
    }
    .creative-info .actions {
      display: flex;
      gap: 4px;
      flex-shrink: 0;
    }
    .creative-info a, .creative-info button {
      font-size: 0.7rem;
      color: #555;
      text-decoration: none;
      background: none;
      border: none;
      cursor: pointer;
      padding: 2px 5px;
    }
    .creative-info a:hover, .creative-info button:hover { color: #0af; }
  </style>
</head>
<body>
  <header>
    <div class="header-left"><a href="../">← ${client.name}</a></div>
    <div class="header-center">
      <h1>${campaign.name}</h1>
      <span>${creatives.length} creatives</span>
    </div>
    <div class="header-right">${new Date().toLocaleDateString()}</div>
  </header>
  
  ${locales.length > 1 ? `
  <div class="filters">
    <button class="filter-btn active" data-filter="all">All</button>
    ${locales.map(locale => `<button class="filter-btn" data-filter="${locale}">${locale}</button>`).join('')}
  </div>
  ` : ''}
  
  ${sizeGroups.map(group => `
  <section class="size-section">
    <div class="size-label">${group.size}</div>
    <div class="creatives-grid">
      ${group.creatives.map(c => {
        const w = group.width || 300;
        const h = group.height || 250;
        return `
      <div class="creative" data-locale="${c.locale}">
        <iframe 
          src="${c.slug}/" 
          style="width:${w}px; height:${h}px; min-width:${w}px; min-height:${h}px; max-width:${w}px; max-height:${h}px; border:none; display:block; background:#fff;"
          scrolling="no" 
          loading="lazy"
        ></iframe>
        <div class="creative-info" style="width:${w}px;">
          <span class="locale">${c.locale}</span>
          <span class="name" title="${c.creativeName}">${c.creativeName}</span>
          <span class="actions">
            <a href="${c.slug}/" target="_blank" title="Open">↗</a>
            <button onclick="navigator.clipboard.writeText(location.href+'${c.slug}/');this.textContent='✓';setTimeout(()=>this.textContent='⎘',1000)" title="Copy link">⎘</button>
          </span>
        </div>
      </div>`;
      }).join('')}
    </div>
  </section>
  `).join('')}
  
  <script>
    document.querySelectorAll('.filter-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const f = btn.dataset.filter;
        document.querySelectorAll('.creative').forEach(c => {
          c.classList.toggle('hidden', f !== 'all' && c.dataset.locale !== f);
        });
      });
    });
  </script>
</body>
</html>`;

  // Deploy campaign index
  await githubService.deploy({
    creativeName: 'Campaign Index',
    folderPath: `${client.slug}/${campaign.slug}`,
    files: [{
      path: 'index.html',
      content: indexHtml,
      encoding: 'utf-8',
      type: 'html',
    }],
  });
}

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
