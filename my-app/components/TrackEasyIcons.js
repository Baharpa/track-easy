export function TrackEasyIcon({ name, size = 20, className = '', strokeWidth = 2, title }) {
  const common = {
    width: size,
    height: size,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth,
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
    className,
    'aria-hidden': title ? undefined : true,
    role: title ? 'img' : 'presentation'
  };

  switch (name) {
    case 'menu':
      return (
        <svg {...common}>
          {title ? <title>{title}</title> : null}
          <path d="M4 7h16" />
          <path d="M4 12h16" />
          <path d="M4 17h16" />
        </svg>
      );
    case 'profile':
      return (
        <svg {...common}>
          {title ? <title>{title}</title> : null}
          <circle cx="12" cy="8" r="3.2" />
          <path d="M5.5 19c1.4-3.2 4-4.8 6.5-4.8s5.1 1.6 6.5 4.8" />
        </svg>
      );
    case 'sparkle':
      return (
        <svg {...common}>
          {title ? <title>{title}</title> : null}
          <path d="M12 3.8l1.7 4.5 4.5 1.7-4.5 1.7-1.7 4.5-1.7-4.5-4.5-1.7 4.5-1.7L12 3.8z" />
        </svg>
      );
    case 'leaf':
      return (
        <svg {...common}>
          {title ? <title>{title}</title> : null}
          <path d="M18 4c-7.2.2-12 4.9-12 11.2 0 2.4 1.8 4.3 4.3 4.3 6.3 0 11-4.8 11.2-12-.6.1-1.7.2-3.5 0C16 5.7 15 4.4 18 4z" />
          <path d="M7.5 16.5C10 15.5 13 12.7 15 9" />
        </svg>
      );
    case 'flame':
      return (
        <svg {...common}>
          {title ? <title>{title}</title> : null}
          <path d="M13.5 3.8c.7 2.6-.4 4.3-1.6 5.5-1.1 1.2-2.1 2.1-2.1 3.7 0 1.8 1.4 3.2 3.2 3.2 2.7 0 4.9-2.2 4.9-5 0-2.8-1.8-5.9-4.4-7.4z" />
          <path d="M10 20.2c-2.4-1-4-3.2-4-5.8 0-2.7 1.6-4.8 3.4-6.4" />
        </svg>
      );
    case 'muscle':
      return (
        <svg {...common}>
          {title ? <title>{title}</title> : null}
          <path d="M6 9h2.2l2.1 2.1H13l2.4-2.1H18" />
          <path d="M6 15h2.2l2.1-2.1H13l2.4 2.1H18" />
          <path d="M4.5 12h3" />
          <path d="M16.5 12h3" />
        </svg>
      );
    case 'bread':
      return (
        <svg {...common}>
          {title ? <title>{title}</title> : null}
          <path d="M6.5 9.5c0-2.3 2.2-4.2 5.5-4.2s5.5 1.9 5.5 4.2V19H6.5V9.5z" />
          <path d="M9.4 9.2v1.8" />
          <path d="M12 8.7v2.3" />
          <path d="M14.6 9.2v1.8" />
        </svg>
      );
    case 'avocado':
      return (
        <svg {...common}>
          {title ? <title>{title}</title> : null}
          <path d="M12 4c3.8 0 7 3.1 7 7 0 4.5-2.9 8-7 8s-7-3.5-7-8c0-3.9 3.2-7 7-7z" />
          <circle cx="12" cy="12" r="2.2" />
          <path d="M9 6.8c-1.8 1.6-2.9 3.9-2.9 6.2" />
        </svg>
      );
    case 'berry':
      return (
        <svg {...common}>
          {title ? <title>{title}</title> : null}
          <path d="M12 4.8 17.2 9 12 19.2 6.8 9 12 4.8z" />
          <path d="M12 4.8v-2" />
        </svg>
      );
    case 'target':
      return (
        <svg {...common}>
          {title ? <title>{title}</title> : null}
          <circle cx="12" cy="12" r="7.2" />
          <circle cx="12" cy="12" r="3.1" />
          <path d="M12 2.8v2.1" />
          <path d="M21.2 12h-2.1" />
        </svg>
      );
    case 'bolt':
      return (
        <svg {...common}>
          {title ? <title>{title}</title> : null}
          <path d="M13.5 2.8 6.8 13h4l-1.3 8.2 7-10.2h-4L13.5 2.8z" />
        </svg>
      );
    case 'bowl':
      return (
        <svg {...common}>
          {title ? <title>{title}</title> : null}
          <path d="M4.5 11h15" />
          <path d="M6 11.2c0 4 2.7 7 6 7s6-3 6-7" />
          <path d="M8.2 5.3c-.7.8-.7 1.6 0 2.4" />
          <path d="M12 4.8c-.7.8-.7 1.6 0 2.4" />
          <path d="M15.8 5.3c-.7.8-.7 1.6 0 2.4" />
        </svg>
      );
    case 'plus':
      return (
        <svg {...common}>
          {title ? <title>{title}</title> : null}
          <path d="M12 5v14" />
          <path d="M5 12h14" />
        </svg>
      );
    case 'camera':
      return (
        <svg {...common}>
          {title ? <title>{title}</title> : null}
          <path d="M5.5 8.5h13a1.5 1.5 0 0 1 1.5 1.5v7a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 17V10a1.5 1.5 0 0 1 1.5-1.5z" />
          <path d="M8 8.5 9.3 6.4h5.4L16 8.5" />
          <circle cx="12" cy="13.5" r="2.6" />
        </svg>
      );
    case 'search':
      return (
        <svg {...common}>
          {title ? <title>{title}</title> : null}
          <circle cx="11" cy="11" r="5.5" />
          <path d="M16 16l4 4" />
        </svg>
      );
    case 'home':
      return (
        <svg {...common}>
          {title ? <title>{title}</title> : null}
          <path d="M4.5 11.5 12 5l7.5 6.5" />
          <path d="M6.5 10.8V19h11V10.8" />
        </svg>
      );
    case 'tracker':
      return (
        <svg {...common}>
          {title ? <title>{title}</title> : null}
          <path d="M7 4.8v2.4" />
          <path d="M17 4.8v2.4" />
          <rect x="4.5" y="6.5" width="15" height="13" rx="2.5" />
          <path d="M8 11h3" />
          <path d="M8 14h8" />
        </svg>
      );
    case 'chevron-right':
      return (
        <svg {...common}>
          {title ? <title>{title}</title> : null}
          <path d="M9 6.5 14.5 12 9 17.5" />
        </svg>
      );
    default:
      return (
        <svg {...common}>
          {title ? <title>{title}</title> : null}
          <circle cx="12" cy="12" r="8" />
        </svg>
      );
  }
}

