import { Button, Modal } from 'react-bootstrap';

export default function UnsavedChangesModal({
  show,
  onKeepEditing,
  onDiscardChanges,
  onSaveDraft
}) {
  return (
    <Modal show={show} onHide={onKeepEditing} centered contentClassName="confirm-delete-modal-content">
      <Modal.Header closeButton>
        <Modal.Title>Discard unsaved changes?</Modal.Title>
      </Modal.Header>
      <Modal.Body>You have unsaved changes. Are you sure you want to leave without saving?</Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={onKeepEditing}>Keep editing</Button>
        <Button variant="danger" onClick={onDiscardChanges}>Discard changes</Button>
        {onSaveDraft && <Button variant="success" onClick={onSaveDraft}>Save draft</Button>}
      </Modal.Footer>
    </Modal>
  );
}
