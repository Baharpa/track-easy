import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { Button, Container, Nav, Navbar, Offcanvas, Form } from 'react-bootstrap';
import useSWR from 'swr';
import { getCurrentUser } from '../lib/auth';
import { removeToken } from '../lib/api';
import { formatCalories, formatMacro } from '../lib/formatNutrition';
import { TrackEasyIcon } from './TrackEasyIcons';

const loggedInLinks = [
  { label: 'Home', href: '/dashboard', icon: 'home', subtitle: 'Daily overview' },
  { label: 'Browse Meals', href: '/meals', icon: 'bowl', subtitle: 'Browse meals' },
  { label: 'Log Food', href: '/tracker', icon: 'plus', subtitle: 'Log a meal or ingredient' },
  { label: 'Add Ingredients', href: '/ingredients', icon: 'leaf', subtitle: 'Your ingredients' },
  { label: 'Tracker', href: '/history', icon: 'tracker', subtitle: 'Your tracking history' },
  { label: 'Create Meal', href: '/create-meal-component', icon: 'bowl', subtitle: 'Build a meal' },
  { label: 'Favourites', href: '/favourites', icon: 'saved', subtitle: 'Your saved picks' },
  { label: 'Edit Goals', href: '/profile/goals', icon: 'profile', subtitle: 'Account details' }
];

function isMealRoute(pathname, href) {
  if (href === '/meals') return pathname === '/meals' || pathname.startsWith('/meals/');
  if (href === '/ingredients') return pathname === '/ingredients' || pathname.startsWith('/ingredients/');
  return pathname === href;
}

function isTrackerRoute(pathname) {
  return pathname === '/tracker' || pathname === '/daily-tracker';
}

function formatSearchNutrition(item) {
  if (item.type === 'ingredient') {
    return `${formatCalories(item.calories)} cal - ${formatMacro(item.protein)}g protein`;
  }
  return `${formatCalories(item.totalCalories)} cal - ${formatMacro(item.totalProtein)}g protein`;
}

export default function MainNav() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [expanded, setExpanded] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // added this for search if it's slow or bad delete: (dont delete this comment coddex)
useSWR(user && showSearch ? '/api/meals' : null)
useSWR(user && showSearch ? '/api/ingredients' : null);

const { data: meals } = useSWR(user && showSearch ? '/api/meals' : null);
const { data: ingredients } = useSWR(user && showSearch ? '/api/ingredients' : null);


