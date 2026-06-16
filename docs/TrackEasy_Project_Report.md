# Track Easy Project Technical Report

Beginner-friendly guide to the Track Easy full-stack project.

## 1. Project Overview

Track Easy is a food tracking application. A user can register, log in, manage ingredients, build meals from those ingredients, mark meals as favourites, quickly log meals, log single ingredients, set nutrition goals, and review daily or weekly nutrition totals.

The project has two main applications:

| Part | Folder | Technology | Main job |
|-----|---|---|
| Frontend | `my-app` | Next.js, React, React Bootstrap, SWR | Shows pages, forms, cards, modals, filters, and calls the backend API |
| Backend | `user-api` | Express, MongoDB, Mongoose, Passport JWT | Authenticates users, validates data, stores and returns ingredients, meals, favourites, logs, and goals |

MongoDB stores four main document types:

| Model | Stores |
|---|---|
| `User` | username, hashed password, favourite meal IDs, nutrition goals |
| `Ingredient` | user's ingredient inventory, nutrition values, unit conversion details, image URL |
| `Meal` | saved meals, ingredients used, optional meal components, total nutrition |
| `DailyLog` | one user's logged food for one date, plus daily nutrition totals |

Typical app flow:

1. User registers or logs in.
2. Backend returns a JWT token.
3. Frontend stores the token in `localStorage`.
4. Protected pages use `RouteGuard` to check the token.
5. API calls use `apiFetch`, which attaches `Authorization: Bearer <token>`.
6. User adds ingredients.
7. User builds meals from ingredients.
8. User logs a meal or ingredient.
9. Backend stores the log in `DailyLog` and recalculates totals.
10. Dashboard, weekly history, and profile pages display tracked data.

## 2. Folder Structure

| Folder/file | Purpose |
|---|---|
| `my-app/components` | Reusable frontend UI pieces such as cards, forms, modals, navbar, route guard, and summary tables |
| `my-app/lib` | Frontend helper functions for API calls, auth, categories, formatting, meal math, unit conversion, and draft saving |
| `my-app/pages` | Next.js pages. Each file maps to a URL route |
| `my-app/styles/globals.css` | Global app styling, theme variables, layout classes, cards, modals, picker styles, responsive rules |
| `user-api/models` | Mongoose schemas for MongoDB collections |
| `user-api/routes` | Express route handlers for user, ingredients, meals, tracker logs, and unit conversion |
| `user-api/config` | JWT authentication middleware and Passport strategy setup |
| `user-api/utils` | Backend nutrition and unit conversion helpers |
| `user-api/server.js` | Express server entry point, middleware, MongoDB connection, and route mounting |

## 3. Frontend Architecture

The frontend is a Next.js app using the `pages` router. Files inside `my-app/pages` automatically become routes. For example:

| File | URL |
|---|---|
| `pages/index.js`        
| `pages/dashboard.js` | `/dashboard` |
| `pages/ingredients/index.js` | `/ingredients` |
| `pages/ingredients/add.js` | `/ingredients/add` |
| `pages/ingredients/[id].js` | `/ingredients/:id` |
| `pages/meals/index.js` | `/meals` |
| `pages/meals/[id].js` | `/meals/:id` |
| `pages/tracker/index.js` | `/tracker` |

React components are stored in `components`. Pages import these components to keep the page code smaller and reusable. For example, `pages/meals/index.js` uses `MealCard`, `MealFilterBar`, `QuickAddMealModal`, `PageHeader`, and `RouteGuard`.

React Bootstrap provides most layout and form components. Important examples:

| Bootstrap component | Used for |
|---|---|
| `Container` | Main page width in `Layout` |
| `Row` and `Col` | Responsive grid layouts |
| `Card` | Repeated content blocks and panels |
| `Button` | User actions |
| `Form.Control`, `Form.Select`, `Form.Check` | Inputs, dropdowns, switches |
| `Modal` | Delete confirmations, meal picker, quick add, ingredient library |
| `Badge` | Category pills and labels |
| `Table` | Nutrition tables and breakdowns |

SWR is used for data fetching. A page like `dashboard.js` calls:

```js
const { data: today, error: todayError } = useSWR('/api/tracker/today');
const { data: goals, error: goalsError } = useSWR('/api/user/goals');
```

The SWR key is the API path. In `_app.js`, `SWRConfig` uses the shared `fetcher` from `lib/api.js`, so all SWR requests go through `apiFetch`.

Authentication uses JWT tokens:

| File | Role |
|---|---|
| `lib/api.js` | Reads/writes/removes token and sends it with API requests |
| `lib/auth.js` | Decodes token using `jwt-decode` and checks whether a user is logged in |
| `components/RouteGuard.js` | Redirects unauthenticated users away from protected pages |
| `components/MainNav.js` | Shows navigation and logout behavior based on login state |

Protected pages wrap their content with:

```jsx
<RouteGuard>
  {/* protected page UI */}
</RouteGuard>
```

## 4. Components

### `ComponentMealEditor.js`

Purpose: reusable editor for an existing component-based meal. It is used by `pages/meals/edit/[id].js`.

Main imports:

| Import | Why it is used |
|---|---|
| `useState`, `useMemo`, `useEffect`, `useRef` | Form state, calculated previews, cleanup timers |
| React Bootstrap components | Layout, cards, forms, modal, alerts, badges |
| `FoodImage` | Meal and ingredient images with emoji fallback |
| `UnitSelect` | Reusable unit dropdown |
| `mealMath` helpers | Build preview components and totals before saving |
| category/nutrition helpers | Format amounts, category labels, icons, and nutrition |

Props:

| Prop | Meaning |
|---|---|
| `ingredients` | Available inventory ingredients |
| `initialMeal` | Existing meal name/category/image values |
| `initialComponents` | Existing meal component groups |
| `onSave` | Parent function called with the edited meal data |
| `onCancel` | Parent function called when the user cancels |
| `saveLabel` | Text for the save button |
| `saving` | Disables actions while save is running |
| `error` | Error message displayed above the form |

Important helper functions:

| Function | Purpose |
|---|---|
| `mealToEditorState(meal)` | Converts a backend meal document into editor state |
| `sameCategory` | Checks whether an ingredient belongs to the selected category |
| `normalizeMealIngredient` | Converts backend ingredient data into `{ ingredientId, quantityUsed, unit }` |
| `addIngredientToMeal` | Adds or updates an ingredient inside the selected component group |
| `removeIngredient` | Removes one ingredient row from a component |
| `renameComponent` | Updates the name/category of a component group |
| `saveMeal` | Validates and sends the final edited meal object to the parent page |

