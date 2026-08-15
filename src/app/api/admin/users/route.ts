import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// 1. יצירת לקוח אדמין (חובה כדי ליצור משתמשים ולשנות סיסמאות מאחורי הקלעים)
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! // ודא שהמפתח הזה קיים אצלך ב-env.local!
);

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action, email, password, fullName, userId } = body;

    // --- שלב אימות הרשאות אוטומטי ---

    // א. קבלת הטוקן של המשתמש ששלח את הבקשה מההידר (Header)
    const authHeader = request.headers.get('Authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'חסר טוקן התחברות (Unauthorized)' }, { status: 401 });
    }
    const token = authHeader.replace('Bearer ', '');

  // ב. זיהוי המשתמש מול סופאבייס באמצעות הטוקן
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    
    if (authError || !user) {
      return NextResponse.json({ error: 'משתמש לא מזוהה' }, { status: 401 });
    }

    // ג. שליפת הפרופיל וההרשאות של המשתמש המבקש
    // הוספנו פה שליפה גם של ה-permissions
    const { data: userProfile } = await supabaseAdmin
      .from('user_profiles')
      .select('*, role:roles(name, permissions)')
      .eq('id', user.id)
      .single();

    // בדיקה חכמה: מוודאים שיש לו את ההרשאה manage_users בתוך ה-JSON
    const permissions = userProfile?.role?.permissions;
    
    const isAuthorized = permissions && (
      // אם ההרשאות שמורות כמערך: ["manage_users", "other_rule"]
      (Array.isArray(permissions) && permissions.includes('manage_users')) || 
      // אם ההרשאות שמורות כאובייקט: { manage_users: true }
      (typeof permissions === 'object' && permissions['manage_users'] === true) ||
      // גיבוי: למקרה שהתפקיד נקרא מנהל
      userProfile?.role?.name === 'admin' || userProfile?.role?.name === 'Admin' || userProfile?.role?.name === 'מנהל'
    );

    if (!isAuthorized) {
      return NextResponse.json({ error: 'אין לך הרשאת מנהל לביצוע פעולה זו.' }, { status: 403 });
    }

    // --- אם הגענו לפה, המשתמש הוא אדמין ואפשר לבצע את הפעולה! ---
    
    if (action === 'create') {
      // יצירת יוזר ב-Auth
      const { data: authData, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email: email,
        password: password,
        email_confirm: true,
      });

      if (createError) throw createError;

      // הוספת השם שלו לטבלת user_profiles (נוצר אוטומטית ריק אם יש לך טריגר, אבל נעדכן שם)
      if (authData.user) {
        await supabaseAdmin
          .from('user_profiles')
          .update({ full_name: fullName })
          .eq('id', authData.user.id);
      }

      return NextResponse.json({ success: true });
    }

    if (action === 'update_password') {
      const { error: passError } = await supabaseAdmin.auth.admin.updateUserById(
        userId,
        { password: password }
      );
      if (passError) throw passError;
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'פעולה לא חוקית' }, { status: 400 });

  } catch (error: any) {
    console.error('Admin API Error:', error);
    return NextResponse.json({ error: error.message || 'שגיאת שרת פנימית' }, { status: 500 });
  }
}