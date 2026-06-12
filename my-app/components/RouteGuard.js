import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import { isLoggedIn } from '../lib/auth';

export default function RouteGuard({ children }) {
  const router = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!isLoggedIn()) router.push('/login');
    else setReady(true);
  }, [router]);

  if (!ready) return <p>Loading...</p>;
  return children;
}
