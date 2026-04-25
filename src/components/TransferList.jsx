import { formatFileSize, formatSpeed, formatETA, getFileCategory, getFileIcon } from '../utils/fileUtils';

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

export default function TransferList({ transfers, onRemove, onClearCompleted }) {
  if (transfers.length === 0) return null;

  const hasCompleted = transfers.some(t => t.status === 'completed' || t.status === 'error');

  return (
    <div className="transfer-list" id="transfer-list">
      <div className="transfer-list-header">
        <h2 className="transfer-list-title">
          <span className="material-symbols-outlined">sync</span>
          Active Transfers
        </h2>
        {hasCompleted && (
          <button className="clear-btn" onClick={onClearCompleted} id="clear-completed-btn">
            Clear completed
          </button>
        )}
      </div>

      <div className="transfer-items">
        {transfers.map((transfer) => (
          <TransferItem key={transfer.id} transfer={transfer} onRemove={onRemove} />
        ))}
      </div>
    </div>
  );
}

function TransferItem({ transfer, onRemove }) {
  const category = getFileCategory(transfer.fileType, transfer.fileName);
  const iconName = categoryIcons[category] || 'draft';
  const progress = Math.round(transfer.progress);
  const isComplete = transfer.status === 'completed';
  const isError = transfer.status === 'error';

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
            {transfer.direction === 'send' ? '↑ Sending' : '↓ Receiving'}
          </span>

          {transfer.status === 'transferring' && (
            <>
              <span className="transfer-speed">{formatSpeed(transfer.speed)}</span>
              <span className="transfer-eta">ETA: {formatETA(eta)}</span>
            </>
          )}

          {isComplete && <span className="transfer-done">✓ Complete</span>}
          {isError && <span className="transfer-error">✗ Failed</span>}
        </div>

        <div className="progress-bar-wrapper">
          <div
            className={`progress-bar-fill ${isComplete ? 'complete' : ''} ${isError ? 'error' : ''}`}
            style={{ width: `${progress}%` }}
          ></div>
        </div>
      </div>

      <div className="transfer-percentage">{progress}%</div>

      {(isComplete || isError) && (
        <button
          className="transfer-remove-btn"
          onClick={() => onRemove(transfer.id)}
          title="Dismiss"
        >
          ✕
        </button>
      )}
    </div>
  );
}
