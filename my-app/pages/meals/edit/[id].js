import { useState } from 'react';
import { useRouter } from 'next/router';
import useSWR, { useSWRConfig } from 'swr';
import PageHeader from '../../../components/PageHeader';
import RouteGuard from '../../../components/RouteGuard';
import ComponentMealEditor, { mealToEditorState } from '../../../components/ComponentMealEditor';
import { ErrorMessage, LoadingMessage } from '../../../components/StateMessage';
import { apiFetch } from '../../../lib/api';

export default function EditMeal() {
  const router = useRouter();
  const { id } = router.query;
  const { mutate } = useSWRConfig();
  const { data: meal, error: mealError } = useSWR(id ? `/api/meals/${id}` : null);
  const { data: ingredients, error: ingredientsError } = useSWR('/api/ingredients');
  const [saveError, setSaveError] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  async function submit(data) {
    setSaveError('');
    setIsSaving(true);

    try {
      const updatedMeal = await apiFetch(`/api/meals/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data)
      });

      await mutate(`/api/meals/${id}`, updatedMeal, false);
      mutate('/api/meals');
      router.replace(`/meals/${id}`);
    } catch (err) {
      setSaveError(err.message || 'Could not update meal.');
    } finally {
      setIsSaving(false);
    }
  }

  const editorState = meal ? mealToEditorState(meal) : null;

  return <RouteGuard>
    <PageHeader title="Edit Meal" text="Update meal details and ingredient amounts." />
    {(mealError || ingredientsError) && <ErrorMessage text="Failed to load meal editor data." />}
    {(!meal || !ingredients) && !(mealError || ingredientsError) && <LoadingMessage text="Loading meal editor..." />}
    {meal && ingredients && <ComponentMealEditor
      ingredients={ingredients}
      initialMeal={editorState.meal}
      initialComponents={editorState.components}
      onSave={submit}
      onCancel={() => router.push(`/meals/${id}`)}
      saveLabel="Update Meal"
      saving={isSaving}
      error={saveError}
    />}
  </RouteGuard>;
}
