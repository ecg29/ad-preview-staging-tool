import { useState } from 'react';
import './PreviewList.css';

/**
 * PreviewList Component
 * Displays history of generated previews with copy link functionality
 * 
 * @param {Array} previews - List of generated preview objects
 * @param {Function} onRefresh - Callback to refresh the preview list
 */
function PreviewList({ previews = [], onRefresh }) {
  const [copiedId, setCopiedId] = useState(null);

  /**
   * Copy preview URL to clipboard
   */
  const handleCopyLink = async (url, id) => {
    try {
      await navigator.clipboard.writeText(url);
      setCopiedId(id);
      // Reset copied state after 2 seconds
      setTimeout(() => setCopiedId(null), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  /**
   * Format date for display
   */
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  /**
   * Get status badge styling
   */
  const getStatusClass = (status) => {
    switch (status) {
      case 'ready':
        return 'status-ready';
      case 'processing':
        return 'status-processing';
      case 'failed':
        return 'status-failed';
      default:
        return 'status-pending';
    }
  };

  if (previews.length === 0) {
    return (
      <div className="preview-list-container">
        <div className="preview-list-header">
          <h2 className="preview-list-title">📋 Recent Previews</h2>
          <button className="refresh-button" onClick={onRefresh}>
            🔄 Refresh
          </button>
        </div>
        <div className="preview-list-empty">
          <span className="empty-icon">📭</span>
          <p>No previews generated yet</p>
          <p className="empty-hint">Upload a ZIP file and fill in the form to create your first preview</p>
        </div>
      </div>
    );
  }

  return (
    <div className="preview-list-container">
      <div className="preview-list-header">
        <h2 className="preview-list-title">📋 Recent Previews</h2>
        <button className="refresh-button" onClick={onRefresh}>
          🔄 Refresh
        </button>
      </div>

      <div className="preview-list">
        {previews.map((preview) => (
          <div key={preview.id} className="preview-card">
            <div className="preview-card-header">
              <h3 className="preview-name">{preview.creativeName}</h3>
              <span className={`status-badge ${getStatusClass(preview.status)}`}>
                {preview.status}
              </span>
            </div>

            {preview.clientName && (
              <p className="preview-client">
                <span className="label">Client:</span> {preview.clientName}
              </p>
            )}

            {preview.description && (
              <p className="preview-description">{preview.description}</p>
            )}

            <p className="preview-date">
              Created: {formatDate(preview.createdAt)}
            </p>

            {preview.url && (
              <div className="preview-actions">
                <a
                  href={preview.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="preview-link"
                >
                  🔗 Open Preview
                </a>
                <button
                  className={`copy-button ${copiedId === preview.id ? 'copied' : ''}`}
                  onClick={() => handleCopyLink(preview.url, preview.id)}
                >
                  {copiedId === preview.id ? '✓ Copied!' : '📋 Copy Link'}
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export default PreviewList;
