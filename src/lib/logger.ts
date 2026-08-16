import { supabase } from '@/lib/supabase';

export async function logActivity(action: string, tableName: string, description: string) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      console.log('🔍 LOG DEBUG: No user found');
      return;
    }

    console.log('🔍 LOG DEBUG: User ID:', user.id);
    console.log('🔍 LOG DEBUG: User Email:', user.email);

    // שליפת שם המשתמש מטבלת הפרופילים
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('full_name')
      .eq('id', user.id)
      .single();

    console.log('🔍 LOG DEBUG: Profile data:', profile);
    console.log('🔍 LOG DEBUG: Profile error:', profileError);

    const userName = profile?.full_name || user.email || 'משתמש לא ידוע';
    console.log('🔍 LOG DEBUG: Final resolved userName:', userName);

    const { error: insertError } = await supabase.from('audit_logs').insert({
      user_id: user.id,
      user_name: userName,
      action,
      table_name: tableName,
      description,
    });

    if (insertError) {
      console.error('🔍 LOG DEBUG: Insert error object:', JSON.stringify(insertError, null, 2));
      console.error('🔍 LOG DEBUG: Insert error message:', insertError.message || insertError.hint || insertError.details);
    }
  } catch (error) {
    console.error('🔍 LOG DEBUG: Unexpected error:', error);
  }
}