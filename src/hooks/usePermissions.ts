import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

type PermissionsValue =
  | Record<string, boolean>
  | string[]
  | null
  | undefined;

export function usePermissions() {
  const [permissions, setPermissions] = useState<Record<string, boolean>>({});
  const [loadingPerms, setLoadingPerms] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function fetchPermissions() {
      try {
        setLoadingPerms(true);

        // ============================================
        // משתמש מחובר
        // ============================================

        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();

        if (userError) {
          console.error(
            'Error getting current user:',
            userError
          );

          if (mounted) {
            setPermissions({});
          }

          return;
        }

        if (!user) {
          if (mounted) {
            setPermissions({});
          }

          return;
        }

        // ============================================
        // שליפת פרופיל + תפקיד + הרשאות
        // ============================================

        const {
          data,
          error,
        } = await supabase
          .from('user_profiles')
          .select(`
            role:roles(
              permissions
            )
          `)
          .eq('id', user.id)
          .single();

        if (error) {
          console.error(
            'Error fetching user permissions:',
            error
          );

          if (mounted) {
            setPermissions({});
          }

          return;
        }

        // ============================================
        // חילוץ מידע התפקיד
        // ============================================

        const roleInfo = data?.role as
          | {
              permissions?: PermissionsValue;
            }
          | Array<{
              permissions?: PermissionsValue;
            }>
          | null
          | undefined;

        const role = Array.isArray(roleInfo)
          ? roleInfo[0]
          : roleInfo;

        const rawPermissions = role?.permissions;

        // ============================================
        // המרת הרשאות למבנה אחיד
        // ============================================

        let normalizedPermissions: Record<string, boolean> = {};

        // --------------------------------------------
        // הרשאות בפורמט:
        //
        // {
        //   "create_donors": true,
        //   "donors_edit": true
        // }
        // --------------------------------------------

        if (
          rawPermissions &&
          !Array.isArray(rawPermissions) &&
          typeof rawPermissions === 'object'
        ) {
          normalizedPermissions = Object.entries(
            rawPermissions
          ).reduce<Record<string, boolean>>(
            (result, [key, value]) => {
              result[key] = Boolean(value);
              return result;
            },
            {}
          );
        }

        // --------------------------------------------
        // הרשאות בפורמט:
        //
        // [
        //   "create_donors",
        //   "donors_edit"
        // ]
        // --------------------------------------------

        else if (Array.isArray(rawPermissions)) {
          normalizedPermissions =
            rawPermissions.reduce<
              Record<string, boolean>
            >((result, permission) => {
              if (typeof permission === 'string') {
                result[permission] = true;
              }

              return result;
            }, {});
        }

        // ============================================
        // שמירת ההרשאות
        // ============================================

        if (mounted) {
          setPermissions(normalizedPermissions);
        }

        // ============================================
        // DEBUG זמני
        // ============================================

        console.log(
          '🔐 Current user:',
          user.email
        );

        console.log(
          '🔐 Raw permissions:',
          rawPermissions
        );

        console.log(
          '🔐 Normalized permissions:',
          normalizedPermissions
        );

        console.log(
          '🔐 create_donors:',
          normalizedPermissions.create_donors
        );
      } catch (error) {
        console.error(
          'Unexpected permissions error:',
          error
        );

        if (mounted) {
          setPermissions({});
        }
      } finally {
        if (mounted) {
          setLoadingPerms(false);
        }
      }
    }

    fetchPermissions();

    return () => {
      mounted = false;
    };
  }, []);

  // ================================================
  // בדיקת הרשאה
  // ================================================

  const hasPermission = (permId: string): boolean => {
    return permissions[permId] === true;
  };

  return {
    permissions,
    hasPermission,
    loadingPerms,
  };
}