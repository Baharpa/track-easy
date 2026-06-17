import { useEffect, useRef, useState } from 'react';
import { Button } from 'react-bootstrap';
import { uploadImage } from '../lib/api';

const MAX_IMAGE_SIZE = 5 * 1024 * 1024;

export default function MealImageUpload({ imageUrl, onUploaded }) {
  const inputRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState('');
  const [previewUrl, setPreviewUrl] = useState('');

  useEffect(() => () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
  }, [previewUrl]);

  async function handleFileChange(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    setMessage('');

    if (!file.type.startsWith('image/')) {
      setMessage('Please choose an image file.');
      event.target.value = '';
      return;
    }

    if (file.size > MAX_IMAGE_SIZE) {
      setMessage('Image must be 5MB or smaller.');
      event.target.value = '';
      return;
    }

    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(URL.createObjectURL(file));

    try {
      setUploading(true);
      const result = await uploadImage(file);
      onUploaded(result.imageUrl);
      setMessage('Photo uploaded.');
    } catch (err) {
      setMessage(err.message || 'Image upload failed.');
    } finally {
      setUploading(false);
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
        {uploading ? 'Uploading...' : 'Choose from camera/library'}
      </Button>
      {previewUrl && <img src={previewUrl} alt="Selected meal preview" className="meal-image-upload-preview" />}
      {imageUrl && <small className="meal-image-upload-status">Preview updates after upload.</small>}
      {message && <small className={`meal-image-upload-message ${message.includes('uploaded') ? 'success' : 'error'}`}>{message}</small>}
    </div>
  );
}
