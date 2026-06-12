import { Alert, Card, Spinner } from 'react-bootstrap';

export function LoadingMessage({ text = 'Loading...' }) {
  return <Card className="page-card p-4 text-center"><div><Spinner size="sm" className="me-2" />{text}</div></Card>;
}

export function ErrorMessage({ text = 'Failed to load data.' }) {
  return <Alert variant="danger">{text}</Alert>;
}

export function EmptyMessage({ text }) {
  return <Card className="page-card p-4 text-center text-muted">{text}</Card>;
}
