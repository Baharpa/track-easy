import useSWR from 'swr';
import Link from 'next/link';
import { Button, Card, Col, Row } from 'react-bootstrap';
import PageHeader from '../components/PageHeader';
import RouteGuard from '../components/RouteGuard';
import { ErrorMessage, LoadingMessage } from '../components/StateMessage';
import { formatCalories, formatMacro } from '../lib/formatNutrition';
import { NUTRITION_ICONS } from '../lib/foodVisuals';

function getNutritionStats(today) {
  return [
    { label: 'Calories', value: formatCalories(today?.totalCalories), unit: 'cal', current: today?.totalCalories, goalKey: 'calorieGoal' },
    { label: 'Protein', value: formatMacro(today?.totalProtein), unit: 'g', current: today?.totalProtein, goalKey: 'proteinGoal' },
    { label: 'Carbs', value: formatMacro(today?.totalCarbs), unit: 'g', current: today?.totalCarbs, goalKey: 'carbsGoal' },
    { label: 'Fats', value: formatMacro(today?.totalFats), unit: 'g', current: today?.totalFats, goalKey: 'fatsGoal' },
    { label: 'Sugar', value: formatMacro(today?.totalSugar), unit: 'g', current: today?.totalSugar, goalKey: 'sugarGoal' }
  ];
}

function formatGoalValue(label, value) {
  return label === 'Calories' ? formatCalories(value) : formatMacro(value);
}

export default function Dashboard() {
  const { data: today, error: todayError } = useSWR('/api/tracker/today');
  const { data: goals, error: goalsError } = useSWR('/api/user/goals');
  const stats = getNutritionStats(today);

  return <RouteGuard>
    <div className="dashboard-compact">
      <PageHeader title="Dashboard" text="📊 Today at a glance." />
      {(todayError || goalsError) && <ErrorMessage text="Failed to load dashboard data." />}
      {(!today || !goals) && !(todayError || goalsError) && <LoadingMessage text="Loading dashboard..." />}

      {today && <Card className="page-card dashboard-stat-strip">
        {stats.map(stat => (
          <div className="dashboard-stat-cell" key={stat.label}>
            <span className="dashboard-stat-icon">{NUTRITION_ICONS[stat.label]}</span>
            <span className="dashboard-stat-label">{stat.label}</span>
            <strong>{stat.value}<small>{stat.unit}</small></strong>
          </div>
        ))}
      </Card>}

      {today && goals && <Row className="dashboard-grid dashboard-home-grid">
        <Col lg={8}>
          <Card className="page-card dashboard-panel dashboard-goal-card">
            <h4>{NUTRITION_ICONS.Calories} Goal Progress</h4>
            <div className="dashboard-goal-list">
              {stats.map(stat => {
                const goal = Number(goals[stat.goalKey]) || 0;
                const current = Number(stat.current) || 0;
                const percent = goal > 0 ? Math.min(100, Math.round((current / goal) * 100)) : 0;
                return (
                  <div className={`dashboard-goal-row dashboard-goal-${stat.label.toLowerCase()}`} key={stat.label}>
                    <div className="dashboard-goal-row-top">
                      <span><span className="dashboard-goal-icon">{NUTRITION_ICONS[stat.label]}</span>{stat.label}</span>
                      <strong>{goal > 0 ? `${formatGoalValue(stat.label, current)} / ${formatGoalValue(stat.label, goal)}${stat.unit === 'g' ? 'g' : ''}` : `${stat.value}${stat.unit} logged`}</strong>
                    </div>
                    <div className="dashboard-goal-track">
                      <span style={{ width: `${percent}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        </Col>
        <Col lg={4}>
          <Card className="page-card dashboard-panel dashboard-actions-compact">
            <h4>Quick Actions</h4>
            <Button as={Link} href="/ingredients/add" variant="success" className="quick-action-button">Add Ingredient</Button>
            <Button as={Link} href="/create-meal-component" variant="warning" className="quick-action-button">Create Meal</Button>
            <Button as={Link} href="/tracker" variant="outline-success" className="quick-action-button">Log Meal</Button>
          </Card>
        </Col>
      </Row>}
    </div>
  </RouteGuard>;
}
