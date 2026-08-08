import { useEffect } from 'react';
import { useRouter } from 'expo-router';
import type { Role } from '@rentqil/shared';
import { useAuth } from './auth';

// screen level role guard, sends strangers to the catalog
export function useRequireRole(...roles: Role[]) {
  const { me, loading } = useAuth();
  const router = useRouter();
  const allowed = !loading && me !== null && roles.includes(me.role);
  const rolesKey = roles.join(',');

  useEffect(() => {
    if (loading) return;
    if (!me) {
      router.replace('/login');
    } else if (!rolesKey.split(',').includes(me.role)) {
      router.replace('/');
    }
  }, [loading, me, router, rolesKey]);

  return { me, ready: allowed };
}