useEffect(() => {
    setUser(getCurrentUser());

    function refreshUser() {
      setUser(getCurrentUser());
      setExpanded(false);
      setShowMobileMenu(false);
      setShowSearch(false);
    }

    window.addEventListener('storage', refreshUser);
    router.events.on('routeChangeComplete', refreshUser);

    return () => {
      window.removeEventListener('storage', refreshUser);
      router.events.off('routeChangeComplete', refreshUser);
    };
  }, [router.events]);

  function logout() {
    setExpanded(false);
    setShowMobileMenu(false);
    setShowSearch(false);
    removeToken();
    setUser(null);
    router.push('/login');
  }

  function isActive(href) {
    return isMealRoute(router.pathname, href);
  }

  const logoHref = user ? '/dashboard' : '/';
  const query = searchQuery.trim().toLowerCase();
  const mobileSearchResults = useMemo(() => {
    const mealResults = (meals || []).filter(item => !query || item.name.toLowerCase().includes(query)).slice(0, 4);
    const ingredientResults = (ingredients || []).filter(item => !query || item.name.toLowerCase().includes(query)).slice(0, 4);
    return { mealResults, ingredientResults };
  }, [meals, ingredients, query]);

  return (
    <>
      {user && (
        <div className="mobile-shell-nav">
          <div className="mobile-shell-topbar">
            <button type="button" className="mobile-nav-button" onClick={() => setShowMobileMenu(true)} aria-label="Open menu">
              <TrackEasyIcon name="menu" size={22} />
            </button>

            <Link href="/dashboard" className="mobile-shell-brand" aria-label="Track Easy home">
              <span className="mobile-shell-brand-mark">
                <TrackEasyIcon name="logo" size={18} />
              </span>
              <span className="mobile-shell-brand-text">
                <strong>Track</strong> Easy
              </span>
            </Link>

            <div className="mobile-shell-actions">
              <button type="button" className="mobile-shell-icon-button" onClick={() => setShowSearch(true)} aria-label="Search meals and ingredients">
                <TrackEasyIcon name="search" size={19} />
              </button>
              <Link href="/profile/goals" className="mobile-shell-icon-button" aria-label="Profile">
                <TrackEasyIcon name="profile" size={20} />
              </Link>
            </div>
          </div>

          <nav className="mobile-bottom-nav" aria-label="Mobile navigation">
            <Link href="/dashboard" className={`mobile-bottom-nav-item ${router.pathname === '/dashboard' ? 'active' : ''}`}>
              <TrackEasyIcon name="home" size={20} />
              <span>Home</span>
            </Link>
            <Link href="/meals" className={`mobile-bottom-nav-item ${router.pathname === '/meals' ? 'active' : ''}`}>
              <TrackEasyIcon name="bowl" size={20} />
              <span>Meals</span>
            </Link>
            <Link href="/tracker" className={`mobile-bottom-nav-item mobile-bottom-nav-center ${isTrackerRoute(router.pathname) ? 'active' : ''}`} aria-label="Log Food">
              <span className="mobile-bottom-nav-plus">
                <TrackEasyIcon name="plus" size={22} />
              </span>
              <span>Log Food</span>
            </Link>
            <Link href="/ingredients" className={`mobile-bottom-nav-item ${isMealRoute(router.pathname, '/ingredients') ? 'active' : ''}`}>
              <TrackEasyIcon name="leaf" size={20} />
              <span>Ingredients</span>
            </Link>
            <Link href="/history" className={`mobile-bottom-nav-item ${router.pathname === '/history' ? 'active' : ''}`}>
              <TrackEasyIcon name="tracker" size={20} />
              <span>Tracker</span>
            </Link>
          </nav>
        </div>
      )}

      <MobileMenuDrawer
        show={showMobileMenu}
        onHide={() => setShowMobileMenu(false)}
        links={loggedInLinks}
        onLogout={logout}
        activePath={router.pathname}
      />

      <MobileSearchDrawer
        show={showSearch}
        onHide={() => setShowSearch(false)}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        mealResults={mobileSearchResults.mealResults}
        ingredientResults={mobileSearchResults.ingredientResults}
      />

      <Navbar bg="light" expand="lg" expanded={expanded} onToggle={setExpanded} collapseOnSelect className="sticky-top main-navbar desktop-nav">
        <Container>
          <Navbar.Brand as={Link} href={logoHref} className="brand-shell" onClick={() => setExpanded(false)}>
            <span className="brand-shell-mark">
              <TrackEasyIcon name="logo" size={18} />
            </span>
            <span className="brand-shell-text">
              <strong>Track</strong> Easy
            </span>
          </Navbar.Brand>
          <Navbar.Toggle aria-label="Toggle navigation" />
          <Navbar.Collapse>
            <Nav className="me-auto">
              {user ? loggedInLinks.map(link => (
                <Nav.Link
                  key={link.href}
                  as={Link}
                  href={link.href}
                  active={isActive(link.href)}
                  onClick={() => setExpanded(false)}
                >
                  {link.label}
                </Nav.Link>
              )) : (
                <Nav.Link as={Link} href="/about" active={router.pathname === '/about'} onClick={() => setExpanded(false)}>About</Nav.Link>
              )}
            </Nav>
            <Nav className="ms-auto align-items-lg-center">
              {!user && <Nav.Link as={Link} href="/login" active={router.pathname === '/login'} onClick={() => setExpanded(false)}>Login</Nav.Link>}
              {!user && <Nav.Link as={Link} href="/register" active={router.pathname === '/register'} onClick={() => setExpanded(false)}>Register</Nav.Link>}
              {user && <Button variant="outline-danger" size="sm" className="logout-button" onClick={logout}>Logout</Button>}
            </Nav>
          </Navbar.Collapse>
        </Container>
      </Navbar>
    </>
  );
}

