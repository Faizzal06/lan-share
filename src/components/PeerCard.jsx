import { useRef, useState } from 'react';
import { getOsIcon } from '../utils/deviceInfo';

export default function PeerCard({ peer, onSendFile, isActive, isLocal }) {
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef(null);

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      onSendFile(peer.peerId, files);
    }
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files);
    if (files.length > 0) {
      onSendFile(peer.peerId, files);
    }
    // Reset input so the same file can be selected again
    e.target.value = '';
  };

  const iconName = getOsIcon(peer.os);
  const isMobile = peer.os === 'Android' || peer.os === 'iOS';

  return (
    <div
      className={`peer-card ${isDragOver ? 'drag-over' : ''} ${isActive ? 'active' : ''}`}
      id={`peer-card-${peer.peerId}`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <div className="peer-card-top">
        <div className={`peer-avatar ${isMobile ? 'android' : ''}`}>
          <span className="material-symbols-outlined">{iconName}</span>
        </div>
        <div className="peer-badges">
          {isLocal && (
            <span className="peer-network-badge local">
              <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>wifi</span>
              LAN
            </span>
          )}
          <span className="peer-status-badge">Tersedia</span>
        </div>
      </div>

      <div className="peer-info">
        <h3 className="peer-name" title={peer.peerId}>{peer.deviceName || `Device-${peer.peerId?.slice(0, 4).toUpperCase()}`}</h3>
        <span className="peer-browser">{peer.os} • {peer.browser}</span>
      </div>

      <button
        className="send-btn"
        onClick={handleClick}
        title="Kirim file ke perangkat ini"
        id={`send-btn-${peer.peerId}`}
      >
        <span className="material-symbols-outlined">upload_file</span>
        <span>Kirim File</span>
      </button>

      <input
        ref={fileInputRef}
        type="file"
        multiple
        onChange={handleFileSelect}
        className="hidden-file-input"
        id={`file-input-${peer.peerId}`}
      />

      {isDragOver && (
        <div className="drop-overlay">
          <div className="drop-overlay-content">
            <span className="material-symbols-outlined drop-icon">download</span>
            <span>Lepaskan file di sini</span>
          </div>
        </div>
      )}
    </div>
  );
}
