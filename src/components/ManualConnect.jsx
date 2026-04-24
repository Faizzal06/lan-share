import { useState } from 'react';

export default function ManualConnect({ onConnect }) {
  const [ip, setIp] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');

    const trimmed = ip.trim();
    if (!trimmed) {
      setError('Please enter a Peer ID or IP address');
      return;
    }

    onConnect(trimmed);
    setIp('');
  };

  return (
    <div className="manual-connect" id="manual-connect">
      <div className="manual-connect-header">
        <span className="manual-icon">🔗</span>
        <h3>Manual Connect</h3>
      </div>
      <p className="manual-desc">
        Can&apos;t see the other device? Enter their Peer ID to connect directly.
      </p>
      <form className="manual-form" onSubmit={handleSubmit}>
        <div className="input-group">
          <input
            type="text"
            className="manual-input"
            placeholder="Enter Peer ID..."
            value={ip}
            onChange={(e) => setIp(e.target.value)}
            id="manual-connect-input"
          />
          <button type="submit" className="btn btn-connect" id="manual-connect-btn">
            Connect
          </button>
        </div>
        {error && <span className="manual-error">{error}</span>}
      </form>
    </div>
  );
}