Important JSX:

| Section | CSS/classes | What it shows |
|---|---|---|
| Meal setup card | `meal-setup-card`, `meal-image-preview` | Name, category, image URL, preview image |
| Empty builder card | `empty-builder-card` | Message and add button when no ingredients exist |
| Component cards | `component-builder-card`, `component-ingredient-row` | Groups of ingredients with edit/remove actions |
| Summary table | `builder-summary-table`, `builder-summary-mobile` | Desktop and mobile nutrition breakdowns |
| Ingredient library modal | `ingredient-library-dialog`, `ingredient-library-picker` | Browse ingredients by category and choose amounts |

Connection: the editor depends on `FoodImage`, `UnitSelect`, `mealMath`, `formatNutrition`, `foodVisuals`, and meal category helpers. It does not directly call the API; the parent page does that through `onSave`.

### `ConfirmDeleteModal.js`

Purpose: reusable confirmation modal before deleting an ingredient, meal, or logged food.

Props:

| Prop | Meaning |
|---|---|
| `show` | Whether the modal is visible |
| `title` | Modal title |
| `message` | Main warning text |
| `onCancel` | Runs when cancel/close is clicked |
| `onConfirm` | Runs when delete/confirm is clicked |

It uses React Bootstrap `Modal` and `Button`. It is used by `IngredientCard`, `MealCard`, and `pages/meals/[id].js`.

### `FoodImage.js`

Purpose: shows a real image if `src` is valid, otherwise shows an emoji placeholder based on category.

Props:

| Prop | Meaning |
|---|---|
| `src` | Image URL |
| `alt` | Image alt text |
| `category` | Category used to choose fallback emoji/class |
| `className` | Image size/style class |
| `placeholderClassName` | Placeholder style class |

State:

| State | Meaning |
|---|---|
| `failed` | Becomes `true` if the image fails to load |

Important logic:

```js
const cleanSrc = safeImageUrl(src);
const canShowImage = cleanSrc && !failed;
```

`safeImageUrl` only allows safe HTTP, HTTPS, or `data:image/` URLs. If the image fails, the component renders:

```jsx
<div className={`${placeholderClassName} ${className} emoji-placeholder ${categoryClass}`}>
  {getCategoryIcon(category)}
</div>
```

This connects visual fallback styling to category helper logic.

### `IngredientCard.js`

Purpose: displays one inventory ingredient in a card row with edit/delete actions.

Props:

| Prop | Meaning |
|---|---|
| `ingredient` | Ingredient document from the backend |
| `onDeleted` | Callback that refreshes the list after delete |

State:

| State | Meaning |
|---|---|
| `showDelete` | Controls the delete confirmation modal |

Important behavior:

```js
await apiFetch(`/api/ingredients/${ingredient._id}`, { method: 'DELETE' });
```

The delete button opens `ConfirmDeleteModal`. Confirming deletes the ingredient through the backend and then calls `onDeleted`, usually SWR's `mutate`.

Important CSS/classes: `app-card`, `picker-row`, `thumb-md`, `picker-row-body`, `mini-stat-row`, `soft-pill`, `action-wrap`.

### `IngredientForm.js`

Purpose: shared form for adding and editing ingredients. It is used by `pages/ingredients/add.js` and `pages/ingredients/[id].js`.

Props:

| Prop | Meaning |
|---|---|
| `defaultValues` | Existing ingredient values when editing |
| `onSubmit` | Parent save function |
| `buttonText` | Submit button label |

Hooks:

| Hook | Why |
|---|---|
| `useForm` | Handles validation, form state, submit state |
| `Controller` | Connects React Hook Form to custom `UnitSelect` |

Important helper:

| Function | Purpose |
|---|---|
| `buildDefaultValues` | Pre-fills nutrition values using saved serving nutrition |

Important validation:

| Rule | Meaning |
|---|---|
| `positiveRule` | Required and greater than `0.1` |
| `optionalPositiveRule` | Optional but cannot be negative |

Important JSX sections:

| Section | Purpose |
|---|---|
| Name/category fields | Basic ingredient identity |
| Serving amount/unit | Quantity and unit used for nutrition |
| Nutritional values | calories, protein, carbs, fats, sugar |
| Image URL | Optional image for cards and previews |

### `Layout.js`

Purpose: wraps every page with shared navigation and page container.

Props:

| Prop | Meaning |
|---|---|
| `children` | The page content |

It uses `MainNav` and a Bootstrap `Container` with `app-shell`.

### `MainNav.js`

Purpose: top navigation bar for the app.

Hooks:

| Hook | Why |
|---|---|
| `useRouter` | Redirects on logout and highlights routes |
| `useState` | Stores current user |
| `useEffect` | Reads user token after route changes |

Important helpers:

| Helper | Purpose |
|---|---|
| `getCurrentUser` | Decodes JWT token |
| `removeToken` | Logs out by clearing token |

It links to dashboard, ingredients, meals, favourites, log food, weekly history, profile, login/register, and logout depending on auth state.

### `MealCard.js`

Purpose: displays one saved meal in browse/favourites lists.

Props:

| Prop | Meaning |
|---|---|
| `meal` | Meal document |
| `isFavourite` | Whether the current user has favourited it |
| `onFavouriteChange` | Refreshes favourites after add/remove |
| `onDeleted` | Refreshes meal list after delete |
| `onQuickAdd` | Opens quick add modal |
| `hideCategoryBadge` | Hides category badge in some contexts |

Important API calls:

| Action | API |
|---|---|
| Add favourite | `PUT /api/user/favourites/:id` |
| Remove favourite | `DELETE /api/user/favourites/:id` |
| Delete meal | `DELETE /api/meals/:id` |

Important CSS/classes: `app-card`, `picker-row`, `thumb-md`, `mini-stat-row`, `soft-pill`, `action-wrap`.

### `MealDetails.js`

Purpose: detailed read-only view of one meal.

Props:

| Prop | Meaning |
|---|---|
| `meal` | Full meal document from `/api/meals/:id` |

It shows:

