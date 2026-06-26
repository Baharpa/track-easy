import { useMemo, useState } from 'react';
import useSWR from 'swr';
import { Card } from 'react-bootstrap';
import LoggedFoodCard, { EmptyLoggedFoodCard } from '../components/LoggedFoodCard';
import RouteGuard from '../components/RouteGuard';
import { ErrorMessage, LoadingMessage } from '../components/StateMessage';
import { apiFetch } from '../lib/api';
import { TrackEasyIcon } from '../components/TrackEasyIcons';

const nutrients = [
  { label: 'Calories', key: 'totalCalories', shortKey: 'calories', goalKey: 'calorieGoal', icon: 'flame', className: 'tracker-calories', unit: 'cal' },
  { label: 'Protein', key: 'totalProtein', shortKey: 'protein', goalKey: 'proteinGoal', icon: 'muscle', className: 'tracker-protein', unit: 'g' },
  { label: 'Carbs', key: 'totalCarbs', shortKey: 'carbs', goalKey: 'carbsGoal', icon: 'bread', className: 'tracker-carbs', unit: 'g' },
  { label: 'Fats', key: 'totalFats', shortKey: 'fats', goalKey: 'fatsGoal', icon: 'avocado', className: 'tracker-fats', unit: 'g' },
  { label: 'Sugar', key: 'totalSugar', shortKey: 'sugar', goalKey: 'sugarGoal', icon: 'berry', className: 'tracker-sugar', unit: 'g' }
];

const weeklyMetrics = {
  calories: { label: 'Calories', key: 'totalCalories', goalKey: 'calorieGoal', unit: 'cal' },
  protein: { label: 'Protein', key: 'totalProtein', goalKey: 'proteinGoal', unit: 'g' },
  carbs: { label: 'Carbs', key: 'totalCarbs', goalKey: 'carbsGoal', unit: 'g' },
  fats: { label: 'Fats', key: 'totalFats', goalKey: 'fatsGoal', unit: 'g' }
};

function whole(value) {
  return Math.round(Number(value) || 0);
}

