import PeerCard from './PeerCard';

export default function PeerGrid({ peers, onSendFile, activePeerId }) {
  if (peers.length === 0) {
    return (
      <div className="empty-state" id="empty-state">
        <div className="empty-animation">
          <div className="radar">
            <div className="radar-ring ring-1"></div>
            <div className="radar-ring ring-2"></div>
            <div className="radar-ring ring-3"></div>
            <div className="radar-dot"></div>
          </div>
        </div>
        <h2 className="empty-title">Searching for devices...</h2>
        <p className="empty-subtitle">
          Make sure other devices are connected to the <strong>same WiFi network</strong> and have LANShare open.
        </p>
        <div className="empty-tips">
          <div className="tip">
            <span className="tip-icon">📶</span>
            <span>Check that WiFi is connected</span>
          </div>
          <div className="tip">
            <span className="tip-icon">🔗</span>
            <span>Open the same URL on other devices</span>
          </div>
          <div className="tip">
            <span className="tip-icon">🛡️</span>
            <span>Disable AP Isolation on your router if needed</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="peer-grid" id="peer-grid">
      {peers.map((peer) => (
        <PeerCard
          key={peer.peerId}
          peer={peer}
          onSendFile={onSendFile}
          isActive={activePeerId === peer.peerId}
        />
      ))}
    </div>
  );
}
