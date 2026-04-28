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
        <h2 className="empty-title">Mencari perangkat...</h2>
        <p className="empty-subtitle">
          Pastikan perangkat lain terhubung ke <strong>jaringan WiFi yang sama</strong> dan membuka LANShare.
        </p>
        <div className="empty-tips">
          <div className="tip">
            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>wifi</span>
            <span>Pastikan WiFi terhubung</span>
          </div>
          <div className="tip">
            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>link</span>
            <span>Buka URL yang sama di perangkat lain</span>
          </div>
          <div className="tip">
            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>shield</span>
            <span>Nonaktifkan AP Isolation di router jika perlu</span>
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
