import { Button, Modal } from 'react-bootstrap';

export default function ConfirmDeleteModal({ show, title, message, onCancel, onConfirm }) {
  return (
    <Modal show={show} onHide={onCancel} centered>
      <Modal.Header closeButton>
        <Modal.Title>{title || 'Confirm Delete'}</Modal.Title>
      </Modal.Header>
      <Modal.Body>{message || 'Are you sure you want to delete this item?'}</Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={onCancel}>Cancel</Button>
        <Button variant="danger" onClick={onConfirm}>Delete</Button>
      </Modal.Footer>
    </Modal>
  );
}
