import { useState } from 'react';
import Link from 'next/link';
import useSWR from 'swr';
import { Button, Card, Col, Row } from 'react-bootstrap';
import PageHeader from '../../components/PageHeader';
import RouteGuard from '../../components/RouteGuard';
import MealCard from '../../components/MealCard';
import QuickAddMealModal from '../../components/QuickAddMealModal';
import MealFilterBar from '../../components/MealFilterBar';
import { EmptyMessage, ErrorMessage, LoadingMessage } from '../../components/StateMessage';
import { normalizeMealCategory } from '../../lib/mealCategoryHelpers';

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

export default function SavedMeals() {
  const { data: meals, error, mutate } = useSWR('/api/meals');
  const { data: favourites, mutate: mutateFavourites } = useSWR('/api/user/favourites');
  const { data: weekLogs } = useSWR('/api/tracker/week');
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [showPastWeek, setShowPastWeek] = useState(false);
  const [quickAddMeal, setQuickAddMeal] = useState(null);

  const favouriteIds = (favourites || []).map(meal => meal._id);
  const weekLogsLoaded = Array.isArray(weekLogs);
  const pastWeekMealIds = buildPastWeekMealIds(weekLogs || []);
  const filtered = (meals || []).filter(meal => {
    const matchesName = meal.name.toLowerCase().includes(search.trim().toLowerCase());
    const matchesCategory = !category || normalizeMealCategory(meal.category) === category;
    const createdAt = meal.createdAt ? new Date(meal.createdAt) : null;
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const createdInPastWeek = createdAt && createdAt >= sevenDaysAgo;
    const matchesPastWeek = !showPastWeek || (weekLogsLoaded ? pastWeekMealIds.has(meal._id) : createdInPastWeek);
    return matchesName && matchesCategory && matchesPastWeek;
  });

  return (
    <RouteGuard>
      <div className="list-page-header">
        <PageHeader title="Browse Meals" text="Meals you created from your inventory." />
        <Button as={Link} href="/create-meal-component" variant="success">Create Meal</Button>
      </div>

      {error && <ErrorMessage text="Failed to load meals." />}
      {!meals && !error && <LoadingMessage text="Loading meals..." />}

      {meals && (
        <>
          <Link href="/favourites" className="favourite-meals-shortcut">
            <Card className="app-card favourite-meals-shortcut-card">
              <div className="favourite-meals-shortcut-icon">{'\u2605'}</div>
              <div>
                <strong>Favourite Meals</strong>
                <span>Jump to your saved favourites and quick picks.</span>
              </div>
            </Card>
          </Link>

          <MealFilterBar
            search={search}
            setSearch={setSearch}
            category={category}
            setCategory={setCategory}
            showPastWeek={showPastWeek}
            setShowPastWeek={setShowPastWeek}
            className="page-card filter-card"
          />

          {meals.length === 0 && <EmptyMessage text="No meals yet. Create your first meal from your ingredients." />}
          {meals.length > 0 && filtered.length === 0 && <EmptyMessage text="No meals match your search or filter." />}
          <Row className="mobile-card-grid">
            {filtered.map(meal => (
              <Col lg={6} key={meal._id}>
                <MealCard
                  meal={meal}
                  isFavourite={favouriteIds.includes(meal._id)}
                  onFavouriteChange={mutateFavourites}
                  onDeleted={mutate}
                  onQuickAdd={setQuickAddMeal}
                />
              </Col>
            ))}
          </Row>
        </>
      )}

      <QuickAddMealModal meal={quickAddMeal} show={!!quickAddMeal} onHide={() => setQuickAddMeal(null)} />
    </RouteGuard>
  );
}
