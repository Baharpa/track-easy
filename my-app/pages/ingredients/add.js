import { useRouter } from 'next/router';
import AppBackButton from '../../components/AppBackButton';
import PageHeader from '../../components/PageHeader';
import RouteGuard from '../../components/RouteGuard';
import IngredientForm from '../../components/IngredientForm';
import { apiFetch } from '../../lib/api';

export default function AddIngredient() {
  const router = useRouter();
  const category = typeof router.query.category === 'string' ? router.query.category : '';
  const returnTo = typeof router.query.returnTo === 'string' && router.query.returnTo.startsWith('/')
    ? router.query.returnTo
    : '/ingredients';

  async function submit(data) {
    await apiFetch('/api/ingredients', { method: 'POST', body: JSON.stringify(data) });
  }

  async function handleSuccess() {
    router.push(returnTo);
  }

  return <RouteGuard>
    <AppBackButton href="/ingredients" label="Back to Ingredients" />
    <PageHeader title="Add Ingredient" text="Add nutrition values for the full quantity you have." />
    <IngredientForm key={category || 'new'} defaultValues={{ category }} onSubmit={submit} onSuccess={handleSuccess} />
  </RouteGuard>;
}
