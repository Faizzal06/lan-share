import { useRef, useCallback, useState } from 'react';
import { CHUNK_SIZE } from '../utils/fileUtils';

/**
 * Custom hook for file transfer logic.
 * Handles file chunking, sending, receiving, progress tracking.
 */
export function useFileTransfer(connectToPeer, sendToPeer, onData) {
  const [transfers, setTransfers] = useState([]); // active transfers
  const receivingBuffers = useRef(new Map()); // peerId -> { info, chunks, received }

  /**
   * Send a file to a remote peer in chunks.
   */
  const sendFile = useCallback(async (remotePeerId, file) => {
    const transferId = `${Date.now()}-${Math.random().toString(36).slice(2)}`;

    const transfer = {
      id: transferId,
      peerId: remotePeerId,
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type,
      direction: 'send',
      progress: 0,
      speed: 0,
      status: 'transferring',
      startTime: Date.now(),
    };

    setTransfers(prev => [...prev, transfer]);

    try {
      // Ensure connection is open
      await connectToPeer(remotePeerId);

      // Send file metadata
      sendToPeer(remotePeerId, {
        type: 'file-start',
        transferId,
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type,
        totalChunks: Math.ceil(file.size / CHUNK_SIZE),
      });

      // Read and send in chunks
      const arrayBuffer = await file.arrayBuffer();
      const totalChunks = Math.ceil(arrayBuffer.byteLength / CHUNK_SIZE);

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

        // Update progress
        const progress = ((i + 1) / totalChunks) * 100;
        const elapsed = (Date.now() - transfer.startTime) / 1000;
        const speed = (start + chunk.byteLength) / elapsed;

        setTransfers(prev => prev.map(t =>
          t.id === transferId
            ? { ...t, progress, speed, status: 'transferring' }
            : t
        ));

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

      setTransfers(prev => prev.map(t =>
        t.id === transferId
          ? { ...t, progress: 100, status: 'completed' }
          : t
      ));
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
   * Handle incoming data from peers (chunks, metadata, etc.)
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
        const speed = bytesReceived / elapsed;

        setTransfers(prev => prev.map(t =>
          t.id === data.transferId
            ? { ...t, progress, speed, status: 'transferring' }
            : t
        ));
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
        break;
      }

      default:
        break;
    }
  }, []);

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
    sendFile,
    handleIncomingData,
    removeTransfer,
    clearCompleted,
  };
}