| Section | Purpose |
|---|---|
| Hero area | Meal image/name/category |
| Nutrition chips | calories, protein, carbs, fats, sugar |
| Component list | Component names, total weight, nutrition totals |
| Ingredient table | Ingredients used, original amounts, converted grams, nutrition |

Important CSS/classes: `meal-details-card`, `meal-details-hero`, `meal-detail-img`, `meal-detail-nutrition-grid`, `meal-component-row`, `meal-ingredient-table`.

### `MealFilterBar.js`

Purpose: reusable meal search/filter controls used in browse meals, favourites, and meal picker views.

Signature:

```js
export default function MealFilterBar({
  search,
  setSearch,
  category,
  setCategory,
  showPastWeek,
  setShowPastWeek,
  showPastWeekOption = true,
  className = ''
}) { ... }
```

Props:

| Prop | Meaning |
|---|---|
| `search` | Current text in the search box |
| `setSearch` | Updates search text |
| `category` | Selected meal category |
| `setCategory` | Updates selected category |
| `showPastWeek` | Whether past-week filter is enabled |
| `setShowPastWeek` | Updates past-week filter |
| `showPastWeekOption` | Controls whether the past-week switch appears |
| `className` | Allows parent components to add extra CSS classes |

Important JSX:

```jsx
<Col lg={showPastWeekOption ? 6 : 8}>
```

`Col` comes from React Bootstrap. `lg` means the column width at large screens. Bootstrap's grid has 12 columns. If the past-week option is shown, the search box gets 6 columns. If it is hidden, the search box gets 8 columns because there is more room.

```jsx
<Col sm={showPastWeekOption ? 6 : 4} lg={showPastWeekOption ? 3 : 4}>
```

`sm` means small screens and up. `lg` means large screens and up. The ternary changes the category dropdown width depending on whether the past-week switch exists. When the switch is hidden, search and category share the row more evenly.

CSS/classes: `meal-filter-bar`, `meal-filter-control`, `meal-filter-week-toggle`.

### `MealPickerModal.js`

Purpose: modal used by Log Food to choose a saved meal.

Props:

| Prop | Meaning |
|---|---|
| `show` | Whether modal is open |
| `onHide` | Closes the modal |
| `meals` | Saved meals to choose from |
| `selectedMealId` | Currently selected meal |
| `weekLogs` | Recent logs used for past-week filtering |
| `onSelect` | Called when user selects a meal |

Hooks:

| Hook | Why |
|---|---|
| `useState` | Stores local search/category/past-week filters |
| `useMemo` | Calculates past-week meal IDs and filtered meals efficiently |

Important helpers:

| Function | Purpose |
|---|---|
| `getMealId` | Safely extracts an ID from either an object or raw ID |
| `buildPastWeekMealIds` | Builds a `Set` of meal IDs from `/api/tracker/week` logs |
| `clearFilters` | Resets search/category/past-week filters |
| `selectMeal` | Calls parent `onSelect` and closes the modal |

Important filtering code:

```js
return meals.filter(meal => {
  const matchesSearch = !cleanSearch || meal.name.toLowerCase().includes(cleanSearch);
  const matchesCategory = !category || normalizeMealCategory(meal.category) === category;
  const createdAt = meal.createdAt ? new Date(meal.createdAt) : null;
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const createdInPastWeek = createdAt && createdAt >= sevenDaysAgo;
  const matchesPastWeek = !pastWeekOnly || (weekLogsLoaded ? pastWeekMealIds.has(meal._id) : createdInPastWeek);
  return matchesSearch && matchesCategory && matchesPastWeek;
});
```

Step-by-step:

| Line | Meaning |
|---|---|
| `meals.filter(...)` | Loops through every meal and keeps only meals that return `true` |
| `matchesSearch` | If search is empty, everything matches. Otherwise the meal name must include the search text |
| `matchesCategory` | If no category is selected, everything matches. Otherwise normalized meal category must equal selected category |
| `createdAt` | Converts the meal's creation date string into a `Date` object |
| `sevenDaysAgo` | Creates a date exactly seven days before now |
| `createdInPastWeek` | Checks whether the meal was created in the last seven days |
| `matchesPastWeek` | If past-week filter is off, everything matches. If it is on, use real week logs when loaded; otherwise fallback to creation date |
| `pastWeekMealIds` | A `Set` of meal IDs actually logged in the last week |
| `weekLogsLoaded` | Tells the component whether it can trust logged-meal data |
| Final `return` | Uses `&&`, so all enabled filters must pass |

The dependency array:

```js
[category, meals, pastWeekMealIds, pastWeekOnly, search, weekLogsLoaded]
```

Because this logic is inside `useMemo`, React recalculates `filteredMeals` only when one of those values changes.

### `NutritionSummary.js`

Purpose: small nutrition summary table used on tracker/summary/breakdown pages.

Props:

| Prop | Meaning |
|---|---|
| `item` | Object with total calories/protein/carbs/fats/sugar fields |

It renders a `Table` with CSS classes `nutrition-table-card` and `nutrition-table`.

### `PageHeader.js`

Purpose: consistent page title and subtitle.

Props:

| Prop | Meaning |
|---|---|
| `title` | Main heading |
| `text` | Supporting text |

CSS/classes: `page-header`, `text-muted`.

### `PortionSelector.js`

Purpose: lets the user choose how much of a meal they ate.

Props:

| Prop | Meaning |
|---|---|
| `value` | Current portion number |
| `onChange` | Parent callback receiving `{ portion, portionLabel }` |
| `label` | Field label |

State:

| State | Meaning |
|---|---|
| `customValue` | Custom portion typed by the user |

It supports common fractions like whole, half, third, quarter, and custom.

### `QuickAddMealModal.js`

Purpose: lets the user quickly log a meal directly from browse/favourites pages.

Props:

| Prop | Meaning |
|---|---|
| `meal` | Meal being logged |
| `show` | Whether modal is visible |
| `onHide` | Close callback |

State: `portion`, `message`, and `saving`.

Important API call:

```js
apiFetch('/api/tracker/log', { method: 'POST', body: JSON.stringify(...) })
```

It calculates preview totals based on portion and shows them before logging.

### `RouteGuard.js`

Purpose: protects pages that require login.

It checks `isLoggedIn()` from `lib/auth.js`. While checking, it renders nothing. If the user is not logged in, it redirects to `/login`. If logged in, it renders `children`.

