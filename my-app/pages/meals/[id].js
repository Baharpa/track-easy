import { useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import useSWR from 'swr';
import { Button } from 'react-bootstrap';
import PageHeader from '../../components/PageHeader';
import RouteGuard from '../../components/RouteGuard';
import MealDetails from '../../components/MealDetails';
import ConfirmDeleteModal from '../../components/ConfirmDeleteModal';
import { ErrorMessage, LoadingMessage } from '../../components/StateMessage';
import { apiFetch } from '../../lib/api';
import { normalizeMealCategory } from '../../lib/mealCategoryHelpers';

export default function MealDetailsPage() {
  const router = useRouter();
  const { id } = router.query;
  const { data: meal, error } = useSWR(id ? `/api/meals/${id}` : null);
  const [showDelete, setShowDelete] = useState(false);

  async function deleteMeal() {
    await apiFetch(`/api/meals/${id}`, { method: 'DELETE' });
    setShowDelete(false);
    router.push('/meals');
  }

  return <RouteGuard>
    {error && <ErrorMessage text="Failed to load meal details." />}
    {!meal && !error && <LoadingMessage text="Loading meal details..." />}
    {meal && <>
      <div className="meal-details-page-header">
        <PageHeader title={meal.name} text={normalizeMealCategory(meal.category)} />
        <div className="meal-details-page-actions">
          <Button as={Link} href={`/meals/edit/${meal._id}`} variant="warning" className="me-2">Edit</Button>
          <Button variant="outline-danger" onClick={() => setShowDelete(true)}>Delete</Button>
        </div>
      </div>
      <MealDetails meal={meal} />
      <ConfirmDeleteModal show={showDelete} title="Delete Meal" message={`Delete ${meal.name}? This cannot be undone.`} onCancel={() => setShowDelete(false)} onConfirm={deleteMeal} />
    </>}
  </RouteGuard>;
}
