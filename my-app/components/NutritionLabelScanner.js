import { useRef, useState } from 'react';
import { Button, Spinner, Toast, ToastContainer } from 'react-bootstrap';
import { scanNutritionLabel } from '../lib/api';
import { TrackEasyIcon } from './TrackEasyIcons';

const MAX_IMAGE_SIZE = 8 * 1024 * 1024;
const MAX_SCAN_DIMENSION = 1000;
const SCAN_IMAGE_QUALITY = 0.72;
const REQUIRED_FIELDS = ['calories', 'protein', 'fat', 'carbohydrates', 'sugar'];

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

function getCanvasSize(width, height) {
  const scale = Math.min(1, MAX_SCAN_DIMENSION / width, MAX_SCAN_DIMENSION / height);
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale))
  };
}

function loadImage(file) {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const image = new Image();

    image.onload = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(image);
    };

    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('Could not read this label photo.'));
    };

    image.src = objectUrl;
  });
}

function canvasToBlob(canvas) {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error('Could not prepare this label photo.'));
    }, 'image/jpeg', SCAN_IMAGE_QUALITY);
  });
}

async function prepareScanImage(file) {
  const image = await loadImage(file);
  const size = getCanvasSize(image.naturalWidth, image.naturalHeight);
  const canvas = document.createElement('canvas');
  canvas.width = size.width;
  canvas.height = size.height;

  const context = canvas.getContext('2d');
  if (!context) throw new Error('Could not prepare this label photo.');

  context.drawImage(image, 0, 0, size.width, size.height);
  const blob = await canvasToBlob(canvas);
  const baseName = file.name.replace(/\.[^.]+$/, '') || 'nutrition-label';
  return new File([blob], `${baseName}-scan.jpg`, { type: 'image/jpeg' });
}

function getMissingFields(result) {
  return REQUIRED_FIELDS.filter(field => result?.[field] === null || result?.[field] === undefined || result?.[field] === '');
}

export default function NutritionLabelScanner({ onDetected }) {
  const inputRef = useRef(null);
  const [scanning, setScanning] = useState(false);
  const [scanNote, setScanNote] = useState('');
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

    const logId = `nutrition-scan-${Date.now()}`;
    console.time(`${logId}: total`);
    setScanning(true);
    setScanNote('Preparing label photo...');

    try {
      console.time(`${logId}: frontend scan image preparation`);
      const preparedFile = await prepareScanImage(file);
      console.timeEnd(`${logId}: frontend scan image preparation`);
      console.info(`${logId}: compressed scan file size ${(preparedFile.size / 1024).toFixed(1)} KB`);

      setScanNote('Scanning label...');
      console.time(`${logId}: scan upload request`);
      const result = await scanNutritionLabel(preparedFile);
      console.timeEnd(`${logId}: scan upload request`);

      onDetected?.(result);
      const missingFields = getMissingFields(result);
      if (missingFields.length > 0) {
        setScanNote(`Please double-check scanned values. Missing: ${missingFields.join(', ')}.`);
        setToast(buildToast('Some values were not detected. Please review the form.', 'danger'));
      } else {
        setScanNote('Please double-check scanned values before saving.');
        setToast(buildToast('Nutrition values detected. Please review them before saving.', 'success'));
      }
    } catch (error) {
      setScanNote('');
      setToast(buildToast(error.message || 'Nutrition scan failed.', 'danger'));
    } finally {
      console.timeEnd(`${logId}: total`);
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
      {scanNote && <small className="nutrition-scan-note">{scanNote}</small>}

      <ToastContainer position="top-end" className="nutrition-scan-toast-container">
        <Toast
          show={toast.show}
          onClose={() => setToast(current => ({ ...current, show: false }))}
          autohide
          delay={4500}
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
