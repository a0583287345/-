import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

export function usePermissions() {
  const [permissions, setPermissions] = useState<Record<string, boolean>>({});
  const [loadingPerms, setLoadingPerms] = useState(true);

  useEffect(() => {
    async function fetchPermissions() {
      try {
        // 1. מי המשתמש המחובר?
        const { data: { user } } = await supabase.auth.getUser();
        
        if (user) {
          // 2. נשלוף את הפרופיל שלו ואת ההרשאות של התפקיד שלו
          const { data, error } = await supabase
            .from('user_profiles')
            .select('role:roles(permissions)')
            .eq('id', user.id)
            .single();

          const roleInfo = data?.role as any;
          const perms = Array.isArray(roleInfo) ? roleInfo[0]?.permissions : roleInfo?.permissions;

          if (perms) {
            setPermissions(perms);
          }
        }
      } catch (error) {
        console.error('Error fetching permissions:', error);
      } finally {
        setLoadingPerms(false);
      }
    }

    fetchPermissions();
  }, []);

  // פונקציית עזר שבודקת אם יש הרשאה ספציפית
  const hasPermission = (permId: string) => {
    // אם ההרשאה קיימת והיא true, נחזיר true
    return !!permissions[permId];
  };

  return { permissions, hasPermission, loadingPerms };
}