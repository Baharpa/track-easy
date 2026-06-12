import { useState } from 'react';
import useSWR from 'swr';
import { Card, Form, Table } from 'react-bootstrap';
import PageHeader from '../components/PageHeader';
import RouteGuard from '../components/RouteGuard';
import NutritionSummary from '../components/NutritionSummary';
import FoodImage from '../components/FoodImage';
import { EmptyMessage, ErrorMessage, LoadingMessage } from '../components/StateMessage';
import { formatAmount, formatCalories, formatMacro } from '../lib/formatNutrition';

export default function NutritionBreakdown() {
  const { data: meals, error } = useSWR('/api/meals');
  const [mealId, setMealId] = useState('');
  const meal = (meals || []).find(item => item._id === mealId) || (meals || [])[0];

  return <RouteGuard>
    <PageHeader title="Nutrition Breakdown" text="See meal, component, and ingredient-level nutrition calculations." />
    {error && <ErrorMessage text="Failed to load meals for nutrition breakdown." />}
    {!meals && !error && <LoadingMessage text="Loading nutrition breakdown..." />}
    {meals && meals.length === 0 && <EmptyMessage text="No meals yet. Create a meal to view a breakdown." />}
    {meals && meals.length > 0 && <>
      <Card className="page-card p-3 mb-4">
        <Form.Label>Choose Meal</Form.Label>
        <Form.Select value={meal?._id || ''} onChange={e => setMealId(e.target.value)}>
          {meals.map(item => <option key={item._id} value={item._id}>{item.name}</option>)}
        </Form.Select>
      </Card>

      {meal && <>
        <Card className="page-card p-4 mb-4">
          <h4>Meal-Level Totals</h4>
          <p className="text-muted">These totals come from adding all ingredient calculations together.</p>
        </Card>
        <NutritionSummary item={meal} />

        {meal.components?.length > 0 && <Card className="page-card p-4 mt-4">
          <h4>Component-Level Totals</h4>
          <Table responsive hover><thead><tr><th>Component</th><th>Original Weight</th><th>Calories</th><th>Protein</th><th>Carbs</th><th>Fats</th><th>Sugar</th></tr></thead><tbody>
            {meal.components.map((component, index) => <tr key={index}><td>{component.name}</td><td>{formatAmount(component.totalWeight)}g</td><td>{formatCalories(component.nutritionTotals?.calories)}</td><td>{formatMacro(component.nutritionTotals?.protein)}g</td><td>{formatMacro(component.nutritionTotals?.carbs)}g</td><td>{formatMacro(component.nutritionTotals?.fats)}g</td><td>{formatMacro(component.nutritionTotals?.sugar)}g</td></tr>)}
          </tbody></Table>
          <p className="text-muted small mb-0">When this meal is logged, eaten component amounts are divided proportionally across the original ingredients.</p>
        </Card>}

        <Card className="page-card p-4 mt-4">
          <h4>Ingredient-Level Calculations</h4>
          <p className="text-muted">Formula: nutrition values scale proportionally from the saved ingredient quantity and unit.</p>
          <Table responsive hover><thead><tr><th>Ingredient</th><th>Amount Used</th><th>Calories</th><th>Protein</th><th>Carbs</th><th>Fats</th><th>Sugar</th></tr></thead><tbody>
            {meal.ingredients.map((item, index) => <tr key={index}><td><div className="d-flex align-items-center gap-2"><FoodImage src={item.imageUrl} alt={item.name} category={item.category || 'Other'} /><span>{item.name}</span></div></td><td>{formatAmount(item.originalQuantityUsed || item.quantityUsed)} {item.originalUnit || item.unit}</td><td>{formatCalories(item.calories)}</td><td>{formatMacro(item.protein)}g</td><td>{formatMacro(item.carbs)}g</td><td>{formatMacro(item.fats)}g</td><td>{formatMacro(item.sugar)}g</td></tr>)}
          </tbody></Table>
        </Card>
      </>}
    </>}
  </RouteGuard>;
}
