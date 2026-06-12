import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import useSWR from 'swr';
import { Alert, Button, Card, Table } from 'react-bootstrap';
import PageHeader from '../components/PageHeader';
import RouteGuard from '../components/RouteGuard';
import NutritionSummary from '../components/NutritionSummary';
import { EmptyMessage, ErrorMessage, LoadingMessage } from '../components/StateMessage';
import { apiFetch } from '../lib/api';
import { addTotals, buildPreviewIngredients } from '../lib/mealMath';
import { formatAmount, formatCalories, formatMacro } from '../lib/formatNutrition';
import { normalizeMealCategory } from '../lib/mealCategoryHelpers';

export default function MealSummaryPage() {
  const router = useRouter();
  const { data: ingredients, error } = useSWR('/api/ingredients');
  const [pendingMeal, setPendingMeal] = useState(null);
  const [saveError, setSaveError] = useState('');

  useEffect(() => {
    const saved = localStorage.getItem('pendingMeal');
    if (saved) setPendingMeal(JSON.parse(saved));
  }, []);

  if (error) return <RouteGuard><ErrorMessage text="Failed to load ingredients for the summary." /></RouteGuard>;
  if (!ingredients) return <RouteGuard><LoadingMessage text="Loading meal summary..." /></RouteGuard>;
  if (!pendingMeal) return <RouteGuard><PageHeader title="Meal Summary" text="Preview a meal before saving." /><EmptyMessage text="No meal summary yet. Create a meal and click Preview Summary first." /></RouteGuard>;

  const previewIngredients = buildPreviewIngredients(ingredients, pendingMeal.ingredients || []);
  const totals = addTotals(previewIngredients);
  const summaryItem = {
    totalCalories: totals.calories,
    totalProtein: totals.protein,
    totalCarbs: totals.carbs,
    totalFats: totals.fats,
    totalSugar: totals.sugar
  };

  async function saveMeal() {
    try {
      setSaveError('');
      await apiFetch('/api/meals', { method: 'POST', body: JSON.stringify(pendingMeal) });
      localStorage.removeItem('pendingMeal');
      router.push('/meals');
    } catch (err) {
      setSaveError(err.message);
    }
  }

  return <RouteGuard>
    <PageHeader title="Meal Summary" text="Review ingredients, quantities, and totals before saving." />
    {saveError && <Alert variant="danger">{saveError}</Alert>}
    <Card className="page-card p-4 mb-4">
      <h4>{pendingMeal.name}</h4>
      <p className="text-muted mb-0">{normalizeMealCategory(pendingMeal.category)}</p>
    </Card>
    <NutritionSummary item={summaryItem} />
    <Card className="page-card p-4 mt-4">
      <h4>Selected Ingredients</h4>
      <Table responsive hover>
        <thead><tr><th>Name</th><th>Quantity</th><th>Calories</th><th>Protein</th><th>Carbs</th><th>Fats</th><th>Sugar</th></tr></thead>
        <tbody>{previewIngredients.map((item, index) => <tr key={index}><td>{item.name}</td><td>{formatAmount(item.originalQuantityUsed || item.quantityUsed)} {item.originalUnit || item.unit}</td><td>{formatCalories(item.calories)}</td><td>{formatMacro(item.protein)}g</td><td>{formatMacro(item.carbs)}g</td><td>{formatMacro(item.fats)}g</td><td>{formatMacro(item.sugar)}g</td></tr>)}</tbody>
      </Table>
      <div>
        <Button variant="success" className="me-2" onClick={saveMeal}>Save Meal</Button>
        <Button variant="outline-secondary" onClick={() => router.push('/create-meal-component')}>Back to Create Meal</Button>
      </div>
    </Card>
  </RouteGuard>;
}