function formatShortDate(dateString) {
  return new Date(`${dateString}T00:00:00`).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function formatShortRange(days = []) {
  if (!days.length) return '';
  const start = new Date(`${days[0].date}T00:00:00`);
  const end = new Date(`${days[days.length - 1].date}T00:00:00`);
  const sameMonth = start.getMonth() === end.getMonth();
  const startText = start.toLocaleDateString(undefined, sameMonth ? { month: 'short', day: 'numeric' } : { month: 'short', day: 'numeric' });
  const endText = end.toLocaleDateString(undefined, { month: sameMonth ? undefined : 'short', day: 'numeric' });
  return `${startText} - ${endText}`;
}

function formatDayName(dateString) {
  return new Date(`${dateString}T00:00:00`).toLocaleDateString(undefined, { weekday: 'long' });
}

function formatFoodStat(value, unit = '') {
  const numeric = Number(value) || 0;
  const rounded = Math.round(numeric * 10) / 10;
  return `${Number.isInteger(rounded) ? rounded.toLocaleString() : rounded.toLocaleString(undefined, { maximumFractionDigits: 1 })}${unit}`;
}

function buildSmoothPath(points) {
  if (!points.length) return '';
  if (points.length === 1) return `M ${points[0].x} ${points[0].y}`;

  return points.reduce((path, point, index) => {
    if (index === 0) return `M ${point.x} ${point.y}`;

    const previous = points[index - 1];
    const controlX = (previous.x + point.x) / 2;
    return `${path} C ${controlX} ${previous.y}, ${controlX} ${point.y}, ${point.x} ${point.y}`;
  }, '');
}

function getWeekRange(days = []) {
  if (!days.length) return '';
  return `${formatShortDate(days[0].date)} - ${formatShortDate(days[days.length - 1].date)}`;
}

function normalizeWeek(weekLogs = []) {
  return weekLogs.map(item => ({
    date: item.date,
    dayLabel: item.dayLabel || new Date(`${item.date}T00:00:00`).toLocaleDateString(undefined, { weekday: 'short' }),
    totalCalories: Number(item.totalCalories ?? item.calories) || 0,
    totalProtein: Number(item.totalProtein ?? item.protein) || 0,
    totalCarbs: Number(item.totalCarbs ?? item.carbs) || 0,
    totalFats: Number(item.totalFats ?? item.fats) || 0,
    totalSugar: Number(item.totalSugar ?? item.sugar) || 0,
    meals: item.meals || item.foods || [],
    hasLogs: item.hasLogs ?? (item.meals || item.foods || []).length > 0
  }));
}

function getTotals(days) {
  return nutrients.reduce((totals, nutrient) => {
    totals[nutrient.key] = days.reduce((sum, day) => sum + (Number(day[nutrient.key]) || 0), 0);
    return totals;
  }, {});
}

function goalForWeek(goals, goalKey) {
  const dailyGoal = Number(goals?.[goalKey]);
  return dailyGoal > 0 ? dailyGoal * 7 : 0;
}

function getAnalysis(days, goals) {
  const loggedDays = days.filter(day => day.hasLogs);
  const divisor = loggedDays.length || 1;
  const avgCalories = loggedDays.reduce((sum, day) => sum + day.totalCalories, 0) / divisor;
  const avgProtein = loggedDays.reduce((sum, day) => sum + day.totalProtein, 0) / divisor;
  const bestProtein = days.reduce((best, day) => day.totalProtein > best.totalProtein ? day : best, days[0] || {});
  const highestCalories = days.reduce((best, day) => day.totalCalories > best.totalCalories ? day : best, days[0] || {});
  const totals = getTotals(days);
  const weeklyCalorieGoal = goalForWeek(goals, 'calorieGoal');
  const calorieDiff = totals.totalCalories - weeklyCalorieGoal;
  const calorieGoalStatus = weeklyCalorieGoal > 0
    ? calorieDiff === 0
      ? 'On target'
      : `${Math.abs(whole(calorieDiff)).toLocaleString()} ${calorieDiff > 0 ? 'over' : 'under'} goal`
    : 'No calorie goal set';
  const consistency = loggedDays.length >= 5
    ? `You logged food ${loggedDays.length} of 7 days. Strong consistency.`
    : `You logged food ${loggedDays.length} of 7 days. A few more logs will make your trends clearer.`;

  return {
    loggedCount: loggedDays.length,
    avgCalories: whole(avgCalories),
    avgProtein: whole(avgProtein),
    bestProtein,
    highestCalories,
    totals,
    weeklyCalorieGoal,
    calorieGoalStatus,
    consistency
  };
}

export default function ProfileTracker() {
  const { data: today, error: todayError, mutate } = useSWR('/api/tracker/today');
  const { data: goals, error: goalsError } = useSWR('/api/user/goals');
  const [view, setView] = useState('day');
  const [selectedWeekOffset, setSelectedWeekOffset] = useState(0);
  const { data: weekLogs, error: weekError } = useSWR(`/api/tracker/week?offset=${selectedWeekOffset}`);
  const weekDays = useMemo(() => normalizeWeek(weekLogs || []), [weekLogs]);
  const analysis = weekDays.length ? getAnalysis(weekDays, goals) : null;

  async function deleteLog(item) {
    await apiFetch(`/api/tracker/log/${item._id}`, { method: 'DELETE' });
    mutate();
  }

  return (
    <RouteGuard>
      <div className="tracker-page">
        <div className="mobile-page-header">
          <div>
            <h1 className="mobile-page-title">Tracker</h1>
            <p className="mobile-page-subtitle">Review your nutrition progress.</p>
          </div>
        </div>

        {(todayError || weekError || goalsError) && <ErrorMessage text="Failed to load tracker data." />}
        {(!today || !weekLogs || !goals) && !(todayError || weekError || goalsError) && <LoadingMessage text="Loading tracker..." />}

        {today && weekLogs && goals && (
          <>
            <div className="segmented-control" role="tablist" aria-label="Tracker view">
              <button type="button" className={`segmented-control-button ${view === 'day' ? 'active' : ''}`} onClick={() => setView('day')}>Day</button>
              <button type="button" className={`segmented-control-button ${view === 'week' ? 'active' : ''}`} onClick={() => setView('week')}>Week</button>
            </div>

            {view === 'day' && (
              <>
                <ProgressCard item={today} goals={goals} title="Today" />
                <FoodList title="Foods logged today" foods={today.meals || []} onDelete={deleteLog} />
              </>
            )}

            {view === 'week' && weekDays.length > 0 && analysis && (
              <>
                <WeekSelector selectedOffset={selectedWeekOffset} onSelect={setSelectedWeekOffset} range={formatShortRange(weekDays)} />
                <WeekProgress days={weekDays} goals={goals} />
                <WeekAnalysis analysis={analysis} />
                <WeeklyMealsByDay days={weekDays} />
              </>
            )}
          </>
        )}
      </div>
    </RouteGuard>
  );
}

function ProgressCard({ item, goals, title }) {
  return (
    <Card className="app-card tracker-card">
      <div className="tracker-card-header">
        <h2>{title} Progress</h2>
      </div>
      <div className="tracker-progress-list">
        {nutrients.map(nutrient => {
          const current = whole(item?.[nutrient.key]);
          const goal = whole(goals?.[nutrient.goalKey]);
          const percent = goal > 0 ? Math.min(100, Math.round((current / goal) * 100)) : 0;
          return (
            <div className={`tracker-progress-row ${nutrient.className}`} key={nutrient.label}>
              <div className="tracker-progress-top">
                <span className="tracker-progress-icon"><TrackEasyIcon name={nutrient.icon} size={15} /></span>
                <strong>{nutrient.label}</strong>
                <span>{current} / {goal || 0} {nutrient.unit}</span>
              </div>
              <div className="tracker-progress-bar"><span style={{ width: `${percent}%` }} /></div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

function WeekSelector({ selectedOffset, onSelect, range }) {
  return (
    <div className="week-screen-time-nav" aria-label="Week navigation">
      <button
        type="button"
        className="week-nav-arrow"
        onClick={() => onSelect(Math.min(3, selectedOffset + 1))}
        disabled={selectedOffset >= 3}
        aria-label="Previous week"
      >
        &lsaquo;</button>
      <div className="week-nav-date">
        <strong>{range}</strong>
        <span>{selectedOffset === 0 ? 'This week' : `${selectedOffset} week${selectedOffset > 1 ? 's' : ''} ago`}</span>
      </div>
      <button
        type="button"
        className="week-nav-arrow"
        onClick={() => onSelect(Math.max(0, selectedOffset - 1))}
        disabled={selectedOffset <= 0}
        aria-label="Next week"
      >
        &rsaquo;</button>
    </div>
  );
}

function WeekProgress({ days, goals }) {
  const [selectedMetric, setSelectedMetric] = useState('calories');
  const metricKeys = Object.keys(weeklyMetrics);
  const metric = weeklyMetrics[selectedMetric];
  const values = days.map(day => Number(day[metric.key]) || 0);
  const goalValue = Number(goals?.[metric.goalKey]) || 0;
  const hasGoal = goalValue > 0;
  const maxValue = Math.max(1, goalValue, ...values);
  const chartWidth = 320;
  const chartHeight = 148;
  const chartPadding = 24;
  const innerWidth = chartWidth - chartPadding * 2;
  const innerHeight = 90;
  const baseY = chartPadding + innerHeight;
  const goalY = hasGoal ? baseY - (goalValue / maxValue) * innerHeight : null;
  const goalLabelY = hasGoal ? Math.max(16, Math.min(baseY - 10, goalY - 8)) : null;
  const points = values.map((value, index) => {
    const x = chartPadding + (days.length === 1 ? innerWidth / 2 : (innerWidth / Math.max(1, days.length - 1)) * index);
    const y = maxValue > 0 ? baseY - (value / maxValue) * innerHeight : baseY;
    return { x, y, value };
  });
  const path = buildSmoothPath(points);

  return (
    <Card className="app-card tracker-card week-progress-card tracker-line-chart-card">
      <div className="tracker-card-header">
        <h2>Week View</h2>
      </div>

      {/* ********************* TRACKER WEEK CLEAN METRIC SELECTOR START ********************* */}
      <div className="tracker-week-metric-form" data-selected={selectedMetric} role="radiogroup" aria-label="Weekly chart metric">
        <span className="tracker-week-metric-indicator" aria-hidden="true" />
        {metricKeys.map(key => (
          <div className="tracker-week-metric-choice" key={key}>
            <input
              type="radio"
              id={`week-metric-${key}`}
              name="weekMetric"
              className="tracker-week-metric-radio"
              checked={selectedMetric === key}
              onChange={() => setSelectedMetric(key)}
            />
            <label className="tracker-week-metric-label" htmlFor={`week-metric-${key}`}>
              <span className="tracker-week-metric-dot" aria-hidden="true" />
              <span>{weeklyMetrics[key].label}</span>
            </label>
          </div>
        ))}
      </div>
      {/* ********************* TRACKER WEEK CLEAN METRIC SELECTOR END ********************* */}

      {/* ********************* TRACKER WEEK LINE CHART START ********************* */}
      <div className="tracker-week-line-chart" aria-label={`Weekly ${metric.label.toLowerCase()} line chart`}>
        <svg className="tracker-week-line-chart-svg" viewBox={`0 0 ${chartWidth} ${chartHeight}`} role="img" aria-hidden="true">
          {hasGoal && (
            <>
              <line className="tracker-goal-line" x1={chartPadding} y1={goalY} x2={chartWidth - chartPadding} y2={goalY} />
              <text className="tracker-goal-label" x={chartWidth - chartPadding - 6} y={goalLabelY}>
                Goal {whole(goalValue)}{metric.unit === 'g' ? 'g' : ' cal'}
              </text>
            </>
          )}
          <line className="tracker-line-axis" x1={chartPadding} y1={baseY} x2={chartWidth - chartPadding} y2={baseY} />
          <path className="tracker-line-path-shadow" d={path} />
          <path className="tracker-line-path" d={path} />
          {points.map(point => (
            <circle className="tracker-line-dot" cx={point.x} cy={point.y} r="4.4" key={`${point.x}-${point.y}`} />
          ))}
        </svg>

        <div className="tracker-line-chart-labels">
          {days.map((day, index) => (
            <div className="tracker-line-day" key={day.date}>
              <strong>{day.dayLabel}</strong>
              <span>{whole(values[index])} {metric.unit}</span>
            </div>
          ))}
        </div>
      </div>
      {/* ********************* TRACKER WEEK LINE CHART END ********************* */}
    </Card>
  );
}

function WeeklyMealsByDay({ days }) {
  return (
    <Card className="app-card tracker-card weekly-meals-card">
      <div className="tracker-card-header">
        <h2>Meals by Day</h2>
      </div>
      <div className="weekly-meal-groups">
        {days.map(day => (
          <section className="weekly-meal-group" key={day.date}>
            <div className="weekly-meal-day">
              <strong>{formatDayName(day.date)}</strong>
              <span>{formatShortDate(day.date)}</span>
            </div>
            {(day.meals || []).length === 0 ? (
              <p className="weekly-meal-empty">No food logged</p>
            ) : (
              <div className="weekly-meal-list">
                {(day.meals || []).map(food => (
                  <div className="weekly-meal-row" key={food._id || `${day.date}-${food.name}-${food.loggedAt || ''}`}>
                    <span className="weekly-meal-name">{food.name || 'Logged food'}</span>
                    <span className="weekly-meal-stats">
                      {formatFoodStat(food.calories, ' cal')}, {formatFoodStat(food.protein, 'g')} protein
                    </span>
                  </div>
                ))}
              </div>
            )}
          </section>
        ))}
      </div>
    </Card>
  );
}

function FoodList({ title, foods = [], onDelete, compact = false }) {
  const content = foods.length === 0 ? (
    <EmptyLoggedFoodCard />
  ) : (
    <div className="logged-food-list">
      {foods.map(food => (
        <LoggedFoodCard item={food} onRemove={onDelete} key={food._id || `${food.name}-${food.loggedAt}`} />
      ))}
    </div>
  );

  if (compact) return content;

  return (
    <Card className="app-card tracker-card">
      {title && <div className="tracker-card-header"><h2>{title}</h2></div>}
      {content}
    </Card>
  );
}

function WeekAnalysis({ analysis }) {
  return (
    <Card className="app-card week-analysis-card compact-week-analysis-card">
      <div className="tracker-card-header">
        <h2>Week Analysis</h2>
      </div>
      <div className="analysis-grid compact-analysis-grid">
        <div className="analysis-stat"><span>Days logged</span><strong>{analysis.loggedCount}/7</strong></div>
        <div className="analysis-stat"><span>Avg calories</span><strong>{analysis.avgCalories}</strong></div>
        <div className="analysis-stat"><span>Avg protein</span><strong>{analysis.avgProtein}g</strong></div>
        <div className="analysis-stat"><span>Highest calorie day</span><strong>{analysis.highestCalories?.dayLabel || '-'}, {formatFoodStat(analysis.highestCalories?.totalCalories, ' cal')}</strong></div>
      </div>
    </Card>
  );
}

