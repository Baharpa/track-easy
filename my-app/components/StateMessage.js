import { Alert, Card } from 'react-bootstrap';
import AppLoadingBox from './AppLoadingBox';

export function LoadingMessage({ text = 'Loading...' }) {
  return (
    <Card className="page-card app-loading-panel">
      <AppLoadingBox />
      {text && <span className="app-loading-panel-text">{text}</span>}
    </Card>
  );
}

export function ErrorMessage({ text = 'Failed to load data.' }) {
  return <Alert variant="danger">{text}</Alert>;
}

export function EmptyMessage({ text }) {
  return <Card className="page-card p-4 text-center text-muted">{text}</Card>;
}
