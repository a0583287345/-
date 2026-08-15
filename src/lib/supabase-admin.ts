import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!serviceKey) {
  console.warn("חסר SUPABASE_SERVICE_ROLE_KEY בקובץ סביבה");
}

// קליינט אדמין חזק שעוקף את מנגנוני הניתוק ואבטחת ה-RLS
export const supabaseAdmin = createClient(supabaseUrl, serviceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false, // מונע ניתוק של המנהל הנוכחי
  },
});