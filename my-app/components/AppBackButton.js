import Link from 'next/link';
import { useRouter } from 'next/router';
import { TrackEasyIcon } from './TrackEasyIcons';

export default function AppBackButton({ label = 'Back', href, onClick, className = '' }) {
  const router = useRouter();
  const classes = ['app-back-button', className].filter(Boolean).join(' ');
  const content = (
    <>
      <TrackEasyIcon name="chevron-left" size={17} strokeWidth={2.6} />
      <span>{label}</span>
    </>
  );

  if (href) {
    return (
      <Link href={href} className={classes} aria-label={label}>
        {content}
      </Link>
    );
  }

  return (
    <button
      type="button"
      className={classes}
      aria-label={label}
      onClick={onClick || (() => router.back())}
    >
      {content}
    </button>
  );
}
