import { useRef, useCallback, useState } from 'react';
import { CHUNK_SIZE } from '../utils/fileUtils';

/**
 * Custom hook for file transfer logic.
 * Handles file chunking, sending, receiving, progress tracking.
 * 
 * Flow:
 * 1. Sender calls requestSendFile() → sends file-request via WS, stores file in pendingFiles
 * 2. Receiver sees IncomingFileDialog, clicks Accept → sends file-response via WS
 * 3. Sender receives file-response(accepted=true) → calls startTransfer() to begin P2P data transfer
 * 4. Receiver gets chunks via PeerJS data channel, sends progress-ack back to sender
 * 5. Both sides display the RECEIVER's actual progress
 */
export function useFileTransfer(connectToPeer, sendToPeer) {
  const [transfers, setTransfers] = useState([]);
  const receivingBuffers = useRef(new Map()); // transferId -> { info, chunks, received }
  const pendingFiles = useRef(new Map()); // transferId -> { remotePeerId, file, transferId }

  /**
   * Queue a file to be sent — does NOT start sending yet.
   * Returns the transferId so App.jsx can associate the WS response later.
   */
  const requestSendFile = useCallback((remotePeerId, file) => {
    const transferId = `${Date.now()}-${Math.random().toString(36).slice(2)}`;

    // Store the file for later when the receiver accepts
    pendingFiles.current.set(transferId, { remotePeerId, file });

    // Create a "waiting" transfer entry in the UI
    const transfer = {
      id: transferId,
      peerId: remotePeerId,
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type,
      direction: 'send',
      progress: 0,
      speed: 0,
      status: 'waiting', // waiting for receiver to accept
      startTime: Date.now(),
    };

    setTransfers(prev => [...prev, transfer]);
    return transferId;
  }, []);

  /**
   * Actually start the P2P transfer after the receiver accepted.
   */
  const startTransfer = useCallback(async (transferId) => {
    const pending = pendingFiles.current.get(transferId);
    if (!pending) return;

    const { remotePeerId, file } = pending;
    pendingFiles.current.delete(transferId);

    // Mark as transferring
    setTransfers(prev => prev.map(t =>
      t.id === transferId
        ? { ...t, status: 'transferring', startTime: Date.now() }
        : t
    ));

    try {
      await connectToPeer(remotePeerId);

      const totalChunks = Math.ceil(file.size / CHUNK_SIZE);

      // Send file metadata
      sendToPeer(remotePeerId, {
        type: 'file-start',
        transferId,
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type,
        totalChunks,
      });

      // Read and send in chunks
      const arrayBuffer = await file.arrayBuffer();

      for (let i = 0; i < totalChunks; i++) {
        const start = i * CHUNK_SIZE;
        const end = Math.min(start + CHUNK_SIZE, arrayBuffer.byteLength);
        const chunk = arrayBuffer.slice(start, end);

        sendToPeer(remotePeerId, {
          type: 'file-chunk',
          transferId,
          index: i,
          data: chunk,
        });

        // Small delay to prevent overwhelming the data channel buffer
        if (i % 16 === 0 && i > 0) {
          await new Promise(r => setTimeout(r, 10));
        }
      }

      // Send completion signal
      sendToPeer(remotePeerId, {
        type: 'file-complete',
        transferId,
      });

      // Note: we do NOT set 100% here — we wait for receiver's progress-ack
    } catch (err) {
      console.error('[Transfer] Send error:', err);
      setTransfers(prev => prev.map(t =>
        t.id === transferId
          ? { ...t, status: 'error', error: err.message }
          : t
      ));
    }
  }, [connectToPeer, sendToPeer]);

  /**
   * Cancel a pending (waiting) transfer.
   */
  const cancelPendingTransfer = useCallback((transferId) => {
    pendingFiles.current.delete(transferId);
    setTransfers(prev => prev.map(t =>
      t.id === transferId
        ? { ...t, status: 'error', error: 'Transfer declined by receiver' }
        : t
    ));
  }, []);

  /**
   * Find a pending transferId by targetPeerId and fileName.
   * Used when the WS file-response comes back so we can match it to the right pending file.
   */
  const findPendingTransfer = useCallback((targetPeerId, accepted) => {
    // Find the first "waiting" transfer to that peer
    const waitingTransfer = [...pendingFiles.current.entries()].find(
      ([, val]) => val.remotePeerId === targetPeerId
    );
    if (waitingTransfer) {
      return waitingTransfer[0]; // return the transferId
    }
    // Fallback: find in transfers state
    return null;
  }, []);

  /**
   * Handle incoming data from peers (chunks, metadata, progress-ack, etc.)
   */
  const handleIncomingData = useCallback((fromPeerId, data) => {
    if (!data?.type) return;

    switch (data.type) {
      case 'file-start': {
        // Initialize receiving buffer
        receivingBuffers.current.set(data.transferId, {
          info: data,
          chunks: new Array(data.totalChunks),
          receivedCount: 0,
          startTime: Date.now(),
        });

        const transfer = {
          id: data.transferId,
          peerId: fromPeerId,
          fileName: data.fileName,
          fileSize: data.fileSize,
          fileType: data.fileType,
          direction: 'receive',
          progress: 0,
          speed: 0,
          status: 'transferring',
          startTime: Date.now(),
        };

        setTransfers(prev => [...prev, transfer]);
        break;
      }

      case 'file-chunk': {
        const buffer = receivingBuffers.current.get(data.transferId);
        if (!buffer) return;

        buffer.chunks[data.index] = data.data;
        buffer.receivedCount++;

        const progress = (buffer.receivedCount / buffer.info.totalChunks) * 100;
        const elapsed = (Date.now() - buffer.startTime) / 1000;
        const bytesReceived = buffer.receivedCount * CHUNK_SIZE;
        const speed = elapsed > 0 ? bytesReceived / elapsed : 0;

        setTransfers(prev => prev.map(t =>
          t.id === data.transferId
            ? { ...t, progress, speed, status: 'transferring' }
            : t
        ));

        // Send progress-ack back to sender every 8 chunks so they stay in sync
        if (buffer.receivedCount % 8 === 0) {
          sendToPeer(fromPeerId, {
            type: 'progress-ack',
            transferId: data.transferId,
            progress,
            speed,
          });
        }
        break;
      }

      case 'file-complete': {
        const buffer = receivingBuffers.current.get(data.transferId);
        if (!buffer) return;

        // Reassemble file
        const blob = new Blob(buffer.chunks, { type: buffer.info.fileType });
        const url = URL.createObjectURL(blob);

        // Trigger download
        const a = document.createElement('a');
        a.href = url;
        a.download = buffer.info.fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        // Cleanup
        receivingBuffers.current.delete(data.transferId);

        setTransfers(prev => prev.map(t =>
          t.id === data.transferId
            ? { ...t, progress: 100, status: 'completed' }
            : t
        ));

        // Send final progress-ack (100%) to sender
        sendToPeer(fromPeerId, {
          type: 'progress-ack',
          transferId: data.transferId,
          progress: 100,
          speed: 0,
          completed: true,
        });
        break;
      }

      case 'progress-ack': {
        // Sender receives this — update sender's progress to match receiver's actual progress
        setTransfers(prev => prev.map(t =>
          t.id === data.transferId && t.direction === 'send'
            ? {
                ...t,
                progress: data.progress,
                speed: data.speed,
                status: data.completed ? 'completed' : t.status,
              }
            : t
        ));
        break;
      }

      default:
        break;
    }
  }, [sendToPeer]);

  /**
   * Remove a completed or errored transfer from the list.
   */
  const removeTransfer = useCallback((transferId) => {
    setTransfers(prev => prev.filter(t => t.id !== transferId));
  }, []);

  /**
   * Clear all completed transfers.
   */
  const clearCompleted = useCallback(() => {
    setTransfers(prev => prev.filter(t => t.status !== 'completed' && t.status !== 'error'));
  }, []);

  return {
    transfers,
    requestSendFile,
    startTransfer,
    cancelPendingTransfer,
    findPendingTransfer,
    handleIncomingData,
    removeTransfer,
    clearCompleted,
  };
}
