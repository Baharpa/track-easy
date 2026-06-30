import { useEffect, useRef, useState } from 'react';
import { Button } from 'react-bootstrap';
import { uploadImage } from '../lib/api';
import { getFoodImage } from '../lib/foodVisuals';

const MAX_UPLOAD_SIZE = 2 * 1024 * 1024;
const MAX_IMAGE_DIMENSION = 1200;
const IMAGE_QUALITY = 0.82;
const FALLBACK_IMAGE_QUALITY = 0.76;

function getCanvasSize(width, height) {
  const scale = Math.min(1, MAX_IMAGE_DIMENSION / width, MAX_IMAGE_DIMENSION / height);
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale))
  };
}

function canvasToBlob(canvas, quality) {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error('Could not compress this image.'));
    }, 'image/jpeg', quality);
  });
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
      reject(new Error('This image format is not supported. Please choose a JPEG, PNG, or WebP image.'));
    };

    image.src = objectUrl;
  });
}

async function compressImage(file) {
  if (!file.type.startsWith('image/') || file.type === 'image/svg+xml') {
    throw new Error('Please choose a JPEG, PNG, or WebP image.');
  }

  const image = await loadImage(file);
  const size = getCanvasSize(image.naturalWidth, image.naturalHeight);
  const canvas = document.createElement('canvas');
  canvas.width = size.width;
  canvas.height = size.height;

  const context = canvas.getContext('2d');
  if (!context) throw new Error('Could not prepare this image for upload.');

  context.drawImage(image, 0, 0, size.width, size.height);

  let blob = await canvasToBlob(canvas, IMAGE_QUALITY);
  if (blob.size > MAX_UPLOAD_SIZE) blob = await canvasToBlob(canvas, FALLBACK_IMAGE_QUALITY);
  if (blob.size > MAX_UPLOAD_SIZE) {
    throw new Error('Compressed image is still too large. Please choose a smaller photo.');
  }

  const baseName = file.name.replace(/\.[^.]+$/, '') || 'trackeasy-photo';
  return new File([blob], `${baseName}.jpg`, { type: 'image/jpeg' });
}

export default function MealImageUpload({ imageUrl, onUploaded, onUploadingChange, uploadType = 'meal' }) {
  const inputRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState('');
  const [previewUrl, setPreviewUrl] = useState('');
  const [previewFailed, setPreviewFailed] = useState(false);
  const displayUrl = previewUrl || getFoodImage(imageUrl);

  useEffect(() => () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
  }, [previewUrl]);

  useEffect(() => setPreviewFailed(false), [displayUrl]);

  function updateUploading(value) {
    setUploading(value);
    onUploadingChange?.(value);
  }

  async function handleFileChange(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    setMessage('');

    try {
      updateUploading(true);
      setMessage('Uploading photo...');
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      setPreviewUrl(URL.createObjectURL(file));
      const compressedFile = await compressImage(file);
      const result = await uploadImage(compressedFile, uploadType);
      onUploaded(result.imageUrl, result.publicId);
      setMessage('Photo uploaded.');
    } catch (err) {
      setMessage(err.message || 'Image upload failed.');
    } finally {
      updateUploading(false);
      event.target.value = '';
    }
  }

  return (
    <div className="meal-image-upload">
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="meal-image-upload-input"
        onChange={handleFileChange}
      />
      <Button
        type="button"
        variant="outline-success"
        className="meal-image-upload-button"
        disabled={uploading}
        onClick={() => inputRef.current?.click()}
      >
        {uploading ? 'Uploading photo...' : 'Choose from camera/library'}
      </Button>
      {displayUrl && !previewFailed && <img src={displayUrl} alt="Selected meal preview" className="meal-image-upload-preview" onError={() => setPreviewFailed(true)} />}
      {imageUrl && <small className="meal-image-upload-status">Preview updates after upload.</small>}
      {message && <small className={`meal-image-upload-message ${message.includes('uploaded') ? 'success' : 'error'}`}>{message}</small>}
    </div>
  );
}
