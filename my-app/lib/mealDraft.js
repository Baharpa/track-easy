export const MEAL_DRAFT_KEY = 'trackeasy_meal_draft';

export function hasMealDraftContent(draft) {
  const meal = draft?.meal || {};
  return Boolean(
    meal.name?.trim() ||
    meal.category?.trim() ||
    meal.imageUrl?.trim() ||
    draft?.components?.length
  );
}

export function loadMealDraft() {
  if (typeof window === 'undefined') return null;

  try {
    const rawDraft = localStorage.getItem(MEAL_DRAFT_KEY);
    if (!rawDraft) return null;
    const draft = JSON.parse(rawDraft);
    return hasMealDraftContent(draft) ? draft : null;
  } catch {
    return null;
  }
}

export function saveMealDraft(draft) {
  if (typeof window === 'undefined') return;

  if (!hasMealDraftContent(draft)) {
    localStorage.removeItem(MEAL_DRAFT_KEY);
    return;
  }

  localStorage.setItem(MEAL_DRAFT_KEY, JSON.stringify({
    meal: draft.meal,
    components: draft.components || [],
    updatedAt: new Date().toISOString()
  }));
}

export function clearMealDraft() {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(MEAL_DRAFT_KEY);
}
