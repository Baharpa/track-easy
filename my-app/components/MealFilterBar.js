import { Col, Form, Row } from 'react-bootstrap';
import AppSearchBar from './AppSearchBar';
import { mealCategoryOptions } from '../lib/mealCategoryHelpers';

export default function MealFilterBar({
  search,
  setSearch,
  category,
  setCategory,
  showPastWeek,
  setShowPastWeek,
  showPastWeekOption = true,
  categoryOptions,
  searchPlaceholder = 'Search meals...',
  searchAriaLabel = 'Search meals',
  categoryAriaLabel = 'Filter by category',
  className = ''
}) {
  const options = categoryOptions || mealCategoryOptions(true).map(option => ({
    label: option,
    value: option === 'All categories' ? '' : option
  }));

  return (
    <div className={`meal-filter-bar ${className}`}>
      <Row className="g-2 align-items-stretch">
        <Col md={7}>
          <AppSearchBar
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder={searchPlaceholder}
            ariaLabel={searchAriaLabel}
            size="compact"
          />
        </Col>
        <Col md={5}>
          <Form.Select
            className="meal-filter-control"
            value={category}
            onChange={e => setCategory(e.target.value)}
            aria-label={categoryAriaLabel}
          >
            {options.map(option => (
              <option key={option.value || option.label} value={option.value}>
                {option.label}
              </option>
            ))}
          </Form.Select>
        </Col>
        {showPastWeekOption && setShowPastWeek && (
          <Col sm={6} lg={3}>
            <Form.Check
              type="switch"
              id="meal-filter-past-week"
              className="meal-filter-week-toggle"
              checked={showPastWeek}
              onChange={e => setShowPastWeek(e.target.checked)}
              label="Meals from past week"
            />
          </Col>
        )}
      </Row>
    </div>
  );
}
