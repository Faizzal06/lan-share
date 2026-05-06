import { formatFileSize } from '../utils/fileUtils';

export default function IncomingFileDialog({ request, onAccept, onReject }) {
  if (!request) return null;

  const files = request.files || [];
  const totalBytes = request.totalBytes || files.reduce((sum, file) => sum + (file.fileSize || 0), 0);

  return (
    <div className="modal-overlay" id="incoming-file-overlay">
      <div className="modal incoming-file-modal" id="incoming-file-modal">
        <div className="modal-header">
          <span className="material-symbols-outlined modal-icon">mail</span>
          <h2>File Masuk</h2>
        </div>

        <div className="modal-body">
          <p className="incoming-message">
            <strong>{request.fromDeviceName || 'Sebuah perangkat'}</strong> ingin mengirim {files.length > 1 ? `${files.length} file` : 'file'}:
          </p>

          <p className="incoming-message" style={{ marginTop: '-4px', marginBottom: '12px', opacity: 0.8 }}>
            Total ukuran: <strong>{formatFileSize(totalBytes)}</strong>
          </p>

          <div className="file-preview-list" style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '200px', overflowY: 'auto', paddingRight: '4px' }}>
            {files.map((file, idx) => (
              <div className="file-preview" key={idx} style={{ padding: '8px 12px', margin: 0 }}>
                <div className="file-preview-icon" style={{ padding: '6px' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>description</span>
                </div>
                <div className="file-preview-info">
                  <span className="file-preview-name" style={{ fontSize: '14px' }}>{file.fileName}</span>
                  <span className="file-preview-size" style={{ fontSize: '12px' }}>{formatFileSize(file.fileSize)}</span>
                  {file.fileType && (
                    <span className="file-preview-type" style={{ fontSize: '10px' }}>{file.fileType}</span>
                  )}
                </div>
              </div>
            ))}
            
            {/* Fallback for backward compatibility just in case */}
            {files.length === 0 && request.fileName && (
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
            )}
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
