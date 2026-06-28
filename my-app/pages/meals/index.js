import { useState } from 'react';
import Link from 'next/link';
import { Button, Col, Row } from 'react-bootstrap';
import AppShortcutCard from '../../components/AppShortcutCard';
import AppLoadingBox from '../../components/AppLoadingBox';
import MealCard from '../../components/MealCard';
import MealFilterBar from '../../components/MealFilterBar';
import PageHeader from '../../components/PageHeader';
import QuickAddMealModal from '../../components/QuickAddMealModal';
import RouteGuard from '../../components/RouteGuard';
import { EmptyMessage, ErrorMessage } from '../../components/StateMessage';
import useSessionCachedSWR from '../../hooks/useSessionCachedSWR';
import useSWR from 'swr';
import { normalizeMealCategory } from '../../lib/mealCategoryHelpers';

export default function SavedMeals() {
  const { data: meals, error, mutate, isInitialLoading, hasCachedData } = useSessionCachedSWR('/api/meals', 'trackeasy.meals.cache');
  const { data: favourites, mutate: mutateFavourites } = useSWR('/api/user/favourites');
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [quickAddMeal, setQuickAddMeal] = useState(null);
  const [quickAddSuccess, setQuickAddSuccess] = useState('');

  const favouriteIds = (favourites || []).map(meal => meal._id);
  const filtered = (meals || []).filter(meal => {
    const matchesName = meal.name.toLowerCase().includes(search.trim().toLowerCase());
    const matchesCategory = !category || normalizeMealCategory(meal.category) === category;
    return matchesName && matchesCategory;
  });

  return (
    <RouteGuard>
      <div className="list-section-page">
        <div className="list-page-header">
          <PageHeader title="Browse Meals" text="Meals you created from your inventory." />
          <div className="inventory-header-actions">
            <Button as={Link} href="/create-meal-component" variant="success">Create Meal</Button>
          </div>
        </div>

        <AppShortcutCard
          href="/favourites"
          title="Go to Favourites"
          subtitle="See your saved meals and quick picks."
          icon={<span>&hearts;</span>}
          variant="coral"
        />

        <MealFilterBar
          search={search}
          setSearch={setSearch}
          category={category}
          setCategory={setCategory}
          showPastWeekOption={false}
          className="page-card filter-card"
        />

        {error && !meals && <ErrorMessage text="Failed to load meals." />}
        {error && meals && <ErrorMessage text="Could not refresh meals. Showing your last loaded meals." />}
        {quickAddSuccess && <div className="quick-add-success-alert" role="status">✓ {quickAddSuccess}</div>}

        <section className="list-results-area" aria-busy={isInitialLoading}>
          {isInitialLoading && (
            <div className="app-loading-panel">
              <AppLoadingBox />
              <span className="app-loading-panel-text">Loading meals...</span>
            </div>
          )}

          {meals && (
            <>
              {hasCachedData && <div className="list-refresh-note">Refreshing meals...</div>}
              {meals.length === 0 && <EmptyMessage text="No meals yet. Create your first meal from your ingredients." />}
              {meals.length > 0 && filtered.length === 0 && <EmptyMessage text="No meals match your search or filter." />}

              <Row className="mobile-card-grid food-card-grid">
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
        </section>

        <QuickAddMealModal
          meal={quickAddMeal}
          show={!!quickAddMeal}
          onHide={() => setQuickAddMeal(null)}
          onLogged={message => {
            setQuickAddSuccess(message);
            window.setTimeout(() => setQuickAddSuccess(''), 2600);
          }}
        />
      </div>
    </RouteGuard>
  );
}
