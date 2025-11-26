import { useState, useCallback, useEffect } from 'react';
import axios from 'axios';
import DropZone from './components/DropZone';
import PreviewForm from './components/PreviewForm';
import PreviewList from './components/PreviewList';
import './App.css';

/**
 * Main Application Component
 * Manages state for file uploads, form data, and preview history
 */
function App() {
  // State for uploaded file
  const [selectedFile, setSelectedFile] = useState(null);
  // State for form data
  const [formData, setFormData] = useState({
    creativeName: '',
    folderPath: '',
    description: '',
    clientName: '',
  });
  // State for generated previews
  const [previews, setPreviews] = useState([]);
  // Loading state for API calls
  const [isLoading, setIsLoading] = useState(false);
  // Error state
  const [error, setError] = useState(null);
  // Success message
  const [successMessage, setSuccessMessage] = useState('');

  // Fetch existing previews on component mount
  useEffect(() => {
    fetchPreviews();
  }, []);

  /**
   * Fetch list of generated previews from the backend
   */
  const fetchPreviews = async () => {
    try {
      const response = await axios.get('/api/previews');
      setPreviews(response.data.previews || []);
    } catch (err) {
      console.error('Failed to fetch previews:', err);
    }
  };

  /**
   * Handle file selection from DropZone
   */
  const handleFileSelect = useCallback((file) => {
    setSelectedFile(file);
    setError(null);
    setSuccessMessage('');
  }, []);

  /**
   * Handle form input changes
   */
  const handleFormChange = useCallback((field, value) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  }, []);

  /**
   * Handle form submission and generate preview
   */
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage('');

    // Validate required fields
    if (!selectedFile) {
      setError('Please select a ZIP file to upload');
      return;
    }
    if (!formData.creativeName.trim()) {
      setError('Creative name is required');
      return;
    }

    setIsLoading(true);

    try {
      // Step 1: Upload the ZIP file
      const uploadFormData = new FormData();
      uploadFormData.append('zipFile', selectedFile);

      const uploadResponse = await axios.post('/api/upload', uploadFormData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      // Step 2: Generate preview with form data
      const generateResponse = await axios.post('/api/generate-preview', {
        fileId: uploadResponse.data.fileId,
        creativeName: formData.creativeName,
        folderPath: formData.folderPath,
        description: formData.description,
        clientName: formData.clientName,
      });

      // Success - refresh previews and reset form
      setSuccessMessage(`Preview generated successfully! URL: ${generateResponse.data.previewUrl}`);
      setSelectedFile(null);
      setFormData({
        creativeName: '',
        folderPath: '',
        description: '',
        clientName: '',
      });
      fetchPreviews();
    } catch (err) {
      console.error('Failed to generate preview:', err);
      setError(err.response?.data?.error || 'Failed to generate preview. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="app">
      <header className="app-header">
        <h1 className="app-title">
          <span className="title-icon">🎨</span>
          Ad Preview Staging Tool
        </h1>
        <p className="app-subtitle">
          Drag & drop creative ZIP files to generate shareable preview links
        </p>
      </header>

      <main className="app-main">
        <div className="upload-section">
          {/* Error message display */}
          {error && (
            <div className="message error-message">
              <span className="message-icon">⚠️</span>
              {error}
            </div>
          )}

          {/* Success message display */}
          {successMessage && (
            <div className="message success-message">
              <span className="message-icon">✅</span>
              {successMessage}
            </div>
          )}

          {/* File drop zone */}
          <DropZone
            onFileSelect={handleFileSelect}
            selectedFile={selectedFile}
            disabled={isLoading}
          />

          {/* Preview form */}
          <PreviewForm
            formData={formData}
            onChange={handleFormChange}
            onSubmit={handleSubmit}
            isLoading={isLoading}
            hasFile={!!selectedFile}
          />
        </div>

        {/* Preview history */}
        <PreviewList previews={previews} onRefresh={fetchPreviews} />
      </main>

      <footer className="app-footer">
        <p>Ad Preview Staging Tool v1.0.0</p>
      </footer>
    </div>
  );
}

export default App;
