import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import useSWR, { useSWRConfig } from 'swr';
import { Button } from 'react-bootstrap';
import ConfirmDeleteModal from '../../components/ConfirmDeleteModal';
import IngredientForm from '../../components/IngredientForm';
import RouteGuard from '../../components/RouteGuard';
import {
  DetailDangerZone,
  DetailHeroCard,
  DetailNutritionSummary,
  DetailPageShell,
  DetailSectionCard
} from '../../components/DetailPageSystem';
import { ErrorMessage, LoadingMessage } from '../../components/StateMessage';
import { apiFetch } from '../../lib/api';
import { formatAmount } from '../../lib/formatNutrition';
import FoodImage from '../../components/FoodImage';
import FoodNutritionOverview from '../../components/FoodNutritionOverview';

export default function IngredientDetailsPage() {
  const router = useRouter();
  const { id, mode } = router.query;
  const { mutate } = useSWRConfig();
  const { data: ingredient, error } = useSWR(id ? `/api/ingredients/${id}` : null);
  const [showDelete, setShowDelete] = useState(false);
  const editMode = mode === 'edit';
  const from = typeof router.query.from === 'string' ? router.query.from : 'ingredients';

  async function submit(data) {
    const updated = await apiFetch(`/api/ingredients/${id}`, { method: 'PUT', body: JSON.stringify(data) });
    await mutate(`/api/ingredients/${id}`, updated, false);
    mutate('/api/ingredients');
  }

  async function handleSuccess() {
    router.replace({ pathname: `/ingredients/${id}`, query: { from } });
  }

  async function deleteIngredient() {
    await apiFetch(`/api/ingredients/${id}`, { method: 'DELETE' });
    setShowDelete(false);
    mutate('/api/ingredients');
    router.push('/ingredients');
  }

  if (!ingredient && !error) return <RouteGuard><LoadingMessage text="Loading ingredient..." /></RouteGuard>;
  if (error || !ingredient) return <RouteGuard><ErrorMessage text="Failed to load ingredient." /></RouteGuard>;

  if (editMode) {
    return (
      <RouteGuard>
        <DetailPageShell title="Edit Ingredient" subtitle="Update this ingredient." defaultFrom="ingredients">
          <IngredientForm defaultValues={ingredient} onSubmit={submit} onSuccess={handleSuccess} buttonText="Update Ingredient" />
        </DetailPageShell>
      </RouteGuard>
    );
  }

  const conversions = ingredient.conversions?.length
    ? ingredient.conversions
    : ingredient.servingOptions || [];
  const amountLabel = `${formatAmount(ingredient.quantity)} ${ingredient.unit || ''}`.trim();

  return (
    <RouteGuard>
      <DetailPageShell title="Ingredient Details" subtitle="Review this ingredient and its nutrition." defaultFrom="ingredients">
        <section className="meal-overview-hero ingredient-overview-hero">
          <FoodImage src={ingredient} alt={ingredient.name} category={ingredient.category} variant="detail" className="meal-overview-hero-image" placeholderClassName="meal-overview-hero-placeholder" />
          <div className="meal-overview-hero-overlay"><span>{ingredient.category || 'Other'}</span><h2>{ingredient.name}</h2><strong>{amountLabel}</strong></div>
        </section>
        <FoodNutritionOverview item={ingredient} amount={amountLabel} amountLabel="saved amount" />
        <div className="ingredient-overview-actions"><Button as={Link} href={{ pathname: `/ingredients/${id}`, query: { mode: 'edit', from } }} variant="success">Edit Ingredient</Button></div>
        <DetailDangerZone text={`Delete ${ingredient.name} permanently.`} buttonLabel="Delete Ingredient" onDelete={() => setShowDelete(true)} />
      </DetailPageShell>
      <ConfirmDeleteModal show={showDelete} title="Delete Ingredient" message={`Delete ${ingredient.name}? This cannot be undone.`} onCancel={() => setShowDelete(false)} onConfirm={deleteIngredient} />
    </RouteGuard>
  );
}
