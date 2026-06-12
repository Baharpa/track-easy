import { useMemo, useState } from 'react';
import Link from 'next/link';
import { Badge, Button, Card, Modal } from 'react-bootstrap';
import FoodImage from './FoodImage';
import MealFilterBar from './MealFilterBar';
import { formatCalories, formatMacro } from '../lib/formatNutrition';
import { normalizeMealCategory } from '../lib/mealCategoryHelpers';

function getMealId(value) {
  return String(value?._id || value || '');
}

function buildPastWeekMealIds(weekLogs = []) {
  const ids = new Set();
  weekLogs.forEach(log => {
    (log.meals || []).forEach(meal => {
      const mealId = getMealId(meal.mealId);
      if (mealId) ids.add(mealId);
    });
  });
  return ids;
}

export default function MealPickerModal({ show, onHide, meals = [], selectedMealId = '', weekLogs, onSelect }) {
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [pastWeekOnly, setPastWeekOnly] = useState(false);

  // Uses /api/tracker/week logs so this filter means meals actually eaten in the past week.
  const weekLogsLoaded = Array.isArray(weekLogs);
  const pastWeekMealIds = useMemo(() => buildPastWeekMealIds(weekLogs || []), [weekLogs]);

  const filteredMeals = useMemo(() => {
      const cleanSearch = search.trim().toLowerCase();

    return meals.filter(meal => {
      const matchesSearch = !cleanSearch || meal.name.toLowerCase().includes(cleanSearch);
      const matchesCategory = !category || normalizeMealCategory(meal.category) === category;
      const createdAt = meal.createdAt ? new Date(meal.createdAt) : null;
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const createdInPastWeek = createdAt && createdAt >= sevenDaysAgo;
      const matchesPastWeek = !pastWeekOnly || (weekLogsLoaded ? pastWeekMealIds.has(meal._id) : createdInPastWeek);
      return matchesSearch && matchesCategory && matchesPastWeek;
    });
  }, [category, meals, pastWeekMealIds, pastWeekOnly, search, weekLogsLoaded]);

  function clearFilters() {
    setSearch('');
    setCategory('');
    setPastWeekOnly(false);
  }

  function selectMeal(meal) {
    onSelect(meal);
    onHide();
  }

  const hasFilters = search || category || pastWeekOnly;

  return (
    <Modal show={show} onHide={onHide} size="lg" centered dialogClassName="meal-picker-dialog">
      <Modal.Header closeButton>
        <Modal.Title>Choose a Meal</Modal.Title>
      </Modal.Header>
      <Modal.Body className="meal-picker-body">
        <MealFilterBar
          search={search}
          setSearch={setSearch}
          category={category}
          setCategory={setCategory}
          showPastWeek={pastWeekOnly}
          setShowPastWeek={setPastWeekOnly}
          className="meal-picker-controls"
        />

        {meals.length === 0 && (
          <Card className="meal-picker-empty">
            <Card.Body>
              <h5>Create a meal first.</h5>
              <p className="text-muted">No saved meals are available to log yet.</p>
              <Button as={Link} href="/create-meal-component" variant="success">Create Meal</Button>
            </Card.Body>
          </Card>
        )}

        {meals.length > 0 && filteredMeals.length === 0 && (
          <Card className="meal-picker-empty">
            <Card.Body>
              <h5>{pastWeekOnly ? 'No meals logged in the past week.' : 'No meals match your search.'}</h5>
              <p className="text-muted">Adjust the search or filters to browse more meals.</p>
              {hasFilters && <Button variant="outline-success" onClick={clearFilters}>Clear Filters</Button>}
            </Card.Body>
          </Card>
        )}

        {filteredMeals.length > 0 && (
          <div className="meal-picker-results">
            {filteredMeals.map(meal => {
              const selected = selectedMealId === meal._id;
              return (
                <Card className={`meal-picker-card ${selected ? 'selected' : ''}`} key={meal._id}>
                  <FoodImage
                    src={meal.imageUrl}
                    alt={meal.name}
                    category={normalizeMealCategory(meal.category)}
                    className="meal-picker-thumb"
                    placeholderClassName="meal-placeholder-thumb"
                  />
                  <Card.Body className="meal-picker-card-body">
                    <div className="meal-picker-card-main">
                      <div className="meal-picker-card-title">
                        <h6>{meal.name}</h6>
                        <Badge className="soft-pill soft-pill-beige">{normalizeMealCategory(meal.category)}</Badge>
                      </div>
                      <div className="meal-stat-row">
                        <span>cal {formatCalories(meal.totalCalories)}</span>
                        <span>protein {formatMacro(meal.totalProtein)}g</span>
                        <span>carbs {formatMacro(meal.totalCarbs)}g</span>
                        <span>fats {formatMacro(meal.totalFats)}g</span>
                        <span>sugar {formatMacro(meal.totalSugar)}g</span>
                      </div>
                    </div>
                    <Button variant={selected ? 'outline-success' : 'success'} size="sm" onClick={() => selectMeal(meal)}>
                      {selected ? 'Selected' : 'Select'}
                    </Button>
                  </Card.Body>
                </Card>
              );
            })}
          </div>
        )}
      </Modal.Body>
    </Modal>
  );
}
