import { useEffect, useState } from 'react';
import { useSWRConfig } from 'swr';
import { Alert, Button, Form, Modal } from 'react-bootstrap';
import FoodImage from './FoodImage';
import { TrackEasyIcon } from './TrackEasyIcons';
import { apiFetch } from '../lib/api';
import { formatAmount, formatCalories, formatMacro } from '../lib/formatNutrition';
import { normalizeMealCategory } from '../lib/mealCategoryHelpers';

const PORTIONS = [1 / 24, 1 / 12, 1 / 8, 1 / 6, 1 / 4, 1 / 3, 1 / 2, 3 / 4, 1, 1.25, 1.5, 2, 3, 4, 5, 10];
const LABELS = ['1/24', '1/12', '1/8', '1/6', '1/4', '1/3', '1/2', '3/4', '1', '1.25', '1.5', '2', '3', '4', '5', '10'];

function mealWeight(meal) {
  if (!meal) return 0;
  if (Number(meal.totalWeight) > 0) return Number(meal.totalWeight);
  const parts = meal.mealParts?.length ? meal.mealParts : meal.components || [];
  const partWeight = parts.reduce((sum, part) => sum + Number(part?.totalWeight || 0), 0);
  if (partWeight > 0) return partWeight;
  return (meal.ingredients || []).reduce((sum, item) => sum + Number(item?.gramsUsed || 0), 0);
}

function wholeMealLabel(value, shortLabel) {
  if (value === 1) return '1 whole meal';
  if (value > 1) return `${shortLabel} whole meals`;
  return `${shortLabel} whole meal`;
}

export default function QuickAddMealModal({ meal, show, onHide, onLogged }) {
  const { mutate } = useSWRConfig();
  const [mode, setMode] = useState('whole');
  const [portionIndex, setPortionIndex] = useState(8);
  const [grams, setGrams] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const weight = mealWeight(meal);
  const portion = PORTIONS[portionIndex];
  const portionText = LABELS[portionIndex];
  const factor = mode === 'whole' ? portion : (weight > 0 ? Number(grams || 0) / weight : 0);
  const category = normalizeMealCategory(meal?.category);
  useEffect(() => {
    if (show) { setMode('whole'); setPortionIndex(8); setGrams(''); setError(''); }
  }, [show, meal?._id]);

  function close() { if (!saving) onHide(); }

  async function submit(event) {
    event.preventDefault();
    if (!meal?._id || saving) return;
    if (mode === 'grams' && (!weight || Number(grams) <= 0)) {
      setError(weight ? 'Enter an amount greater than 0.' : "Custom grams needs this meal's total weight.");
      return;
    }
    const portionLabel = mode === 'whole' ? wholeMealLabel(portion, portionText) : `${formatAmount(Number(grams))}g of meal`;
    setSaving(true); setError('');
    try {
      await apiFetch('/api/tracker/log', { method: 'POST', body: JSON.stringify({
        type: 'meal', mealId: meal._id, portion: factor, portionFactor: factor,
        portionMode: mode, portionLabel, ...(mode === 'grams' ? { loggedGrams: Number(grams) } : {}),
      }) });
      await mutate('/api/tracker/today');
      await mutate((key) => typeof key === 'string' && key.startsWith('/api/tracker/week'));
      onHide();
      if (onLogged) onLogged(`${meal.name} added to Tracker`);
    } catch (err) { setError(err.message || 'Could not add meal to tracker.'); }
    finally { setSaving(false); }
  }

  const metrics = [
    ['flame', formatCalories(meal?.totalCalories || 0), 'cal'], ['strength', formatMacro(meal?.totalProtein || 0), 'g protein'],
    ['leaf', formatMacro(meal?.totalCarbs || 0), 'g carbs'], ['drop', formatMacro(meal?.totalFats || 0), 'g fats'],
    ['cube', formatMacro(meal?.totalSugar || 0), 'g sugar'],
  ];

  return (
    <Modal
      show={show}
      onHide={close}
      dialogClassName="quick-add-modal"
      contentClassName="quick-add-modal-content"
      scrollable
    >
      <Form onSubmit={submit}>
        <Modal.Header className="quick-add-header">
          <Modal.Title>Quick Add</Modal.Title>
          <Button type="button" className="quick-add-close" onClick={close} aria-label="Close"><span aria-hidden="true">×</span></Button>
        </Modal.Header>
        <Modal.Body>
          {meal ? <>
            <div className="quick-add-food-header">
              <FoodImage src={meal} alt={meal?.name || 'Meal'} category={category} variant="card" className="quick-add-img" placeholderClassName="quick-add-placeholder" />
              <div><h3>{meal?.name || 'Meal'}</h3><p>{category}</p><div className="quick-add-metrics">{metrics.map(([icon, value, unit]) => <span key={unit}><TrackEasyIcon name={icon} size={17} />{value}{unit}</span>)}</div></div>
            </div>
            {error && <Alert variant="warning">{error}</Alert>}
            <div className="quick-add-mode" role="group" aria-label="Amount mode">
              <Button type="button" className={mode === 'whole' ? 'active' : ''} onClick={() => setMode('whole')}><TrackEasyIcon name="cube" size={20} />Whole meal</Button>
              <Button type="button" className={mode === 'grams' ? 'active' : ''} onClick={() => setMode('grams')}><TrackEasyIcon name="scale" size={20} />Custom amount</Button>
            </div>
            {mode === 'whole' ? <div className="quick-add-stepper">
              <Button type="button" onClick={() => setPortionIndex((value) => Math.max(0, value - 1))} disabled={portionIndex === 0}>−</Button>
              <strong>{portionText}</strong>
              <Button type="button" onClick={() => setPortionIndex((value) => Math.min(PORTIONS.length - 1, value + 1))} disabled={portionIndex === PORTIONS.length - 1}>+</Button>
            </div> : <div className="quick-add-grams"><Form.Control type="number" min="0" step="0.1" value={grams} onChange={(event) => setGrams(event.target.value)} placeholder="0" /><span>grams</span></div>}
            <p className="quick-add-help">{mode === 'whole' ? 'Choose how much of the full saved meal you ate.' : 'Enter the amount of the saved meal you ate.'}</p>
            {mode === 'grams' && !weight && <p className="quick-add-warning">Custom grams needs this meal's total weight.</p>}
          </> : null}
        </Modal.Body>
        <Modal.Footer className="quick-add-footer"><Button type="submit" variant="success" disabled={saving || (mode === 'grams' && (!weight || Number(grams) <= 0))}>{saving ? 'Adding...' : 'Add to Tracker'}</Button><Button type="button" variant="light" onClick={close}>Cancel</Button></Modal.Footer>
      </Form>
    </Modal>
  );
}
