# Track Easy

Track Easy is a beginner-friendly full-stack food tracking app. Users can register, login, manage their own ingredient inventory, create meals from those ingredients, save favourite meals, set nutrition goals, and log what they eat each day.

## Folder Structure

```text
TrackEasy/
  my-app/                 # Next.js frontend
    components/
      ConfirmDeleteModal.js
      GoalProgress.js
      IngredientCard.js
      IngredientForm.js
      Layout.js
      MainNav.js
      MealCard.js
      MealDetails.js
      MealForm.js
      NutritionSummary.js
      PageHeader.js
      RouteGuard.js
      StateMessage.js
    lib/
      api.js
      auth.js
      mealMath.js
    pages/
      _app.js
      index.js
      about.js
      login.js
      register.js
      dashboard.js
      profile.js
      favourites.js
      inventory.js
      saved-meals.js
      daily-tracker.js
      create-meal-component.js
      meal-summary.js
      nutrition-breakdown.js
      weekly-history.js
      ingredients/
        index.js
        add.js
        [id].js
      meals/
        index.js
        create.js
        [id].js
        edit/
          [id].js
      tracker/
        index.js
    styles/
      globals.css
    .env.example
    package.json
  user-api/               # Express backend
    config/
      auth.js
      passport.js
    models/
      User.js
      Ingredient.js
      Meal.js
      DailyLog.js
    routes/
      userRoutes.js
      ingredientRoutes.js
      mealRoutes.js
      trackerRoutes.js
    utils/
      nutrition.js
    .env.example
    package.json
    server.js
```

## Installation Commands

Open two terminals.

### Backend

```bash
cd TrackEasy/user-api
npm install
cp .env.example .env
npm run dev
```

### Frontend

```bash
cd TrackEasy/my-app
npm install
cp .env.example .env.local
npm run dev
```

## Backend `.env` Example

```env
MONGO_URL=mongodb+srv://YOUR_USER:YOUR_PASSWORD@cluster0.mongodb.net/trackeasy?retryWrites=true&w=majority
JWT_SECRET=change_this_secret_key
PORT=8080
CLIENT_URL=http://localhost:3000
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_cloudinary_api_key
CLOUDINARY_API_SECRET=your_cloudinary_api_secret
PEXELS_API_KEY=your_pexels_api_key
```

## Frontend `.env.local` Example

```env
NEXT_PUBLIC_API_URL=http://localhost:8080
```

## How the App Connects Together

The frontend runs on `http://localhost:3000`. It uses Next.js pages, React Bootstrap for the design, SWR for fetching data, and React Hook Form for forms.

The backend runs on `http://localhost:8080`. It uses Express routes for users, ingredients, meals, favourites, and daily tracking.

MongoDB Atlas stores the data. Mongoose models define the shape of the data: users, ingredients, meals, and daily logs.

When a user logs in, the backend checks the hashed password with bcryptjs. If the login is correct, the backend creates a JWT token. The frontend saves that token in `localStorage`. For protected requests, the frontend sends the token in the `Authorization: Bearer TOKEN_HERE` header. Passport-JWT checks that token before allowing access to protected routes.

## Features Included

- Register and login with form validation
- Confirm password on register
- Protected private pages
- About page
- Profile page with nutrition goals
- Add, view, edit, and delete ingredients
- Search and filter ingredients by name and category
- Create simple meals from ingredients
- Preview a real meal summary before saving
- Edit existing meals with `PUT /api/meals/:id`
- Search and filter meals by name and category
- Favourite and unfavourite meals
- Favourites page
- Bootstrap modal delete confirmations
- Create a meal component such as Protein, Vegetables, Carbs, or Sauce
- Proportional component nutrition logic
- View saved meals and meal details
- Log meals for today with validation
- Empty states and error messages on SWR pages
- Better dashboard with today's totals, goals, recent meals, and quick actions
- Weekly history page
- Nutrition breakdown page with meal, component, and ingredient-level calculations
- Image support using `imageUrl`

## Nutrition Logic

Ingredients are the base data. When a meal is created, the backend looks up each selected ingredient and calculates nutrition based on the amount used.

Example: if carrots are 40 calories per 100g, and a meal uses 150g carrots, the app calculates 40 * 150 / 100 = 60 calories.

Meal components use proportional math. If a vegetable component has 300g carrots and 50g parsley, the total component weight is 350g. If the user eats 100g of the component, the app calculates about 85.7g carrots and 14.3g parsley. Then it uses those calculated ingredient amounts to calculate calories, protein, carbs, fats, and sugar.

The backend helper file is:

```text
user-api/utils/nutrition.js
```

The frontend preview helper file is:

```text
my-app/lib/mealMath.js
```

## How to Run

1. Start MongoDB Atlas and copy your connection string.
2. Add the connection string to `user-api/.env`.
3. Start the backend with `npm run dev` from the `user-api` folder.
4. Start the frontend with `npm run dev` from the `my-app` folder.
5. Open `http://localhost:3000` in your browser.

## Notes

This project is intentionally simple and school-assignment friendly. It avoids advanced patterns so the folder structure and code are easier to understand.
