import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(request: Request) {
  try {
    // הוספנו את ה-nickname לקבלת הנתונים
    const { email, password, role, nickname } = await request.json();

    if (!email || !password) {
      return NextResponse.json({ error: 'יש למלא אימייל וסיסמה' }, { status: 400 });
    }

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data: authData, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });

    if (createError) {
      return NextResponse.json({ error: createError.message }, { status: 400 });
    }

    const newUser = authData.user;

    if (newUser) {
      const { error: roleError } = await supabaseAdmin
        .from('user_roles')
        .upsert({
          user_id: newUser.id,
          email: email,
          role: role || 'viewer',
          nickname: nickname || '', // שמירת הכינוי החדש
        });

      if (roleError) {
        console.error('שגיאה בשמירת התפקיד:', roleError);
      }
    }

    return NextResponse.json({ success: true, user: newUser });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'שגיאת שרת פנימית' }, { status: 500 });
  }
}