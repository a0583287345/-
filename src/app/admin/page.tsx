'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/components/AuthContext';
import { useRouter } from 'next/navigation';
import { ShieldAlert, Users, Key, ArrowRight, Loader2 } from 'lucide-react';
import UsersTab from './UsersTab';
import RolesTab from './RolesTab';

export default function AdminPage() {
  const { profile, hasPermission, loading } = useAuth();
  const router = useRouter();
  
  const [activeTab, setActiveTab] = useState<'users' | 'roles'>('users');

  useEffect(() => {
    if (loading) return;

    if (!profile || !hasPermission('manage_users')) {
      alert("אין לך הרשאה לגשת לפאנל הניהול.");
      router.push('/');
    }
  }, [loading, profile, router]);

  if (loading || !profile) {
    return (
      <div dir="rtl" className="min-h-screen bg-slate-50 flex flex-col items-center justify-center gap-3">
        <Loader2 className="w-8 h-8 text-purple-600 animate-spin" />
        <p className="text-slate-600 text-sm font-medium">מאמת הרשאות...</p>
      </div>
    );
  }

  return (
    <div dir="rtl" className="min-h-screen bg-slate-50 p-4 md:p-8 font-sans">
      <div className="max-w-6xl mx-auto space-y-6">
        
        {/* כותרת הדף */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-slate-800 flex items-center gap-2">
              <ShieldAlert className="w-8 h-8 text-purple-600" />
              פאנל ניהול מערכת
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              ניהול משתמשים, הרשאות ואבטחה
            </p>
          </div>
          
          <button
            onClick={() => router.push('/')}
            className="flex items-center gap-2 px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-bold rounded-xl transition shadow-sm"
          >
            <ArrowRight className="w-4 h-4" />
            חזרה למערכת
          </button>
        </div>

        {/* תפריט התגיות (Tabs) */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="border-b border-slate-200 bg-slate-50 p-2">
            <div className="flex gap-2">
              <button
                onClick={() => setActiveTab('users')}
                className={`
                  flex-1 md:flex-none px-6 py-3 rounded-xl text-sm font-bold transition flex items-center justify-center gap-2
                  ${activeTab === 'users'
                    ? 'bg-white text-purple-700 shadow-sm border border-slate-200'
                    : 'text-slate-500 hover:bg-white/70 hover:text-slate-700'
                  }
                `}
              >
                <Users className="w-4 h-4" />
                ניהול משתמשים
              </button>

              <button
                onClick={() => setActiveTab('roles')}
                className={`
                  flex-1 md:flex-none px-6 py-3 rounded-xl text-sm font-bold transition flex items-center justify-center gap-2
                  ${activeTab === 'roles'
                    ? 'bg-white text-blue-700 shadow-sm border border-slate-200'
                    : 'text-slate-500 hover:bg-white/70 hover:text-slate-700'
                  }
                `}
              >
                <Key className="w-4 h-4" />
                ניהול רמות הרשאה
              </button>
            </div>
          </div>

          {/* אזור התוכן המשתנה */}
          <div className="p-0">
            {activeTab === 'users' && <UsersTab />}
            {activeTab === 'roles' && <RolesTab />}
          </div>
        </div>
      </div>
    </div>
  );
}