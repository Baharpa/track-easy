import { useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { Alert, Button, Card, Col, Row } from 'react-bootstrap';
import PageHeader from '../../components/PageHeader';
import MealFilterBar from '../../components/MealFilterBar';
import AppShortcutCard from '../../components/AppShortcutCard';
import AppLoadingBox from '../../components/AppLoadingBox';
import RouteGuard from '../../components/RouteGuard';
import IngredientCard from '../../components/IngredientCard';
import { EmptyMessage, ErrorMessage } from '../../components/StateMessage';
import useSessionCachedSWR from '../../hooks/useSessionCachedSWR';
import { APP_CATEGORIES, normalizeCategory } from '../../lib/categoryHelpers';

const INVENTORY_CATEGORIES = APP_CATEGORIES;

export default function Inventory() {
  const router = useRouter();
  const { data: ingredients, error, mutate, isInitialLoading, hasCachedData } = useSessionCachedSWR('/api/ingredients', 'trackeasy.ingredients.cache');
  const inventoryRef = useRef(null);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [expandedCategories, setExpandedCategories] = useState({});

  const addedName = typeof router.query.added === 'string' ? router.query.added : '';

  const searchedIngredients = useMemo(() => {
    const cleanSearch = search.trim().toLowerCase();
    return (ingredients || []).filter(item => !cleanSearch || item.name.toLowerCase().includes(cleanSearch));
  }, [ingredients, search]);

  const groupedIngredients = useMemo(() => {
    const groups = INVENTORY_CATEGORIES.reduce((result, categoryName) => {
      result[categoryName] = [];
      return result;
    }, {});

    searchedIngredients.forEach(item => {
      const groupName = normalizeCategory(item.category);
      if (!category || groupName === category) {
        groups[groupName].push(item);
      }
    });

    return INVENTORY_CATEGORIES
      .map(categoryName => ({ category: categoryName, items: groups[categoryName] || [] }))
      .filter(group => group.items.length > 0);
  }, [category, searchedIngredients]);

  const visibleIngredientCount = groupedIngredients.reduce((total, group) => total + group.items.length, 0);

  function toggleExpandedCategory(categoryName) {
    setExpandedCategories(current => ({
      ...current,
      [categoryName]: !current[categoryName]
    }));
  }

  return <RouteGuard>
    <div className="list-section-page">
      <div className="list-page-header">
        <PageHeader title="Ingredients" text="Ingredients you have at home." />
        <div className="inventory-header-actions">
          <Button as={Link} href="/ingredients/add" variant="success">Add Ingredient</Button>
        </div>
      </div>

      <AppShortcutCard
        href="/ingredients/library"
        title="Go to Library"
        subtitle="Browse natural foods and add them to your inventory."
        icon="+"
        variant="library"
      />

    {addedName && (
      <Alert variant="success" className="inventory-success-alert">
        <span>Added {addedName} to your inventory.</span>
      </Alert>
    )}

    <div ref={inventoryRef}>
      <MealFilterBar
        search={search}
        setSearch={setSearch}
        category={category}
        setCategory={value => {
          setCategory(value);
          setExpandedCategories({});
        }}
        categoryOptions={[
          { label: 'All categories', value: '' },
          ...INVENTORY_CATEGORIES.map(categoryName => ({ label: categoryName, value: categoryName }))
        ]}
        searchPlaceholder="Search ingredients..."
        searchAriaLabel="Search ingredients"
        categoryAriaLabel="Filter inventory by category"
        showPastWeekOption={false}
        className="page-card filter-card"
      />
    </div>

    {error && !ingredients && <ErrorMessage text="Failed to load ingredients." />}
    {error && ingredients && <ErrorMessage text="Could not refresh ingredients. Showing your last loaded ingredients." />}

    <section className="list-results-area" aria-busy={isInitialLoading}>
      {isInitialLoading && (
        <div className="app-loading-panel">
          <AppLoadingBox />
          <span className="app-loading-panel-text">Loading ingredients...</span>
        </div>
      )}

      {ingredients && (
        <>
          {hasCachedData && <div className="list-refresh-note">Refreshing ingredients...</div>}
          {ingredients.length === 0 && <EmptyMessage text="No ingredients yet. Add your first ingredient to start building meals." />}
          {ingredients.length > 0 && visibleIngredientCount === 0 && <EmptyMessage text="No ingredients match your search or filter." />}
          {visibleIngredientCount > 0 && (
            <div className="inventory-category-list">
              {groupedIngredients.map(group => {
                const isExpanded = category || expandedCategories[group.category];
                const visibleItems = isExpanded ? group.items : group.items.slice(0, 5);
                const hasMore = !category && group.items.length > 5;

                return (
                  <Card className="page-card inventory-category-section" key={group.category}>
                    <div className="inventory-category-section-header">
                      <div>
                        <h3>{group.category}</h3>
                        <p>{group.items.length} ingredient{group.items.length === 1 ? '' : 's'}</p>
                      </div>
                      {hasMore && (
                        <Button type="button" variant="outline-success" size="sm" onClick={() => toggleExpandedCategory(group.category)}>
                          {isExpanded ? 'Show less' : 'View more'}
                        </Button>
                      )}
                    </div>
                    <Row className="mobile-card-grid food-card-grid">
                      {visibleItems.map(item => (
                        <Col lg={6} key={item._id}>
                          <IngredientCard ingredient={item} onDeleted={mutate} />
                        </Col>
                      ))}
                    </Row>
                  </Card>
                );
              })}
            </div>
          )}
        </>
      )}
    </section>
    </div>
  </RouteGuard>;
}