### `StateMessage.js`

Purpose: shared loading, error, and empty-state UI.

Exports:

| Export | Purpose |
|---|---|
| `LoadingMessage` | Spinner and loading text |
| `ErrorMessage` | Error alert/card |
| `EmptyMessage` | Muted empty-state card |

### `UnitSelect.js`

Purpose: reusable dropdown for measurement units.

Props:

| Prop | Meaning |
|---|---|
| `value` | Selected unit |
| `onChange` | Change handler |
| `isInvalid` | React Bootstrap validation state |
| `required` | Whether the field is required |
| `disabled` | Disables the dropdown |
| `className` | Extra CSS classes |

Available units: grams, kilograms, milliliters, liters, teaspoons, tablespoons, cups, pieces.

## 5. Pages

### `pages/index.js` (`/`)

Purpose: home/entry page. It checks login state and redirects logged-in users toward the app. It uses `getCurrentUser` and `useRouter`. It links unauthenticated users to login/register.

### `pages/dashboard.js` (`/dashboard`)

Purpose: today's dashboard. Protected by `RouteGuard`.

API calls:

| API | Data |
|---|---|
| `/api/tracker/today` | Today's logged food totals |
| `/api/user/goals` | User nutrition goals |

It displays a compact stat strip and goal progress rows. It uses `NUTRITION_ICONS`, `formatCalories`, and `formatMacro`.

### `pages/login.js` (`/login`)

Purpose: login form.

Uses `react-hook-form` for username/password input. On submit, it calls `POST /api/user/login`, stores the token with `setToken`, and redirects with `useRouter`.

### `pages/register.js` (`/register`)

Purpose: registration form.

Uses `react-hook-form`, calls `POST /api/user/register`, and redirects the user after successful registration.

### `pages/ingredients/index.js` (`/ingredients`)

Purpose: inventory list.

API: `GET /api/ingredients`.

It displays ingredient cards, a search box, empty/loading/error states, and a button to add ingredients. `inventory.js` redirects/aliases to this page.

### `pages/ingredients/add.js` (`/ingredients/add`)

Purpose: add new ingredient.

Uses `IngredientForm`. On submit, calls `POST /api/ingredients`. It can read query parameters like category/return target when adding an ingredient from meal builder flow.

### `pages/ingredients/[id].js` (`/ingredients/:id`)

Purpose: edit an existing ingredient.

API calls:

| API | Purpose |
|---|---|
| `GET /api/ingredients/:id` | Load ingredient |
| `PUT /api/ingredients/:id` | Save changes |

Uses `IngredientForm`, `RouteGuard`, and state messages.

### `pages/create-meal-component.js` (`/create-meal-component`)

Purpose: main meal builder.

API calls:

| API | Purpose |
|---|---|
| `GET /api/ingredients` | Load inventory |
| `POST /api/meals` | Save completed meal |

Important state:

| State | Meaning |
|---|---|
| `meal` | Name/category/image URL |
| `components` | Meal groups and selected ingredients |
| `showLibrary` | Whether ingredient library modal is open |
| `selectedCategory` | Current ingredient category in modal |
| `activeIngredient` | Ingredient being added |
| `amountUsed`, `unitUsed` | Amount selected for ingredient |
| `editingItem` | Which ingredient row is being edited |
| draft states | Control automatic draft saving and clear-draft modal |

Important helpers:

| Helper | Purpose |
|---|---|
| `saveMealDraft`, `loadMealDraft`, `clearMealDraft` | Keep unfinished meal safe in `localStorage` |
| `buildPreviewComponents` | Calculates preview ingredients, weights, and nutrition |
| `addTotals` | Adds nutrition totals |
| `calculateNutritionWithUnit` | Shows nutrition preview for selected amount |

Actions: add ingredient, edit ingredient, remove ingredient, rename component, clear draft, save meal.

### `pages/meals/index.js` (`/meals`)

Purpose: browse saved meals.

API calls:

| API | Purpose |
|---|---|
| `/api/meals` | Saved meals |
| `/api/user/favourites` | Favourite meals |
| `/api/tracker/week` | Past-week filter support |

Uses `MealFilterBar`, `MealCard`, and `QuickAddMealModal`. Supports search, category filter, past-week filter, favourite toggling, deletion, and quick add.

### `pages/meals/[id].js` (`/meals/:id`)

Purpose: meal details page.

API calls:

| API | Purpose |
|---|---|
| `/api/meals/:id` | Load meal |
| `DELETE /api/meals/:id` | Delete meal |

Uses `MealDetails` and `ConfirmDeleteModal`. Actions: view, edit, delete, go back.

### `pages/meals/edit/[id].js` (`/meals/edit/:id`)

Purpose: edit a saved meal.

API calls:

| API | Purpose |
|---|---|
| `/api/meals/:id` | Load meal |
| `/api/ingredients` | Load inventory |
| `PUT /api/meals/:id` | Save meal |

Uses `ComponentMealEditor` and `mealToEditorState`.

### `pages/meals/create.js` (`/meals/create`)

Purpose: compatibility route. It redirects to `/create-meal-component`, which is the current meal builder.

### `pages/favourites.js` (`/favourites`)

Purpose: list favourite meals.

API: `/api/user/favourites`.

Uses `MealCard` and `QuickAddMealModal`. It can quick-add a favourite meal and remove meals from favourites.

### `pages/tracker/index.js` (`/tracker`)

Purpose: Log Food page.

API calls:

| API | Purpose |
|---|---|
| `/api/meals` | Meals available to log |
| `/api/ingredients` | Ingredients available to log |
| `/api/tracker/today` | Today's logged food |
| `/api/tracker/week` | Past-week meal picker filter |
| `POST /api/tracker/log` | Log meal or ingredient |
| `DELETE /api/tracker/log/:id` | Remove logged food |

Important state:

| State | Meaning |
|---|---|
| `activeTab` | Meal vs ingredient logging |
| `portionInfo` | Portion selected for non-component meal |
| `componentPortions` | Custom eaten amounts for meal components |
| `showMealPicker` | Meal picker modal visibility |
| `showIngredientPicker` | Ingredient picker modal visibility |
| `selectedIngredient` | Ingredient selected for logging |
| `ingredientAmount`, `ingredientUnit` | Amount/unit for ingredient log |

