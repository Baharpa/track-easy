import { useMemo } from 'react';
import { Card } from 'react-bootstrap';
import quotes from '../data/track-easy-quotes.json';
import { TrackEasyIcon } from './TrackEasyIcons';

export default function DailyQuote() {
  const randomQuote = useMemo(() => quotes[Math.floor(Math.random() * quotes.length)] || quotes[0], []);

  return (
    <Card className="app-card dashboard-quote-card">
      <div className="dashboard-quote-glow dashboard-quote-glow-left" />
      <div className="dashboard-quote-glow dashboard-quote-glow-right" />
      <div className="dashboard-quote-top">
        <span className="dashboard-quote-icon">
          <TrackEasyIcon name="sparkle" size={14} />
        </span>
        <span className="dashboard-quote-kicker">Today&apos;s mindset</span>
      </div>
      <p className="dashboard-quote-text">"{randomQuote.quote}"</p>
    </Card>
  );
}

