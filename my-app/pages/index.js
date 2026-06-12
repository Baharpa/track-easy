import { useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { Button, Col, Row } from 'react-bootstrap';
import { isLoggedIn } from '../lib/auth';

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    if (isLoggedIn()) router.replace('/dashboard');
  }, [router]);

  return (
    <div className="hero">
      <Row className="align-items-center">
        <Col md={7}>
          <h1 className="display-4 fw-bold">Track Easy</h1>
          <p className="lead">A simple food tracking app for your ingredients, meals, nutrition goals, and daily eating progress.</p>
          <Button as={Link} href="/register" variant="success" className="me-2">Get Started</Button>
          <Button as={Link} href="/login" variant="outline-success">Login</Button>
        </Col>
        <Col md={5}><img className="img-fluid rounded-4 shadow" src="https://images.unsplash.com/photo-1498837167922-ddd27525d352?auto=format&fit=crop&w=900&q=80" alt="Healthy food" /></Col>
      </Row>
    </div>
  );
}
