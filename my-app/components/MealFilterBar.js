import { Col, Form, InputGroup, Row } from 'react-bootstrap';
import { mealCategoryOptions } from '../lib/mealCategoryHelpers';

export default function MealFilterBar({
  search,
  setSearch,
  category,
  setCategory,
  showPastWeek,
  setShowPastWeek,
  showPastWeekOption = true,
  className = ''
}) {
  return (
    <div className={`meal-filter-bar ${className}`}>
      <Row className="g-2 align-items-stretch">
        <Col lg={showPastWeekOption ? 6 : 8}>
          <InputGroup className="meal-filter-control">
            <InputGroup.Text>Search</InputGroup.Text>
            <Form.Control
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search meals..."
              aria-label="Search meals"
            />
          </InputGroup>
        </Col>
        <Col sm={showPastWeekOption ? 6 : 4} lg={showPastWeekOption ? 3 : 4}>
          <Form.Select
            className="meal-filter-control"
            value={category}
            onChange={e => setCategory(e.target.value)}
            aria-label="Filter meals by category"
          >
            {mealCategoryOptions(true).map(option => (
              <option key={option} value={option === 'All categories' ? '' : option}>
                {option}
              </option>
            ))}
          </Form.Select>
        </Col>
        {showPastWeekOption && (
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
