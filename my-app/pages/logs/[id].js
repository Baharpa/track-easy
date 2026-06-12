import { useState } from 'react';
import { useRouter } from 'next/router';
import useSWR from 'swr';
import { Alert, Button, Card, Col, Form, Modal, Row, Table } from 'react-bootstrap';
import Link from 'next/link';
import PageHeader from '../../components/PageHeader';
import RouteGuard from '../../components/RouteGuard';
import { ErrorMessage, LoadingMessage } from '../../components/StateMessage';
import { apiFetch } from '../../lib/api';
import { formatAmount, formatCalories, formatMacro } from '../../lib/formatNutrition';

export default function LoggedMealDetail() {
  const router = useRouter();
  const { id } = router.query;
  const { data: today, mutate: mutateToday, error: todayError } = useSWR('/api/tracker/today');
  const [isEditing, setIsEditing] = useState(false);
  const [newPortion, setNewPortion] = useState('');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  if (!id || !today) return <RouteGuard><LoadingMessage text="Loading..." /></RouteGuard>;

  const loggedMeal = today.meals?.find(m => String(m._id) === String(id));
  if (!loggedMeal) {
    console.error('Meal not found. ID:', id, 'Available meals:', today.meals?.map(m => ({ id: m._id, name: m.name })));
    return <RouteGuard><ErrorMessage text="Logged meal not found." /></RouteGuard>;
  }

  const portionOptions = [
    { value: 1, label: '1 whole meal' },
    { value: 0.5, label: '1/2 meal' },
    { value: 0.333, label: '1/3 meal' },
    { value: 0.25, label: '1/4 meal' },
    { value: 0.167, label: '1/6 meal' },
    { value: 0.125, label: '1/8 meal' },
    { value: 0.083, label: '1/12 meal' }
  ];

  async function handleSaveEdit() {
    const portionNum = parseFloat(newPortion);
    if (!portionNum || portionNum <= 0) {
      alert('Please enter a valid portion.');
      return;
    }

    const portionOption = portionOptions.find(p => p.value === portionNum);
    const portionLabel = portionOption?.label || `${portionNum}× meal`;

    await apiFetch(`/api/tracker/log/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ portion: portionNum, portionLabel })
    });

    mutateToday();
    setIsEditing(false);
  }

  async function handleDelete() {
    setIsDeleting(true);
    setDeleteError('');
    try {
      const response = await apiFetch(`/api/tracker/log/${id}`, { method: 'DELETE' });
      if (!response || response.error) {
        setDeleteError('Failed to delete meal. Please try again.');
        setIsDeleting(false);
        return;
      }
      await mutateToday();
      setIsDeleting(false);
      router.push('/daily-tracker');
    } catch (err) {
      console.error('Delete error:', err);
      setDeleteError(err.message || 'Failed to delete meal');
      setIsDeleting(false);
    }
  }

  return <RouteGuard>
    <PageHeader title={loggedMeal.name} text={`Logged: ${loggedMeal.portionLabel || loggedMeal.servings}`} />

    <Card className="page-card p-4 mb-4">
      <h4>Nutrition Details</h4>
      <Row className="mt-3">
        <Col xs={6} sm={4}>
          <div className="text-center">
            <div className="log-stat-value log-stat-calories">
              {formatCalories(loggedMeal.calories)}
            </div>
            <small className="text-muted">Calories</small>
          </div>
        </Col>
        <Col xs={6} sm={4}>
          <div className="text-center">
            <div className="log-stat-value log-stat-protein">
              {formatMacro(loggedMeal.protein)}g
            </div>
            <small className="text-muted">Protein</small>
          </div>
        </Col>
        <Col xs={6} sm={4}>
          <div className="text-center">
            <div className="log-stat-value log-stat-carbs">
              {formatMacro(loggedMeal.carbs)}g
            </div>
            <small className="text-muted">Carbs</small>
          </div>
        </Col>
        <Col xs={6} sm={4} className="mt-3">
          <div className="text-center">
            <div className="log-stat-value log-stat-fats">
              {formatMacro(loggedMeal.fats)}g
            </div>
            <small className="text-muted">Fats</small>
          </div>
        </Col>
        <Col xs={6} sm={4} className="mt-3">
          <div className="text-center">
            <div className="log-stat-value log-stat-sugar">
              {formatMacro(loggedMeal.sugar)}g
            </div>
            <small className="text-muted">Sugar</small>
          </div>
        </Col>
      </Row>
    </Card>

    {loggedMeal.components?.length > 0 && (
      <Card className="page-card p-4 mb-4">
        <h4>Component Breakdown</h4>
        <Table responsive hover>
          <thead><tr><th>Component</th><th>Eaten Amount</th><th>Calories</th><th>Protein</th></tr></thead>
          <tbody>
            {loggedMeal.components.map((component, index) => (
              <tr key={index}>
                <td>{component.name}</td>
                <td>{formatAmount(component.eatenWeight || 0)} {component.unit || 'grams'}</td>
                <td>{formatCalories(component.nutritionTotals?.calories || 0)}</td>
                <td>{formatMacro(component.nutritionTotals?.protein || 0)}g</td>
              </tr>
            ))}
          </tbody>
        </Table>
      </Card>
    )}

    {loggedMeal.ingredients?.length > 0 && (
      <Card className="page-card p-4 mb-4">
        <h4>Ingredient Breakdown</h4>
        <Table responsive hover>
          <thead><tr><th>Ingredient</th><th>Amount</th><th>Calories</th><th>Protein</th><th>Carbs</th><th>Fats</th><th>Sugar</th></tr></thead>
          <tbody>
            {loggedMeal.ingredients.map((ingredient, index) => (
              <tr key={index}>
                <td>{ingredient.name}</td>
                <td>{formatAmount(ingredient.quantityUsed || 0)} {ingredient.unit || 'grams'}</td>
                <td>{formatCalories(ingredient.calories || 0)}</td>
                <td>{formatMacro(ingredient.protein || 0)}g</td>
                <td>{formatMacro(ingredient.carbs || 0)}g</td>
                <td>{formatMacro(ingredient.fats || 0)}g</td>
                <td>{formatMacro(ingredient.sugar || 0)}g</td>
              </tr>
            ))}
          </tbody>
        </Table>
      </Card>
    )}

    {/* Edit Portion Card */}
    <Card className="page-card p-4 mb-4">
      <h4>Edit Portion</h4>
      {isEditing ? (
        <>
          <Form.Group className="mb-3">
            <Form.Label>New Portion</Form.Label>
            <Form.Select value={newPortion} onChange={(e) => setNewPortion(e.target.value)}>
              <option value="">Choose portion</option>
              {portionOptions.map(opt => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </Form.Select>
          </Form.Group>
          <div className="d-flex gap-2">
            <Button variant="success" onClick={handleSaveEdit}>Save</Button>
            <Button variant="outline-secondary" onClick={() => setIsEditing(false)}>Cancel</Button>
          </div>
        </>
      ) : (
        <>
          <p>Current portion: <strong>{loggedMeal.portionLabel || loggedMeal.servings}</strong></p>
          <Button variant="primary" onClick={() => setIsEditing(true)}>Edit Portion</Button>
        </>
      )}
    </Card>

    {/* Delete Card */}
    <Card className="page-card p-4 mb-4 border-danger">
      <h4>Danger Zone</h4>
      <p className="text-muted">Once you delete this logged meal, it cannot be recovered.</p>
      <Button variant="danger" onClick={() => setShowDeleteModal(true)}>Delete Logged Meal</Button>
    </Card>

    {/* Back Button */}
    <Link href="/daily-tracker">
      <Button variant="outline-secondary">Back to Daily Tracker</Button>
    </Link>

    {/* Delete Confirmation Modal */}
    <Modal show={showDeleteModal} onHide={() => setShowDeleteModal(false)} centered>
      <Modal.Header closeButton>
        <Modal.Title>Delete Logged Meal?</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <p>Are you sure you want to delete this logged meal?</p>
        <p className="text-muted">This action cannot be undone.</p>
        {deleteError && <Alert variant="danger">{deleteError}</Alert>}
      </Modal.Body>
      <Modal.Footer>
        <Button variant="outline-secondary" onClick={() => setShowDeleteModal(false)} disabled={isDeleting}>Cancel</Button>
        <Button variant="danger" onClick={handleDelete} disabled={isDeleting}>
          {isDeleting ? 'Deleting...' : 'Delete'}
        </Button>
      </Modal.Footer>
    </Modal>
  </RouteGuard>;
}
