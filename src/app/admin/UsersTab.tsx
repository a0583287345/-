'use client';

import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { UserPlus, Pencil, KeyRound, Loader2, CheckCircle2, X, Users } from 'lucide-react';

export default function UsersTab() {
  const [users, setUsers] = useState<any[]>([]);
  const [roles, setRoles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // מצבי מודאל
  const [isAddUserModalOpen, setIsAddUserModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any | null>(null);

  // טפסים
  const [formData, setFormData] = useState({ email: '', password: '', fullName: '' });
  const [actionLoading, setActionLoading] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    const { data: usersData } = await supabase.from('user_profiles').select('*, role:roles(name)');
    const { data: rolesData } = await supabase.from('roles').select('*');
    
    if (usersData) setUsers(usersData);
    if (rolesData) setRoles(rolesData);
    
    setLoading(false);
  };

  const updateUserRole = async (userId: string, roleId: string) => {
    const valToUpdate = roleId === "" ? null : roleId;
    await supabase.from('user_profiles').update({ role_id: valToUpdate }).eq('id', userId);
    fetchData(); 
  };

  // קריאה מאובטחת ל-API (שולחת את הטוקן של המשתמש המחובר לבדיקת הרשאות בשרת)
  async function callAdminApi(action: string, payload: any) {
    setActionLoading(true);
    setFeedbackMsg('');
    try {
      // 1. שולפים את הטוקן של המשתמש המחובר כרגע
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      if (!token) throw new Error('אינך מחובר למערכת');

      // 2. שולחים את הבקשה ל-API שלנו יחד עם הטוקן
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` // שולחים את הטוקן לאימות
        },
        body: JSON.stringify({ action, ...payload }),
      });
      
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'שגיאה בפעולה');
      
      setFeedbackMsg('הפעולה בוצעה בהצלחה!');
      setTimeout(() => {
        closeAllModals();
        fetchData();
      }, 1500);

    } catch (err: any) {
      alert(err.message);
    } finally {
      setActionLoading(false);
    }
  }

  async function handleAddUser(e: React.FormEvent) {
    e.preventDefault();
    await callAdminApi('create', formData);
  }

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedUser) return;
    await callAdminApi('update_password', { userId: selectedUser.id, password: formData.password });
  }

  async function handleEditUser(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedUser) return;
    setActionLoading(true);
    
    await supabase.from('user_profiles').update({ full_name: formData.fullName }).eq('id', selectedUser.id);
    
    setActionLoading(false);
    closeAllModals();
    fetchData();
  }

  function closeAllModals() {
    setIsAddUserModalOpen(false);
    setIsEditModalOpen(false);
    setIsPasswordModalOpen(false);
    setSelectedUser(null);
    setFormData({ email: '', password: '', fullName: '' });
    setFeedbackMsg('');
  }

  if (loading) return (
    <div className="flex justify-center p-8">
      <Loader2 className="w-6 h-6 animate-spin text-purple-600" />
    </div>
  );

  return (
    <div>
      <div className="p-4 flex justify-between items-center bg-white border-b border-slate-100">
        <h2 className="text-lg font-bold text-slate-700 flex items-center gap-2">
          <Users className="w-5 h-5 text-slate-400" />
          רשימת משתמשים במערכת
        </h2>
        <button 
          onClick={() => setIsAddUserModalOpen(true)}
          className="flex items-center gap-2 bg-purple-600 text-white px-4 py-2 rounded-xl hover:bg-purple-700 transition-colors text-sm font-bold shadow-sm"
        >
          <UserPlus className="w-4 h-4" />
          הוסף משתמש
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-right text-sm border-collapse">
          <thead>
            <tr className="bg-slate-50 text-slate-500 border-b border-slate-200">
              <th className="px-6 py-4 font-medium">שם מלא</th>
              <th className="px-6 py-4 font-medium">מייל</th>
              <th className="px-6 py-4 font-medium">רמת הרשאה</th>
              <th className="px-6 py-4 font-medium text-left">פעולות</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {users.map((u) => (
              <tr key={u.id} className="hover:bg-slate-50/50 transition">
                <td className="px-6 py-4 font-medium text-slate-800">{u.full_name || 'ללא שם'}</td>
                <td className="px-6 py-4 text-slate-600">{u.email}</td>
                <td className="px-6 py-4">
                  <select 
                    value={u.role_id || ''} 
                    onChange={(e) => updateUserRole(u.id, e.target.value)}
                    className="border border-slate-300 rounded-lg p-1.5 w-full max-w-[150px] text-slate-700 bg-white focus:ring-2 focus:ring-purple-500 outline-none text-xs"
                  >
                    <option value="">ללא הרשאה</option>
                    {roles.map(r => (
                      <option key={r.id} value={r.id}>{r.name}</option>
                    ))}
                  </select>
                </td>
                <td className="px-6 py-4 flex items-center justify-end gap-2 text-left">
                  <button 
                    onClick={() => { setSelectedUser(u); setFormData({ ...formData, fullName: u.full_name }); setIsEditModalOpen(true); }}
                    className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"
                    title="ערוך פרטים"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={() => { setSelectedUser(u); setIsPasswordModalOpen(true); }}
                    className="p-2 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition"
                    title="שנה סיסמה"
                  >
                    <KeyRound className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ================= MODALS ================= */}

      {/* 1. מודאל הוספת משתמש */}
      {isAddUserModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden relative border border-slate-200">
            <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h2 className="font-bold text-slate-800 flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-purple-600" />
                הוספת משתמש חדש
              </h2>
              <button onClick={closeAllModals} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleAddUser} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1.5">אימייל למשתמש החדש</label>
                <input type="email" required value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:border-purple-500 outline-none" 
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1.5">סיסמה (לפחות 6 תווים)</label>
                <input type="password" required minLength={6} value={formData.password} onChange={(e) => setFormData({...formData, password: e.target.value})}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:border-purple-500 outline-none" 
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1.5">שם מלא (יוצג במערכת)</label>
                <input type="text" required value={formData.fullName} onChange={(e) => setFormData({...formData, fullName: e.target.value})}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:border-purple-500 outline-none" 
                />
              </div>
              
              {feedbackMsg && <p className="text-emerald-600 text-sm font-bold flex items-center gap-1"><CheckCircle2 className="w-4 h-4"/>{feedbackMsg}</p>}
              
              <button disabled={actionLoading} type="submit" className="w-full py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-bold text-sm mt-4 flex justify-center items-center gap-2">
                {actionLoading ? <Loader2 className="w-4 h-4 animate-spin"/> : 'צור משתמש'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* 2. מודאל עריכת משתמש */}
      {isEditModalOpen && selectedUser && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden relative border border-slate-200">
            <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h2 className="font-bold text-slate-800 flex items-center gap-2">
                <Pencil className="w-5 h-5 text-blue-600" />
                עריכת פרטי משתמש
              </h2>
              <button onClick={closeAllModals} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
            </div>
            
            <form onSubmit={handleEditUser} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1.5">שם מלא</label>
                <input type="text" required value={formData.fullName} onChange={(e) => setFormData({...formData, fullName: e.target.value})}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:border-blue-500 outline-none" 
                />
              </div>
              <button disabled={actionLoading} type="submit" className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-sm mt-4 flex justify-center items-center gap-2">
                {actionLoading ? <Loader2 className="w-4 h-4 animate-spin"/> : 'שמור שינויים'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* 3. מודאל שינוי סיסמה */}
      {isPasswordModalOpen && selectedUser && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden relative border border-slate-200">
            <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h2 className="font-bold text-slate-800 flex items-center gap-2">
                <KeyRound className="w-5 h-5 text-amber-600" />
                שינוי סיסמה
              </h2>
              <button onClick={closeAllModals} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
            </div>
            
            <form onSubmit={handleChangePassword} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1.5">סיסמה חדשה</label>
                <input type="password" required minLength={6} value={formData.password} onChange={(e) => setFormData({...formData, password: e.target.value})}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:border-amber-500 outline-none" 
                  placeholder="לפחות 6 תווים"
                />
              </div>

              {feedbackMsg && <p className="text-emerald-600 text-sm font-bold flex items-center gap-1"><CheckCircle2 className="w-4 h-4"/>{feedbackMsg}</p>}
              
              <button disabled={actionLoading} type="submit" className="w-full py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-bold text-sm mt-4 flex justify-center items-center gap-2">
                {actionLoading ? <Loader2 className="w-4 h-4 animate-spin"/> : 'עדכן סיסמה'}
              </button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}