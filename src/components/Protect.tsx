import { usePermissions } from '@/hooks/usePermissions';

interface ProtectProps {
  permId: string;
  children: React.ReactNode;
}

export function Protect({ permId, children }: ProtectProps) {
  const { hasPermission, loadingPerms } = usePermissions();

  // אם טוען או שאין הרשאה, אל תצייר כלום על המסך
  if (loadingPerms || !hasPermission(permId)) {
    return null; 
  }

  // אם יש הרשאה, תצייר את מה שבתוך התגית
  return <>{children}</>;
}