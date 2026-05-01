export default function Header({ connected, peerId, peerStatus, deviceName }) {
  const shortId = peerId ? peerId.slice(0, 7).toUpperCase() : '---';

  return (
    <header className="desktop-status-bar" id="app-header">
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        <h2 className="status-bar-title">Dasbor</h2>
        <span style={{ fontSize: '14px', fontWeight: '700', padding: '4px 8px', background: 'var(--primary-container)', border: '2px solid var(--border)', boxShadow: '2px 2px 0px 0px #1b1b1b' }}>
          {deviceName}
        </span>
      </div>

      <div className="status-bar-right">
        <div className="status-badge" id="network-status">
          <span className={`status-dot ${connected ? 'online' : 'offline'}`}></span>
          <span className="status-label">
            {connected ? 'Terhubung' : 'Menghubungkan...'}
          </span>
        </div>

        {peerId && (
          <div className="peer-id-badge" id="device-badge">
            <span className="peer-id-label">ID PEER:</span>
            <span className="peer-id-value">{shortId}</span>
          </div>
        )}
      </div>
    </header>
  );
}
