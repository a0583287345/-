'use client';

import { usePermissions } from '@/hooks/usePermissions';

interface ProtectProps {
  permId: string;
  children: React.ReactNode;
}

export function Protect({ permId, children }: ProtectProps) {
  const { hasPermission, loadingPerms } = usePermissions();

  // בזמן טעינת ההרשאות לא מציגים את התוכן
  if (loadingPerms) {
    return null;
  }

  // אם אין הרשאה – לא מציגים את התוכן
  if (!hasPermission(permId)) {
    return null;
  }

  return <>{children}</>;
}