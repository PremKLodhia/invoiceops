import React, { useState, useRef, useEffect, type ChangeEvent, type DragEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Upload, X, FileText, AlertCircle, CheckCircle2, Loader2, Trash2 } from 'lucide-react';
import { api, ApiError } from '../../api/client';
import { Button } from '../ui';
import styles from './InvoiceUploadModal.module.css';

interface InvoiceUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10MB
const ALLOWED_MIME_TYPES = ['application/pdf', 'image/png', 'image/jpeg', 'image/jpg'];
const ALLOWED_EXTENSIONS = ['.pdf', '.png', '.jpg', '.jpeg'];

type UploadState = 'idle' | 'uploading' | 'processing' | 'success' | 'error';

export const InvoiceUploadModal: React.FC<InvoiceUploadModalProps> = ({ isOpen, onClose }) => {
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [uploadState, setUploadState] = useState<UploadState>('idle');
  const [progressPercent, setProgressPercent] = useState<number>(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && uploadState !== 'uploading' && uploadState !== 'processing') {
        onClose();
      }
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, uploadState, onClose]);

  if (!isOpen) return null;

  const validateFile = (file: File): string | null => {
    const extension = `.${file.name.split('.').pop()?.toLowerCase()}`;
    const isValidType = ALLOWED_MIME_TYPES.includes(file.type) || ALLOWED_EXTENSIONS.includes(extension);

    if (!isValidType) {
      return `Unsupported file format "${file.name}". Please upload a digital PDF, PNG, or JPEG invoice.`;
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      const sizeMB = (file.size / (1024 * 1024)).toFixed(1);
      return `File size (${sizeMB} MB) exceeds maximum allowed limit of 10 MB.`;
    }

    return null;
  };

  const handleFile = (file: File) => {
    setErrorMessage(null);
    const validationError = validateFile(file);
    if (validationError) {
      setErrorMessage(validationError);
      setSelectedFile(null);
      return;
    }
    setSelectedFile(file);
  };

  const handleDrag = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (uploadState === 'uploading' || uploadState === 'processing') return;

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  const handleUploadSubmit = async () => {
    if (!selectedFile) return;

    setErrorMessage(null);
    setUploadState('uploading');
    setProgressPercent(25);

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);

      // Advance progress state to reflect extraction pipeline
      const progressTimer = setTimeout(() => {
        setProgressPercent(65);
        setUploadState('processing');
      }, 500);

      const response = await api.post<{ id?: string; invoiceId?: string } | { data?: { id?: string } }>(
        '/invoices/upload',
        formData
      );

      clearTimeout(progressTimer);
      setProgressPercent(100);
      setUploadState('success');

      // Extract new invoice ID or fallback to standard review path
      const invoiceId =
        (response && 'id' in response && response.id) ||
        (response && 'invoiceId' in response && response.invoiceId) ||
        (response && 'data' in response && response.data && 'id' in response.data && response.data.id) ||
        'inv_new';

      setTimeout(() => {
        onClose();
        navigate(`/invoices/${invoiceId}`);
      }, 600);
    } catch (err: unknown) {
      setUploadState('error');
      setProgressPercent(0);
      const msg =
        err instanceof ApiError
          ? err.message
          : err instanceof Error
          ? err.message
          : 'Failed to upload and extract invoice document. Please try again.';
      setErrorMessage(msg);
    }
  };

  const resetSelection = () => {
    setSelectedFile(null);
    setErrorMessage(null);
    setUploadState('idle');
    setProgressPercent(0);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const isWorking = uploadState === 'uploading' || uploadState === 'processing';

  return (
    <div className={styles.overlay} onClick={() => !isWorking && onClose()}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <div className={styles.titleArea}>
            <Upload size={16} />
            <h2 className={styles.title}>Ingest Invoices to Pipeline</h2>
          </div>
          {!isWorking && (
            <button
              type="button"
              className={styles.closeBtn}
              onClick={onClose}
              aria-label="Close modal"
            >
              <X size={16} />
            </button>
          )}
        </div>

        <div className={styles.body}>
          {errorMessage && (
            <div className={styles.errorBanner} role="alert">
              <AlertCircle size={16} className={styles.fileIcon} />
              <span>{errorMessage}</span>
            </div>
          )}

          {!selectedFile ? (
            <div
              className={`${styles.dropzone} ${dragActive ? styles.dropzoneActive : ''}`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              <div className={styles.dropIcon}>
                <Upload size={22} />
              </div>
              <div>
                <p className={styles.dropTextPrimary}>Click to browse or drag & drop invoice document</p>
                <p className={styles.dropTextSecondary}>
                  Supports PDFBox digital PDF, PNG, JPG scans (Up to 10MB)
                </p>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                className={styles.fileInput}
                accept=".pdf,.png,.jpg,.jpeg,application/pdf,image/png,image/jpeg"
                onChange={handleFileInputChange}
              />
            </div>
          ) : (
            <div className={styles.filePreviewCard}>
              <div className={styles.fileInfo}>
                <FileText size={28} className={styles.fileIcon} />
                <div className={styles.fileNameMeta}>
                  <span className={styles.fileName}>{selectedFile.name}</span>
                  <span className={styles.fileMeta}>
                    {(selectedFile.size / 1024).toFixed(1)} KB &bull; {selectedFile.type || 'Document'}
                  </span>
                </div>
              </div>

              {!isWorking && (
                <button
                  type="button"
                  className={styles.closeBtn}
                  onClick={resetSelection}
                  title="Remove selected file"
                >
                  <Trash2 size={16} />
                </button>
              )}
            </div>
          )}

          {isWorking && (
            <div className={styles.progressSection}>
              <div className={styles.progressLabelRow}>
                <span className={styles.progressStatus}>
                  <Loader2 size={14} className={styles.fileIcon} style={{ animation: 'spin 1s linear infinite' }} />
                  {uploadState === 'uploading' ? 'Uploading document...' : 'Running extraction pipeline...'}
                </span>
                <span>{progressPercent}%</span>
              </div>
              <div className={styles.progressBarBg}>
                <div
                  className={styles.progressBarFill}
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>
          )}

          {uploadState === 'success' && (
            <div className={styles.progressSection}>
              <div className={styles.progressLabelRow}>
                <span className={styles.progressStatus} style={{ color: 'var(--color-status-success)' }}>
                  <CheckCircle2 size={14} /> Extraction completed. Opening workspace...
                </span>
                <span>100%</span>
              </div>
            </div>
          )}
        </div>

        <div className={styles.footer}>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            disabled={isWorking}
          >
            Cancel
          </Button>

          <Button
            variant="primary"
            size="sm"
            disabled={!selectedFile || isWorking || uploadState === 'success'}
            isLoading={isWorking}
            onClick={handleUploadSubmit}
            leftIcon={<Upload size={13} />}
          >
            {isWorking ? 'Processing...' : 'Upload & Extract'}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default InvoiceUploadModal;
