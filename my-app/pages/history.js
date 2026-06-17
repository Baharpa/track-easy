import { useMemo, useState } from 'react';
import useSWR from 'swr';
import { Button, Card } from 'react-bootstrap';
import RouteGuard from '../components/RouteGuard';
import { EmptyMessage, ErrorMessage, LoadingMessage } from '../components/StateMessage';
import { apiFetch } from '../lib/api';
import { formatAmount } from '../lib/formatNutrition';
import { TrackEasyIcon } from '../components/TrackEasyIcons';

const nutrients = [
  { label: 'Calories', key: 'totalCalories', shortKey: 'calories', goalKey: 'calorieGoal', icon: 'flame', className: 'tracker-calories', unit: 'cal' },
  { label: 'Protein', key: 'totalProtein', shortKey: 'protein', goalKey: 'proteinGoal', icon: 'muscle', className: 'tracker-protein', unit: 'g' },
  { label: 'Carbs', key: 'totalCarbs', shortKey: 'carbs', goalKey: 'carbsGoal', icon: 'bread', className: 'tracker-carbs', unit: 'g' },
  { label: 'Fats', key: 'totalFats', shortKey: 'fats', goalKey: 'fatsGoal', icon: 'avocado', className: 'tracker-fats', unit: 'g' },
  { label: 'Sugar', key: 'totalSugar', shortKey: 'sugar', goalKey: 'sugarGoal', icon: 'berry', className: 'tracker-sugar', unit: 'g' }
];

function whole(value) {
  return Math.round(Number(value) || 0);
}

function displayDate(dateString) {
  return new Date(`${dateString}T00:00:00`).toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' });
}

function logAmountLabel(item) {
  if (item.type === 'ingredient') return `${formatAmount(item.amount || item.quantityUsed)} ${item.unit || ''}`.trim();
  return item.portionLabel || `${item.servings || item.portion || 1} serving`;
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

function getAnalysis(days) {
  const loggedDays = days.filter(day => day.hasLogs);
  const divisor = loggedDays.length || 1;
  const avgCalories = loggedDays.reduce((sum, day) => sum + day.totalCalories, 0) / divisor;
  const avgProtein = loggedDays.reduce((sum, day) => sum + day.totalProtein, 0) / divisor;
  const bestProtein = days.reduce((best, day) => day.totalProtein > best.totalProtein ? day : best, days[0]);
  const highestCalories = days.reduce((best, day) => day.totalCalories > best.totalCalories ? day : best, days[0]);
  const consistency = loggedDays.length >= 5
    ? `You logged food ${loggedDays.length} of 7 days. Strong consistency.`
    : `You logged food ${loggedDays.length} of 7 days. A few more logs will make your trends clearer.`;

  return {
    loggedCount: loggedDays.length,
    avgCalories: whole(avgCalories),
    avgProtein: whole(avgProtein),
    bestProtein,
    highestCalories,
    consistency
  };
}

export default function ProfileTracker() {
  const { data: today, error: todayError, mutate } = useSWR('/api/tracker/today');
  const { data: weekLogs, error: weekError } = useSWR('/api/tracker/week');
  const { data: goals, error: goalsError } = useSWR('/api/user/goals');
  const [view, setView] = useState('day');
  const weekDays = useMemo(() => normalizeWeek(weekLogs || []), [weekLogs]);
  const [selectedDate, setSelectedDate] = useState('');
  const selectedDay = weekDays.find(day => day.date === (selectedDate || weekDays[weekDays.length - 1]?.date)) || weekDays[weekDays.length - 1];
  const analysis = weekDays.length ? getAnalysis(weekDays) : null;

  async function deleteLog(logId) {
    await apiFetch(`/api/tracker/log/${logId}`, { method: 'DELETE' });
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
                <FoodList title="Foods logged today" foods={today.meals || []} emptyText="No food logged today." onDelete={deleteLog} />
              </>
            )}

            {view === 'week' && selectedDay && analysis && (
              <>
                <WeeklyBars days={weekDays} goals={goals} selectedDate={selectedDay.date} onSelect={setSelectedDate} />
                <SelectedDayCard day={selectedDay} />
                <WeekAnalysis analysis={analysis} />
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

function WeeklyBars({ days, goals, selectedDate, onSelect }) {
  const calorieGoal = Number(goals?.calorieGoal) || Math.max(...days.map(day => day.totalCalories), 1);
  return (
    <Card className="app-card tracker-card">
      <div className="tracker-card-header">
        <h2>Week View</h2>
        <span>Mon-Sun</span>
      </div>
      <div className="weekly-bars">
        {days.map(day => {
          const ratio = calorieGoal > 0 ? day.totalCalories / calorieGoal : 0;
          const height = Math.max(4, Math.min(100, Math.round(ratio * 100)));
          return (
            <button type="button" className={`weekly-bar-day ${day.date === selectedDate ? 'selected' : ''} ${ratio > 1 ? 'over-goal' : ''}`} onClick={() => onSelect(day.date)} key={day.date}>
              <div className="weekly-bar-track"><span className="weekly-bar-fill" style={{ height: `${height}%` }} /></div>
              <span className="weekly-day-label">{day.dayLabel}</span>
              <small>{whole(day.totalCalories)}</small>
            </button>
          );
        })}
      </div>
    </Card>
  );
}

function SelectedDayCard({ day }) {
  return (
    <Card className="app-card selected-day-card">
      <div className="tracker-card-header">
        <h2>{displayDate(day.date)}</h2>
      </div>
      <div className="selected-day-stats">
        {nutrients.map(nutrient => (
          <span key={nutrient.label}>{nutrient.label}: <strong>{whole(day[nutrient.key])}</strong></span>
        ))}
      </div>
      <FoodList foods={day.meals || []} emptyText="No food logged this day." compact />
    </Card>
  );
}

function FoodList({ title, foods = [], emptyText, onDelete, compact = false }) {
  const content = foods.length === 0 ? (
    <EmptyMessage text={emptyText} />
  ) : (
    <div className="tracker-food-list">
      {foods.map(food => (
        <div className="tracker-food-row" key={food._id || `${food.name}-${food.loggedAt}`}>
          <span className="tracker-food-icon"><TrackEasyIcon name={food.type === 'ingredient' ? 'leaf' : 'bowl'} size={16} /></span>
          <div>
            <strong>{food.name}</strong>
            <span>{logAmountLabel(food)} | {whole(food.calories)} cal | {whole(food.protein)}g protein</span>
          </div>
          {onDelete && <Button variant="outline-danger" size="sm" onClick={() => onDelete(food._id)}>Remove</Button>}
        </div>
      ))}
    </div>
  );

  if (compact) return <div className="tracker-food-compact">{content}</div>;

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
        <div className="analysis-stat"><span>Best protein</span><strong>{analysis.bestProtein?.dayLabel || '-'}</strong></div>
        <div className="analysis-stat"><span>Highest calories</span><strong>{analysis.highestCalories?.dayLabel || '-'}</strong></div>
      </div>
    </Card>
  );
}
