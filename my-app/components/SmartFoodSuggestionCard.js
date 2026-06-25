import Link from 'next/link';
import { Badge, Button, Card } from 'react-bootstrap';

export default function SmartFoodSuggestionCard({
  suggestion,
  primaryHref,
  primaryLabel = 'Create as meal',
  onPrimary,
  onDismiss
}) {
  if (!suggestion) return null;

  const primaryButton = primaryHref ? (
    <Button as={Link} href={primaryHref} variant="success">{primaryLabel}</Button>
  ) : (
    <Button variant="success" onClick={onPrimary}>{primaryLabel}</Button>
  );

  return (
    <Card className="smart-food-suggestion-card">
      <Card.Body>
        <div className="smart-food-suggestion-card__header">
          <div>
            <Badge className="smart-food-suggestion-card__badge">This looks like a meal</Badge>
            <h5>{suggestion.name}</h5>
            <p>{suggestion.explanation}</p>
          </div>
        </div>

        <div className="smart-food-suggestion-card__components">
          {suggestion.suggestedComponents.map(component => (
            <div className="smart-food-suggestion-card__component" key={`${component.name}-${component.amount}-${component.unit}`}>
              <span>{component.name}</span>
              <strong>{component.amount} {component.unit}</strong>
            </div>
          ))}
        </div>

        <div className="smart-food-suggestion-card__actions">
          {primaryButton}
          {onDismiss && <Button variant="outline-success" onClick={onDismiss}>Search ingredients instead</Button>}
        </div>
      </Card.Body>
    </Card>
  );
}
