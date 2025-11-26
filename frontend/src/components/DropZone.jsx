import { useCallback, useState } from 'react';
import './DropZone.css';

/**
 * DropZone Component
 * Handles drag and drop for ZIP file uploads with visual feedback
 * 
 * @param {Function} onFileSelect - Callback when a file is selected
 * @param {File} selectedFile - Currently selected file
 * @param {boolean} disabled - Whether the dropzone is disabled
 */
function DropZone({ onFileSelect, selectedFile, disabled = false }) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [validationError, setValidationError] = useState('');

  /**
   * Validate that the file is a ZIP file
   */
  const validateFile = (file) => {
    if (!file) return false;
    
    const validTypes = ['application/zip', 'application/x-zip-compressed'];
    const isZip = validTypes.includes(file.type) || file.name.endsWith('.zip');
    
    if (!isZip) {
      setValidationError('Please upload a ZIP file only');
      return false;
    }
    
    setValidationError('');
    return true;
  };

  /**
   * Handle drag enter event
   */
  const handleDragEnter = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled) {
      setIsDragOver(true);
    }
  }, [disabled]);

  /**
   * Handle drag leave event
   */
  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  }, []);

  /**
   * Handle drag over event
   */
  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled) {
      setIsDragOver(true);
    }
  }, [disabled]);

  /**
   * Handle file drop event
   */
  const handleDrop = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    if (disabled) return;

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      const file = files[0];
      if (validateFile(file)) {
        onFileSelect(file);
      }
    }
  }, [disabled, onFileSelect]);

  /**
   * Handle file input change (click to upload)
   */
  const handleFileInputChange = (e) => {
    const file = e.target.files?.[0];
    if (file && validateFile(file)) {
      onFileSelect(file);
    }
    // Reset input so same file can be selected again
    e.target.value = '';
  };

  /**
   * Remove the selected file
   */
  const handleRemoveFile = () => {
    onFileSelect(null);
    setValidationError('');
  };

  /**
   * Format file size for display
   */
  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="dropzone-container">
      <div
        className={`dropzone ${isDragOver ? 'dropzone-active' : ''} ${disabled ? 'dropzone-disabled' : ''} ${selectedFile ? 'dropzone-has-file' : ''}`}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        {selectedFile ? (
          <div className="dropzone-file-info">
            <div className="file-icon">📦</div>
            <div className="file-details">
              <span className="file-name">{selectedFile.name}</span>
              <span className="file-size">{formatFileSize(selectedFile.size)}</span>
            </div>
            <button
              type="button"
              className="remove-file-btn"
              onClick={handleRemoveFile}
              disabled={disabled}
              aria-label="Remove file"
            >
              ✕
            </button>
          </div>
        ) : (
          <>
            <div className="dropzone-icon">📁</div>
            <p className="dropzone-text">
              Drag & drop your ZIP file here
            </p>
            <p className="dropzone-subtext">or</p>
            <label className="dropzone-button">
              <input
                type="file"
                accept=".zip,application/zip,application/x-zip-compressed"
                onChange={handleFileInputChange}
                disabled={disabled}
                className="file-input-hidden"
              />
              Browse Files
            </label>
          </>
        )}
      </div>

      {validationError && (
        <p className="dropzone-error">{validationError}</p>
      )}
    </div>
  );
}

export default DropZone;
