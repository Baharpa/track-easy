import { useRouter } from 'next/router';
import useSWR from 'swr';
import PageHeader from '../../components/PageHeader';
import RouteGuard from '../../components/RouteGuard';
import IngredientForm from '../../components/IngredientForm';
import { ErrorMessage, LoadingMessage } from '../../components/StateMessage';
import { apiFetch } from '../../lib/api';

export default function EditIngredient() {
  const router = useRouter();
  const { id } = router.query;
  const { data: ingredient, error } = useSWR(id ? `/api/ingredients/${id}` : null);

  async function submit(data) {
    await apiFetch(`/api/ingredients/${id}`, { method: 'PUT', body: JSON.stringify(data) });
    router.push('/ingredients');
  }

  return <RouteGuard>
    <PageHeader title="Edit Ingredient" text="Update this ingredient." />
    {error && <ErrorMessage text="Failed to load ingredient." />}
    {!ingredient && !error && <LoadingMessage text="Loading ingredient..." />}
    {ingredient && <IngredientForm defaultValues={ingredient} onSubmit={submit} buttonText="Update Ingredient" />}
  </RouteGuard>;
}
