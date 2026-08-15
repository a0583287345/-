'use client';

import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Key, Plus, Loader2, Pencil, ShieldCheck, X, CheckCircle2 } from 'lucide-react';

// חלוקת ההרשאות לקבוצות לפי הטבלאות והצרכים של המערכת
const PERMISSION_GROUPS = [
  {
    title: 'הגדרות מערכת ומשתמשים',
    permissions: [
      { id: 'manage_users', label: 'ניהול משתמשים (הוספה, עריכה, סיסמאות)' },
      { id: 'manage_roles', label: 'ניהול תפקידים והרשאות' },
      { id: 'view_dashboard', label: 'צפייה בלוח הבקרה (Dashboard)' },
    ]
  },
  {
    title: 'ניהול תורמים (Donors)',
    permissions: [
      { id: 'donors_view', label: 'צפייה ברשימת התורמים' },
      { id: 'donors_create', label: 'הוספת תורם חדש' },
      { id: 'donors_edit', label: 'עריכת פרטי תורם (כללי)' },
      { id: 'donors_delete', label: 'מחיקת תורם' },
      // הרשאות ברמת שדה
      { id: 'donors_view_contact', label: 'צפייה בפרטי התקשרות (טלפונים, אימייל, כתובת)' },
      { id: 'donors_edit_contact', label: 'עריכת פרטי התקשרות' },
    ]
  },
  {
    title: 'ניהול תרומות (Donations)',
    permissions: [
      { id: 'donations_view', label: 'צפייה ברשימת התרומות' },
      { id: 'donations_create', label: 'הוספת תרומה חדשה' },
      { id: 'donations_edit', label: 'עריכת תרומה קיימת' },
      { id: 'donations_delete', label: 'מחיקת תרומה' },
      // הרשאות ברמת שדה
      { id: 'donations_view_amount', label: 'צפייה בסכומי התרומות (חסיון פיננסי)' },
    ]
  },
  {
    title: 'מסמכי תורמים (Documents)',
    permissions: [
      { id: 'documents_view', label: 'צפייה במסמכים (קבלות/טפסים)' },
      { id: 'documents_upload', label: 'העלאת מסמכים חדשים' },
      { id: 'documents_delete', label: 'מחיקת מסמכים' },
    ]
  }
];

// יצירת רשימה שטוחה של כל ההרשאות בשביל התצוגה בכרטיסיות
const FLAT_PERMISSIONS = PERMISSION_GROUPS.flatMap(group => group.permissions);

