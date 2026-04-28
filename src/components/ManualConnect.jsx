import { useState } from 'react';

export default function ManualConnect({ onConnect }) {
  const [ip, setIp] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');

    const trimmed = ip.trim();
    if (!trimmed) {
      setError('Masukkan ID Peer atau alamat IP');
      return;
    }

    onConnect(trimmed);
    setIp('');
  };

  return (
    <section className="manual-connect-section">
      <div className="section-header">
        <h2 className="section-title">
          <span className="material-symbols-outlined">hub</span>
          Koneksi Manual
        </h2>
      </div>
      <div className="manual-connect" id="manual-connect">
        <form className="manual-form" onSubmit={handleSubmit}>
          <label className="manual-label">Masukkan ID Peer</label>
          <div className="input-group">
            <input
              type="text"
              className="manual-input"
              placeholder="mis. AB-123C"
              value={ip}
              onChange={(e) => setIp(e.target.value)}
              id="manual-connect-input"
            />
            <button type="submit" className="btn btn-connect" id="manual-connect-btn">
              Hubungkan
            </button>
          </div>
          {error && <span className="manual-error">{error}</span>}
        </form>
      </div>
    </section>
  );
}
