# Ad Preview Staging Tool

A tool for generating shareable creative ad preview links via drag & drop. Upload ZIP files containing creative assets, fill in metadata, and automatically deploy to GitHub Pages for instant preview sharing.

## Features

- 🎨 **Drag & Drop Interface** - Easy ZIP file upload with visual feedback
- 📝 **Metadata Form** - Add creative name, description, client info
- 🚀 **Auto Deploy** - Automatic GitHub Pages deployment
- 🔗 **Shareable Links** - Instant preview URLs for team sharing
- 📋 **Preview History** - Track all generated previews
- 🌙 **Modern Dark UI** - Clean, responsive design

## Project Structure

```
ad-preview-staging-tool/
├── frontend/                 # React + Vite frontend
│   ├── src/
│   │   ├── components/       # React components
│   │   │   ├── DropZone.jsx  # File upload component
│   │   │   ├── PreviewForm.jsx # Metadata form
│   │   │   └── PreviewList.jsx # Preview history
│   │   ├── App.jsx           # Main application
│   │   └── index.jsx         # Entry point
│   ├── index.html
│   ├── package.json
│   └── vite.config.js
├── backend/                  # Node.js + Express backend
│   ├── src/
│   │   ├── routes/
│   │   │   └── api.js        # API endpoints
│   │   ├── services/
│   │   │   ├── zipProcessor.js      # ZIP extraction
│   │   │   ├── templateGenerator.js # HTML/JS generation
│   │   │   └── githubService.js     # GitHub API
│   │   └── server.js         # Express server
│   ├── package.json
│   └── .env.example
├── templates/                # Preview templates
│   ├── index.html
│   └── data.js
├── .gitignore
└── README.md
```

## Prerequisites

- Node.js 18+ 
- npm or yarn
- GitHub Personal Access Token with `repo` permissions

## Setup

### 1. Clone the Repository

```bash
git clone https://github.com/your-username/ad-preview-staging-tool.git
cd ad-preview-staging-tool
```

### 2. Configure Backend

```bash
cd backend
cp .env.example .env
```

Edit `.env` and add your GitHub credentials:

```env
GITHUB_TOKEN=your_github_personal_access_token
GITHUB_OWNER=your_github_username
GITHUB_REPO=ad-preview-hosting
PORT=4000
```

> **Note:** Create a separate repository for hosting previews (e.g., `ad-preview-hosting`) and enable GitHub Pages on the `gh-pages` branch.

### 3. Install Dependencies

```bash
# Backend
cd backend
npm install

# Frontend
cd ../frontend
npm install
```

### 4. Run the Application

In two separate terminals:

```bash
# Terminal 1 - Backend
cd backend
npm run dev

# Terminal 2 - Frontend
cd frontend
npm run dev
```

The frontend will be available at `http://localhost:3000` and the backend at `http://localhost:4000`.

## API Endpoints

### Upload ZIP File
```
POST /api/upload
Content-Type: multipart/form-data

Body: zipFile (file)

Response:
{
  "success": true,
  "fileId": "uuid",
  "filename": "creative.zip",
  "size": 12345
}
```

### Generate Preview
```
POST /api/generate-preview
Content-Type: application/json

Body:
{
  "fileId": "uuid",
  "creativeName": "Summer Campaign",
  "folderPath": "campaigns/summer-2024",
  "description": "Banner ads for summer sale",
  "clientName": "Acme Corp"
}

Response:
{
  "success": true,
  "previewUrl": "https://username.github.io/repo/path/",
  "preview": { ... }
}
```

### List Previews
```
GET /api/previews

Response:
{
  "success": true,
  "previews": [ ... ],
  "count": 5
}
```

## Development

### Frontend Scripts

```bash
npm run dev      # Start development server
npm run build    # Build for production
npm run preview  # Preview production build
```

### Backend Scripts

```bash
npm run start    # Start server
npm run dev      # Start with auto-reload
```

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `GITHUB_TOKEN` | GitHub Personal Access Token | Yes |
| `GITHUB_OWNER` | GitHub username or org | Yes |
| `GITHUB_REPO` | Repository for previews | Yes |
| `PORT` | Backend server port | No (default: 4000) |
| `CUSTOM_DOMAIN` | Custom domain for previews | No |

## How It Works

1. **Upload**: User uploads a ZIP file containing creative assets
2. **Extract**: Backend extracts and validates ZIP contents
3. **Generate**: Templates are generated with creative metadata
4. **Deploy**: Files are pushed to GitHub Pages via the API
5. **Share**: Preview URL is returned for sharing

## Supported File Types

- **Images**: PNG, JPG, JPEG, GIF, WebP, SVG, ICO
- **Web**: HTML, CSS, JavaScript
- **Fonts**: WOFF, WOFF2, TTF, EOT, OTF
- **Data**: JSON, XML
- **Media**: MP4, WebM, MP3, WAV, OGG

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

MIT License - see LICENSE file for details.

## Troubleshooting

### "GITHUB_TOKEN not set" Error
Ensure your `.env` file exists in the `backend` directory and contains a valid token.

### GitHub Pages Not Updating
- Check that GitHub Pages is enabled on the `gh-pages` branch
- Wait 1-2 minutes for deployment to complete
- Clear browser cache if viewing an old version

### File Upload Fails
- Ensure the file is a valid ZIP
- Check file size is under 50MB
- Verify CORS is configured correctly