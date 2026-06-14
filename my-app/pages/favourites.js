import { useState } from 'react';
import useSWR from 'swr';
import { Col, Row } from 'react-bootstrap';
import PageHeader from '../components/PageHeader';
import RouteGuard from '../components/RouteGuard';
import MealCard from '../components/MealCard';
import QuickAddMealModal from '../components/QuickAddMealModal';
import { EmptyMessage, ErrorMessage, LoadingMessage } from '../components/StateMessage';

export default function Favourites() {
  const { data: favourites, error, mutate } = useSWR('/api/user/favourites');
  const [quickAddMeal, setQuickAddMeal] = useState(null);

  return <RouteGuard>
    <PageHeader title="Favourite Meals" text="Meals you saved as favourites." />
    {error && <ErrorMessage text="Failed to load favourite meals." />}
    {!favourites && !error && <LoadingMessage text="Loading favourites..." />}
    {favourites && favourites.length === 0 && <EmptyMessage text="No favourite meals yet. Use the favourite button on saved meals." />}
    <Row className="mobile-card-grid">
      {favourites?.map(meal => (
        <Col lg={6} key={meal._id}>
          <MealCard meal={meal} isFavourite onFavouriteChange={mutate} onDeleted={mutate} onQuickAdd={setQuickAddMeal} />
        </Col>
      ))}
    </Row>
    <QuickAddMealModal meal={quickAddMeal} show={!!quickAddMeal} onHide={() => setQuickAddMeal(null)} />
  </RouteGuard>;
}
