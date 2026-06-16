import { useMemo } from 'react';
import Link from 'next/link';
import useSWR from 'swr';
import { Card, Col, Row } from 'react-bootstrap';
import RouteGuard from '../components/RouteGuard';
import { ErrorMessage, LoadingMessage } from '../components/StateMessage';
import DailyQuote from '../components/DailyQuote';
import DashboardQuickLog from '../components/DashboardQuickLog';
import { formatCalories, formatMacro } from '../lib/formatNutrition';
import { TrackEasyIcon } from '../components/TrackEasyIcons';

const nutritionConfig = [
  { label: 'Calories', key: 'totalCalories', goalKey: 'calorieGoal', icon: 'flame', color: 'orange', unit: 'kcal' },
  { label: 'Protein', key: 'totalProtein', goalKey: 'proteinGoal', icon: 'muscle', color: 'purple', unit: 'g' },
  { label: 'Carbs', key: 'totalCarbs', goalKey: 'carbsGoal', icon: 'bread', color: 'blue', unit: 'g' },
  { label: 'Fats', key: 'totalFats', goalKey: 'fatsGoal', icon: 'avocado', color: 'green', unit: 'g' },
  { label: 'Sugar', key: 'totalSugar', goalKey: 'sugarGoal', icon: 'berry', color: 'pink', unit: 'g' }
];

function formatGoalValue(label, value) {
  return label === 'Calories' ? formatCalories(value) : formatMacro(value);
}

function getNutritionStats(today) {
  return nutritionConfig.map(item => ({
    ...item,
    value: item.label === 'Calories' ? formatCalories(today?.[item.key]) : formatMacro(today?.[item.key]),
    current: Number(today?.[item.key]) || 0
  }));
}

