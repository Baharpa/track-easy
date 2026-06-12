import { ProgressBar } from 'react-bootstrap';
import { formatCalories, formatMacro } from '../lib/formatNutrition';
import { NUTRITION_ICONS } from '../lib/foodVisuals';

export default function GoalProgress({ label, current, goal }) {
  const hasGoal = Number(goal) > 0;
  const percent = hasGoal ? Math.min(100, Math.round((current / goal) * 100)) : 0;
  const currentText = label === 'Calories' ? formatCalories(current) : formatMacro(current);
  const goalText = label === 'Calories' ? formatCalories(goal) : formatMacro(goal);

  return (
    <div className={`goal-progress goal-${label.toLowerCase()}`}>
      <div className="goal-progress-header">
        <strong><span>{NUTRITION_ICONS[label]}</span>{label}</strong>
        <span className="goal-progress-value">{hasGoal ? `${currentText} / ${goalText}` : `${currentText} logged`}</span>
      </div>
      {hasGoal ? <ProgressBar now={percent} label={`${percent}%`} variant="success" /> : <div className="goal-progress-empty">No goal set</div>}
    </div>
  );
}
