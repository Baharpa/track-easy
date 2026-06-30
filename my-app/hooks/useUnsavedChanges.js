import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/router';

export default function useUnsavedChanges(isDirty, { enabled = true, onDiscard, onSaveDraft } = {}) {
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

    const handleDocumentClick = event => {
      if (!dirtyRef.current || allowNavigationRef.current || event.defaultPrevented || event.button !== 0) return;
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const anchor = event.target.closest?.('a[href]');
      if (!anchor || anchor.target === '_blank' || anchor.hasAttribute('download')) return;
      const target = new URL(anchor.href, window.location.href);
      if (target.origin !== window.location.origin) return;
      event.preventDefault();
      event.stopPropagation();
      pendingActionRef.current = { type: 'push', url: `${target.pathname}${target.search}${target.hash}` };
      setShowModal(true);
    };

    const handleBeforeUnload = event => {
      if (!dirtyRef.current) return undefined;
      event.preventDefault();
      event.returnValue = '';
      return '';
    };

    document.addEventListener('click', handleDocumentClick, true);
    window.addEventListener('beforeunload', handleBeforeUnload);
    router.beforePopState(() => {
      if (!dirtyRef.current || allowNavigationRef.current) return true;
      pendingActionRef.current = { type: 'back' };
      setShowModal(true);
      return false;
    });

    return () => {
      document.removeEventListener('click', handleDocumentClick, true);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      router.beforePopState(() => true);
    };
  }, [enabled, router]);

  function keepEditing() {
    setShowModal(false);
    pendingActionRef.current = null;
  }

  function requestNavigation(action) {
    if (!dirtyRef.current || allowNavigationRef.current) {
      action();
      return;
    }
    pendingActionRef.current = { type: 'callback', action };
    setShowModal(true);
  }

  function continuePendingNavigation() {
    const pending = pendingActionRef.current;
    allowNavigationRef.current = true;
    setShowModal(false);
    pendingActionRef.current = null;

    if (pending?.type === 'back') {
      router.back();
      return;
    }

    if (pending?.type === 'callback') {
      pending.action();
      return;
    }

    if (pending?.url) {
      router.push(pending.url);
    }
  }

  function discardChanges() {
    if (typeof onDiscard === 'function') {
      onDiscard();
    }
    continuePendingNavigation();
  }

  async function saveDraft() {
    if (typeof onSaveDraft !== 'function') {
      discardChanges();
      return;
    }

    await onSaveDraft();
    continuePendingNavigation();
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
    saveDraft,
    markSaved,
    requestNavigation
  };
}
