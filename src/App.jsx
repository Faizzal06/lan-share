import { useEffect, useCallback, useState } from 'react';
import Header from './components/Header';
import PeerGrid from './components/PeerGrid';
import TransferList from './components/TransferList';
import IncomingFileDialog from './components/IncomingFileDialog';
import { SendTextDialog, IncomingTextDialog } from './components/TextShareDialog';
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

  // Text share state
  const [textDialogTarget, setTextDialogTarget] = useState(null);
  const [incomingText, setIncomingText] = useState(null);

  // Wire up PeerJS data handler to file transfer logic
  useEffect(() => {
    onData((fromPeerId, data) => {
      handleIncomingData(fromPeerId, data);
    });
  }, [onData, handleIncomingData]);

  // Listen for WebSocket signals (file-request, file-response, text-incoming)
  useEffect(() => {
    if (!wsRef.current) return;

    const handler = (data) => {
      if (data.type === 'file-request') {
        setIncomingRequest(data);
        addToast(`File masuk: ${data.fileName}`, 'info', 6000);
      } else if (data.type === 'file-response') {
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
      } else if (data.type === 'text-incoming') {
        setIncomingText({
          fromPeerId: data.fromPeerId,
          fromDeviceName: data.fromDeviceName,
          text: data.text,
        });
        addToast(`Teks masuk dari ${data.fromDeviceName || 'Perangkat'}`, 'info', 6000);
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

  const handleSendFile = useCallback(async (targetPeerId, files) => {
    setActivePeerId(targetPeerId);
    for (const file of files) {
      try {
        const transferId = requestSendFile(targetPeerId, file);
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

  // ── Text share handlers ──
  const handleOpenTextDialog = useCallback((peerId, peerDeviceName) => {
    setTextDialogTarget({ peerId, deviceName: peerDeviceName });
  }, []);

  const handleSendText = useCallback((targetPeerId, text) => {
    sendSignal({
      type: 'text-send',
      targetPeerId,
      text,
      fromDeviceName: deviceName,
    });
    addToast('Teks terkirim!', 'success');
  }, [sendSignal, addToast, deviceName]);

  const handleCloseTextDialog = useCallback(() => {
    setTextDialogTarget(null);
  }, []);

  const handleCloseIncomingText = useCallback(() => {
    setIncomingText(null);
  }, []);

  const handleTextCopied = useCallback(() => {
    addToast('Teks disalin ke clipboard!', 'success');
  }, [addToast]);

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

  return (
    <div className="app" id="app">
      <div className="main-area">
        {/* ── Top Bar ── */}
        <header className="app-topbar" id="app-topbar">
          <a href="/" className="topbar-brand">
            <h1 className="topbar-logo">Kirimly</h1>
          </a>
          <div className="topbar-right">
            <div className="topbar-device-name">
              <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>devices</span>
              {deviceName}
            </div>
            <div className={`topbar-status ${connected ? 'online' : ''}`} id="network-status">
              <span className={`status-dot ${connected ? 'online' : 'offline'}`}></span>
              <span>{connected ? 'Terhubung' : 'Menghubungkan...'}</span>
            </div>
          </div>
        </header>

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
              onSendText={handleOpenTextDialog}
              activePeerId={activePeerId}
              selfNetworkId={selfNetworkId}
            />
          </section>

          <TransferList
            transfers={transfers}
            onRemove={removeTransfer}
            onClearCompleted={clearCompleted}
          />
        </main>

        <footer className="app-footer" id="app-footer">
          <p>File & teks ditransfer langsung antar perangkat. <strong>Tidak ada data yang melewati server.</strong></p>
          <p className="footer-sub">Kirimly · made with ❤️ by Faizal</p>
        </footer>
      </div>

      <IncomingFileDialog
        request={incomingRequest}
        onAccept={handleAcceptFile}
        onReject={handleRejectFile}
      />

      {textDialogTarget && (
        <SendTextDialog
          targetPeerId={textDialogTarget.peerId}
          targetDeviceName={textDialogTarget.deviceName}
          onSend={handleSendText}
          onClose={handleCloseTextDialog}
        />
      )}

      <IncomingTextDialog
        request={incomingText}
        onCopy={handleTextCopied}
        onClose={handleCloseIncomingText}
      />

      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </div>
  );
}
