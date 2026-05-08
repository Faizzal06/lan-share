import { useEffect, useCallback, useState } from 'react';
import PeerGrid from './components/PeerGrid';
import TransferList from './components/TransferList';
import IncomingFileDialog from './components/IncomingFileDialog';
import { SendTextDialog, IncomingTextDialog } from './components/TextShareDialog';
import ToastContainer, { useToast } from './components/Toast';
import { usePeer } from './hooks/usePeer';
import { useWebSocket } from './hooks/useWebSocket';
import { useFileTransfer } from './hooks/useFileTransfer';
import { getDeviceInfo, getDeviceInfoAsync } from './utils/deviceInfo';

function normalizeIncomingFiles(data) {
  if (Array.isArray(data.files) && data.files.length > 0) {
    return data.files;
  }

  if (data.transferId && data.fileName) {
    return [{
      transferId: data.transferId,
      fileName: data.fileName,
      fileSize: data.fileSize,
      fileType: data.fileType,
    }];
  }

  return [];
}

export default function App() {
  // Start with a fast sync value, then upgrade to real model name (e.g. SM-G955U) on mobile
  const [deviceName, setDeviceName] = useState(() => getDeviceInfo().deviceName);

  useEffect(() => {
    getDeviceInfoAsync().then(({ deviceName: resolvedName }) => {
      setDeviceName(resolvedName);
    });
  }, []);

  const { peerId, connectToPeer, sendToPeer, onData } = usePeer();
  const { peers, connected, selfNetworkId, sendSignal, onMessage } = useWebSocket(peerId);
  const {
    batches,
    transfers,
    requestSendBatch,
    enqueueAcceptedTransfers,
    rejectTransfers,
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
    const handler = (data) => {
      if (data.type === 'file-request') {
        const files = normalizeIncomingFiles(data);
        const totalBytes = data.totalBytes ?? files.reduce((sum, file) => sum + (file.fileSize || 0), 0);

        setIncomingRequest({
          ...data,
          batchId: data.batchId || `legacy-${Date.now()}`,
          files,
          totalFiles: data.totalFiles || files.length,
          totalBytes,
        });

        const count = files.length || 1;
        addToast(`File masuk: ${count} file`, 'info', 6000);
      } else if (data.type === 'file-response') {
        const acceptedIds = data.acceptedTransferIds || (data.accepted ? (data.transferIds || []) : []);
        const rejectedIds = data.rejectedTransferIds || (!data.accepted ? (data.transferIds || []) : []);

        if (acceptedIds.length > 0) {
          enqueueAcceptedTransfers(data.fromPeerId, acceptedIds);
        }

        if (rejectedIds.length > 0) {
          rejectTransfers(rejectedIds);
        }

        if (data.accepted) {
          addToast(`Transfer batch diterima: ${acceptedIds.length} file`, 'success');
        } else {
          addToast('Transfer file ditolak.', 'warning');
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

    return onMessage(handler);
  }, [onMessage, addToast, enqueueAcceptedTransfers, rejectTransfers]);

  const handleSendFile = useCallback(async (targetPeerId, files) => {
    setActivePeerId(targetPeerId);

    try {
      const batch = requestSendBatch(targetPeerId, files);
      if (batch.files.length === 0) return;

      sendSignal({
        type: 'file-request',
        batchId: batch.batchId,
        targetPeerId,
        files: batch.files,
        totalFiles: batch.totalFiles,
        totalBytes: batch.totalBytes,
        fromDeviceName: deviceName,
      });
      addToast(`Menunggu persetujuan untuk ${batch.totalFiles} file...`, 'info');
    } catch (err) {
      addToast(err.message || 'Gagal menyiapkan transfer file', 'error');
    } finally {
      setActivePeerId(null);
    }
  }, [requestSendBatch, sendSignal, addToast, deviceName]);

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
      const transferIds = incomingRequest.files.map((file) => file.transferId);

      sendSignal({
        type: 'file-response',
        batchId: incomingRequest.batchId,
        targetPeerId: incomingRequest.fromPeerId,
        accepted: true,
        acceptedTransferIds: transferIds,
        rejectedTransferIds: [],
      });
      addToast(`${transferIds.length} transfer file diterima`, 'success');
      setIncomingRequest(null);
    }
  }, [incomingRequest, sendSignal, addToast]);

  const handleRejectFile = useCallback(() => {
    if (incomingRequest) {
      const transferIds = incomingRequest.files.map((file) => file.transferId);

      sendSignal({
        type: 'file-response',
        batchId: incomingRequest.batchId,
        targetPeerId: incomingRequest.fromPeerId,
        accepted: false,
        acceptedTransferIds: [],
        rejectedTransferIds: transferIds,
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
            batches={batches}
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
