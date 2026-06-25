import { Button, Modal } from 'react-bootstrap';

export default function ConfirmDeleteModal({
  show,
  title,
  message,
  onCancel,
  onConfirm,
  confirmLabel = 'Delete',
  cancelLabel = 'Cancel',
  confirmVariant = 'danger'
}) {
  return (
    <Modal show={show} onHide={onCancel} centered contentClassName="confirm-delete-modal-content">
      <Modal.Header closeButton>
        <Modal.Title>{title || 'Confirm Delete'}</Modal.Title>
      </Modal.Header>
      <Modal.Body>{message || 'Are you sure you want to delete this item?'}</Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={onCancel}>{cancelLabel}</Button>
        <Button variant={confirmVariant} onClick={onConfirm}>{confirmLabel}</Button>
      </Modal.Footer>
    </Modal>
  );
}
