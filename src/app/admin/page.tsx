'use client';

import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { ArrowRight } from 'lucide-react';

export type RoleType = 'admin' | 'viewer' | 'editor';

export interface UserRoleRecord {
  id: string;
  user_id: string;
  email: string;
  role: RoleType;
  nickname?: string; // הוספנו כינוי לממשק
  created_at?: string;
}

export default function AdminDashboard() {
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [currentUserEmail, setCurrentUserEmail] = useState<string | null>(null);
  const [currentRole, setCurrentRole] = useState<RoleType | null>(null);
  const [usersList, setUsersList] = useState<UserRoleRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // הוספנו מצב חדש לכינוי
  const [newUserEmail, setNewUserEmail] = useState<string>('');
  const [newUserPassword, setNewUserPassword] = useState<string>('');
  const [newUserRole, setNewUserRole] = useState<RoleType>('viewer');
  const [newUserNickname, setNewUserNickname] = useState<string>(''); 
  const [isCreatingUser, setIsCreatingUser] = useState<boolean>(false);

  const router = useRouter();

  useEffect(() => {
    checkUserAndFetchData();
  }, []);

  const checkUserAndFetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !session) {
        router.push('/login');
        return;
      }
      
      setCurrentUserId(session.user.id);
      setCurrentUserEmail(session.user.email || null);

      const { data: roleData, error: roleError } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', session.user.id)
        .single();

      if (roleError) return setError('שגיאה בטעינת הרשאות משתמש');

      const role = roleData?.role as RoleType;
      setCurrentRole(role);

      if (role === 'admin') await fetchAllUsers();
    } catch (err) {
      setError('אירעה שגיאה בלתי צפויה');
    } finally {
      setLoading(false);
    }
  };

  const fetchAllUsers = async () => {
    const { data, error } = await supabase
      .from('user_roles')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) setError('שגיאה בטעינת רשימת המשתמשים');
    else setUsersList((data as UserRoleRecord[]) || []);
  };

  const handleRoleChange = async (targetUserId: string, newRole: RoleType) => {
    try {
      setSuccessMsg(null);
      setError(null);

      const { error } = await supabase.from('user_roles').update({ role: newRole }).eq('user_id', targetUserId);
      if (error) throw error;

      setSuccessMsg('רמת ההרשאה עודכנה בהצלחה');
      setUsersList((prev) => prev.map((user) => (user.user_id === targetUserId ? { ...user, role: newRole } : user)));
    } catch (err: any) {
      setError(err.message || 'שגיאה בעדכון ההרשאה');
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUserEmail || !newUserPassword) return setError('יש למלא אימייל וסיסמה');

    try {
      setIsCreatingUser(true);
      setError(null);
      setSuccessMsg(null);

      const res = await fetch('/api/admin/create-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: newUserEmail,
          password: newUserPassword,
          role: newUserRole,
          nickname: newUserNickname, // שולחים את הכינוי לשרת
        }),
      });

      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || 'שגיאה ביצירת המשתמש');

      setSuccessMsg(`המשתמש ${newUserEmail} נוצר בהצלחה!`);
      setNewUserEmail('');
      setNewUserPassword('');
      setNewUserNickname(''); // איפוס הכינוי
      setNewUserRole('viewer');

      await fetchAllUsers();
    } catch (err: any) {
      setError(err.message || 'שגיאה ביצירת משתמש חדש');
    } finally {
      setIsCreatingUser(false);
    }
  };

  if (loading) return <div dir="rtl" className="p-8 text-center text-gray-600">טוען נתונים...</div>;

  if (currentRole !== 'admin') {
    return (
      <div dir="rtl" className="p-8 text-center flex flex-col items-center gap-4">
        <p className="text-red-600 font-bold text-lg">אין לך הרשאה לצפות בעמוד זה. גישה למנהלים בלבד.</p>
        <button onClick={() => router.push('/')} className="text-blue-600 underline">חזור לדף הבית</button>
      </div>
    );
  }

  return (
    <div dir="rtl" className="p-6 max-w-5xl mx-auto text-right font-sans min-h-screen">
      <div className="mb-4">
        <button onClick={() => router.push('/')} className="flex items-center gap-2 px-4 py-2 bg-white hover:bg-slate-100 text-slate-700 text-sm font-medium rounded-xl border border-slate-200 transition shadow-sm w-fit">
          <ArrowRight className="w-4 h-4 text-slate-500" /> חזור לדף הבית
        </button>
      </div>

      <div className="bg-slate-800 text-white p-5 rounded-xl mb-6 shadow-md flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">פאנל ניהול משתמשים</h1>
        </div>
      </div>

      {error && <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-xl mb-4 text-sm font-medium">{error}</div>}
      {successMsg && <div className="bg-emerald-100 border border-emerald-400 text-emerald-800 px-4 py-3 rounded-xl mb-4 text-sm font-medium">{successMsg}</div>}

      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 mb-8">
        <h2 className="text-lg font-bold mb-4 text-slate-800">יצירת משתמש חדש במערכת</h2>
        <form onSubmit={handleCreateUser} className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">כינוי</label>
            <input
              type="text"
              value={newUserNickname}
              onChange={(e) => setNewUserNickname(e.target.value)}
              className="w-full border border-slate-200 rounded-xl p-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              placeholder="לדוגמה: ישראל ישראלי"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">דוא"ל</label>
            <input
              type="email"
              value={newUserEmail}
              onChange={(e) => setNewUserEmail(e.target.value)}
              className="w-full border border-slate-200 rounded-xl p-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">סיסמה</label>
            <input
              type="password"
              value={newUserPassword}
              onChange={(e) => setNewUserPassword(e.target.value)}
              className="w-full border border-slate-200 rounded-xl p-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">הרשאה</label>
            <select
              value={newUserRole}
              onChange={(e) => setNewUserRole(e.target.value as RoleType)}
              className="w-full border border-slate-200 rounded-xl p-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
            >
              <option value="viewer">Viewer</option>
              <option value="editor">Editor</option>
              <option value="admin">Admin</option>
            </select>
          </div>
          <div>
            <button type="submit" disabled={isCreatingUser} className="w-full bg-blue-600 text-white py-2.5 rounded-xl text-sm font-bold hover:bg-blue-700 transition disabled:bg-slate-400">
              {isCreatingUser ? 'יוצר...' : 'צור משתמש'}
            </button>
          </div>
        </form>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-4 bg-slate-50 border-b border-slate-200">
          <h2 className="text-lg font-bold text-slate-800">רשימת משתמשים קיימים</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-right border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-xs text-slate-500 font-bold">
                <th className="p-4">כינוי</th>
                <th className="p-4">אימייל</th>
                <th className="p-4">הרשאה נוכחית</th>
                <th className="p-4">שינוי הרשאה</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {usersList.map((user) => (
                <tr key={user.id} className="hover:bg-slate-50 transition">
                  <td className="p-4 font-medium text-slate-900">{user.nickname || '-'}</td>
                  <td className="p-4 text-slate-600">{user.email}</td>
                  <td className="p-4">
                    <span className={`px-2.5 py-1 rounded-md text-xs font-bold ${user.role === 'admin' ? 'bg-purple-100 text-purple-700' : user.role === 'editor' ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-700'}`}>{user.role}</span>
                  </td>
                  <td className="p-4">
                    {user.user_id === currentUserId ? (
                      <span className="text-xs text-slate-400 font-medium">(החשבון שלך)</span>
                    ) : (
                      <select value={user.role} onChange={(e) => handleRoleChange(user.user_id, e.target.value as RoleType)} className="border border-slate-200 rounded-lg p-1.5 text-xs bg-white focus:outline-none">
                        <option value="viewer">viewer</option>
                        <option value="editor">editor</option>
                        <option value="admin">admin</option>
                      </select>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}