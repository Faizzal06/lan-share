import { getOsIcon } from '../utils/deviceInfo';

export default function Header({ connected, peerId, peerStatus }) {
  return (
    <header className="app-header" id="app-header">
      <div className="header-left">
        <div className="logo">
          <span className="logo-icon">⚡</span>
          <h1 className="logo-text">LANShare</h1>
        </div>
        <span className="header-tagline">Peer-to-Peer File Sharing</span>
      </div>

      <div className="header-right">
        <div className="network-status" id="network-status">
          <span className={`status-dot ${connected ? 'online' : 'offline'}`}></span>
          <span className="status-label">
            {connected ? 'LAN Connected' : 'Connecting...'}
          </span>
        </div>

        {peerId && (
          <div className="device-badge" id="device-badge">
            <span className="device-icon">{getOsIcon(navigator.userAgent.includes('Windows') ? 'Windows' : 'Unknown')}</span>
            <span className="device-id" title={peerId}>
              {peerId.slice(0, 8)}...
            </span>
          </div>
        )}
      </div>
    </header>
  );
}