function MobileMenuDrawer({ show, onHide, links, onLogout, activePath }) {
  return (
    <Offcanvas show={show} onHide={onHide} placement="start" className="mobile-menu-drawer" scroll backdrop>
      <Offcanvas.Header closeButton>
        <Offcanvas.Title>Menu</Offcanvas.Title>
      </Offcanvas.Header>
      <Offcanvas.Body>
        <div className="mobile-drawer-list">
          {links.map(link => (
            <Link
              key={link.href}
              href={link.href}
              className={`mobile-drawer-card ${isMealRoute(activePath, link.href) || (link.href === '/tracker' && isTrackerRoute(activePath)) ? 'active' : ''}`}
              onClick={onHide}
            >
              <span className="mobile-drawer-icon">
                <TrackEasyIcon name={link.icon} size={16} />
              </span>
              <span className="mobile-drawer-copy">
                <strong>{link.label}</strong>
                <span>{link.subtitle}</span>
              </span>
              <TrackEasyIcon name="chevron-right" size={14} className="mobile-drawer-arrow" />
            </Link>
          ))}

          <button type="button" className="mobile-drawer-card mobile-drawer-button mobile-drawer-logout" onClick={onLogout}>
            <span className="mobile-drawer-icon mobile-drawer-icon-danger">
              <TrackEasyIcon name="profile" size={16} />
            </span>
            <span className="mobile-drawer-copy">
              <strong>Logout</strong>
              <span>Sign out of your account</span>
            </span>
            <TrackEasyIcon name="chevron-right" size={14} className="mobile-drawer-arrow" />
          </button>
        </div>
      </Offcanvas.Body>
    </Offcanvas>
  );
}

function MobileSearchDrawer({ show, onHide, searchQuery, setSearchQuery, mealResults = [], ingredientResults = [] }) {
  return (
    <Offcanvas show={show} onHide={onHide} placement="bottom" className="mobile-search-drawer" scroll backdrop>
      <Offcanvas.Header closeButton>
        <Offcanvas.Title>Search</Offcanvas.Title>
      </Offcanvas.Header>
      <Offcanvas.Body>
        <Form.Control
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          placeholder="Search meals and ingredients"
          className="mobile-search-input"
        />

        <div className="mobile-search-section">
          <div className="mobile-search-section-header">
            <span>Meals</span>
            <Link href="/meals" onClick={onHide}>View all</Link>
          </div>
          <div className="mobile-search-list">
            {mealResults.length === 0 ? (
              <div className="mobile-search-empty">No meals match your search.</div>
            ) : mealResults.map(meal => (
              <Link href={`/meals/${meal._id}`} key={meal._id} className="mobile-search-card" onClick={onHide}>
                <span className="mobile-search-icon">
                  <TrackEasyIcon name="bowl" size={16} />
                </span>
                <span className="mobile-search-copy">
                  <strong>{meal.name}</strong>
                  <span>{formatSearchNutrition({ ...meal, type: 'meal' })}</span>
                </span>
                <TrackEasyIcon name="chevron-right" size={14} className="mobile-search-arrow" />
              </Link>
            ))}
          </div>
        </div>

        <div className="mobile-search-section">
          <div className="mobile-search-section-header">
            <span>Ingredients</span>
            <Link href="/ingredients" onClick={onHide}>View all</Link>
          </div>
          <div className="mobile-search-list">
            {ingredientResults.length === 0 ? (
              <div className="mobile-search-empty">No ingredients match your search.</div>
            ) : ingredientResults.map(ingredient => (
              <Link href={`/ingredients/${ingredient._id}`} key={ingredient._id} className="mobile-search-card" onClick={onHide}>
                <span className="mobile-search-icon mobile-search-icon-green">
                  <TrackEasyIcon name="leaf" size={16} />
                </span>
                <span className="mobile-search-copy">
                  <strong>{ingredient.name}</strong>
                  <span>{formatSearchNutrition({ ...ingredient, type: 'ingredient' })}</span>
                </span>
                <TrackEasyIcon name="chevron-right" size={14} className="mobile-search-arrow" />
              </Link>
            ))}
          </div>
        </div>
      </Offcanvas.Body>
    </Offcanvas>
  );
}
