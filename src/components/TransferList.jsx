import { formatFileSize, formatSpeed, formatETA, getFileCategory } from '../utils/fileUtils';

// Maps file category to Material Symbols icon name
const categoryIcons = {
  document: 'description',
  spreadsheet: 'table_chart',
  presentation: 'slideshow',
  image: 'image',
  video: 'movie',
  audio: 'music_note',
  archive: 'folder_zip',
  code: 'code',
  file: 'draft',
};

export default function TransferList({ batches = [], transfers, onRemove, onClearCompleted }) {
  if (transfers.length === 0) return null;

  const hasCompleted = transfers.some(t => t.status === 'completed' || t.status === 'error');
  const visibleBatches = batches.length > 0
    ? batches
    : [{ id: 'single-batch', totalFiles: transfers.length, totalBytes: transfers.reduce((sum, transfer) => sum + transfer.fileSize, 0), progress: 0, status: 'transferring' }];

  return (
    <div className="transfer-list" id="transfer-list">
      <div className="transfer-list-header">
        <h2 className="transfer-list-title">
          <span className="material-symbols-outlined">sync</span>
          Transfer Aktif
        </h2>
        {hasCompleted && (
          <button className="clear-btn" onClick={onClearCompleted} id="clear-completed-btn">
            Hapus yang selesai
          </button>
        )}
      </div>

      <div className="transfer-items">
        {visibleBatches.map((batch) => (
          <TransferBatch
            key={batch.id}
            batch={batch}
            transfers={transfers.filter((transfer) => transfer.batchId === batch.id || batch.id === 'single-batch')}
            onRemove={onRemove}
          />
        ))}
      </div>
    </div>
  );
}

function TransferBatch({ batch, transfers, onRemove }) {
  const progress = Math.round(batch.progress || 0);

  return (
    <div className={`transfer-batch ${batch.status || 'waiting'}`} style={{ marginBottom: '16px' }}>
      <div className="transfer-item" style={{ marginBottom: '10px' }}>
        <div className="transfer-item-icon">
          <span className="material-symbols-outlined">folder</span>
        </div>

        <div className="transfer-item-details">
          <div className="transfer-item-name">
            <span className="file-name">{batch.totalFiles} file</span>
            <span className="file-size">{formatFileSize(batch.totalBytes || 0)}</span>
          </div>

          <div className="transfer-item-meta">
            <span className={`direction-badge ${batch.direction || 'send'}`}>
              {batch.direction === 'receive' ? '↓ Batch Masuk' : '↑ Batch Kirim'}
            </span>
            <span className="transfer-speed">
              {batch.completedFiles || 0}/{batch.totalFiles} selesai
            </span>
            {batch.failedFiles > 0 && (
              <span className="transfer-error">✕ {batch.failedFiles} gagal</span>
            )}
          </div>

          <div className="progress-bar-wrapper">
            <div
              className={`progress-bar-fill ${batch.status === 'completed' ? 'complete' : ''} ${batch.status === 'error' ? 'error' : ''}`}
              style={{ width: `${progress}%` }}
            ></div>
          </div>
        </div>

        <div className="transfer-percentage">{progress}%</div>
      </div>

      {transfers.map((transfer) => (
        <TransferItem key={transfer.id} transfer={transfer} onRemove={onRemove} />
      ))}
    </div>
  );
}

function TransferItem({ transfer, onRemove }) {
  const category = getFileCategory(transfer.fileType, transfer.fileName);
  const iconName = categoryIcons[category] || 'draft';
  const progress = Math.round(transfer.progress);
  const isComplete = transfer.status === 'completed';
  const isError = transfer.status === 'error';
  const isWaiting = transfer.status === 'waiting' || transfer.status === 'queued' || transfer.status === 'connecting';

  const remainingBytes = transfer.fileSize - ((transfer.progress / 100) * transfer.fileSize);
  const eta = transfer.speed > 0 ? remainingBytes / transfer.speed : 0;

  return (
    <div className={`transfer-item ${transfer.status}`} id={`transfer-${transfer.id}`}>
      <div className="transfer-item-icon">
        <span className="material-symbols-outlined">{iconName}</span>
      </div>

      <div className="transfer-item-details">
        <div className="transfer-item-name">
          <span className="file-name">{transfer.fileName}</span>
          <span className="file-size">{formatFileSize(transfer.fileSize)}</span>
        </div>

        <div className="transfer-item-meta">
          <span className={`direction-badge ${transfer.direction}`}>
            {transfer.direction === 'send' ? '↑ Mengirim' : '↓ Menerima'}
          </span>

          {transfer.status === 'waiting' && (
            <span className="transfer-waiting">⏳ Menunggu persetujuan...</span>
          )}

          {transfer.status === 'queued' && (
            <span className="transfer-waiting">⏳ Masuk antrean pengiriman...</span>
          )}

          {transfer.status === 'connecting' && (
            <span className="transfer-waiting">⏳ Menyiapkan koneksi...</span>
          )}

          {transfer.status === 'transferring' && (
            <>
              <span className="transfer-speed">{formatSpeed(transfer.speed)}</span>
              <span className="transfer-eta">Estimasi: {formatETA(eta)}</span>
            </>
          )}

          {isComplete && <span className="transfer-done">✓ Selesai</span>}
          {isError && <span className="transfer-error">✕ {transfer.error || 'Gagal'}</span>}
        </div>

        <div className="progress-bar-wrapper">
          <div
            className={`progress-bar-fill ${isComplete ? 'complete' : ''} ${isError ? 'error' : ''} ${isWaiting ? '' : ''}`}
            style={{ width: `${progress}%` }}
          ></div>
        </div>
      </div>

      <div className="transfer-percentage">{progress}%</div>

      {(isComplete || isError) && (
        <button
          className="transfer-remove-btn"
          onClick={() => onRemove(transfer.id)}
          title="Tutup"
        >
          ✕
        </button>
      )}
    </div>
  );
}
