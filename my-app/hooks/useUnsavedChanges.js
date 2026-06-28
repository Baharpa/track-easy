import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/router';

export default function useUnsavedChanges(isDirty, { enabled = true, onDiscard } = {}) {
  const router = useRouter();
  const [showModal, setShowModal] = useState(false);
  const dirtyRef = useRef(Boolean(isDirty));
  const allowNavigationRef = useRef(false);
  const pendingActionRef = useRef(null);

  useEffect(() => {
    dirtyRef.current = Boolean(isDirty);
    if (!isDirty) {
      pendingActionRef.current = null;
      setShowModal(false);
    }
  }, [isDirty]);

  useEffect(() => {
    if (!enabled) return;

    const handleRouteChangeStart = url => {
      if (!dirtyRef.current || allowNavigationRef.current) {
        return;
      }

      pendingActionRef.current = { type: 'push', url };
      setShowModal(true);
      const error = new Error('Route change cancelled due to unsaved changes.');
      error.cancelled = true;
      router.events.emit('routeChangeError', error, url, { shallow: false });
      throw error;
    };

    const handleRouteChangeComplete = () => {
      allowNavigationRef.current = false;
      pendingActionRef.current = null;
    };

    const handleBeforeUnload = event => {
      if (!dirtyRef.current) return undefined;
      event.preventDefault();
      event.returnValue = '';
      return '';
    };

    router.events.on('routeChangeStart', handleRouteChangeStart);
    router.events.on('routeChangeComplete', handleRouteChangeComplete);
    window.addEventListener('beforeunload', handleBeforeUnload);
    router.beforePopState(() => {
      if (!dirtyRef.current || allowNavigationRef.current) return true;
      pendingActionRef.current = { type: 'back' };
      setShowModal(true);
      return false;
    });

    return () => {
      router.events.off('routeChangeStart', handleRouteChangeStart);
      router.events.off('routeChangeComplete', handleRouteChangeComplete);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      router.beforePopState(() => true);
    };
  }, [enabled, router]);

  function keepEditing() {
    setShowModal(false);
    pendingActionRef.current = null;
  }

  function discardChanges() {
    const pending = pendingActionRef.current;
    allowNavigationRef.current = true;
    setShowModal(false);
    pendingActionRef.current = null;
    if (typeof onDiscard === 'function') {
      onDiscard();
    }

    if (pending?.type === 'back') {
      router.back();
      return;
    }

    if (pending?.url) {
      router.push(pending.url);
    }
  }

  function markSaved() {
    dirtyRef.current = false;
    allowNavigationRef.current = false;
    pendingActionRef.current = null;
    setShowModal(false);
  }

  return {
    showModal,
    keepEditing,
    discardChanges,
    markSaved
  };
}
