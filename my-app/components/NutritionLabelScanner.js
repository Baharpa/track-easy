import { useRef, useState } from 'react';
import { Button, Spinner, Toast, ToastContainer } from 'react-bootstrap';
import { scanNutritionLabel } from '../lib/api';
import { TrackEasyIcon } from './TrackEasyIcons';

const MAX_IMAGE_SIZE = 8 * 1024 * 1024;

function isLikelyImageFile(file) {
  const fileName = file?.name?.toLowerCase() || '';
  const mimeType = file?.type || '';
  return (
    mimeType.startsWith('image/') ||
    /\.(png|jpe?g|gif|webp|bmp|tiff?)$/.test(fileName)
  );
}

function buildToast(message, variant = 'success') {
  return {
    show: true,
    message,
    variant,
    key: `${variant}-${Date.now()}`,
    title: variant === 'success' ? 'Scan complete' : 'Scan error'
  };
}

export default function NutritionLabelScanner({ onDetected }) {
  const inputRef = useRef(null);
  const [scanning, setScanning] = useState(false);
  const [toast, setToast] = useState({ show: false, message: '', variant: 'success', key: 'idle', title: '' });

  async function handleFileChange(event) {
    const file = event.target.files?.[0];
    event.target.value = '';

    if (!file) return;

    if (!isLikelyImageFile(file)) {
      setToast(buildToast('Please choose a photo of a nutrition label.', 'danger'));
      return;
    }

    if (file.size > MAX_IMAGE_SIZE) {
      setToast(buildToast('Image must be 8MB or smaller.', 'danger'));
      return;
    }

    setScanning(true);

    try {
      const result = await scanNutritionLabel(file);
      onDetected?.(result);
      setToast(buildToast('Nutrition values detected.', 'success'));
    } catch (error) {
      setToast(buildToast(error.message || 'Nutrition scan failed.', 'danger'));
    } finally {
      setScanning(false);
    }
  }

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="nutrition-scan-input"
        onChange={handleFileChange}
      />
      <Button
        type="button"
        variant="outline-success"
        className="nutrition-scan-button"
        disabled={scanning}
        onClick={() => inputRef.current?.click()}
      >
        {scanning ? (
          <>
            <Spinner as="span" animation="border" size="sm" role="status" aria-hidden="true" />
            <span>Scanning...</span>
          </>
        ) : (
          <>
            <TrackEasyIcon name="camera" size={14} />
            <span>Scan for Auto Fill</span>
          </>
        )}
      </Button>

      <ToastContainer position="top-end" className="nutrition-scan-toast-container">
        <Toast
          show={toast.show}
          onClose={() => setToast(current => ({ ...current, show: false }))}
          autohide
          delay={3500}
          className={`nutrition-scan-toast ${toast.variant}`}
          key={toast.key}
        >
          <Toast.Header closeButton={false}>
            <strong className="me-auto">{toast.title}</strong>
          </Toast.Header>
          <Toast.Body>{toast.message}</Toast.Body>
        </Toast>
      </ToastContainer>
    </>
  );
}
