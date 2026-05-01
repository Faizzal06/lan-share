import PeerCard from './PeerCard';

export default function PeerGrid({ peers, onSendFile, onSendText, activePeerId, selfNetworkId }) {
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

  // Split peers into local network and other networks
  const localPeers = peers.filter(p => selfNetworkId && p.networkId === selfNetworkId);
  const remotePeers = peers.filter(p => !selfNetworkId || p.networkId !== selfNetworkId);

  return (
    <div className="peer-groups" id="peer-groups">
      {/* ── Local Network Group ── */}
      {localPeers.length > 0 && (
        <div className="peer-group" id="peer-group-local">
          <div className="peer-group-header">
            <div className="peer-group-label local">
              <span className="material-symbols-outlined">wifi</span>
              <span>Jaringan Lokal · <em>Local Network</em></span>
            </div>
            <span className="peer-group-count">{localPeers.length}</span>
          </div>
          <div className="peer-grid" id="peer-grid-local">
            {localPeers.map((peer) => (
              <PeerCard
                key={peer.peerId}
                peer={peer}
                onSendFile={onSendFile}
                onSendText={onSendText}
                isActive={activePeerId === peer.peerId}
                isLocal={true}
              />
            ))}
          </div>
        </div>
      )}

      {/* ── Remote Networks Group ── */}
      {remotePeers.length > 0 && (
        <div className="peer-group" id="peer-group-remote">
          <div className="peer-group-header">
            <div className="peer-group-label remote">
              <span className="material-symbols-outlined">language</span>
              <span>Jaringan Lain · <em>Other Networks</em></span>
            </div>
            <span className="peer-group-count">{remotePeers.length}</span>
          </div>
          <div className="peer-grid" id="peer-grid-remote">
            {remotePeers.map((peer) => (
              <PeerCard
                key={peer.peerId}
                peer={peer}
                onSendFile={onSendFile}
                onSendText={onSendText}
                isActive={activePeerId === peer.peerId}
                isLocal={false}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

