import { useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import useSWR from 'swr';
import { Alert, Button, Card, Col, Form, Row } from 'react-bootstrap';
import PageHeader from '../../components/PageHeader';
import RouteGuard from '../../components/RouteGuard';
import IngredientCard from '../../components/IngredientCard';
import { EmptyMessage, ErrorMessage, LoadingMessage } from '../../components/StateMessage';
import { APP_CATEGORIES, normalizeCategory } from '../../lib/categoryHelpers';

const INVENTORY_CATEGORIES = APP_CATEGORIES;

export default function Inventory() {
  const router = useRouter();
  const { data: ingredients, error, mutate } = useSWR('/api/ingredients');
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
    <div className="inventory-page">
    <div className="list-page-header">
      <PageHeader title="Inventory" text="Ingredients you have at home." />
      <div className="inventory-header-actions">
        <Button as={Link} href="/ingredients/add" variant="success">Add Ingredient</Button>
      </div>
    </div>

    <div className="library-launch-row">
      <Button as={Link} href="/ingredients/library" variant="outline-success" className="library-launch-button">
        Browse Library
      </Button>
    </div>

    {error && <ErrorMessage text="Failed to load ingredients." />}
    {!ingredients && !error && <LoadingMessage text="Loading ingredients..." />}

    {ingredients && <>
      {addedName && (
        <Alert variant="success" className="inventory-success-alert">
          <span>Added {addedName} to your inventory.</span>
        </Alert>
      )}

      <Card className="page-card filter-card">
        <div className="inventory-section-header" ref={inventoryRef}>
          <div>
            <h2>Your Inventory</h2>
            <p>Grouped by category so your saved ingredients are easier to scan.</p>
          </div>
          <Form.Select
            value={category}
            onChange={e => {
              setCategory(e.target.value);
              setExpandedCategories({});
            }}
            className="inventory-category-filter"
            aria-label="Filter inventory by category"
          >
            <option value="">All categories</option>
            {INVENTORY_CATEGORIES.map(categoryName => (
              <option key={categoryName} value={categoryName}>{categoryName}</option>
            ))}
          </Form.Select>
        </div>
        <Row>
          <Col>
            <Form.Control placeholder="Search by ingredient name" value={search} onChange={e => setSearch(e.target.value)} />
          </Col>
        </Row>
      </Card>

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
                <Row className="mobile-card-grid inventory-category-grid">
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
    </>}
    </div>
  </RouteGuard>;
}
