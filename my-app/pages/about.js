import { Card, Col, Row } from 'react-bootstrap';
import PageHeader from '../components/PageHeader';

export default function About() {
  return (
    <>
      <PageHeader title="Track easier with me." />
      <Row className="g-4">
        <Col md={6}>
          <Card className="page-card p-4 h-100">
            <h4>What the app does</h4>
            <p>Track Easy helps users save ingredients, build meals, calculate nutrition totals, set daily goals, and track what they eat each day.</p>
            <p>The project uses a Next.js frontend and an Express/MongoDB backend.</p>
          </Card>
        </Col>
        <Col md={6}>
        </Col>
      </Row>
    </>
  );
}
