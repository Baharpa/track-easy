import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { Container, Nav, Navbar, Button } from 'react-bootstrap';
import { getCurrentUser } from '../lib/auth';
import { removeToken } from '../lib/api';

const loggedInLinks = [
  { label: 'Dashboard', href: '/dashboard' },
  { label: 'Inventory', href: '/ingredients' },
  { label: 'Meals', href: '/meals' },
  { label: 'Add Meal', href: '/create-meal-component' },
  { label: 'Favourites', href: '/favourites' },
  { label: 'Daily Tracker', href: '/tracker' },
  { label: 'Profile', href: '/profile' }
];

export default function MainNav() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    setUser(getCurrentUser());

    function refreshUser() {
      setUser(getCurrentUser());
      setExpanded(false);
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
    removeToken();
    setUser(null);
    router.push('/login');
  }

  function isActive(href) {
    if (href === '/meals') return router.pathname === '/meals' || router.pathname.startsWith('/meals/');
    return router.pathname === href;
  }

  const logoHref = user ? '/dashboard' : '/';

  return (
    <Navbar bg="light" expand="lg" expanded={expanded} onToggle={setExpanded} collapseOnSelect className="sticky-top main-navbar">
      <Container>
        <Navbar.Brand as={Link} href={logoHref} className="brand-text" onClick={() => setExpanded(false)}>Track Easy</Navbar.Brand>
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
            {user && <Button variant="outline-success" size="sm" className="logout-button" onClick={logout}>Logout</Button>}
          </Nav>
        </Navbar.Collapse>
      </Container>
    </Navbar>
  );
}