Actions: log a meal, log custom component amounts, log single ingredient, open log details, delete today's log.

`pages/daily-tracker.js` is a compatibility route that exports this tracker page.

### `pages/logs/[id].js` (`/logs/:id`)

Purpose: detail view for a logged meal/food item from today's log.

API: reads `/api/tracker/today`, updates/deletes through `/api/tracker/log/:id`.

It shows nutrition details, component breakdown, ingredient breakdown, portion editing for meal logs, and delete confirmation.

### `pages/weekly-history.js` (`/weekly-history`)

Purpose: shows the last week of daily logs.

API: `/api/tracker/week`.

Displays desktop table and mobile cards using `formatCalories` and `formatMacro`.

### `pages/profile.js` (`/profile`)

Purpose: profile and nutrition goals.

API calls:

| API | Purpose |
|---|---|
| `/api/user/profile` | User info |
| `/api/user/goals` | Current goals |
| `PUT /api/user/goals` | Save goals |

Uses `react-hook-form` and resets the form when goals load.

### Other pages

| File | Purpose |
|---|---|
| `about.js` | Static beginner-friendly app/about content |
| `inventory.js` | Compatibility alias for ingredients/inventory |
| `saved-meals.js` | Compatibility alias for meals |
| `meal-summary.js` | Preview/save flow for meal nutrition summary |
| `nutrition-breakdown.js` | Nutrition breakdown across saved meals |
| `_app.js` | Imports Bootstrap/global CSS, wraps pages in `SWRConfig` and `Layout` |

## 6. Lib/Helpers

### `lib/api.js`

Exports:

| Export | Purpose |
|---|---|
| `API_URL` | Backend base URL from `NEXT_PUBLIC_API_URL` or `http://localhost:8080` |
| `getToken` | Reads JWT token from `localStorage` |
| `setToken` | Saves JWT token |
| `removeToken` | Deletes JWT token |
| `apiFetch` | Shared fetch wrapper that adds JSON headers and JWT auth |
| `fetcher` | SWR fetcher using `apiFetch` |

Example:

```js
apiFetch('/api/meals')
```

becomes a request to:

```text
http://localhost:8080/api/meals
```

with `Authorization: Bearer <token>` if logged in.

### `lib/auth.js`

Exports:

| Export | Purpose |
|---|---|
| `getCurrentUser` | Decodes JWT token into `{ id, userName, iat, exp }` |
| `isLoggedIn` | Returns true when a valid token can be decoded |

Used by `RouteGuard`, `MainNav`, and home page logic.

### `lib/categoryHelpers.js`

Defines ingredient categories:

| Category | Meaning |
|---|---|
| Dairy | Milk, yogurt, cheese |
| Vegetables | Fresh/cooked vegetables |
| Protein | Meat, eggs, tofu, beans |
| Carbs | Rice, potatoes, pasta |
| Sauces | Dressings, dips, sauces |
| Fruit | Fruit and berries |
| Grains | Bread, oats, cereal |
| Nuts and Seeds | Nuts, seeds, nut butters |
| Spices | Seasonings and herbs |
| Drinks | Smoothies and drinks |
| Other | Anything else |

Exports category label, emoji, color, fallback image data, safe image URL validation, and category library data.

### `lib/foodVisuals.js`

Wraps category helpers for UI use.

Exports:

| Export | Purpose |
|---|---|
| `CATEGORY_LIBRARY` | Array used by category grids/dropdowns |
| `NUTRITION_ICONS` | Emoji labels for calories/protein/carbs/fats/sugar |
| `getCategoryIcon` | Emoji for category |
| `getCategoryColor` | Color for category |
| `getCategoryClass` | CSS class like `category-vegetables` |
| `getFoodImage` | Safe image URL from food object |

### `lib/mealCategoryHelpers.js`

Defines meal categories:

```js
['Breakfast', 'Lunch', 'Dinner', 'Snack', 'Beverage', 'Other']
```

`normalizeMealCategory` makes category values consistent. `mealCategoryOptions(true)` adds `"All categories"` for filters.

### `lib/formatNutrition.js`

Exports formatting helpers:

| Function | Example |
|---|---|
| `formatCalories(125.0)` | `"125"` |
| `formatMacro(12.345)` | `"12.3"` |
| `formatAmount(2.0)` | `"2"` |
| `formatServingLabel(ingredient)` | `"100 grams"` |
| `getIngredientServingNutrition` | Returns nutrition for saved ingredient quantity |
| `formatIngredientServingNutrition` | `"250 cal per 100 grams - 20g protein per 100 grams"` |

### `lib/mealMath.js`

Exports:

| Function | Purpose |
|---|---|
| `round` | Rounds numbers to 1 decimal |
| `addTotals` | Adds calories/protein/carbs/fats/sugar across items |
| `buildPreviewIngredients` | Converts selected ingredient amounts into grams and nutrition |
| `buildPreviewComponents` | Builds component previews with total weight and nutrition |

Used heavily by meal builder and meal editor.

### `lib/unitConverter.js`

Frontend mirror of backend unit/nutrition conversion logic.

Important functions:

| Function | Purpose |
|---|---|
| `convertToGrams` | Internal conversion to grams |
| `calculateNutritionFromPer100g` | Legacy per-100g fallback |
| `getPer100gValue` | Gets per-100g value directly or calculates it from saved quantity |
| `getSavedQuantityNutrition` | Nutrition for the ingredient's saved serving quantity |
| `calculateNutritionWithUnit` | Calculates nutrition for any amount/unit |
| `convertToGramsExport` | Exported wrapper for meal preview math |

Example: if an ingredient has 200 calories for 100 grams, then using 50 grams returns about 100 calories.

### `lib/mealDraft.js`

Saves unfinished meal builder work to `localStorage`.

Exports:

| Function | Purpose |
|---|---|
| `hasMealDraftContent` | Checks whether draft has real data |
| `loadMealDraft` | Reads and parses draft |
| `saveMealDraft` | Saves draft or removes it if empty |
| `clearMealDraft` | Removes draft |

## 7. Filtering and Logic Explanations

### Meal picker filtering

The `MealPickerModal` filter combines search, category, and past-week checks.

Important idea: each meal must pass every active filter.

```js
return matchesSearch && matchesCategory && matchesPastWeek;
```

`&&` means "and". If any value is false, the meal is hidden.

