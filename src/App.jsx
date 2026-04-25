import { useEffect, useCallback, useState } from 'react';
import Header from './components/Header';
import PeerGrid from './components/PeerGrid';
import TransferList from './components/TransferList';
import ManualConnect from './components/ManualConnect';
import IncomingFileDialog from './components/IncomingFileDialog';
import ToastContainer, { useToast } from './components/Toast';
import { usePeer } from './hooks/usePeer';
import { useWebSocket } from './hooks/useWebSocket';
import { useFileTransfer } from './hooks/useFileTransfer';
import { getDeviceInfo } from './utils/deviceInfo';

export default function App() {
  const { deviceName } = getDeviceInfo();
  const { peerId, peerStatus, connectToPeer, sendToPeer, onData, onConnection } = usePeer();
  const { peers, connected, sendSignal, onMessage, wsRef } = useWebSocket(peerId);
  const { transfers, sendFile, handleIncomingData, removeTransfer, clearCompleted } = useFileTransfer(connectToPeer, sendToPeer);
  const { toasts, addToast, removeToast } = useToast();

  const [incomingRequest, setIncomingRequest] = useState(null);
  const [activePeerId, setActivePeerId] = useState(null);

  // Wire up PeerJS data handler to file transfer logic
  useEffect(() => {
    onData((fromPeerId, data) => {
      handleIncomingData(fromPeerId, data);
    });
  }, [onData, handleIncomingData]);

  // Listen for WebSocket signals (file-request, file-response)
  useEffect(() => {
    if (!wsRef.current) return;

    const handler = (data) => {
      if (data.type === 'file-request') {
        setIncomingRequest(data);
        addToast(`Incoming file: ${data.fileName}`, 'info', 6000);
      } else if (data.type === 'file-response') {
        if (data.accepted) {
          addToast('File transfer accepted!', 'success');
        } else {
          addToast('File transfer was declined.', 'warning');
        }
      }
    };

    const ws = wsRef.current;
    const listener = (event) => {
      try {
        const parsed = JSON.parse(event.data);
        handler(parsed);
      } catch { /* ignore non-JSON */ }
    };

    ws.addEventListener('message', listener);
    return () => ws.removeEventListener('message', listener);
  }, [wsRef.current, addToast]);

  // Notify when peers join/leave
  useEffect(() => {
    if (peers.length > 0) {
      // Check for newly added peers (we'll rely on toast for new connections)
    }
  }, [peers]);

  const handleSendFile = useCallback(async (targetPeerId, files) => {
    setActivePeerId(targetPeerId);
    for (const file of files) {
      try {
        // Send signal via WebSocket to ask permission
        sendSignal({
          type: 'file-request',
          targetPeerId,
          fileName: file.name,
          fileSize: file.size,
          fileType: file.type,
        });

        // Start the P2P transfer directly (for MVP, auto-accept)
        await sendFile(targetPeerId, file);
        addToast(`Sent: ${file.name}`, 'success');
      } catch (err) {
        addToast(`Failed to send: ${file.name}`, 'error');
      }
    }
    setActivePeerId(null);
  }, [sendFile, sendSignal, addToast]);

  const handleAcceptFile = useCallback(() => {
    if (incomingRequest) {
      sendSignal({
        type: 'file-response',
        targetPeerId: incomingRequest.fromPeerId,
        accepted: true,
      });
      addToast('File transfer accepted', 'success');
      setIncomingRequest(null);
    }
  }, [incomingRequest, sendSignal, addToast]);

  const handleRejectFile = useCallback(() => {
    if (incomingRequest) {
      sendSignal({
        type: 'file-response',
        targetPeerId: incomingRequest.fromPeerId,
        accepted: false,
      });
      addToast('File transfer declined', 'info');
      setIncomingRequest(null);
    }
  }, [incomingRequest, sendSignal, addToast]);

  const handleManualConnect = useCallback(async (remotePeerId) => {
    try {
      await connectToPeer(remotePeerId);
      addToast(`Connected to ${remotePeerId}`, 'success');
    } catch (err) {
      addToast(`Failed to connect: ${err.message}`, 'error');
    }
  }, [connectToPeer, addToast]);

  return (
    <div className="app" id="app">
      {/* ── Desktop Sidebar ── */}
      <aside className="app-sidebar" id="app-sidebar">
        <div className="sidebar-brand">
          <h1 className="sidebar-logo">LANShare</h1>
          <span className="sidebar-version">V1.0.0-Stable</span>
        </div>

        <nav className="sidebar-nav">
          <a href="#" className="active">
            <span className="material-symbols-outlined">radar</span>
            <span>Discover</span>
          </a>
          <a href="#">
            <span className="material-symbols-outlined">swap_horiz</span>
            <span>Transfers</span>
          </a>
          <a href="#">
            <span className="material-symbols-outlined">history</span>
            <span>History</span>
          </a>
          <a href="#">
            <span className="material-symbols-outlined">settings</span>
            <span>Settings</span>
          </a>
        </nav>

        <div className="sidebar-footer">
          <button className="sidebar-send-btn">
            <span className="material-symbols-outlined">send</span>
            Send File
          </button>
        </div>
      </aside>

      {/* ── Mobile Header ── */}
      <div className="main-area">
        <header className="mobile-header" id="mobile-header">
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div className="mobile-logo">LANShare</div>
            <div style={{ fontSize: '12px', fontWeight: '700', textTransform: 'uppercase', color: 'var(--on-surface-var)' }}>
              {deviceName}
            </div>
          </div>
          <div className="mobile-actions">
            <button className="mobile-action-btn">
              <span className="material-symbols-outlined">lan</span>
            </button>
            <button className="mobile-action-btn">
              <span className="material-symbols-outlined">fingerprint</span>
            </button>
            <button className="mobile-action-btn">
              <span className="material-symbols-outlined">settings</span>
            </button>
          </div>
        </header>

        {/* ── Desktop Status Bar ── */}
        <Header
          connected={connected}
          peerId={peerId}
          peerStatus={peerStatus}
          deviceName={deviceName}
        />

        <main className="main-content" id="main-content">
          <section className="section-peers" id="section-peers">
            <div className="section-header">
              <h2 className="section-title">
                <span className="material-symbols-outlined">radar</span>
                Nearby Devices
              </h2>
              <span className="peer-count">{peers.length} found</span>
            </div>
            <PeerGrid
              peers={peers}
              onSendFile={handleSendFile}
              activePeerId={activePeerId}
            />
          </section>

          <TransferList
            transfers={transfers}
            onRemove={removeTransfer}
            onClearCompleted={clearCompleted}
          />

          <ManualConnect onConnect={handleManualConnect} />
        </main>

        <footer className="app-footer" id="app-footer">
          <p>Files are transferred directly between devices. <strong>No data passes through any server.</strong></p>
          <p className="footer-sub">LANShare P2P · Powered by WebRTC</p>
        </footer>
      </div>

      <IncomingFileDialog
        request={incomingRequest}
        onAccept={handleAcceptFile}
        onReject={handleRejectFile}
      />

      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </div>
  );
}
