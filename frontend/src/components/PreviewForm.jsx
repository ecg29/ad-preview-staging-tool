import { useState, useEffect } from 'react';
import axios from 'axios';
import './PreviewForm.css';

/**
 * PreviewForm Component
 * Form for entering preview metadata with client/campaign selection
 */
function PreviewForm({ 
  formData, 
  onChange, 
  onSubmit, 
  isLoading = false, 
  hasFile = false,
  fileCount = 0,
  isBatchMode = false,
}) {
  const [clients, setClients] = useState([]);
  const [campaigns, setCampaigns] = useState([]);
  const [showNewClient, setShowNewClient] = useState(false);
  const [showNewCampaign, setShowNewCampaign] = useState(false);
  const [newClientName, setNewClientName] = useState('');
  const [newCampaignName, setNewCampaignName] = useState('');

  // Fetch clients on mount
  useEffect(() => {
    fetchClients();
  }, []);

  // Fetch campaigns when client changes
  useEffect(() => {
    if (formData.clientId) {
      fetchCampaigns(formData.clientId);
    } else {
      setCampaigns([]);
    }
  }, [formData.clientId]);

  const fetchClients = async () => {
    try {
      const response = await axios.get('/api/clients');
      setClients(response.data.clients || []);
    } catch (err) {
      console.error('Failed to fetch clients:', err);
    }
  };

  const fetchCampaigns = async (clientId) => {
    try {
      const response = await axios.get(`/api/clients/${clientId}/campaigns`);
      setCampaigns(response.data.campaigns || []);
    } catch (err) {
      console.error('Failed to fetch campaigns:', err);
    }
  };

  const handleAddClient = async () => {
    if (!newClientName.trim()) return;
    try {
      const response = await axios.post('/api/clients', { name: newClientName });
      setClients([...clients, response.data.client]);
      onChange('clientId', response.data.client.id);
      setNewClientName('');
      setShowNewClient(false);
    } catch (err) {
      console.error('Failed to add client:', err);
      alert(err.response?.data?.error || 'Failed to add client');
    }
  };

  const handleAddCampaign = async () => {
    if (!newCampaignName.trim() || !formData.clientId) return;
    try {
      const response = await axios.post(`/api/clients/${formData.clientId}/campaigns`, { 
        name: newCampaignName 
      });
      setCampaigns([...campaigns, response.data.campaign]);
      onChange('campaignId', response.data.campaign.id);
      setNewCampaignName('');
      setShowNewCampaign(false);
    } catch (err) {
      console.error('Failed to add campaign:', err);
      alert(err.response?.data?.error || 'Failed to add campaign');
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    onChange(name, value);
  };

  const selectedClient = clients.find(c => c.id === formData.clientId);
  const selectedCampaign = campaigns.find(c => c.id === formData.campaignId);

  return (
    <form className="preview-form" onSubmit={onSubmit}>
      <h2 className="form-title">
        {isBatchMode ? '📦 Batch Upload' : '🎨 Preview Details'}
      </h2>
      
      {isBatchMode && fileCount > 0 && (
        <div className="batch-info">
          <span className="batch-count">{fileCount}</span> files selected for batch upload
        </div>
      )}

      {/* Client Selection */}
      <div className="form-group">
        <label htmlFor="clientId" className="form-label">
          Client <span className="required">*</span>
        </label>
        <div className="select-with-add">
          <select
            id="clientId"
            name="clientId"
            value={formData.clientId}
            onChange={handleChange}
            className="form-input form-select"
            disabled={isLoading}
            required
          >
            <option value="">Select a client...</option>
            {clients.map(client => (
              <option key={client.id} value={client.id}>{client.name}</option>
            ))}
          </select>
          <button 
            type="button" 
            className="add-button"
            onClick={() => setShowNewClient(!showNewClient)}
            disabled={isLoading}
          >
            +
          </button>
        </div>
        {showNewClient && (
          <div className="inline-add">
            <input
              type="text"
              value={newClientName}
              onChange={(e) => setNewClientName(e.target.value)}
              placeholder="New client name..."
              className="form-input"
            />
            <button type="button" className="confirm-add" onClick={handleAddClient}>
              Add
            </button>
          </div>
        )}
      </div>

      {/* Campaign Selection */}
      <div className="form-group">
        <label htmlFor="campaignId" className="form-label">
          Campaign <span className="required">*</span>
        </label>
        <div className="select-with-add">
          <select
            id="campaignId"
            name="campaignId"
            value={formData.campaignId}
            onChange={handleChange}
            className="form-input form-select"
            disabled={isLoading || !formData.clientId}
            required
          >
            <option value="">
              {formData.clientId ? 'Select a campaign...' : 'Select a client first...'}
            </option>
            {campaigns.map(campaign => (
              <option key={campaign.id} value={campaign.id}>{campaign.name}</option>
            ))}
          </select>
          <button 
            type="button" 
            className="add-button"
            onClick={() => setShowNewCampaign(!showNewCampaign)}
            disabled={isLoading || !formData.clientId}
          >
            +
          </button>
        </div>
        {showNewCampaign && formData.clientId && (
          <div className="inline-add">
            <input
              type="text"
              value={newCampaignName}
              onChange={(e) => setNewCampaignName(e.target.value)}
              placeholder="New campaign name..."
              className="form-input"
            />
            <button type="button" className="confirm-add" onClick={handleAddCampaign}>
              Add
            </button>
          </div>
        )}
      </div>

      {/* Creative Name - only for single upload */}
      {!isBatchMode && (
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
            placeholder="e.g., Summer_Banner_300x250"
            className="form-input"
            disabled={isLoading}
            required={!isBatchMode}
          />
          <p className="form-hint">
            For batch uploads, names are extracted from filenames
          </p>
        </div>
      )}

      {/* Description */}
      <div className="form-group">
        <label htmlFor="description" className="form-label">
          Description
        </label>
        <textarea
          id="description"
          name="description"
          value={formData.description}
          onChange={handleChange}
          placeholder="Brief description of the creative(s)..."
          className="form-input form-textarea"
          disabled={isLoading}
          rows={3}
        />
      </div>

      {/* Preview Path Display */}
      {selectedClient && selectedCampaign && (
        <div className="path-preview">
          <span className="path-label">Preview URL structure:</span>
          <code className="path-value">
            /{selectedClient.slug}/{selectedCampaign.slug}/{isBatchMode ? '[creative-name]' : (formData.creativeName?.toLowerCase().replace(/[^a-z0-9]+/g, '-') || '[creative-name]')}/
          </code>
        </div>
      )}

      <button
        type="submit"
        className="submit-button"
        disabled={isLoading || !hasFile || !formData.clientId || !formData.campaignId}
      >
        {isLoading ? (
          <>
            <span className="spinner"></span>
            {isBatchMode ? 'Processing Batch...' : 'Generating Preview...'}
          </>
        ) : (
          <>
            <span className="button-icon">🚀</span>
            {isBatchMode ? `Upload ${fileCount} Creatives` : 'Generate Preview'}
          </>
        )}
      </button>

      {!hasFile && (
        <p className="form-note">
          {isBatchMode 
            ? 'Drop multiple ZIP files to batch upload' 
            : 'Please upload a ZIP file to generate a preview'}
        </p>
      )}
    </form>
  );
}

export default PreviewForm;
