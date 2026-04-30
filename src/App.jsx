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
  const { peers, connected, selfNetworkId, sendSignal, onMessage, wsRef } = useWebSocket(peerId);
  const {
    transfers,
    requestSendFile,
    startTransfer,
    cancelPendingTransfer,
    findPendingTransfer,
    handleIncomingData,
    removeTransfer,
    clearCompleted,
  } = useFileTransfer(connectToPeer, sendToPeer);
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
        // Receiver side: show the accept/decline dialog
        setIncomingRequest(data);
        addToast(`File masuk: ${data.fileName}`, 'info', 6000);
      } else if (data.type === 'file-response') {
        // Sender side: receiver responded to our file-request
        const transferId = findPendingTransfer(data.fromPeerId);
        if (data.accepted) {
          addToast('Transfer file diterima!', 'success');
          if (transferId) {
            startTransfer(transferId);
          }
        } else {
          addToast('Transfer file ditolak.', 'warning');
          if (transferId) {
            cancelPendingTransfer(transferId);
          }
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
  }, [wsRef.current, addToast, findPendingTransfer, startTransfer, cancelPendingTransfer]);

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
        // Queue the file — this does NOT start sending yet
        const transferId = requestSendFile(targetPeerId, file);

        // Send signal via WebSocket to ask receiver for permission
        sendSignal({
          type: 'file-request',
          targetPeerId,
          transferId,
          fileName: file.name,
          fileSize: file.size,
          fileType: file.type,
          fromDeviceName: deviceName,
        });

        addToast(`Menunggu persetujuan: ${file.name}`, 'info');
      } catch (err) {
        addToast(`Gagal mengirim: ${file.name}`, 'error');
      }
    }
    setActivePeerId(null);
  }, [requestSendFile, sendSignal, addToast, deviceName]);

  const handleAcceptFile = useCallback(() => {
    if (incomingRequest) {
      sendSignal({
        type: 'file-response',
        targetPeerId: incomingRequest.fromPeerId,
        accepted: true,
      });
      addToast('Transfer file diterima', 'success');
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
      addToast('Transfer file ditolak', 'info');
      setIncomingRequest(null);
    }
  }, [incomingRequest, sendSignal, addToast]);

  const handleManualConnect = useCallback(async (remotePeerId) => {
    try {
      await connectToPeer(remotePeerId);
      addToast(`Terhubung ke ${remotePeerId}`, 'success');
    } catch (err) {
      addToast(`Gagal terhubung: ${err.message}`, 'error');
    }
  }, [connectToPeer, addToast]);

  return (
    <div className="app" id="app">
      {/* ── Desktop Sidebar ── */}
      <aside className="app-sidebar" id="app-sidebar">
        <div className="sidebar-brand">
          <h1 className="sidebar-logo">LANShare</h1>
          <span className="sidebar-version">V1.0.0-Stabil</span>
        </div>

        <nav className="sidebar-nav">
          <a href="#" className="active">
            <span className="material-symbols-outlined">radar</span>
            <span>Temukan</span>
          </a>
          <a href="#">
            <span className="material-symbols-outlined">swap_horiz</span>
            <span>Transfer</span>
          </a>
          <a href="#">
            <span className="material-symbols-outlined">history</span>
            <span>Riwayat</span>
          </a>
          <a href="#">
            <span className="material-symbols-outlined">settings</span>
            <span>Pengaturan</span>
          </a>
        </nav>

        <div className="sidebar-footer">
          <button className="sidebar-send-btn">
            <span className="material-symbols-outlined">send</span>
            Kirim File
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
                Perangkat Terdekat
              </h2>
              <span className="peer-count">{peers.length} ditemukan</span>
            </div>
            <PeerGrid
              peers={peers}
              onSendFile={handleSendFile}
              activePeerId={activePeerId}
              selfNetworkId={selfNetworkId}
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
          <p>File ditransfer langsung antar perangkat. <strong>Tidak ada data yang melewati server.</strong></p>
          <p className="footer-sub">LANShare P2P · Ditenagai oleh WebRTC</p>
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
