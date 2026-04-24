import { useRef, useState } from 'react';
import { getOsIcon } from '../utils/deviceInfo';

export default function PeerCard({ peer, onSendFile, isActive }) {
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

  const statusClass = peer.status === 'online' ? 'online' :
                       peer.status === 'transferring' ? 'transferring' : 'offline';

  return (
    <div
      className={`peer-card ${isDragOver ? 'drag-over' : ''} ${isActive ? 'active' : ''}`}
      id={`peer-card-${peer.peerId}`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <div className="peer-avatar">
        <span className="peer-os-icon">{getOsIcon(peer.os)}</span>
        <span className={`peer-status-dot ${statusClass}`}></span>
      </div>

      <div className="peer-info">
        <h3 className="peer-name">{peer.deviceName}</h3>
        <span className="peer-browser">{peer.browser}</span>
      </div>

      <button
        className="send-btn"
        onClick={handleClick}
        title="Send files to this device"
        id={`send-btn-${peer.peerId}`}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="22" y1="2" x2="11" y2="13"></line>
          <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
        </svg>
        <span>Send File</span>
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
            <span className="drop-icon">📥</span>
            <span>Drop files here</span>
          </div>
        </div>
      )}
    </div>
  );
}
