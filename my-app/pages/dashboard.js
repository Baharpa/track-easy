import useSWR from 'swr';
import Link from 'next/link';
import { Badge, Button, Card, Col, Row } from 'react-bootstrap';
import PageHeader from '../components/PageHeader';
import RouteGuard from '../components/RouteGuard';
import NutritionSummary from '../components/NutritionSummary';
import GoalProgress from '../components/GoalProgress';
import FoodImage from '../components/FoodImage';
import { EmptyMessage, ErrorMessage, LoadingMessage } from '../components/StateMessage';
import { formatCalories, formatMacro } from '../lib/formatNutrition';
import { normalizeMealCategory } from '../lib/mealCategoryHelpers';

export default function Dashboard() {
  const { data: today, error: todayError } = useSWR('/api/tracker/today');
  const { data: goals, error: goalsError } = useSWR('/api/user/goals');
  const { data: meals, error: mealsError } = useSWR('/api/meals');
  const recentMeals = (meals || []).slice(0, 3);

  return <RouteGuard>
    <PageHeader title="Dashboard" text="📊 Your food tracking overview for today." />
    {(todayError || goalsError || mealsError) && <ErrorMessage text="Failed to load dashboard data." />}
    {(!today || !goals || !meals) && !(todayError || goalsError || mealsError) && <LoadingMessage text="Loading dashboard..." />}

    {today && <NutritionSummary item={today} />}
    {today && goals && meals && <Row className="dashboard-grid">
      <Col md={5}>
        <Card className="page-card dashboard-panel goal-card">
          <h4>📊 Goal Progress</h4>
          <GoalProgress label="Calories" current={today.totalCalories} goal={goals.calorieGoal} />
          <GoalProgress label="Protein" current={today.totalProtein} goal={goals.proteinGoal} />
          <GoalProgress label="Carbs" current={today.totalCarbs} goal={goals.carbsGoal} />
          <GoalProgress label="Fats" current={today.totalFats} goal={goals.fatsGoal} />
          <GoalProgress label="Sugar" current={today.totalSugar} goal={goals.sugarGoal} />
        </Card>
      </Col>
      <Col md={3}>
        <Card className="page-card dashboard-panel quick-actions-card">
          <h4>Quick Actions</h4>
          <Button as={Link} href="/ingredients/add" variant="success" className="quick-action-button">Add Ingredient</Button>
          <Button as={Link} href="/create-meal-component" variant="warning" className="quick-action-button">Create Meal</Button>
          <Button as={Link} href="/tracker" variant="outline-success" className="quick-action-button">Log Meal</Button>
        </Card>
      </Col>
      <Col md={4}>
        <Card className="page-card dashboard-panel recent-meals-card">
          <h4>🍽️ Recent Meals</h4>
          {recentMeals.length === 0 && <EmptyMessage text="No meals yet." />}
          {recentMeals.length > 0 && <div className="recent-meal-list">{recentMeals.map(meal => {
            const mealCategory = normalizeMealCategory(meal.category);
            return (
            <Link href={`/meals/${meal._id}`} className="recent-meal-card" key={meal._id}>
              <FoodImage src={meal.imageUrl} alt={meal.name} category={mealCategory} className="recent-meal-thumb" placeholderClassName="meal-placeholder-thumb" />
              <div>
                <strong>{meal.name}</strong>
                <div className="meal-stat-row">
                  <span>🔥 {formatCalories(meal.totalCalories)} cal</span>
                  <span>💪 {formatMacro(meal.totalProtein)}g</span>
                  <span>🍬 {formatMacro(meal.totalSugar)}g</span>
                </div>
                <Badge className="soft-pill soft-pill-beige">{mealCategory}</Badge>
              </div>
            </Link>
          );})}</div>}
        </Card>
      </Col>
    </Row>}
  </RouteGuard>;
}
