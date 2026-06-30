import { Button, Card } from 'react-bootstrap';
import { useRouter } from 'next/router';
import AppBackButton from './AppBackButton';
import FoodImage from './FoodImage';
import PageHeader from './PageHeader';
import { formatAmount, formatCalories, formatMacro } from '../lib/formatNutrition';

const backTargets = {
  history: { href: '/history', label: 'Back to History' },
  tracker: { href: '/tracker', label: 'Back to Tracker' },
  dashboard: { href: '/dashboard', label: 'Back to Home' },
  meals: { href: '/meals', label: 'Back to Meals' },
  ingredients: { href: '/ingredients', label: 'Back to Ingredients' }
};

export function DetailPageShell({ title, subtitle, defaultFrom, children }) {
  const router = useRouter();
  const from = typeof router.query.from === 'string' ? router.query.from : defaultFrom;
  const backTarget = backTargets[from];

  return (
    <main className="detail-page-shell">
      <AppBackButton href={backTarget?.href} label={backTarget?.label || 'Back'} />
      <PageHeader title={title} text={subtitle} />
      {children}
    </main>
  );
}

export function DetailHeroCard({ item, title, subtitle, meta, category = 'Other', actions }) {
  return (
    <Card className="detail-card detail-hero-card">
      <Card.Body>
        <FoodImage src={item} alt={title} category={category} variant="detail" className="" placeholderClassName="" />
        <div className="detail-hero-copy">
          <h2>{title}</h2>
          {subtitle && <p>{subtitle}</p>}
          {meta && <span>{meta}</span>}
        </div>
        {actions && <div className="detail-hero-actions">{actions}</div>}
      </Card.Body>
    </Card>
  );
}

function nutritionValue(item, totalKey, directKey) {
  return Number(item?.[totalKey] ?? item?.[directKey] ?? 0);
}

export function DetailNutritionSummary({ item, title = 'Nutrition Summary' }) {
  const stats = [
    ['Calories', formatCalories(nutritionValue(item, 'totalCalories', 'calories')), 'cal'],
    ['Protein', formatMacro(nutritionValue(item, 'totalProtein', 'protein')), 'g'],
    ['Carbs', formatMacro(nutritionValue(item, 'totalCarbs', 'carbs')), 'g'],
    ['Sugar', formatMacro(nutritionValue(item, 'totalSugar', 'sugar')), 'g'],
    ['Fats', formatMacro(nutritionValue(item, 'totalFats', 'fats')), 'g']
  ];

  return (
    <DetailSectionCard title={title}>
      <div className="detail-nutrition-grid">
        {stats.map(([label, value, unit]) => (
          <div className="detail-nutrition-stat" key={label}>
            <span>{label}</span>
            <strong>{value}{unit}</strong>
          </div>
        ))}
      </div>
    </DetailSectionCard>
  );
}

export function DetailSectionCard({ title, subtitle, actions, children, className = '' }) {
  return (
    <Card className={`detail-card detail-section-card ${className}`.trim()}>
      <Card.Body>
        {(title || actions) && (
          <div className="detail-section-heading">
            <div>
              {title && <h3>{title}</h3>}
              {subtitle && <p>{subtitle}</p>}
            </div>
            {actions && <div>{actions}</div>}
          </div>
        )}
        {children}
      </Card.Body>
    </Card>
  );
}

export function DetailIngredientRow({ ingredient, amountLabel }) {
  return (
    <div className="detail-ingredient-row">
      <FoodImage src={ingredient} alt={ingredient?.name || 'Ingredient'} category={ingredient?.category || 'Other'} variant="compact" className="detail-ingredient-image" placeholderClassName="detail-ingredient-placeholder" />
      <div className="detail-ingredient-copy">
        <strong>{ingredient?.name || 'Ingredient'}</strong>
        <span>{amountLabel || `${formatAmount(ingredient?.quantityUsed || ingredient?.amount || 0)} ${ingredient?.unit || 'grams'}`}</span>
      </div>
      <div className="detail-ingredient-stats">
        <span>{formatCalories(ingredient?.calories)} cal</span>
        <span>{formatMacro(ingredient?.protein)}g protein</span>
        <span>{formatMacro(ingredient?.carbs)}g carbs</span>
        <span>{formatMacro(ingredient?.fats)}g fats</span>
        <span>{formatMacro(ingredient?.sugar)}g sugar</span>
      </div>
    </div>
  );
}

export function DetailMealPartCard({ part }) {
  const ingredients = part?.ingredients || [];
  const nutrition = part?.nutritionTotals || {};
  const weight = part?.eatenWeight ?? part?.totalWeight ?? 0;
  return (
    <article className="detail-meal-part-card">
      <div className="detail-meal-part-header">
        <div>
          <h4>{part?.name || part?.category || 'Main'}</h4>
          <p>{ingredients.length} ingredient{ingredients.length === 1 ? '' : 's'} · {formatAmount(weight)}g total</p>
        </div>
        <div className="detail-meal-part-summary">
          <span>{formatCalories(nutrition.calories)} cal</span>
          <span>{formatMacro(nutrition.protein)}g protein</span>
        </div>
      </div>
      {ingredients.length > 0 && (
        <div className="detail-ingredient-list">
          {ingredients.map((ingredient, index) => <DetailIngredientRow ingredient={ingredient} key={`${ingredient.ingredientId || ingredient.name}-${index}`} />)}
        </div>
      )}
    </article>
  );
}

export function DetailDangerZone({ title = 'Danger Zone', text, buttonLabel, onDelete, disabled }) {
  return (
    <DetailSectionCard title={title} className="detail-danger-zone">
      <div className="detail-danger-content">
        <p>{text}</p>
        <Button variant="outline-danger" onClick={onDelete} disabled={disabled}>{buttonLabel}</Button>
      </div>
    </DetailSectionCard>
  );
}
