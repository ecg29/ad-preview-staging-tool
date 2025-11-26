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
  // State for uploaded file(s)
  const [selectedFile, setSelectedFile] = useState(null);
  // State for batch mode
  const [isBatchMode, setIsBatchMode] = useState(false);
  // State for form data
  const [formData, setFormData] = useState({
    creativeName: '',
    folderPath: '',
    description: '',
    clientId: '',
    campaignId: '',
  });
  // State for generated previews
  const [previews, setPreviews] = useState([]);
  // Loading state for API calls
  const [isLoading, setIsLoading] = useState(false);
  // Error state
  const [error, setError] = useState(null);
  // Success message
  const [successMessage, setSuccessMessage] = useState('');
  // Batch results
  const [batchResults, setBatchResults] = useState(null);

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
    setBatchResults(null);
  }, []);

  /**
   * Handle batch mode change
   */
  const handleModeChange = useCallback((isBatch) => {
    setIsBatchMode(isBatch);
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
   * Handle single file upload
   */
  const handleSingleUpload = async () => {
    // Step 1: Upload the ZIP file
    const uploadFormData = new FormData();
    uploadFormData.append('zipFile', selectedFile);

    const uploadResponse = await axios.post('/api/upload', uploadFormData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });

    // Step 2: Generate preview with form data
    const generateResponse = await axios.post('/api/generate-preview', {
      fileId: uploadResponse.data.fileId,
      creativeName: formData.creativeName,
      description: formData.description,
      clientId: formData.clientId,
      campaignId: formData.campaignId,
    });

    return generateResponse.data;
  };

  /**
   * Handle batch upload
   */
  const handleBatchUpload = async (files) => {
    // Step 1: Upload all ZIP files
    const uploadFormData = new FormData();
    files.forEach(file => {
      uploadFormData.append('zipFiles', file);
    });

    const uploadResponse = await axios.post('/api/upload-batch', uploadFormData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });

    // Step 2: Generate batch previews
    const generateResponse = await axios.post('/api/generate-batch', {
      files: uploadResponse.data.files,
      campaignName: formData.campaignId,
      description: formData.description,
      clientId: formData.clientId,
      campaignId: formData.campaignId,
    });

    return generateResponse.data;
  };

  /**
   * Handle form submission and generate preview
   */
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage('');
    setBatchResults(null);

    // Validate
    if (!selectedFile) {
      setError('Please select a ZIP file to upload');
      return;
    }
    if (!formData.clientId || !formData.campaignId) {
      setError('Please select a client and campaign');
      return;
    }
    if (!isBatchMode && !formData.creativeName.trim()) {
      setError('Creative name is required');
      return;
    }

    setIsLoading(true);

    try {
      if (isBatchMode && Array.isArray(selectedFile)) {
        // Batch upload
        const result = await handleBatchUpload(selectedFile);
        setBatchResults(result);
        setSuccessMessage(
          `Batch upload complete! ${result.processed} of ${result.processed + result.failed} creatives deployed.`
        );
      } else {
        // Single upload
        const result = await handleSingleUpload();
        setSuccessMessage(`Preview generated successfully! URL: ${result.previewUrl}`);
      }

      // Reset form
      setSelectedFile(null);
      setIsBatchMode(false);
      setFormData({
        creativeName: '',
        folderPath: '',
        description: '',
        clientId: formData.clientId, // Keep client selected
        campaignId: formData.campaignId, // Keep campaign selected
      });
      fetchPreviews();
    } catch (err) {
      console.error('Failed to generate preview:', err);
      setError(err.response?.data?.error || 'Failed to generate preview. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Calculate file count for batch mode
  const fileCount = Array.isArray(selectedFile) ? selectedFile.length : (selectedFile ? 1 : 0);

  return (
    <div className="app">
      <header className="app-header">
        <h1 className="app-title">
          <span className="title-icon">🎨</span>
          Ad Preview Staging Tool
        </h1>
        <p className="app-subtitle">
          Upload creative ZIP files to generate shareable preview links • Supports batch upload
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

          {/* Batch results */}
          {batchResults && batchResults.results && (
            <div className="batch-results">
              <h3>📦 Batch Upload Results</h3>
              <p className="campaign-url">
                Campaign Gallery: <a href={batchResults.campaignUrl} target="_blank" rel="noopener noreferrer">
                  {batchResults.campaignUrl}
                </a>
              </p>
              <div className="results-list">
                {batchResults.results.map((result, index) => (
                  <div key={index} className="result-item success">
                    <span className="result-name">{result.creativeName}</span>
                    <a href={result.previewUrl} target="_blank" rel="noopener noreferrer">
                      View ↗
                    </a>
                  </div>
                ))}
                {batchResults.errors?.map((err, index) => (
                  <div key={`err-${index}`} className="result-item error">
                    <span className="result-name">{err.filename}</span>
                    <span className="result-error">{err.error}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* File drop zone */}
          <DropZone
            onFileSelect={handleFileSelect}
            selectedFile={selectedFile}
            disabled={isLoading}
            multiple={true}
            onModeChange={handleModeChange}
          />

          {/* Preview form */}
          <PreviewForm
            formData={formData}
            onChange={handleFormChange}
            onSubmit={handleSubmit}
            isLoading={isLoading}
            hasFile={!!selectedFile}
            fileCount={fileCount}
            isBatchMode={isBatchMode}
          />
        </div>

        {/* Preview history */}
        <PreviewList previews={previews} onRefresh={fetchPreviews} />
      </main>

      <footer className="app-footer">
        <p>Ad Preview Staging Tool v2.0.0 • Client/Campaign Organization • Batch Upload</p>
      </footer>
    </div>
  );
}

export default App;
