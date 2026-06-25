import { useMemo } from 'react';
import Link from 'next/link';
import useSWR from 'swr';
import { Card } from 'react-bootstrap';
import LoggedFoodCard, { EmptyLoggedFoodCard } from '../components/LoggedFoodCard';
import RouteGuard from '../components/RouteGuard';
import { ErrorMessage, LoadingMessage } from '../components/StateMessage';
import { TrackEasyIcon } from '../components/TrackEasyIcons';
import { apiFetch } from '../lib/api';

const defaultGoals = {
  calorieGoal: 1700,
  proteinGoal: 150,
  carbsGoal: 100,
  fatsGoal: 75
};

const nutritionConfig = [
  { label: 'Calories', key: 'totalCalories', goalKey: 'calorieGoal', icon: 'flame', color: 'orange' },
  { label: 'Protein', key: 'totalProtein', goalKey: 'proteinGoal', icon: 'egg', color: 'purple' },
  { label: 'Carbs', key: 'totalCarbs', goalKey: 'carbsGoal', icon: 'grain', color: 'blue' },
  { label: 'Fats', key: 'totalFats', goalKey: 'fatsGoal', icon: 'drop', color: 'green' },
  { label: 'Sugar', key: 'totalSugar', goalKey: 'sugarGoal', icon: 'candy', color: 'pink' }
];

const goalRows = nutritionConfig.filter(item => item.label !== 'Sugar');

function whole(value) {
  return Math.round(Number(value) || 0);
}

function getGoal(goals, key) {
  const saved = Number(goals?.[key]);
  return saved > 0 ? saved : defaultGoals[key] || 0;
}

function getPercent(current, goal) {
  return goal > 0 ? Math.min(100, Math.round((Number(current) / goal) * 100)) : 0;
}

function getNutritionStats(today) {
  return nutritionConfig.map(item => ({
    ...item,
    value: whole(today?.[item.key]),
    current: Number(today?.[item.key]) || 0
  }));
}

function getOverallGoalPercent(stats, goals) {
  const percentages = goalRows.map(row => {
    const stat = stats.find(item => item.key === row.key);
    return getPercent(stat?.current || 0, getGoal(goals, row.goalKey));
  });

  if (percentages.length === 0) return 0;
  return Math.round(percentages.reduce((sum, percent) => sum + percent, 0) / percentages.length);
}

export default function Dashboard() {
  const { data: today, error: todayError, mutate: mutateToday } = useSWR('/api/tracker/today');
  const { data: goals, error: goalsError } = useSWR('/api/user/goals');
  const stats = useMemo(() => getNutritionStats(today), [today]);
  const overallPercent = useMemo(() => getOverallGoalPercent(stats, goals), [stats, goals]);
  const todaysFood = (today?.meals || []).slice(0, 5);

  async function removeLoggedFood(item) {
    await apiFetch(`/api/tracker/log/${item._id}`, { method: 'DELETE' });
    mutateToday();
  }

  return (
    <RouteGuard>
      <main className="dashboard-shell dashboard-home">
        <section className="dashboard-hero" aria-labelledby="dashboard-title">
          <span className="dashboard-eyebrow">Fresh Market Dashboard</span>
          <h1 id="dashboard-title">Track your day</h1>
        </section>

        {(todayError || goalsError) && <ErrorMessage text="Failed to load dashboard data." />}
        {(!today || !goals) && !(todayError || goalsError) && <LoadingMessage text="Loading your dashboard..." />}

        {today && goals && (
          <div className="dashboard-stack">
            <Card className="mindset-card">
              <div className="mindset-icon">
                <TrackEasyIcon name="sparkle" size={22} />
              </div>
              <div className="mindset-copy">
                <span>Today&apos;s Mindset</span>
                <p>Fresh food, calm tracking, and one good decision at a time.</p>
              </div>
              <div className="mindset-leaf mindset-leaf-one" />
              <div className="mindset-leaf mindset-leaf-two" />
            </Card>

            <section className="nutrition-section" aria-labelledby="nutrition-title">
              <div className="dashboard-section-header dashboard-section-header-tight">
                <span className="dashboard-section-kicker" id="nutrition-title">Today&apos;s Nutrition</span>
              </div>
              <div className="nutrition-stat-grid">
                {stats.map(stat => (
                  <Card className={`dashboard-nutrition-card nutrition-${stat.color}`} key={stat.label}>
                    <span className="dashboard-stat-icon">
                      <TrackEasyIcon name={stat.icon} size={16} />
                    </span>
                    <span className="dashboard-stat-label">{stat.label}</span>
                    <strong className="dashboard-stat-value">{stat.value}</strong>
                  </Card>
                ))}
              </div>
            </section>

            <Card className="goal-progress-card">
              <div className="dashboard-section-header goal-card-header">
                <span className="dashboard-section-kicker">Goal Progress</span>
                <Link href="/profile/goals" className="dashboard-section-link">Edit goals</Link>
              </div>

              <div className="goal-progress-top">
                <div className="goal-progress-copy">
                  <h2>Stay on pace</h2>
                  <p>You&apos;re off to a great start.</p>
                  <p>Let&apos;s keep it going!</p>
                </div>
                <div className="goal-ring" style={{ '--goal-percent': `${overallPercent}%` }}>
                  <span>{overallPercent}%</span>
                </div>
              </div>

              <div className="dashboard-progress-list">
                {goalRows.map(row => {
                  const stat = stats.find(item => item.key === row.key);
                  const goal = getGoal(goals, row.goalKey);
                  const current = stat?.current || 0;
                  const percent = getPercent(current, goal);

                  return (
                    <div className="dashboard-progress-row" key={row.label}>
                      <div className="dashboard-progress-left">
                        <strong>{row.label}</strong>
                        <span>{whole(current)} / {whole(goal)}</span>
                      </div>
                      <div className={`dashboard-progress-track progress-${row.color}`}>
                        <span style={{ width: `${percent}%` }} />
                      </div>
                    </div>
                  );
                })}

                <div className="dashboard-progress-row">
                  <div className="dashboard-progress-left">
                    <strong>Sugar</strong>
                    <span>{whole(today?.totalSugar)} logged</span>
                  </div>
                  <div className="dashboard-progress-track progress-pink">
                    <span style={{ width: today?.totalSugar > 0 ? '100%' : '0%' }} />
                  </div>
                </div>
              </div>
            </Card>

            <Card className="mini-log-card">
              <div className="dashboard-section-header mini-log-header">
                <div>
                  <span className="dashboard-section-kicker">Today&apos;s Food</span>
                  <h3>Mini log</h3>
                </div>
                <Link href="/tracker" className="dashboard-section-link">View tracker</Link>
              </div>

              {todaysFood.length === 0 ? (
                <EmptyLoggedFoodCard />
              ) : (
                <div className="logged-food-list">
                  {todaysFood.map(item => (
                    <LoggedFoodCard item={item} onRemove={removeLoggedFood} key={item._id} />
                  ))}
                </div>
              )}
            </Card>
          </div>
        )}
      </main>
    </RouteGuard>
  );
}
