import FoodImage from './FoodImage';
import { useRouter } from 'next/router';
import { TrackEasyIcon } from './TrackEasyIcons';

export default function FoodInfoCard({
  title,
  subtitle,
  imageSrc,
  imageAlt,
  category = 'Other',
  nutritionRows = [],
  variant = 'premium',
  actions = null,
  footer = null,
  className = '',
  detailHref,
  onCardClick
}) {
  const router = useRouter();
  const isClickable = Boolean(detailHref || onCardClick);
  const cardClassName = [
    'food-info-card',
    variant === 'compact' ? 'food-info-card--compact' : 'food-info-card--standard',
    className
  ].filter(Boolean).join(' ');
  const nutritionMap = nutritionRows.reduce((acc, row) => {
    const key = String(row?.label || '').toLowerCase();
    acc[key] = row;
    return acc;
  }, {});
  const calories = nutritionMap.calories?.value || '0 cal';
  const protein = nutritionMap.protein?.value || '0g';
  const carbs = nutritionMap.carbs?.value || '0g';
  const fats = nutritionMap.fats?.value || nutritionMap.fat?.value || '0g';
  const sugar = nutritionMap.sugar?.value || '0g';

  function isInteractiveTarget(target) {
    return Boolean(target.closest?.('a, button, input, select, textarea, [role="button"], [role="menuitem"]'));
  }

  function openDetails(event) {
    if (!isClickable || isInteractiveTarget(event.target)) return;
    if (onCardClick) onCardClick(event);
    else router.push(detailHref);
  }

  function handleKeyDown(event) {
    if (!isClickable || (event.key !== 'Enter' && event.key !== ' ')) return;
    if (isInteractiveTarget(event.target) && event.target !== event.currentTarget) return;
    event.preventDefault();
    if (onCardClick) onCardClick(event);
    else router.push(detailHref);
  }

  return (
    <article
      className={`${cardClassName} ${isClickable ? 'food-info-card--clickable' : ''}`.trim()}
      role={isClickable ? 'link' : undefined}
      tabIndex={isClickable ? 0 : undefined}
      onClick={openDetails}
      onKeyDown={handleKeyDown}
    >
      <div className="food-info-card__image-wrap">
        <FoodImage
          src={imageSrc}
          variant="card"
          alt={imageAlt || title || 'Food'}
          category={category}
          className="food-info-card__image"
          placeholderClassName="food-info-card__image-placeholder"
        />
      </div>

      {variant === 'compact' ? (
        <div className="food-info-card__content food-info-card__content--compact">
          <div className="food-info-card__top food-info-card__top--compact">
            <div className="food-info-card__copy">
              <h3 className="food-info-card__title">{title}</h3>
              {subtitle && <p className="food-info-card__subtitle">{subtitle}</p>}
            </div>
            {actions && <div className="food-info-card__actions">{actions}</div>}
          </div>
          {footer && <div className="food-info-card__footer">{footer}</div>}
        </div>
      ) : (
        <div className="food-info-card__content">
          <div className="food-info-card__top">
            <div className="food-info-card__copy">
              <h3 className="food-info-card__title">{title}</h3>
              {subtitle && <p className="food-info-card__subtitle">{subtitle}</p>}
            </div>
          </div>

          <div className="food-info-card__actions food-info-card__actions--overlay">
            {actions}
          </div>

          <div className="food-info-nutrition">
            <div className="food-info-nutrition__hero">
              <div className="food-info-nutrition__ring">
                <div className="food-info-nutrition__ring-inner">
                  <TrackEasyIcon name="flame" size={25} className="food-info-nutrition__calorie-icon" />
                  <span className="food-info-nutrition__accent">
                    {String(calories).replace(/\s*cal(?:ories)?$/i, '')}
                  </span>
                  <small>cal</small>
                </div>
              </div>
              <div className="food-info-nutrition__macro food-info-nutrition__macro--protein">
                <TrackEasyIcon name="muscle" size={23} />
                <strong>{protein}</strong>
                <span>Protein</span>
              </div>
              <div className="food-info-nutrition__macro food-info-nutrition__macro--carbs">
                <TrackEasyIcon name="grain" size={23} />
                <strong>{carbs}</strong>
                <span>Carbs</span>
              </div>
              <div className="food-info-nutrition__macro food-info-nutrition__macro--sugar">
                <TrackEasyIcon name="candy" size={23} />
                <strong>{sugar}</strong>
                <span>Sugar</span>
              </div>
              <div className="food-info-nutrition__macro food-info-nutrition__macro--fats">
                <TrackEasyIcon name="drop" size={23} />
                <strong>{fats}</strong>
                <span>Fats</span>
              </div>
            </div>
          </div>

          {footer && <div className="food-info-card__footer">{footer}</div>}
        </div>
      )}
    </article>
  );
}
