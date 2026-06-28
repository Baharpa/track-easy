import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import useSWR, { useSWRConfig } from 'swr';
import { Alert, Button, Card, Col, Form, Modal, Row, Table } from 'react-bootstrap';
import AppBackButton from '../../components/AppBackButton';
import ConfirmDeleteModal from '../../components/ConfirmDeleteModal';
import PageHeader from '../../components/PageHeader';
import PortionSelector from '../../components/PortionSelector';
import RouteGuard from '../../components/RouteGuard';
import ServingAmountSelector from '../../components/ServingAmountSelector';
import UnsavedChangesModal from '../../components/UnsavedChangesModal';
import useUnsavedChanges from '../../hooks/useUnsavedChanges';
import { ErrorMessage, LoadingMessage } from '../../components/StateMessage';
import { apiFetch } from '../../lib/api';
import { calculateNutritionWithUnit } from '../../lib/unitConverter';
import { formatAmount, formatCalories, formatMacro } from '../../lib/formatNutrition';
import { getIngredientServingNutrition } from '../../lib/formatNutrition';

function isIngredientLog(log) {
  return log?.type === 'ingredient' || Boolean(log?.ingredientId);
}

function whole(value) {
  return Math.round(Number(value) || 0);
}

export default function LoggedMealDetail() {
  const router = useRouter();
  const { id, mode, date } = router.query;
  const { mutate } = useSWRConfig();
  const logDateQuery = typeof date === 'string' ? `?date=${encodeURIComponent(date)}` : '';
  const logDetailPath = id ? `/api/tracker/log/${id}${logDateQuery}` : null;
  const logPageHref = id ? `/logs/${id}${logDateQuery}` : '';
  const logEditHref = id ? `/logs/${id}?${new URLSearchParams({ ...(typeof date === 'string' ? { date } : {}), mode: 'edit' }).toString()}` : '';
  const { data: log, error } = useSWR(logDetailPath);
  const { data: ingredient } = useSWR(log?.ingredientId ? `/api/ingredients/${log.ingredientId}` : null);
  const { data: meal } = useSWR(log?.mealId ? `/api/meals/${log.mealId}` : null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');
  const [ingredientAmount, setIngredientAmount] = useState('');
  const [ingredientUnit, setIngredientUnit] = useState('grams');
  const [portion, setPortion] = useState(1);
  const [portionLabel, setPortionLabel] = useState('1 whole meal');
  const [initializedLogId, setInitializedLogId] = useState('');

  const editMode = mode === 'edit';
  const ingredientPreview = ingredient && ingredientAmount
    ? calculateNutritionWithUnit(Number(ingredientAmount), ingredientUnit, ingredient)
    : getIngredientServingNutrition(ingredient || {});
  const canEditMeal = Boolean(log && !isIngredientLog(log) && !log.componentPortions?.length && log.portionLabel !== 'custom component amounts');
  const isDirty = editMode && (
    (isIngredientLog(log) && (
      String(ingredientAmount) !== String(log?.amount ?? log?.quantityUsed ?? '')
      || String(ingredientUnit) !== String(log?.unit || ingredient?.unit || 'grams')
    ))
    || (canEditMeal && (Number(portion) !== Number(log?.portion || log?.servings || 1) || String(portionLabel) !== String(log?.portionLabel || '1 whole meal')))
  );
  const { showModal, keepEditing, discardChanges, markSaved } = useUnsavedChanges(isDirty);

  useEffect(() => {
    if (!log) return;
    if (!editMode) {
      setInitializedLogId('');
      return;
    }
    if (initializedLogId === log._id) return;

    if (isIngredientLog(log)) {
      setIngredientAmount(String(log.amount ?? log.quantityUsed ?? ''));
      setIngredientUnit(log.unit || ingredient?.unit || 'grams');
    } else {
      setPortion(Number(log.portion || log.servings || 1));
      setPortionLabel(log.portionLabel || '1 whole meal');
    }
    setInitializedLogId(log._id);
  }, [editMode, ingredient?.unit, initializedLogId, log]);

  const nutritionRows = useMemo(() => {
    if (!log) return [];
    return [
      { label: 'Calories', value: `${whole(log.calories)} cal` },
      { label: 'Protein', value: `${whole(log.protein)}g` },
      { label: 'Carbs', value: `${whole(log.carbs)}g` },
      { label: 'Sugar', value: `${whole(log.sugar)}g` },
      { label: 'Fats', value: `${whole(log.fats)}g` }
    ];
  }, [log]);

  if (!id || (!log && !error)) {
    return <RouteGuard><LoadingMessage text="Loading..." /></RouteGuard>;
  }

  if (!log) {
    return <RouteGuard><ErrorMessage text="Logged food not found." /></RouteGuard>;
  }

  const loggedFoodName = log.name || ingredient?.name || meal?.name || 'Logged food';
  const showIngredientEditor = editMode && isIngredientLog(log);
  const showMealEditor = editMode && canEditMeal && !isIngredientLog(log);

  async function handleSaveIngredient() {
    if (!ingredient || !ingredientAmount || Number(ingredientAmount) <= 0) return;

    await apiFetch(logDetailPath, {
      method: 'PUT',
      body: JSON.stringify({
        amount: Number(ingredientAmount),
        unit: ingredientUnit
      })
    });

    markSaved();
    await mutate('/api/tracker/today');
    await mutate(key => typeof key === 'string' && key.startsWith('/api/tracker/week'));
    router.replace(logPageHref);
  }

  async function handleSaveMeal() {
    await apiFetch(logDetailPath, {
      method: 'PUT',
      body: JSON.stringify({
        portion,
        portionLabel
      })
    });

    markSaved();
    await mutate('/api/tracker/today');
    await mutate(key => typeof key === 'string' && key.startsWith('/api/tracker/week'));
    router.replace(logPageHref);
  }

  async function handleDelete() {
    setIsDeleting(true);
    setDeleteError('');
    try {
      await apiFetch(logDetailPath, { method: 'DELETE' });
      await mutate('/api/tracker/today');
      await mutate(key => typeof key === 'string' && key.startsWith('/api/tracker/week'));
      router.push('/tracker');
    } catch (err) {
      setDeleteError(err.message || 'Failed to delete logged food.');
      setIsDeleting(false);
    }
  }

  return <RouteGuard>
    <AppBackButton href="/history" label="Back to Tracker" />
    <PageHeader
      title={loggedFoodName}
      text={editMode ? 'Update this logged item.' : `Logged ${isIngredientLog(log) ? 'ingredient' : 'meal'}: ${log.portionLabel || log.servings || `${formatAmount(log.amount || 0)} ${log.unit || ''}`}`}
    />

    <Card className="page-card p-4 mb-4">
      <div className="d-flex justify-content-between align-items-start gap-3 flex-wrap">
        <div>
          <h4 className="mb-2">Nutrition Details</h4>
          <div className="food-info-card__subtitle mb-0">
            {isIngredientLog(log)
              ? `Ingredient: ${ingredient?.name || log.name || 'Logged ingredient'}`
              : `Meal: ${meal?.name || log.name || 'Logged meal'}`}
          </div>
        </div>
        {!editMode && (
          <Button as={Link} href={logEditHref} variant="outline-success">Edit log</Button>
        )}
      </div>

      <Row className="mt-3">
        {nutritionRows.map(item => (
          <Col xs={6} sm={4} key={item.label} className="mt-3 mt-sm-0 mb-1">
            <div className="text-center">
              <div className={`log-stat-value log-stat-${item.label.toLowerCase()}`}>
                {item.value}
              </div>
              <small className="text-muted">{item.label}</small>
            </div>
          </Col>
        ))}
      </Row>
    </Card>

    {showIngredientEditor && ingredient && (
      <Card className="page-card p-4 mb-4">
        <h4>Edit Log</h4>
        <ServingAmountSelector
          amount={ingredientAmount}
          onAmountChange={setIngredientAmount}
          unit={ingredientUnit}
          onUnitChange={setIngredientUnit}
          nutrition={ingredientPreview}
          customLabel="Logged amount"
          amountLabel="Amount"
          conversionWarning=""
        />
        <div className="d-flex gap-2">
          <Button variant="success" onClick={handleSaveIngredient}>Save</Button>
          <Button variant="outline-secondary" onClick={() => router.replace(logPageHref)}>Cancel</Button>
        </div>
      </Card>
    )}

    {showMealEditor && meal && (
      <Card className="page-card p-4 mb-4">
        <h4>Edit Log</h4>
        <PortionSelector value={portion} onChange={({ portion: nextPortion, portionLabel: nextLabel }) => {
          setPortion(nextPortion);
          setPortionLabel(nextLabel || '');
        }} />
        <div className="d-flex gap-2">
          <Button variant="success" onClick={handleSaveMeal}>Save</Button>
          <Button variant="outline-secondary" onClick={() => router.replace(logPageHref)}>Cancel</Button>
        </div>
      </Card>
    )}

    {editMode && !showIngredientEditor && !showMealEditor && (
      <Alert variant="info" className="mb-4">
        This logged item cannot be edited here.
      </Alert>
    )}

    {!editMode && log.components?.length > 0 && (
      <Card className="page-card p-4 mb-4">
        <h4>Component Breakdown</h4>
        <Table responsive hover>
          <thead><tr><th>Component</th><th>Eaten Amount</th><th>Calories</th><th>Protein</th></tr></thead>
          <tbody>
            {log.components.map((component, index) => (
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

    {!editMode && log.ingredients?.length > 0 && (
      <Card className="page-card p-4 mb-4">
        <h4>Ingredient Breakdown</h4>
        <Table responsive hover>
          <thead><tr><th>Ingredient</th><th>Amount</th><th>Calories</th><th>Protein</th><th>Carbs</th><th>Fats</th><th>Sugar</th></tr></thead>
          <tbody>
            {log.ingredients.map((item, index) => (
              <tr key={index}>
                <td>{item.name}</td>
                <td>{formatAmount(item.quantityUsed || 0)} {item.unit || 'grams'}</td>
                <td>{formatCalories(item.calories || 0)}</td>
                <td>{formatMacro(item.protein || 0)}g</td>
                <td>{formatMacro(item.carbs || 0)}g</td>
                <td>{formatMacro(item.fats || 0)}g</td>
                <td>{formatMacro(item.sugar || 0)}g</td>
              </tr>
            ))}
          </tbody>
        </Table>
      </Card>
    )}

    {!editMode && (
      <Card className="page-card p-4 mb-4 border-danger">
        <h4>Danger Zone</h4>
        <p className="text-muted">Once you delete this logged food, it cannot be recovered.</p>
        <Button variant="danger" onClick={() => setShowDeleteModal(true)}>Delete Logged Food</Button>
      </Card>
    )}

    <ConfirmDeleteModal
      show={showDeleteModal}
      title="Delete Logged Food?"
      message="Are you sure you want to delete this logged food?"
      onCancel={() => setShowDeleteModal(false)}
      onConfirm={handleDelete}
      confirmLabel={isDeleting ? 'Deleting...' : 'Delete'}
      confirmVariant="danger"
      confirmDisabled={isDeleting}
    />

    <UnsavedChangesModal
      show={showModal}
      onKeepEditing={keepEditing}
      onDiscardChanges={discardChanges}
    />
  </RouteGuard>;
}
