import Link from 'next/link';
import { Card } from 'react-bootstrap';

export default function AppShortcutCard({ href, title, subtitle, icon, variant = 'coral' }) {
  return (
    <Link href={href} className={`app-shortcut-card-link app-shortcut-card-${variant}`}>
      <Card className="app-shortcut-card" role="button">
        <div className="app-shortcut-icon" aria-hidden="true">{icon}</div>
        <div className="app-shortcut-copy">
          <strong>{title}</strong>
          <span>{subtitle}</span>
        </div>
        <div className="app-shortcut-arrow" aria-hidden="true">&rsaquo;</div>
      </Card>
    </Link>
  );
}
