import { useState } from 'react';
import useSWR from 'swr';
import { Button, Card, Col, Row } from 'react-bootstrap';
import PageHeader from '../components/PageHeader';
import RouteGuard from '../components/RouteGuard';
import MealCard from '../components/MealCard';
import QuickAddMealModal from '../components/QuickAddMealModal';
import { ErrorMessage, LoadingMessage } from '../components/StateMessage';
import { normalizeMealCategory } from '../lib/mealCategoryHelpers';

const FAVOURITE_SECTIONS = [
  {
    key: 'breakfast',
    title: 'Favourite Breakfast',
    empty: 'No favourite breakfast yet.',
    matches: category => category === 'Breakfast'
  },
  {
    key: 'foods',
    title: 'Favourite Foods',
    empty: 'No favourite foods yet.',
    matches: category => ['Lunch/Dinner', 'Other'].includes(category)
  },
  {
    key: 'snacks',
    title: 'Favourite Snacks',
    empty: 'No favourite snacks yet.',
    matches: category => category === 'Snack'
  },
  {
    key: 'beverages',
    title: 'Favourite Beverages',
    empty: 'No favourite beverages yet.',
    matches: category => ['Beverage'].includes(category)
  }
];

function groupFavourites(items = []) {
  return FAVOURITE_SECTIONS.reduce((groups, section) => {
    groups[section.key] = items.filter(item => section.matches(normalizeMealCategory(item.category)));
    return groups;
  }, {});
}

export default function Favourites() {
  const { data: favourites, error, mutate } = useSWR('/api/user/favourites');
  const [quickAddMeal, setQuickAddMeal] = useState(null);
  const [expandedSections, setExpandedSections] = useState({});
  const grouped = groupFavourites(favourites || []);

  function toggleSection(sectionKey) {
    setExpandedSections(current => ({ ...current, [sectionKey]: !current[sectionKey] }));
  }

  return <RouteGuard>
    <PageHeader title="Favourites" text="Your saved favourite foods and meals." />
    {error && <ErrorMessage text="Failed to load favourites." />}
    {!favourites && !error && <LoadingMessage text="Loading favourites..." />}

    {favourites && (
      <Row className="favourites-grid mobile-card-grid">
        {FAVOURITE_SECTIONS.map(section => {
          const sectionItems = grouped[section.key] || [];
          const isExpanded = expandedSections[section.key];
          const visibleItems = isExpanded ? sectionItems : sectionItems.slice(0, 3);
          const hasMore = sectionItems.length > 3;

          return (
            <Col lg={6} key={section.key}>
              <Card className="app-card section-card favourite-section-card">
                <div className="favourite-section-header">
                  <div>
                    <h4>{section.title}</h4>
                    <p>{sectionItems.length} saved favourite{sectionItems.length === 1 ? '' : 's'}</p>
                  </div>
                  {hasMore && (
                    <Button variant="outline-success" size="sm" onClick={() => toggleSection(section.key)}>
                      {isExpanded ? 'Show Less' : 'View More'}
                    </Button>
                  )}
                </div>

                {visibleItems.length === 0 ? (
                  <div className="favourite-empty-state">{section.empty}</div>
                ) : (
                  <div className="favourite-section-list">
                    {visibleItems.map(meal => (
                      <MealCard
                        key={meal._id}
                        meal={meal}
                        isFavourite
                        hideCategoryBadge
                        onFavouriteChange={mutate}
                        onDeleted={mutate}
                        onQuickAdd={setQuickAddMeal}
                      />
                    ))}
                  </div>
                )}
              </Card>
            </Col>
          );
        })}
      </Row>
    )}

    <QuickAddMealModal meal={quickAddMeal} show={!!quickAddMeal} onHide={() => setQuickAddMeal(null)} />
  </RouteGuard>;
}
