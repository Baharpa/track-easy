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

const weekOptions = [
  { label: 'This Week', offset: 0 },
  { label: 'Last Week', offset: 1 },
  { label: '2 Weeks Ago', offset: 2 },
  { label: '3 Weeks Ago', offset: 3 }
];

function whole(value) {
  return Math.round(Number(value) || 0);
}

function formatShortDate(dateString) {
  return new Date(`${dateString}T00:00:00`).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function formatDayName(dateString) {
  return new Date(`${dateString}T00:00:00`).toLocaleDateString(undefined, { weekday: 'long' });
}

function formatFoodStat(value, unit = '') {
  const numeric = Number(value) || 0;
  const rounded = Math.round(numeric * 10) / 10;
  return `${Number.isInteger(rounded) ? rounded.toLocaleString() : rounded.toLocaleString(undefined, { maximumFractionDigits: 1 })}${unit}`;
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
                <WeekSelector selectedOffset={selectedWeekOffset} onSelect={setSelectedWeekOffset} range={getWeekRange(weekDays)} />
                <WeekAnalysis analysis={analysis} />
                <WeeklyMealsByDay days={weekDays} />
                <WeeklyTotals totals={analysis.totals} goals={goals} />
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
    <Card className="app-card tracker-card">
      <div className="tracker-card-header">
        <h2>Week View</h2>
        <span>{range}</span>
      </div>
      <div className="week-selector-pills" role="tablist" aria-label="Select week">
        {weekOptions.map(option => (
          <button
            type="button"
            className={`week-selector-pill ${selectedOffset === option.offset ? 'active' : ''}`}
            onClick={() => onSelect(option.offset)}
            key={option.offset}
          >
            {option.label}
          </button>
        ))}
      </div>
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
    <Card className="app-card week-analysis-card">
      <div className="tracker-card-header">
        <h2>Week Analysis</h2>
      </div>
      <p>{analysis.consistency}</p>
      <div className="analysis-grid">
        <div className="analysis-stat"><span>Days logged</span><strong>{analysis.loggedCount}/7</strong></div>
        <div className="analysis-stat"><span>Avg calories</span><strong>{analysis.avgCalories}</strong></div>
        <div className="analysis-stat"><span>Avg protein</span><strong>{analysis.avgProtein}g</strong></div>
        <div className="analysis-stat"><span>Best protein day</span><strong>{analysis.bestProtein?.dayLabel || '-'}, {formatFoodStat(analysis.bestProtein?.totalProtein, 'g')}</strong></div>
        <div className="analysis-stat"><span>Highest calories</span><strong>{analysis.highestCalories?.dayLabel || '-'}, {formatFoodStat(analysis.highestCalories?.totalCalories, ' cal')}</strong></div>
        <div className="analysis-stat analysis-stat-wide"><span>Calories vs goal</span><strong>{analysis.calorieGoalStatus}</strong></div>
      </div>
    </Card>
  );
}

function WeeklyTotals({ totals, goals }) {
  return (
    <Card className="app-card tracker-card weekly-totals-card">
      <div className="tracker-card-header">
        <h2>Weekly Nutrition Totals</h2>
      </div>
      <div className="weekly-totals-list">
        {nutrients.map(nutrient => {
          const total = totals?.[nutrient.key] || 0;
          const goal = goalForWeek(goals, nutrient.goalKey);
          const totalText = nutrient.unit === 'cal'
            ? whole(total).toLocaleString()
            : `${formatFoodStat(total)}${nutrient.unit}`;
          const goalText = nutrient.unit === 'cal'
            ? whole(goal).toLocaleString()
            : `${formatFoodStat(goal)}${nutrient.unit}`;

          return (
            <div className="weekly-total-row" key={nutrient.label}>
              <span>{nutrient.label}</span>
              <strong>{goal > 0 ? `${totalText} / ${goalText}` : totalText}</strong>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
