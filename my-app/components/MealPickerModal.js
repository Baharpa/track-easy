import { useMemo, useState } from 'react';
import Link from 'next/link';
import { Button, Card, Modal } from 'react-bootstrap';
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

function restaurantNameOf(meal = {}) {
  const cleanName = String(meal.restaurantName || '').trim();
  return cleanName || 'Other restaurants';
}

export default function MealPickerModal({ show, onHide, meals = [], selectedMealId = '', weekLogs, onSelect }) {
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [pastWeekOnly, setPastWeekOnly] = useState(false);
  const [outsideFoodOnly, setOutsideFoodOnly] = useState(false);
  const [selectedRestaurant, setSelectedRestaurant] = useState('');

  // Uses /api/tracker/week logs so this filter means meals actually eaten in the past week.
  const weekLogsLoaded = Array.isArray(weekLogs);
  const pastWeekMealIds = useMemo(() => buildPastWeekMealIds(weekLogs || []), [weekLogs]);

  const filteredMeals = useMemo(() => {
    const cleanSearch = search.trim().toLowerCase();

    return meals.filter(meal => {
      const restaurantName = restaurantNameOf(meal);
      const matchesOutsideFood = outsideFoodOnly ? meal.outsideFood : true;
      const matchesRestaurant = !outsideFoodOnly || !selectedRestaurant || restaurantName === selectedRestaurant;
      const matchesSearch = !cleanSearch
        || meal.name.toLowerCase().includes(cleanSearch)
        || (outsideFoodOnly && restaurantName.toLowerCase().includes(cleanSearch));
      const matchesCategory = !category || normalizeMealCategory(meal.category) === category;
      const createdAt = meal.createdAt ? new Date(meal.createdAt) : null;
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const createdInPastWeek = createdAt && createdAt >= sevenDaysAgo;
      const matchesPastWeek = !pastWeekOnly || (weekLogsLoaded ? pastWeekMealIds.has(meal._id) : createdInPastWeek);
      return matchesOutsideFood && matchesRestaurant && matchesSearch && matchesCategory && matchesPastWeek;
    });
  }, [category, meals, outsideFoodOnly, pastWeekMealIds, pastWeekOnly, search, selectedRestaurant, weekLogsLoaded]);

  const restaurantGroups = useMemo(() => {
    if (!outsideFoodOnly) return [];
    const cleanSearch = search.trim().toLowerCase();
    const groups = new Map();

    meals.forEach(meal => {
      if (!meal.outsideFood) return;

      const restaurantName = restaurantNameOf(meal);
      const matchesSearch = !cleanSearch
        || restaurantName.toLowerCase().includes(cleanSearch)
        || meal.name.toLowerCase().includes(cleanSearch);
      const matchesCategory = !category || normalizeMealCategory(meal.category) === category;
      const createdAt = meal.createdAt ? new Date(meal.createdAt) : null;
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const createdInPastWeek = createdAt && createdAt >= sevenDaysAgo;
      const matchesPastWeek = !pastWeekOnly || (weekLogsLoaded ? pastWeekMealIds.has(meal._id) : createdInPastWeek);

      if (!matchesSearch || !matchesCategory || !matchesPastWeek) return;
      if (!groups.has(restaurantName)) groups.set(restaurantName, []);
      groups.get(restaurantName).push(meal);
    });

    return Array.from(groups.entries())
      .map(([restaurantName, restaurantMeals]) => ({ restaurantName, meals: restaurantMeals }))
      .sort((a, b) => a.restaurantName.localeCompare(b.restaurantName));
  }, [category, meals, outsideFoodOnly, pastWeekMealIds, pastWeekOnly, search, weekLogsLoaded]);

  function clearFilters() {
    setSearch('');
    setCategory('');
    setPastWeekOnly(false);
    setOutsideFoodOnly(false);
    setSelectedRestaurant('');
  }

  function updateOutsideFood(nextValue) {
    setOutsideFoodOnly(nextValue);
    setSelectedRestaurant('');
  }

  function selectMeal(meal) {
    onSelect(meal);
    onHide();
  }

  const hasFilters = search || category || pastWeekOnly || outsideFoodOnly || selectedRestaurant;

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
          showOutsideFood={outsideFoodOnly}
          setShowOutsideFood={updateOutsideFood}
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

        {outsideFoodOnly && selectedRestaurant && (
          <div className="meal-picker-restaurant-header">
            <button type="button" onClick={() => setSelectedRestaurant('')}>&lsaquo; Restaurants</button>
            <strong>{selectedRestaurant}</strong>
          </div>
        )}

        {outsideFoodOnly && !selectedRestaurant && restaurantGroups.length > 0 && (
          <div className="meal-picker-restaurant-list">
            {restaurantGroups.map(group => (
              <button
                type="button"
                className="meal-picker-restaurant-card"
                onClick={() => setSelectedRestaurant(group.restaurantName)}
                key={group.restaurantName}
              >
                <strong>{group.restaurantName}</strong>
                <span>{group.meals.length} meal{group.meals.length === 1 ? '' : 's'}</span>
              </button>
            ))}
          </div>
        )}

        {meals.length > 0 && ((outsideFoodOnly && !selectedRestaurant ? restaurantGroups.length === 0 : filteredMeals.length === 0)) && (
          <Card className="meal-picker-empty">
            <Card.Body>
              <h5>{outsideFoodOnly ? 'No outside food meals match your search.' : pastWeekOnly ? 'No meals logged in the past week.' : 'No meals match your search.'}</h5>
              <p className="text-muted">Adjust the search or filters to browse more meals.</p>
              {hasFilters && <Button variant="outline-success" onClick={clearFilters}>Clear Filters</Button>}
            </Card.Body>
          </Card>
        )}

        {(!outsideFoodOnly || selectedRestaurant) && filteredMeals.length > 0 && (
          <div className="meal-picker-results">
            {filteredMeals.map(meal => {
              const selected = selectedMealId === meal._id;
              return (
                <Card className={`meal-picker-card ${selected ? 'selected' : ''}`} key={meal._id}>
                  <FoodImage
                    src={meal}
                    alt={meal.name}
                    category={normalizeMealCategory(meal.category)}
                    className="meal-picker-thumb"
                    placeholderClassName="emoji-thumb meal-picker-thumb"
                  />
                  <Card.Body className="meal-picker-card-body">
                    <div className="meal-picker-card-main">
                      <div className="meal-picker-card-title">
                        <h6>{meal.name}</h6>
                      </div>
                      <div className="mini-stat-row">
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
