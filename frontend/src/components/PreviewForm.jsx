import './PreviewForm.css';

/**
 * PreviewForm Component
 * Form for entering preview metadata and generating preview links
 * 
 * @param {Object} formData - Current form values
 * @param {Function} onChange - Callback for form field changes
 * @param {Function} onSubmit - Callback for form submission
 * @param {boolean} isLoading - Whether the form is in loading state
 * @param {boolean} hasFile - Whether a file has been selected
 */
function PreviewForm({ formData, onChange, onSubmit, isLoading = false, hasFile = false }) {
  /**
   * Handle input change
   */
  const handleChange = (e) => {
    const { name, value } = e.target;
    onChange(name, value);
  };

  return (
    <form className="preview-form" onSubmit={onSubmit}>
      <h2 className="form-title">Preview Details</h2>

      <div className="form-group">
        <label htmlFor="creativeName" className="form-label">
          Creative Name <span className="required">*</span>
        </label>
        <input
          type="text"
          id="creativeName"
          name="creativeName"
          value={formData.creativeName}
          onChange={handleChange}
          placeholder="e.g., Summer Campaign Banner"
          className="form-input"
          disabled={isLoading}
          required
        />
      </div>

      <div className="form-group">
        <label htmlFor="folderPath" className="form-label">
          Folder Path
        </label>
        <input
          type="text"
          id="folderPath"
          name="folderPath"
          value={formData.folderPath}
          onChange={handleChange}
          placeholder="e.g., campaigns/summer-2024"
          className="form-input"
          disabled={isLoading}
        />
        <p className="form-hint">
          Optional: Specify a custom folder structure for the preview
        </p>
      </div>

      <div className="form-group">
        <label htmlFor="description" className="form-label">
          Description
        </label>
        <textarea
          id="description"
          name="description"
          value={formData.description}
          onChange={handleChange}
          placeholder="Brief description of the creative..."
          className="form-input form-textarea"
          disabled={isLoading}
          rows={3}
        />
      </div>

      <div className="form-group">
        <label htmlFor="clientName" className="form-label">
          Client Name
        </label>
        <input
          type="text"
          id="clientName"
          name="clientName"
          value={formData.clientName}
          onChange={handleChange}
          placeholder="e.g., Acme Corp"
          className="form-input"
          disabled={isLoading}
        />
      </div>

      <button
        type="submit"
        className="submit-button"
        disabled={isLoading || !hasFile}
      >
        {isLoading ? (
          <>
            <span className="spinner"></span>
            Generating Preview...
          </>
        ) : (
          <>
            <span className="button-icon">🚀</span>
            Generate Preview
          </>
        )}
      </button>

      {!hasFile && (
        <p className="form-note">
          Please upload a ZIP file to generate a preview
        </p>
      )}
    </form>
  );
}

export default PreviewForm;