export default function Dashboard() {
  const { data: today, error: todayError, mutate: mutateToday } = useSWR('/api/tracker/today');
  const { data: goals, error: goalsError } = useSWR('/api/user/goals');
  const stats = useMemo(() => getNutritionStats(today), [today]);
  const todaysFood = (today?.meals || []).slice(0, 3);

  return (
    <RouteGuard>
      <div className="dashboard-home">
        <section className="dashboard-hero">
          <div className="dashboard-hero-copy">
            <span className="dashboard-eyebrow">Fresh Market dashboard</span>
            <h1>Track your day</h1>
          </div>
        </section>

        {(todayError || goalsError) && <ErrorMessage text="Failed to load dashboard data." />}
        {(!today || !goals) && !(todayError || goalsError) && <LoadingMessage text="Loading your dashboard..." />}

        {today && goals && (
          <div className="dashboard-stack">
            <DailyQuote />

            <section>
              <div className="dashboard-section-header dashboard-section-header-tight">
                <div>
                  <span className="dashboard-section-kicker">
                    <TrackEasyIcon name="sparkle" size={14} />
                    Today&apos;s nutrition
                  </span>
                </div>
              </div>
              <div className="nutrition-strip">
                {stats.map(stat => {
                  const goal = Number(goals[stat.goalKey]) || 0;
                  const percent = goal > 0 ? Math.min(100, Math.round((stat.current / goal) * 100)) : 0;
                  const accentClass = `nutrition-${stat.color}`;
                  return (
                    <Card className={`dashboard-nutrition-card ${accentClass}`} key={stat.label}>
                      <div className="dashboard-stat-icon">
                        <TrackEasyIcon name={stat.icon} size={17} />
                      </div>
                      <span className="dashboard-stat-label">{stat.label}</span>
                      <strong className="dashboard-stat-value">{stat.value}</strong>
                      <span className="dashboard-stat-unit">{stat.unit}</span>
                      <div className="dashboard-stat-track">
                        <span style={{ width: `${percent}%` }} />
                      </div>
                    </Card>
                  );
                })}
              </div>
            </section>

            <Card className="app-card dashboard-goal-card">
              <div className="dashboard-section-header">
                <div>
                  <span className="dashboard-section-kicker">
                    <TrackEasyIcon name="target" size={14} />
                    Goal progress
                  </span>
                  <h3>Stay on pace</h3>
                </div>
                <Link href="/profile" className="dashboard-section-link">
                  Edit goals
                  <TrackEasyIcon name="chevron-right" size={14} />
                </Link>
              </div>

              <div className="dashboard-progress-list">
                {stats.map(stat => {
                  const goal = Number(goals[stat.goalKey]) || 0;
                  const current = Number(stat.current) || 0;
                  const percent = goal > 0 ? Math.min(100, Math.round((current / goal) * 100)) : 0;
                  const progressClass = `progress-${stat.color}`;
                  return (
                    <div className="dashboard-progress-row" key={stat.label}>
                      <div className="dashboard-progress-left">
                        <span className={`dashboard-progress-icon ${progressClass}`}>
                          <TrackEasyIcon name={stat.icon} size={14} />
                        </span>
                        <div>
                          <strong>{stat.label}</strong>
                          <span>{goal > 0 ? `${formatGoalValue(stat.label, current)} / ${formatGoalValue(stat.label, goal)} ${stat.unit}` : `${stat.value} ${stat.unit} logged`}</span>
                        </div>
                      </div>
                      <div className={`dashboard-progress-track ${progressClass}`}>
                        <span style={{ width: `${percent}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>

            <DashboardQuickLog onLogged={mutateToday} />

            <Card className="app-card dashboard-food-card">
              <div className="dashboard-section-header">
                <div>
                  <span className="dashboard-section-kicker">
                    <TrackEasyIcon name="bowl" size={14} />
                    Today&apos;s food
                  </span>
                  <h3>Mini log</h3>
                </div>
                <Link href="/tracker" className="dashboard-section-link">
                  View tracker
                  <TrackEasyIcon name="chevron-right" size={14} />
                </Link>
              </div>

              {todaysFood.length === 0 ? (
                <div className="dashboard-empty-hero">
                  <div className="dashboard-empty-hero-icon">
                    <TrackEasyIcon name="sparkle" size={18} />
                  </div>
                  <div>
                    <strong>No logs yet</strong>
                    <span>Use Quick Log to add your first meal or ingredient.</span>
                  </div>
                </div>
              ) : (
                <div className="dashboard-food-grid">
                  {todaysFood.map(item => (
                    <Card className="dashboard-food-mini-card" key={item._id}>
                      <div className="dashboard-food-mini-icon">
                        <TrackEasyIcon name={item.type === 'ingredient' ? 'leaf' : 'bowl'} size={16} />
                      </div>
                      <div className="dashboard-food-mini-copy">
                        <strong>{item.name}</strong>
                        <span>{formatCalories(item.calories)} cal</span>
                        <span>{formatMacro(item.protein)}g protein</span>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </Card>

            <Row className="g-2 dashboard-cta-grid">
              <Col xs={6}>
                <Link href="/create-meal-component" className="dashboard-cta-card dashboard-cta-green">
                  <div className="dashboard-cta-icon">
                    <TrackEasyIcon name="bowl" size={18} />
                  </div>
                  <div className="dashboard-cta-copy">
                    <strong>Create Meal</strong>
                    <span>Combine ingredients and save</span>
                  </div>
                  <TrackEasyIcon name="chevron-right" size={14} className="dashboard-cta-arrow" />
                </Link>
              </Col>
              <Col xs={6}>
                <Link href="/ingredients/add?returnTo=/dashboard" className="dashboard-cta-card dashboard-cta-cream">
                  <div className="dashboard-cta-icon">
                    <TrackEasyIcon name="camera" size={18} />
                  </div>
                  <div className="dashboard-cta-copy">
                    <strong>Add Food Photo</strong>
                    <span>Snap your meal or ingredient</span>
                  </div>
                  <TrackEasyIcon name="chevron-right" size={14} className="dashboard-cta-arrow" />
                </Link>
              </Col>
            </Row>
          </div>
        )}
      </div>
    </RouteGuard>
  );
}
