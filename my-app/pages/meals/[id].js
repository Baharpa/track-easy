import { useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import useSWR from 'swr';
import { Dropdown } from 'react-bootstrap';
import AppBackButton from '../../components/AppBackButton';
import RouteGuard from '../../components/RouteGuard';
import MealDetails from '../../components/MealDetails';
import ConfirmDeleteModal from '../../components/ConfirmDeleteModal';
import { ErrorMessage, LoadingMessage } from '../../components/StateMessage';
import { apiFetch } from '../../lib/api';
import { TrackEasyIcon } from '../../components/TrackEasyIcons';

export default function MealDetailsPage() {
  const router = useRouter();
  const { id } = router.query;
  const { data: meal, error } = useSWR(id ? `/api/meals/${id}` : null);
  const [showDelete, setShowDelete] = useState(false);
  const from = typeof router.query.from === 'string' ? router.query.from : 'meals';
  const backTargets = {
    history: { href: '/history', label: 'Back to History' },
    tracker: { href: '/tracker', label: 'Back to Tracker' },
    dashboard: { href: '/dashboard', label: 'Back to Home' },
    meals: { href: '/meals', label: 'Back to Meals' }
  };
  const backTarget = backTargets[from];

  async function deleteMeal() {
    await apiFetch(`/api/meals/${id}`, { method: 'DELETE' });
    setShowDelete(false);
    router.push('/meals');
  }

  return <RouteGuard>
    {error && <ErrorMessage text="Failed to load meal details." />}
    {!meal && !error && <LoadingMessage text="Loading meal details..." />}
    {meal && <>
      <main className="meal-overview-page">
        <header className="meal-overview-header">
          <AppBackButton href={backTarget?.href} label={backTarget?.label || 'Back'} className="meal-overview-back" />
          <h1>Meal Overview</h1>
          <Dropdown align="end" className="meal-overview-menu">
            <Dropdown.Toggle aria-label="Meal actions"><TrackEasyIcon name="ellipsis" size={26} /></Dropdown.Toggle>
            <Dropdown.Menu>
              <Dropdown.Item as={Link} href={{ pathname: `/meals/edit/${meal._id}`, query: { from } }}>Edit meal</Dropdown.Item>
              <Dropdown.Item className="text-danger" onClick={() => setShowDelete(true)}>Delete meal</Dropdown.Item>
            </Dropdown.Menu>
          </Dropdown>
        </header>
        <MealDetails meal={meal} />
      </main>
      <ConfirmDeleteModal show={showDelete} title="Delete Meal" message={`Delete ${meal.name}? This cannot be undone.`} onCancel={() => setShowDelete(false)} onConfirm={deleteMeal} />
    </>}
  </RouteGuard>;
}
