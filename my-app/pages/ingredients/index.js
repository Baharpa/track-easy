import { useState } from 'react';
import Link from 'next/link';
import useSWR from 'swr';
import { Button, Card, Col, Form, Row } from 'react-bootstrap';
import PageHeader from '../../components/PageHeader';
import RouteGuard from '../../components/RouteGuard';
import IngredientCard from '../../components/IngredientCard';
import { EmptyMessage, ErrorMessage, LoadingMessage } from '../../components/StateMessage';

export default function Inventory() {
  const { data: ingredients, error, mutate } = useSWR('/api/ingredients');
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');

  const categories = [...new Set((ingredients || []).map(item => item.category || 'Other'))];
  const filtered = (ingredients || []).filter(item => {
    const matchesName = item.name.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = !category || (item.category || 'Other') === category;
    return matchesName && matchesCategory;
  });

  return <RouteGuard>
    <div className="list-page-header">
      <PageHeader title="Inventory" text="🥗 Ingredients you have at home." />
      <div className="inventory-header-actions">
        <Button as={Link} href="/ingredients/add" variant="success">Add Ingredient</Button>
      </div>
    </div>

    {error && <ErrorMessage text="Failed to load ingredients." />}
    {!ingredients && !error && <LoadingMessage text="Loading ingredients..." />}

    {ingredients && <>
      <Card className="page-card filter-card">
        <Row>
          <Col md={8}><Form.Control placeholder="Search by ingredient name" value={search} onChange={e => setSearch(e.target.value)} /></Col>
          <Col md={4}><Form.Select value={category} onChange={e => setCategory(e.target.value)}><option value="">All categories</option>{categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}</Form.Select></Col>
        </Row>
      </Card>

      {ingredients.length === 0 && <EmptyMessage text="No ingredients yet. Add your first ingredient to start building meals." />}
      {ingredients.length > 0 && filtered.length === 0 && <EmptyMessage text="No ingredients match your search or filter." />}
      <Row className="mobile-card-grid">{filtered.map(item => <Col lg={6} key={item._id}><IngredientCard ingredient={item} onDeleted={mutate} /></Col>)}</Row>
    </>}
  </RouteGuard>;
}