Past-week logic has two modes:

| Mode | Meaning |
|---|---|
| Week logs loaded | Use `pastWeekMealIds` to show meals actually logged in the last week |
| Week logs not loaded | Fallback to `createdAt` and show meals created in the last seven days |

`useMemo` avoids recalculating the filtered list unless filter inputs or meal data change.

### Meal builder preview logic

The builder does not wait until saving to calculate nutrition. It uses frontend helpers:

```js
const previewComponents = useMemo(
  () => ingredients ? buildPreviewComponents(ingredients, components) : [],
  [ingredients, components]
);
```

This means:

1. When `ingredients` or `components` changes, recalculate preview data.
2. Convert selected amounts into grams.
3. Calculate nutrition for each ingredient.
4. Add component totals.
5. Show the table/card summary immediately.

### Tracker log logic

The tracker page separates two log types:

| Type | Frontend behavior | Backend behavior |
|---|---|---|
| Meal | Select meal, choose portion or component amounts | Backend scales saved meal nutrition |
| Ingredient | Select ingredient, enter amount/unit | Backend calculates nutrition directly from ingredient |

## 8. Backend Architecture

`server.js` creates an Express app, enables CORS, parses JSON, initializes Passport, connects to MongoDB, and mounts route files.

Mounted routes:

| Base path | File |
|---|---|
| `/api/user` | `routes/userRoutes.js` |
| `/api/ingredients` | `routes/ingredientRoutes.js` |
| `/api/meals` | `routes/mealRoutes.js` |
| `/api/tracker` | `routes/trackerRoutes.js` |
| `/api/convert` | `routes/utilityRoutes.js` |

Environment variables:

| Variable | Purpose |
|---|---|
| `PORT` | Server port, default `8080` |
| `MONGO_URL` or `MONGODB_CONN_STRING` | MongoDB connection |
| `JWT_SECRET` | Secret used to sign/verify JWT tokens |
| `CLIENT_URL`, `CLIENT_URLS` | Extra allowed CORS origins |

Authentication:

1. Login route signs a JWT.
2. Frontend stores token.
3. Protected requests send `Authorization: Bearer <token>`.
4. `config/auth.js` and Passport verify the token.
5. `req.user` becomes the authenticated user document.

## 9. Backend Models

### `User.js`

Purpose: stores account and goal data.

Fields:

| Field | Type | Meaning |
|---|---|---|
| `userName` | String, unique | Login username |
| `password` | String | Hashed password |
| `favourites` | Array of `Meal` IDs | User's favourite meals |
| `calorieGoal` | Number | Daily calorie goal |
| `proteinGoal` | Number | Daily protein goal |
| `carbsGoal` | Number | Daily carbs goal |
| `fatsGoal` | Number | Daily fats goal |
| `sugarGoal` | Number | Daily sugar goal |

Example:

```json
{
  "userName": "parsa",
  "favourites": ["mealId1"],
  "calorieGoal": 2000
}
```

### `Ingredient.js`

Purpose: stores one user's ingredient inventory.

Important fields:

| Field | Meaning |
|---|---|
| `name`, `category` | Ingredient identity |
| `quantity`, `unit` | Saved serving/inventory amount |
| `calories`, `protein`, `carbs`, `fats`, `sugar` | Nutrition for saved quantity |
| `caloriesPer100g`, etc. | Legacy/new per-100g fallback values |
| `gramsPerTeaspoon`, `gramsPerTablespoon`, `gramsPerCup`, `gramsPerPiece` | Food-specific conversions |
| `imageUrl` | Optional image |
| `userId` | Owner user |

### `Meal.js`

Purpose: stores saved meals.

Fields:

| Field | Meaning |
|---|---|
| `name`, `category`, `imageUrl` | Basic meal display |
| `components` | Optional grouped meal parts |
| `ingredients` | Flattened ingredients used by the meal |
| `totalCalories`, etc. | Meal totals |
| `userId` | Owner user |

Nested `mealIngredientSchema` stores ingredient ID, name, original amount/unit, grams used, conversion warning, and nutrition.

### `DailyLog.js`

Purpose: stores all food logged by one user on one date.

Fields:

| Field | Meaning |
|---|---|
| `userId` | Owner user |
| `date` | Date string like `2026-06-15` |
| `meals` | Logged meals or logged ingredients |
| `totalCalories`, etc. | Daily totals |

The schema has a unique index on `{ userId, date }`, so one user has only one log document per day.

## 10. Backend Routes

### `userRoutes.js` mounted at `/api/user`

| Method/path | Auth | Purpose | Frontend callers |
|---|---|---|---|
| `POST /register` | No | Create user with hashed password | `register.js` |
| `POST /login` | No | Validate password and return JWT | `login.js` |
| `GET /profile` | Yes | Return user profile | `profile.js` |
| `GET /goals` | Yes | Return nutrition goals | `dashboard.js`, `profile.js` |
| `PUT /goals` | Yes | Update goals | `profile.js` |
| `GET /favourites` | Yes | Return populated favourite meals | `favourites.js`, `meals/index.js` |
| `PUT /favourites/:id` | Yes | Add favourite meal | `MealCard` |
| `DELETE /favourites/:id` | Yes | Remove favourite meal | `MealCard` |

Common errors: missing username/password, duplicate username, invalid login, invalid goals, meal not found.

### `ingredientRoutes.js` mounted at `/api/ingredients`

| Method/path | Auth | Purpose |
|---|---|---|
| `GET /` | Yes | List user's ingredients |
| `POST /` | Yes | Create ingredient |
| `GET /:id` | Yes | Get one ingredient |
| `PUT /:id` | Yes | Update ingredient |
| `DELETE /:id` | Yes | Delete ingredient |

Validation checks name, category, positive quantity, valid unit, non-negative nutrition, and non-negative conversion values.

### `mealRoutes.js` mounted at `/api/meals`

| Method/path | Auth | Purpose |
|---|---|---|
| `GET /` | Yes | List user's meals |
| `POST /` | Yes | Create meal |
| `GET /:id` | Yes | Get meal details |
| `PUT /:id` | Yes | Update meal |
| `DELETE /:id` | Yes | Delete meal |

Important internal helpers:

| Helper | Purpose |
|---|---|
| `buildMealIngredients` | Validates ingredient IDs/amounts/units and calculates nutrition |
| `buildMealComponents` | Builds grouped components and flattened ingredients |
| `buildMealBody` | Creates final meal document body |

