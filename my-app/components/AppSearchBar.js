import { TrackEasyIcon } from './TrackEasyIcons';

export default function AppSearchBar({
  value,
  onChange,
  placeholder = 'Search...',
  className = '',
  inputClassName = '',
  rightIcon = null,
  size = '',
  ariaLabel,
  ...props
}) {
  const sizeClass = size ? `app-search-bar-${size}` : '';

  return (
    <div className={['app-search-bar', sizeClass, className].filter(Boolean).join(' ')}>
      <TrackEasyIcon name="search" size={22} strokeWidth={2.25} className="app-search-icon" />
      <input
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className={['app-search-input', inputClassName].filter(Boolean).join(' ')}
        aria-label={ariaLabel || placeholder}
        {...props}
      />
      {rightIcon && <div className="app-search-end-icon">{rightIcon}</div>}
    </div>
  );
}
