import PeerCard from './PeerCard';

export default function PeerGrid({ groupedPeers, peers, onSendFile, activePeerId }) {
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
      {groupedPeers.map((group) => (
        <div key={group.subnet} className="peer-group">
          <div className="peer-group-header">
            <div className="peer-group-title">
              {group.isLocal ? (
                <>
                  <span className="material-symbols-outlined">wifi</span>
                  <span>Local Network</span>
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined">public</span>
                  <span>Remote Network</span>
                </>
              )}
              <span className="peer-group-subnet">{group.subnet}</span>
            </div>
            <span className="peer-group-count">{group.peers.length} device{group.peers.length !== 1 ? 's' : ''}</span>
          </div>
          <div className="peer-group-list">
            {group.peers.map((peer) => (
              <PeerCard
                key={peer.peerId}
                peer={peer}
                onSendFile={onSendFile}
                isActive={activePeerId === peer.peerId}
                isLocal={group.isLocal}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
