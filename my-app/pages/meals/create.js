import { useEffect } from 'react';
import { useRouter } from 'next/router';
import RouteGuard from '../../components/RouteGuard';
import { LoadingMessage } from '../../components/StateMessage';

export default function CreateMealRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/create-meal-component');
  }, [router]);

  return <RouteGuard><LoadingMessage text="AAAAAAAAAAOpening meal builder..." /></RouteGuard>;
}
