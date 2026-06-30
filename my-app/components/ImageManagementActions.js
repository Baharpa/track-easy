import { useState } from 'react';
import { Alert, Button } from 'react-bootstrap';
import { useSWRConfig } from 'swr';
import { apiFetch } from '../lib/api';

const autoSources = new Set(['pexels-auto', 'pexels-refresh']);

export default function ImageManagementActions({ item, itemType, onChanged }) {
  const { mutate } = useSWRConfig();
  const [busyAction, setBusyAction] = useState('');
  const [error, setError] = useState('');
  const itemId = item?._id;
  const collection = itemType === 'ingredient' ? 'ingredients' : 'meals';
  const hasImage = Boolean(item?.imageUrl || item?.image || item?.photoUrl);
  const isAutoImage = autoSources.has(item?.imageSource)
    || (!item?.imageSource && item?.imageAttribution?.provider === 'Pexels');
  const isManualImage = hasImage && !isAutoImage;

  if (!itemId) return null;

  async function refreshCaches(updated) {
    await mutate(`/api/${collection}/${itemId}`, updated, false);
    await mutate(`/api/${collection}`);
    await mutate('/api/tracker/today');
    await mutate((key) => typeof key === 'string' && key.startsWith('/api/tracker/week'));
  }

  async function refreshImage() {
    const confirmReplace = isManualImage
      ? window.confirm('Replace current image?')
      : true;
    if (!confirmReplace) return;

    setBusyAction('refresh');
    setError('');
    try {
      const updated = await apiFetch(`/api/${collection}/${itemId}/image/refresh`, {
        method: 'POST',
        body: JSON.stringify({ confirmReplace })
      });
      onChanged(updated);
      await refreshCaches(updated);
    } catch (requestError) {
      setError(requestError.message || 'Could not refresh image.');
    } finally {
      setBusyAction('');
    }
  }

  async function removeImage() {
    if (!window.confirm('Remove current image?')) return;
    setBusyAction('remove');
    setError('');
    try {
      const updated = await apiFetch(`/api/${collection}/${itemId}/image`, { method: 'DELETE' });
      onChanged(updated);
      await refreshCaches(updated);
    } catch (requestError) {
      setError(requestError.message || 'Could not remove image.');
    } finally {
      setBusyAction('');
    }
  }

  return (
    <div className="image-management-actions">
      <div className="image-management-buttons">
        <Button type="button" variant="outline-success" size="sm" disabled={Boolean(busyAction)} onClick={refreshImage}>
          {busyAction === 'refresh' ? 'Finding image...' : 'Refresh image'}
        </Button>
        {hasImage && (
          <Button type="button" variant="outline-danger" size="sm" disabled={Boolean(busyAction)} onClick={removeImage}>
            {busyAction === 'remove' ? 'Removing...' : 'Remove image'}
          </Button>
        )}
      </div>
      {error && <Alert variant="danger" className="image-management-error">{error}</Alert>}
    </div>
  );
}
