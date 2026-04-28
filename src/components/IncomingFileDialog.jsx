import { formatFileSize } from '../utils/fileUtils';

export default function IncomingFileDialog({ request, onAccept, onReject }) {
  if (!request) return null;

  return (
    <div className="modal-overlay" id="incoming-file-overlay">
      <div className="modal incoming-file-modal" id="incoming-file-modal">
        <div className="modal-header">
          <span className="material-symbols-outlined modal-icon">mail</span>
          <h2>File Masuk</h2>
        </div>

        <div className="modal-body">
          <p className="incoming-message">
            <strong>{request.fromDeviceName || 'Sebuah perangkat'}</strong> ingin mengirim file:
          </p>

          <div className="file-preview">
            <div className="file-preview-icon">
              <span className="material-symbols-outlined">description</span>
            </div>
            <div className="file-preview-info">
              <span className="file-preview-name">{request.fileName}</span>
              <span className="file-preview-size">{formatFileSize(request.fileSize)}</span>
              {request.fileType && (
                <span className="file-preview-type">{request.fileType}</span>
              )}
            </div>
          </div>
        </div>

        <div className="modal-actions">
          <button
            className="btn btn-reject"
            onClick={onReject}
            id="reject-file-btn"
          >
            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>close</span>
            Tolak
          </button>
          <button
            className="btn btn-accept"
            onClick={onAccept}
            id="accept-file-btn"
          >
            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>check</span>
            Terima
          </button>
        </div>
      </div>
    </div>
  );
}
