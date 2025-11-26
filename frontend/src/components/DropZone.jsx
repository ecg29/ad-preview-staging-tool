import { useCallback, useState } from 'react';
import './DropZone.css';

/**
 * DropZone Component
 * Handles drag and drop for ZIP file uploads with batch support
 * 
 * @param {Function} onFileSelect - Callback when file(s) are selected
 * @param {File|File[]} selectedFile - Currently selected file(s)
 * @param {boolean} disabled - Whether the dropzone is disabled
 * @param {boolean} multiple - Whether to allow multiple file selection
 * @param {Function} onModeChange - Callback when batch mode changes
 */
function DropZone({ onFileSelect, selectedFile, disabled = false, multiple = true, onModeChange }) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [validationError, setValidationError] = useState('');

  // Determine if we're in batch mode (array of files)
  const isBatchMode = Array.isArray(selectedFile) && selectedFile.length > 1;
  const files = Array.isArray(selectedFile) ? selectedFile : (selectedFile ? [selectedFile] : []);

  /**
   * Validate that files are ZIP files
   */
  const validateFiles = (fileList) => {
    const validTypes = ['application/zip', 'application/x-zip-compressed'];
    const validFiles = [];
    
    for (const file of fileList) {
      const isZip = validTypes.includes(file.type) || file.name.endsWith('.zip');
      if (isZip) {
        validFiles.push(file);
      }
    }
    
    if (validFiles.length === 0) {
      setValidationError('Please upload ZIP files only');
      return null;
    }
    
    if (validFiles.length < fileList.length) {
      setValidationError(`${fileList.length - validFiles.length} non-ZIP file(s) ignored`);
    } else {
      setValidationError('');
    }
    
    return validFiles;
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

    const droppedFiles = Array.from(e.dataTransfer.files);
    if (droppedFiles.length > 0) {
      const validFiles = validateFiles(droppedFiles);
      if (validFiles) {
        if (validFiles.length === 1) {
          onFileSelect(validFiles[0]);
          onModeChange?.(false);
        } else {
          onFileSelect(validFiles);
          onModeChange?.(true);
        }
      }
    }
  }, [disabled, onFileSelect, onModeChange]);

  /**
   * Handle file input change (click to upload)
   */
  const handleFileInputChange = (e) => {
    const selectedFiles = Array.from(e.target.files || []);
    if (selectedFiles.length > 0) {
      const validFiles = validateFiles(selectedFiles);
      if (validFiles) {
        if (validFiles.length === 1) {
          onFileSelect(validFiles[0]);
          onModeChange?.(false);
        } else {
          onFileSelect(validFiles);
          onModeChange?.(true);
        }
      }
    }
    // Reset input so same file can be selected again
    e.target.value = '';
  };

  /**
   * Remove all selected files
   */
  const handleRemoveFiles = () => {
    onFileSelect(null);
    onModeChange?.(false);
    setValidationError('');
  };

  /**
   * Remove a specific file from batch
   */
  const handleRemoveFile = (index) => {
    if (Array.isArray(selectedFile)) {
      const newFiles = selectedFile.filter((_, i) => i !== index);
      if (newFiles.length === 0) {
        onFileSelect(null);
        onModeChange?.(false);
      } else if (newFiles.length === 1) {
        onFileSelect(newFiles[0]);
        onModeChange?.(false);
      } else {
        onFileSelect(newFiles);
      }
    } else {
      onFileSelect(null);
      onModeChange?.(false);
    }
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

  /**
   * Get total size of all files
   */
  const getTotalSize = () => {
    return files.reduce((acc, file) => acc + file.size, 0);
  };

  return (
    <div className="dropzone-container">
      <div
        className={`dropzone ${isDragOver ? 'dropzone-active' : ''} ${disabled ? 'dropzone-disabled' : ''} ${files.length > 0 ? 'dropzone-has-file' : ''}`}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        {files.length > 0 ? (
          <div className="dropzone-files">
            {isBatchMode ? (
              <>
                <div className="batch-header">
                  <span className="batch-icon">📦</span>
                  <div className="batch-summary">
                    <span className="batch-count">{files.length} ZIP files</span>
                    <span className="batch-size">Total: {formatFileSize(getTotalSize())}</span>
                  </div>
                  <button
                    type="button"
                    className="remove-all-btn"
                    onClick={handleRemoveFiles}
                    disabled={disabled}
                  >
                    Clear All
                  </button>
                </div>
                <div className="file-list">
                  {files.map((file, index) => (
                    <div key={index} className="file-list-item">
                      <span className="file-list-name">{file.name}</span>
                      <span className="file-list-size">{formatFileSize(file.size)}</span>
                      <button
                        type="button"
                        className="remove-file-btn-small"
                        onClick={() => handleRemoveFile(index)}
                        disabled={disabled}
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="dropzone-file-info">
                <div className="file-icon">📦</div>
                <div className="file-details">
                  <span className="file-name">{files[0].name}</span>
                  <span className="file-size">{formatFileSize(files[0].size)}</span>
                </div>
                <button
                  type="button"
                  className="remove-file-btn"
                  onClick={() => handleRemoveFile(0)}
                  disabled={disabled}
                  aria-label="Remove file"
                >
                  ✕
                </button>
              </div>
            )}
          </div>
        ) : (
          <>
            <div className="dropzone-icon">📁</div>
            <p className="dropzone-text">
              Drag & drop your ZIP file(s) here
            </p>
            <p className="dropzone-subtext">
              Drop multiple files for batch upload
            </p>
            <label className="dropzone-button">
              <input
                type="file"
                accept=".zip,application/zip,application/x-zip-compressed"
                onChange={handleFileInputChange}
                disabled={disabled}
                multiple={multiple}
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