export default function RolesTab() {
  const [roles, setRoles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // מצבי מודאל ועריכה
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedRole, setSelectedRole] = useState<any | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState('');

  // טופס ההרשאה
  const [roleName, setRoleName] = useState('');
  const [rolePermissions, setRolePermissions] = useState<Record<string, boolean>>({});

  useEffect(() => {
    fetchRoles();
  }, []);

  const fetchRoles = async () => {
    setLoading(true);
    const { data } = await supabase.from('roles').select('*').order('created_at', { ascending: true });
    if (data) setRoles(data);
    setLoading(false);
  };

  const handleAddNew = () => {
    setSelectedRole(null);
    setRoleName('');
    setRolePermissions({});
    setIsModalOpen(true);
  };

  const handleEdit = (role: any) => {
    setSelectedRole(role);
    setRoleName(role.name);
    setRolePermissions(role.permissions || {});
    setIsModalOpen(true);
  };

  const togglePermission = (permId: string) => {
    setRolePermissions(prev => ({
      ...prev,
      [permId]: !prev[permId]
    }));
  };

  const handleSaveRole = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);
    setFeedbackMsg('');

    try {
      if (selectedRole) {
        const { error } = await supabase
          .from('roles')
          .update({ name: roleName, permissions: rolePermissions })
          .eq('id', selectedRole.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('roles')
          .insert([{ name: roleName, permissions: rolePermissions }]);
        if (error) throw error;
      }

      setFeedbackMsg('ההרשאה נשמרה בהצלחה!');
      setTimeout(() => {
        setIsModalOpen(false);
        setFeedbackMsg('');
        fetchRoles();
      }, 1500);

    } catch (error: any) {
      alert(`שגיאה בשמירת ההרשאה: ${error.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) return (
    <div className="flex justify-center p-8">
      <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
    </div>
  );

  return (
    <div className="p-4">
      <div className="flex justify-between items-center mb-6 bg-white border-b border-slate-100 pb-4">
        <h2 className="text-lg font-bold text-slate-700 flex items-center gap-2">
          <Key className="w-5 h-5 text-slate-400" />
          ניהול תפקידים והרשאות
        </h2>
        <button 
          onClick={handleAddNew}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-xl hover:bg-blue-700 transition-colors text-sm font-bold shadow-sm"
        >
          <Plus className="w-4 h-4" />
          צור תפקיד
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 2xl:grid-cols-3 gap-6">
        {roles.map((role) => (
          <div key={role.id} className="border border-slate-200 rounded-2xl bg-white shadow-sm hover:shadow-md transition overflow-hidden flex flex-col">
            
            <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-blue-500" />
                {role.name}
              </h3>
              <button 
                onClick={() => handleEdit(role)}
                className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"
                title="ערוך הרשאות"
              >
                <Pencil className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 flex-1 bg-white">
              <div className="flex flex-wrap gap-1.5">
                {FLAT_PERMISSIONS.map(perm => {
                  const hasPerm = role.permissions && role.permissions[perm.id];
                  if (!hasPerm) return null;
                  return (
                    <span key={perm.id} className="px-2 py-1 bg-blue-50 text-blue-700 border border-blue-100 text-[11px] rounded-md font-medium">
                      {perm.label}
                    </span>
                  );
                })}
                {(!role.permissions || Object.values(role.permissions).every(v => !v)) && (
                  <span className="text-sm text-slate-400 italic">לא הוגדרו הרשאות לתפקיד זה</span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ================= MODAL ================= */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden relative border border-slate-200 flex flex-col max-h-[90vh]">
            
            <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50 shrink-0">
              <h2 className="font-bold text-slate-800 flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-blue-600" />
                {selectedRole ? 'עריכת תפקיד' : 'יצירת תפקיד חדש'}
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 p-1">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-5 overflow-y-auto custom-scrollbar flex-1">
              <form id="role-form" onSubmit={handleSaveRole} className="space-y-6">
                
                {/* שם ההרשאה */}
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1.5">שם התפקיד (לדוגמה: עורך, רואה חשבון, מנהל)</label>
                  <input 
                    type="text" 
                    required 
                    value={roleName} 
                    onChange={(e) => setRoleName(e.target.value)}
                    className="w-full max-w-sm px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition" 
                    placeholder="הזן את שם התפקיד"
                  />
                </div>

                {/* קבוצות הרשאות - עיצוב בגריד חכם */}
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-3">הגדרת הרשאות למערכת:</label>
                  <div className="space-y-4">
                    {PERMISSION_GROUPS.map((group, idx) => (
                      <div key={idx} className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                        <h4 className="font-bold text-slate-800 mb-3 pb-2 border-b border-slate-200 text-sm">
                          {group.title}
                        </h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {group.permissions.map((perm) => (
                            <label key={perm.id} className="flex items-start gap-2.5 p-2 rounded-lg hover:bg-slate-100 cursor-pointer transition">
                              <input 
                                type="checkbox" 
                                checked={!!rolePermissions[perm.id]} 
                                onChange={() => togglePermission(perm.id)}
                                className="mt-0.5 w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500 cursor-pointer accent-blue-600"
                              />
                              <span className="text-sm font-medium text-slate-600 leading-tight">{perm.label}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </form>
            </div>

            <div className="p-4 border-t border-slate-100 bg-white shrink-0 flex items-center justify-between">
              <div>
                {feedbackMsg && (
                  <span className="text-emerald-600 text-sm font-bold flex items-center gap-1">
                    <CheckCircle2 className="w-4 h-4"/>{feedbackMsg}
                  </span>
                )}
              </div>
              <div className="flex gap-2">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl text-sm font-bold transition">
                  ביטול
                </button>
                <button form="role-form" disabled={actionLoading} type="submit" className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-sm flex justify-center items-center gap-2 transition shadow-sm min-w-[120px]">
                  {actionLoading ? <Loader2 className="w-4 h-4 animate-spin"/> : 'שמור שינויים'}
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}