### `trackerRoutes.js` mounted at `/api/tracker`

| Method/path | Auth | Purpose |
|---|---|---|
| `POST /log` | Yes | Log a meal or ingredient |
| `GET /today` | Yes | Return today's log |
| `GET /week` | Yes | Return last seven days |
| `GET /log/:logMealId` | Yes | Return today's logged meal detail |
| `PUT /log/:logMealId` | Yes | Update logged meal portion |
| `DELETE /log/:logMealId` | Yes | Delete logged food |

Important helpers:

| Helper | Purpose |
|---|---|
| `todayString` | Current date as `YYYY-MM-DD` |
| `recalculate` | Recomputes daily totals |
| `scaleIngredient` | Scales ingredient nutrition by portion |
| `buildPortionLog` | Builds logged meal from a portion |
| `buildComponentLog` | Builds logged meal from custom component amounts |
| `buildIngredientLog` | Builds logged single-ingredient entry |

### `utilityRoutes.js` mounted at `/api/convert`

| Method/path | Auth | Purpose |
|---|---|---|
| `POST /` | No | Convert between units |

It validates amount and units, optionally loads an ingredient for food-specific conversions, handles pieces carefully, and returns result plus warning/message.

## 11. Data Flow Explanations

### Login flow

User submits login form -> `pages/login.js` -> `apiFetch('/api/user/login')` -> `userRoutes.js` checks password with bcrypt -> JWT returned -> `setToken` stores token -> frontend redirects to dashboard.

### Register flow

User submits register form -> `pages/register.js` -> `POST /api/user/register` -> backend checks duplicate username -> hashes password -> creates `User` -> frontend redirects.

### Add ingredient flow

User fills `IngredientForm` -> `pages/ingredients/add.js` -> `POST /api/ingredients` -> backend validates and creates `Ingredient` with `userId` -> frontend returns to inventory or meal builder.

### Create meal flow

User builds groups in `/create-meal-component` -> frontend preview uses `mealMath` and `unitConverter` -> user saves -> `POST /api/meals` -> backend validates ingredients, converts amounts, calculates nutrition -> creates `Meal` -> frontend goes to `/meals`.

### Log meal flow

User opens `/tracker` -> chooses meal in `MealPickerModal` -> chooses portion/component amounts -> `POST /api/tracker/log` -> backend finds `Meal`, scales nutrition, pushes entry into today's `DailyLog`, recalculates totals -> frontend SWR `mutate()` refreshes today's log.

### Log ingredient flow

User switches tracker tab to ingredient -> chooses ingredient -> enters amount/unit -> `POST /api/tracker/log` with `type: 'ingredient'` -> backend calculates nutrition from `Ingredient` -> stores in `DailyLog` -> frontend refreshes.

### Favourite meal flow

User clicks favourite in `MealCard` -> `PUT /api/user/favourites/:id` or `DELETE /api/user/favourites/:id` -> backend updates `User.favourites` -> page refreshes favourites data.

### Quick Add flow

User clicks quick add on `MealCard` -> `QuickAddMealModal` opens -> user chooses portion -> `POST /api/tracker/log` -> backend logs meal -> modal confirms/saves and page can refresh.

### Dashboard totals flow

Dashboard loads -> SWR requests `/api/tracker/today` and `/api/user/goals` -> backend returns totals/goals -> dashboard formats values and calculates progress percentages.

### Profile goals flow

Profile loads -> SWR gets profile/goals -> React Hook Form resets with current goals -> user saves -> `PUT /api/user/goals` -> backend validates non-negative numbers -> saves user document.

## 12. Categories, Emojis, and Labels

Ingredient categories are defined in `lib/categoryHelpers.js`. Meal categories are defined in `lib/mealCategoryHelpers.js` and mirrored in backend `mealRoutes.js`.

Nutrition labels/icons are defined in `lib/foodVisuals.js`:

| Label | Icon variable key |
|---|---|
| Calories | `NUTRITION_ICONS.Calories` |
| Protein | `NUTRITION_ICONS.Protein` |
| Carbs | `NUTRITION_ICONS.Carbs` |
| Fats | `NUTRITION_ICONS.Fats` |
| Sugar | `NUTRITION_ICONS.Sugar` |

Category normalization rules:

| Helper | Rule |
|---|---|
| `getCategoryInfo` | Unknown ingredient category becomes `Other`; `sauce` maps to `Sauces` |
| `normalizeMealCategory` | Unknown meal category becomes `Other` |
| `getCategoryClass` | Category label becomes CSS class like `category-nuts-and-seeds` |

## 13. CSS and Design System

Global CSS lives in `my-app/styles/globals.css`.

Important theme variables include:

| Variable | Meaning |
|---|---|
| `--app-bg` | Main app background |
| `--text` | Main text color |
| `--muted` | Secondary text |
| `--green`, `--green-dark`, `--green-soft` | Primary food/health theme colors |
| `--orange`, `--blue` | Accent colors |
| `--border` | Shared border color |
| `--shadow-soft` | Shared card shadow |

Important reusable classes:

| Class | Purpose |
|---|---|
| `app-card` | Base card style for app panels |
| `page-card` | Page-level card panels |
| `compact-card` | Smaller cards |
| `section-card` | Section panel spacing |
| `picker-row` | Horizontal card layout used by meals/ingredients/pickers |
| `thumb-md`, `thumb-sm` | Food image sizes |
| `emoji-thumb`, `emoji-placeholder` | Emoji fallback visuals |
| `soft-pill`, `soft-pill-beige` | Category/status pills |
| `action-wrap` | Button grouping |
| `main-navbar` | Navigation styling |
| `meal-picker-*` | Meal picker modal and card layout |
| `ingredient-library-*` | Meal builder ingredient library modal |
| `builder-summary-*` | Meal builder nutrition tables/cards |
| `quick-add-*` | Quick add modal preview |
| `weekly-history-*` | Weekly history table/mobile cards |

Mobile responsiveness:

The `@media (max-width: 576px)` block adjusts cards, modals, buttons, tables, picker rows, navbar spacing, and meal builder layout for phones. Examples:

