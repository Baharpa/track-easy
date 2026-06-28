import { useState } from 'react';
import { useRouter } from 'next/router';
import useSWR, { useSWRConfig } from 'swr';
import AppBackButton from '../../../components/AppBackButton';
import PageHeader from '../../../components/PageHeader';
import RouteGuard from '../../../components/RouteGuard';
import ComponentMealEditor, { mealToEditorState } from '../../../components/ComponentMealEditor';
import { ErrorMessage, LoadingMessage } from '../../../components/StateMessage';
import { apiFetch } from '../../../lib/api';
import { getMealDraftKey } from '../../../lib/mealDraft';

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
    } catch (err) {
      setSaveError(err.message || 'Could not update meal.');
      throw err;
    } finally {
      setIsSaving(false);
    }
  }

  async function handleSuccess() {
    router.replace(`/meals/${id}`);
  }

  const editorState = meal ? mealToEditorState(meal) : null;

  return <RouteGuard>
    <AppBackButton href={id ? `/meals/${id}` : '/meals'} label="Back" />
      <PageHeader title="Edit Meal" text="Update meal details and ingredient amounts." />
      {(mealError || ingredientsError) && <ErrorMessage text="Failed to load meal editor data." />}
      {(!meal || !ingredients) && !(mealError || ingredientsError) && <LoadingMessage text="Loading meal editor..." />}
      {meal && ingredients && <ComponentMealEditor
        ingredients={ingredients}
      initialMeal={editorState.meal}
      initialComponents={editorState.components}
      onSave={submit}
      onSaveSuccess={handleSuccess}
        onCancel={() => router.push(`/meals/${id}`)}
        saveLabel="Update Meal"
        saving={isSaving}
        error={saveError}
        draftKey={getMealDraftKey({ mealId: id })}
      />}
    </RouteGuard>;
}
