import FoodImage from './FoodImage';
import NutritionRows from './NutritionRows';

export default function FoodInfoCard({
  title,
  subtitle,
  imageSrc,
  imageAlt,
  category = 'Other',
  nutritionRows = [],
  premium = false,
  showNutritionIcons = false,
  actions = null,
  footer = null,
  className = ''
}) {
  const cardClassName = [
    'food-info-card',
    premium ? 'food-info-card--premium' : '',
    className
  ].filter(Boolean).join(' ');
  const nutritionClassName = [
    'food-info-card__nutrition',
    premium ? 'food-nutrition-rows--premium' : ''
  ].filter(Boolean).join(' ');

  return (
    <article className={cardClassName}>
      <div className="food-info-card__image-wrap">
        <FoodImage
          src={imageSrc}
          alt={imageAlt || title || 'Food'}
          category={category}
          className="food-info-card__image"
          placeholderClassName="food-info-card__image-placeholder"
        />
      </div>

      <div className="food-info-card__content">
        <div className="food-info-card__top">
          <div className="food-info-card__copy">
            <h3 className="food-info-card__title">{title}</h3>
            {subtitle && <p className="food-info-card__subtitle">{subtitle}</p>}
          </div>
          {actions && <div className="food-info-card__actions">{actions}</div>}
        </div>

        <NutritionRows
          rows={nutritionRows}
          showIcons={showNutritionIcons}
          premium={premium}
          className={nutritionClassName}
        />

        {footer && <div className="food-info-card__footer">{footer}</div>}
      </div>
    </article>
  );
}
