import { useRef, useCallback, useState, useMemo } from 'react';
import { CHUNK_SIZE } from '../utils/fileUtils';

const ACK_INTERVAL = 8;
const SEND_YIELD_INTERVAL = 16;

function createTransferId() {
  if (globalThis.crypto?.randomUUID) {
    return globalThis.crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function upsertTransfer(prevTransfers, nextTransfer) {
  const index = prevTransfers.findIndex((transfer) => transfer.id === nextTransfer.id);
  if (index === -1) {
    return [...prevTransfers, nextTransfer];
  }

  const updated = [...prevTransfers];
  updated[index] = { ...updated[index], ...nextTransfer };
  return updated;
}

export function useFileTransfer(connectToPeer, sendToPeer) {
  const [transfers, setTransfers] = useState([]);
  const receivingBuffers = useRef(new Map()); // transferId -> { info, chunks, receivedBytes, receivedCount, startTime }
  const pendingFiles = useRef(new Map()); // transferId -> { batchId, remotePeerId, file }
  const peerQueues = useRef(new Map()); // peerId -> transferId[]
  const activeTransfers = useRef(new Map()); // peerId -> transferId
  const completionWaiters = useRef(new Map()); // transferId -> { resolve, reject }

  const resolveCompletion = useCallback((transferId) => {
    const waiter = completionWaiters.current.get(transferId);
    if (!waiter) return;
    completionWaiters.current.delete(transferId);
    waiter.resolve();
  }, []);

  const rejectCompletion = useCallback((transferId, error) => {
    const waiter = completionWaiters.current.get(transferId);
    if (!waiter) return;
    completionWaiters.current.delete(transferId);
    waiter.reject(error instanceof Error ? error : new Error(error || 'Transfer failed'));
  }, []);

  const waitForCompletion = useCallback((transferId) => {
    return new Promise((resolve, reject) => {
      completionWaiters.current.set(transferId, { resolve, reject });
    });
  }, []);

  const batches = useMemo(() => {
    const grouped = new Map();

    for (const transfer of transfers) {
      const existing = grouped.get(transfer.batchId);
      const transferredBytes = Math.min(
        transfer.fileSize,
        (transfer.fileSize * Math.max(0, transfer.progress || 0)) / 100
      );

      if (!existing) {
        grouped.set(transfer.batchId, {
          id: transfer.batchId,
          peerId: transfer.peerId,
          direction: transfer.direction,
          totalFiles: 1,
          totalBytes: transfer.fileSize,
          transferredBytes,
          completedFiles: transfer.status === 'completed' ? 1 : 0,
          failedFiles: transfer.status === 'error' ? 1 : 0,
          files: [transfer.id],
          createdAt: transfer.createdAt || transfer.startTime || Date.now(),
        });
        continue;
      }

      existing.totalFiles += 1;
      existing.totalBytes += transfer.fileSize;
      existing.transferredBytes += transferredBytes;
      existing.completedFiles += transfer.status === 'completed' ? 1 : 0;
      existing.failedFiles += transfer.status === 'error' ? 1 : 0;
      existing.files.push(transfer.id);
    }

    return Array.from(grouped.values())
      .map((batch) => {
        let status = 'waiting';
        const batchTransfers = transfers.filter((transfer) => transfer.batchId === batch.id);

        if (batch.failedFiles > 0 && batch.completedFiles + batch.failedFiles === batch.totalFiles) {
          status = batch.completedFiles > 0 ? 'partial' : 'error';
        } else if (batch.completedFiles === batch.totalFiles) {
          status = 'completed';
        } else if (batchTransfers.some((transfer) => transfer.status === 'transferring' || transfer.status === 'connecting')) {
          status = 'transferring';
        } else if (batchTransfers.some((transfer) => transfer.status === 'queued')) {
          status = 'queued';
        }

        return {
          ...batch,
          progress: batch.totalBytes > 0
            ? (batch.transferredBytes / batch.totalBytes) * 100
            : (batch.completedFiles === batch.totalFiles ? 100 : 0),
          status,
        };
      })
      .sort((a, b) => b.createdAt - a.createdAt);
  }, [transfers]);

  const markTransfer = useCallback((transferId, updates) => {
    setTransfers((prev) => prev.map((transfer) => (
      transfer.id === transferId ? { ...transfer, ...updates } : transfer
    )));
  }, []);

  const processPeerQueue = useCallback(async (remotePeerId) => {
    if (activeTransfers.current.has(remotePeerId)) return;

    const queue = peerQueues.current.get(remotePeerId) || [];
    if (queue.length === 0) return;

    const nextTransferId = queue.shift();
    peerQueues.current.set(remotePeerId, queue);
    activeTransfers.current.set(remotePeerId, nextTransferId);

    try {
      const pending = pendingFiles.current.get(nextTransferId);
      if (!pending) return;

      const { batchId, file } = pending;
      const completionPromise = waitForCompletion(nextTransferId);

      markTransfer(nextTransferId, {
        status: 'connecting',
        error: null,
        progress: 0,
        speed: 0,
        startTime: Date.now(),
      });

      await connectToPeer(remotePeerId);

      markTransfer(nextTransferId, {
        status: 'transferring',
        startTime: Date.now(),
      });

      const totalChunks = Math.ceil(file.size / CHUNK_SIZE);

      if (!sendToPeer(remotePeerId, {
        type: 'file-start',
        batchId,
        transferId: nextTransferId,
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type,
        totalChunks,
        chunkSize: CHUNK_SIZE,
      })) {
        throw new Error('Unable to send file metadata');
      }

      for (let index = 0; index < totalChunks; index++) {
        const start = index * CHUNK_SIZE;
        const end = Math.min(start + CHUNK_SIZE, file.size);
        const chunk = await file.slice(start, end).arrayBuffer();

        if (!sendToPeer(remotePeerId, {
          type: 'file-chunk',
          batchId,
          transferId: nextTransferId,
          index,
          data: chunk,
        })) {
          throw new Error('Unable to send file chunk');
        }

        if ((index + 1) % SEND_YIELD_INTERVAL === 0) {
          await new Promise((resolve) => setTimeout(resolve, 0));
        }
      }

      if (!sendToPeer(remotePeerId, {
        type: 'file-complete',
        batchId,
        transferId: nextTransferId,
      })) {
        throw new Error('Unable to finalize file transfer');
      }

      if (totalChunks === 0) {
        await new Promise((resolve) => setTimeout(resolve, 0));
      }

      await completionPromise;
    } catch (err) {
      console.error('[Transfer] Send error:', err);
      rejectCompletion(nextTransferId, err);
      markTransfer(nextTransferId, {
        status: 'error',
        error: err.message || 'Transfer failed',
        speed: 0,
      });
    } finally {
      pendingFiles.current.delete(nextTransferId);
      activeTransfers.current.delete(remotePeerId);
      void processPeerQueue(remotePeerId);
    }
  }, [connectToPeer, markTransfer, rejectCompletion, sendToPeer, waitForCompletion]);

  const requestSendBatch = useCallback((remotePeerId, files) => {
    const batchId = createTransferId();
    const createdAt = Date.now();
    const normalizedFiles = [];
    const nextTransfers = [];

    for (const file of files) {
      const transferId = createTransferId();
      pendingFiles.current.set(transferId, { batchId, remotePeerId, file });

      nextTransfers.push({
        id: transferId,
        batchId,
        peerId: remotePeerId,
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type,
        direction: 'send',
        progress: 0,
        speed: 0,
        status: 'waiting',
        createdAt,
        startTime: createdAt,
      });

      normalizedFiles.push({
        transferId,
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type,
        lastModified: file.lastModified || null,
      });
    }

    setTransfers((prev) => [...prev, ...nextTransfers]);

    return {
      batchId,
      files: normalizedFiles,
      totalFiles: normalizedFiles.length,
      totalBytes: normalizedFiles.reduce((sum, file) => sum + file.fileSize, 0),
    };
  }, []);

  const enqueueAcceptedTransfers = useCallback((remotePeerId, transferIds) => {
    if (!transferIds?.length) return;

    const queue = peerQueues.current.get(remotePeerId) || [];

    for (const transferId of transferIds) {
      const isKnown = pendingFiles.current.has(transferId);
      const isQueued = queue.includes(transferId);
      const isActive = activeTransfers.current.get(remotePeerId) === transferId;

      if (!isKnown || isQueued || isActive) continue;
      queue.push(transferId);
      markTransfer(transferId, { status: 'queued', error: null });
    }

    peerQueues.current.set(remotePeerId, queue);
    void processPeerQueue(remotePeerId);
  }, [markTransfer, processPeerQueue]);

  const rejectTransfers = useCallback((transferIds, errorMessage = 'Transfer declined by receiver') => {
    for (const transferId of transferIds) {
      const pending = pendingFiles.current.get(transferId);
      pendingFiles.current.delete(transferId);
      rejectCompletion(transferId, errorMessage);

      if (pending) {
        const queue = peerQueues.current.get(pending.remotePeerId) || [];
        peerQueues.current.set(
          pending.remotePeerId,
          queue.filter((queuedId) => queuedId !== transferId)
        );
      }

      markTransfer(transferId, {
        status: 'error',
        error: errorMessage,
        speed: 0,
      });
    }
  }, [markTransfer, rejectCompletion]);

  const handleIncomingData = useCallback((fromPeerId, data) => {
    if (!data?.type) return;

    switch (data.type) {
      case 'file-start': {
        receivingBuffers.current.set(data.transferId, {
          info: data,
          chunks: new Array(data.totalChunks),
          receivedCount: 0,
          receivedBytes: 0,
          startTime: Date.now(),
        });

        setTransfers((prev) => upsertTransfer(prev, {
          id: data.transferId,
          batchId: data.batchId || data.transferId,
          peerId: fromPeerId,
          fileName: data.fileName,
          fileSize: data.fileSize,
          fileType: data.fileType,
          direction: 'receive',
          progress: 0,
          speed: 0,
          status: 'transferring',
          createdAt: Date.now(),
          startTime: Date.now(),
        }));
        break;
      }

      case 'file-chunk': {
        const buffer = receivingBuffers.current.get(data.transferId);
        if (!buffer) return;

        buffer.chunks[data.index] = data.data;
        buffer.receivedCount++;
        buffer.receivedBytes += data.data?.byteLength || 0;

        const progress = buffer.info.fileSize > 0
          ? Math.min(100, (buffer.receivedBytes / buffer.info.fileSize) * 100)
          : 100;
        const elapsed = (Date.now() - buffer.startTime) / 1000;
        const speed = elapsed > 0 ? buffer.receivedBytes / elapsed : 0;

        markTransfer(data.transferId, { progress, speed, status: 'transferring' });

        if (buffer.receivedCount % ACK_INTERVAL === 0) {
          sendToPeer(fromPeerId, {
            type: 'progress-ack',
            batchId: buffer.info.batchId,
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

        const blob = new Blob(buffer.chunks, { type: buffer.info.fileType });
        const url = URL.createObjectURL(blob);

        const a = document.createElement('a');
        a.href = url;
        a.download = buffer.info.fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        receivingBuffers.current.delete(data.transferId);

        markTransfer(data.transferId, {
          progress: 100,
          speed: 0,
          status: 'completed',
        });

        sendToPeer(fromPeerId, {
          type: 'progress-ack',
          batchId: buffer.info.batchId,
          transferId: data.transferId,
          progress: 100,
          speed: 0,
          completed: true,
        });
        break;
      }

      case 'progress-ack': {
        markTransfer(data.transferId, {
          progress: data.progress,
          speed: data.speed,
          status: data.completed ? 'completed' : 'transferring',
        });

        if (data.completed) {
          resolveCompletion(data.transferId);
        }
        break;
      }

      default:
        break;
    }
  }, [markTransfer, resolveCompletion, sendToPeer]);

  const removeTransfer = useCallback((transferId) => {
    const pending = pendingFiles.current.get(transferId);
    if (pending) {
      pendingFiles.current.delete(transferId);
      const queue = peerQueues.current.get(pending.remotePeerId) || [];
      peerQueues.current.set(
        pending.remotePeerId,
        queue.filter((queuedId) => queuedId !== transferId)
      );
    }

    setTransfers((prev) => prev.filter((transfer) => transfer.id !== transferId));
  }, []);

  const clearCompleted = useCallback(() => {
    setTransfers((prev) => prev.filter((transfer) => transfer.status !== 'completed' && transfer.status !== 'error'));
  }, []);

  return {
    batches,
    transfers,
    requestSendBatch,
    enqueueAcceptedTransfers,
    rejectTransfers,
    handleIncomingData,
    removeTransfer,
    clearCompleted,
  };
}