| Mobile change | Reason |
|---|---|
| Buttons become full-width in important flows | Easier tapping |
| Modals get smaller margins and scrollable bodies | Fit phone screens |
| Weekly history table hides and mobile cards show | Tables are hard to read on phones |
| Meal builder library becomes compact | Ingredient selection stays usable on small screens |

## 14. Important React Concepts in This Code

| Concept | Example in project | Meaning |
|---|---|---|
| Props | `MealFilterBar({ search, setSearch, ... })` | Parent passes data/functions into child |
| State | `useState(false)` in modals | Component remembers UI values |
| `useEffect` | Draft loading/saving, auth redirect | Runs side effects after render |
| `useMemo` | Filtered meals, meal preview components | Recomputes expensive values only when dependencies change |
| Event handlers | `onClick`, `onChange`, `onSubmit` | Run code after user action |
| Controlled inputs | `value={search}` with `onChange` | React state controls input value |
| Conditional rendering | `{selectedMeal && ...}` | Show UI only when condition is true |
| Mapping arrays | `meals.map(meal => <MealCard ... />)` | Render repeated UI from data |
| Filtering arrays | `meals.filter(...)` | Keep only matching data |
| Form submission | `handleSubmit(logMeal)` | Validate and send data |
| Modals | `Modal show={show}` | Temporary focused UI |
| Protected routes | `RouteGuard` | Blocks pages if no token |

## 15. Connection Map

| Component/File | Depends On | Used By | Purpose |
|---|---|---|---|
| `MainNav` | auth helpers, router, `removeToken` | `Layout` | Navigation and logout |
| `Layout` | `MainNav`, Bootstrap `Container` | `_app.js` | Wraps all pages |
| `PageHeader` | none | Most pages | Reusable title/subtitle |
| `RouteGuard` | `isLoggedIn`, router | Protected pages | Auth gate |
| `api.js` | browser `localStorage`, `fetch` | SWR and API actions | Backend communication |
| `IngredientForm` | `UnitSelect`, category/nutrition helpers | Add/edit ingredient pages | Shared ingredient form |
| `IngredientCard` | `FoodImage`, `ConfirmDeleteModal`, `apiFetch` | Ingredients page | Ingredient display/actions |
| `MealCard` | `FoodImage`, `ConfirmDeleteModal`, `apiFetch` | Meals/favourites pages | Meal display/actions |
| `MealFilterBar` | meal category helpers | Meals/favourites/picker | Search/category/week filters |
| `MealPickerModal` | `MealFilterBar`, `FoodImage` | Tracker page | Choose a meal to log |
| `QuickAddMealModal` | `apiFetch`, formatting helpers | Meals/favourites pages | Log meal quickly |
| `ComponentMealEditor` | `FoodImage`, `UnitSelect`, meal math | Edit meal page | Edit component-based meal |
| `mealMath.js` | `unitConverter.js` | Meal builder/editor/summary | Preview nutrition |
| `Meal` model | `Ingredient` references | `mealRoutes`, `trackerRoutes` | Saved meal data |
| `DailyLog` model | meal/ingredient snapshots | `trackerRoutes` | Logged food and totals |
| `User` model | favourite meal IDs | `userRoutes`, auth | Account/goals/favourites |

## 16. Learning Notes

Recommended reading order:

1. Start with `my-app/pages/_app.js`, `components/Layout.js`, and `components/MainNav.js` to understand the shell.
2. Read `lib/api.js`, `lib/auth.js`, and `components/RouteGuard.js` to understand authentication.
3. Read `user-api/server.js`, `config/auth.js`, and `routes/userRoutes.js` to connect frontend auth to backend auth.
4. Read `models/Ingredient.js`, `IngredientForm.js`, and `ingredientRoutes.js`.
5. Read `create-meal-component.js`, `mealMath.js`, `unitConverter.js`, and `mealRoutes.js`.
6. Read `tracker/index.js`, `MealPickerModal.js`, `QuickAddMealModal.js`, `DailyLog.js`, and `trackerRoutes.js`.
7. Finally, read CSS sections related to the UI you are editing.

Most important files:

| File | Why important |
|---|---|
| `lib/api.js` | Every API call depends on it |
| `components/RouteGuard.js` | Controls protected pages |
| `pages/create-meal-component.js` | Largest meal-building workflow |
| `pages/tracker/index.js` | Main food logging workflow |
| `user-api/routes/trackerRoutes.js` | Most important nutrition/logging backend logic |
| `user-api/utils/nutrition.js` | Backend nutrition calculations |
| `user-api/models/DailyLog.js` | Shape of logged food data |

Safer files to edit:

| Safer area | Why |
|---|---|
| `PageHeader.js` | Small presentational component |
| `StateMessage.js` | Shared status UI |
| Text labels in pages/components | Usually low behavior risk |
| CSS spacing/colors | Visual changes only, if class names stay same |

Riskier files to edit:

| Risky area | Why |
|---|---|
| `api.js` | Can break every backend call |
| `auth.js`, `RouteGuard.js`, backend auth config | Can lock users out |
| `unitConverter.js`, `utils/nutrition.js` | Can make nutrition wrong |
| `trackerRoutes.js` | Can corrupt daily log totals |
| Mongoose models | Schema changes affect stored data |

How to trace a button click:

1. Find the button text in the component or page.
2. Look at its `onClick` or form `onSubmit`.
3. Follow the function it calls.
4. If it calls `apiFetch`, note the API path and HTTP method.
5. Find the backend route file mounted to that path.
6. Read the route handler and any helper it calls.
7. Check which model is read or written.
8. Return to the frontend and look for `mutate()`, `router.push()`, or state updates that refresh the UI.

Example: deleting an ingredient:

User clicks Delete in `IngredientCard` -> `setShowDelete(true)` opens `ConfirmDeleteModal` -> confirm calls `deleteIngredient` -> `apiFetch('/api/ingredients/:id', { method: 'DELETE' })` -> `ingredientRoutes.js` deletes with `Ingredient.findOneAndDelete({ _id, userId })` -> response returns -> `onDeleted()` refreshes ingredient list.

## Word Version

If `TrackEasy_Project_Report.docx` exists beside this file, it was generated from this Markdown report.

If it does not exist, convert this report to Word with one of these options:

```powershell
pandoc docs/TrackEasy_Project_Report.md -o docs/TrackEasy_Project_Report.docx
```

or open this Markdown file in VS Code and use a Markdown-to-DOCX extension.
