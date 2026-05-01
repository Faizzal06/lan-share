import { useState, useRef, useEffect } from 'react';

/**
 * Dialog for composing text to send to a peer.
 * Also used for displaying received text with a copy-to-clipboard button.
 */
export function SendTextDialog({ targetPeerId, targetDeviceName, onSend, onClose }) {
  const [text, setText] = useState('');
  const textareaRef = useRef(null);

  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  const handleSend = () => {
    const trimmed = text.trim();
    if (!trimmed) return;
    onSend(targetPeerId, trimmed);
    onClose();
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      handleSend();
    }
  };

  const handlePasteFromClipboard = async () => {
    try {
      const clipText = await navigator.clipboard.readText();
      if (clipText) {
        setText(prev => prev + clipText);
      }
    } catch {
      // Clipboard access denied
    }
  };

  return (
    <div className="modal-overlay" id="send-text-overlay" onClick={onClose}>
      <div className="modal text-share-modal" id="send-text-modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <span className="material-symbols-outlined modal-icon text-icon">chat</span>
          <div>
            <h2>Kirim Teks</h2>
            <span className="text-modal-subtitle">
              Ke <strong>{targetDeviceName || 'Perangkat'}</strong>
            </span>
          </div>
        </div>

        <div className="modal-body">
          <div className="text-compose-area">
            <textarea
              ref={textareaRef}
              className="text-compose-input"
              placeholder="Ketik atau tempel teks di sini..."
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={handleKeyDown}
              rows={6}
              id="send-text-input"
            />
            <div className="text-compose-toolbar">
              <button
                className="text-toolbar-btn"
                onClick={handlePasteFromClipboard}
                title="Tempel dari clipboard"
                id="paste-clipboard-btn"
              >
                <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>content_paste</span>
                <span>Tempel</span>
              </button>
              <span className="text-char-count">{text.length} karakter</span>
            </div>
          </div>
          <p className="text-compose-hint">
            <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>info</span>
            Ctrl + Enter untuk mengirim
          </p>
        </div>

        <div className="modal-actions">
          <button className="btn btn-reject" onClick={onClose} id="cancel-text-btn">
            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>close</span>
            Batal
          </button>
          <button
            className="btn btn-accept"
            onClick={handleSend}
            disabled={!text.trim()}
            id="confirm-send-text-btn"
          >
            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>send</span>
            Kirim
          </button>
        </div>
      </div>
    </div>
  );
}

export function IncomingTextDialog({ request, onCopy, onClose }) {
  if (!request) return null;

  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(request.text);
      setCopied(true);
      if (onCopy) onCopy();
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback: select text in a temp textarea
      const ta = document.createElement('textarea');
      ta.value = request.text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      setCopied(true);
      if (onCopy) onCopy();
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="modal-overlay" id="incoming-text-overlay" onClick={onClose}>
      <div className="modal text-share-modal" id="incoming-text-modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <span className="material-symbols-outlined modal-icon text-icon-receive">mark_chat_read</span>
          <div>
            <h2>Teks Masuk</h2>
            <span className="text-modal-subtitle">
              Dari <strong>{request.fromDeviceName || 'Perangkat'}</strong>
            </span>
          </div>
        </div>

        <div className="modal-body">
          <div className="text-preview-area">
            <pre className="text-preview-content" id="incoming-text-content">{request.text}</pre>
          </div>
          <div className="text-preview-meta">
            <span className="text-char-count">{request.text.length} karakter</span>
          </div>
        </div>

        <div className="modal-actions">
          <button className="btn btn-reject" onClick={onClose} id="dismiss-text-btn">
            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>close</span>
            Tutup
          </button>
          <button
            className={`btn btn-accept ${copied ? 'copied' : ''}`}
            onClick={handleCopy}
            id="copy-text-btn"
          >
            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
              {copied ? 'check' : 'content_copy'}
            </span>
            {copied ? 'Tersalin!' : 'Salin'}
          </button>
        </div>
      </div>
    </div>
  );
}
