'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/components/AuthContext';
import { usePermissions } from '@/hooks/usePermissions';
import { Donor } from '@/types/donor';
import {
  Bell,
  Calendar,
  CheckCircle2,
  Clock,
  Trash2,
  Edit3,
  Plus,
  Search,
  User,
  AlertCircle,
  Loader2,
  RefreshCw,
  Check,
} from 'lucide-react';

export interface Reminder {
  id: string;
  donor_id: string | null;
  title: string;
  description?: string;
  gregorian_date: string;
  hebrew_date?: string;
  is_recurring?: boolean;
  recurring_type?: string;
  notify_email?: boolean;
  is_completed?: boolean;
  created_at: string;
  created_by?: string;
}

interface RemindersTabProps {
  donors: Donor[];
  donorMap: Map<string, Donor>;
  onAddReminder: (donorId?: string, e?: React.MouseEvent) => void;
  onEditReminder: (reminder: Reminder, e?: React.MouseEvent) => void;
  onViewDonor: (donor: Donor) => void;
}

export default function RemindersTab({
  donors,
  donorMap,
  onAddReminder,
  onEditReminder,
  onViewDonor,
}: RemindersTabProps) {
  /* ============================================================
     אימות משתמש והרשאות
  ============================================================ */
  const { user, profile } = useAuth();
  const { hasPermission, loadingPerms } = usePermissions();

  const canCreateReminders = hasPermission('reminders_create');
  const canEditReminders = hasPermission('reminders_edit');
  const canDeleteReminders = hasPermission('reminders_delete');

  /* ============================================================
     מצב (State)
  ============================================================ */
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'overdue' | 'completed'>('all');
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  /* ============================================================
     פונקציית עזר לשליפת שם תורם עבור הלוגים
  ============================================================ */
  const getDonorNameForLog = useCallback((donorId: string | null) => {
    if (!donorId) return 'ללא תורם';
    const donor = donorMap.get(donorId);
    if (donor) {
      return `${donor.first_name_he || ''} ${donor.last_name_he || ''}`.trim() || 'תורם ללא שם';
    }
    return 'תורם לא ידוע';
  }, [donorMap]);

  /* ============================================================
     פונקציית רישום בלוג (Audit Log) - מותאמת לסכמה שלך
  ============================================================ */
  const logAudit = useCallback(
    async (action: string, descriptionText: string) => {
      try {
        const { error } = await supabase.from('audit_logs').insert({
          user_id: user?.id || null,
          user_name: profile?.full_name || user?.email || 'משתמש לא ידוע',
          action: action,
          table_name: 'reminders',
          description: descriptionText,
          created_at: new Date().toISOString(),
        });

        if (error) {
          console.error('שגיאה בשמירת לוג ב-Supabase:', error.message);
        }
      } catch (err) {
        console.error('שגיאה בלתי צפויה ברישום לוג:', err);
      }
    },
    [user?.id, user?.email, profile?.full_name]
  );

  /* ============================================================
     טעינת תזכורות
  ============================================================ */
  const fetchReminders = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('reminders')
        .select('*')
        .order('gregorian_date', { ascending: true });

      if (error) {
        console.error('שגיאה בטעינת תזכורות:', error);
      } else if (data) {
        setReminders(data as Reminder[]);
      }
    } catch (err) {
      console.error('שגיאה בלתי צפויה בטעינת תזכורות:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchReminders();
  }, [fetchReminders]);

  /* ============================================================
     שינוי סטטוס תזכורת (ביצוע / ביטול ביצוע) + לוג
  ============================================================ */
  async function handleToggleComplete(reminder: Reminder, e: React.MouseEvent) {
    e.stopPropagation();

    if (!canEditReminders) {
      alert('אין לך הרשאה לעדכן תזכורות במערכת.');
      return;
    }

    setActionLoadingId(reminder.id);
    const updatedStatus = !reminder.is_completed;
    const donorName = getDonorNameForLog(reminder.donor_id);

    try {
      const { error } = await supabase
        .from('reminders')
        .update({
          is_completed: updatedStatus,
        })
        .eq('id', reminder.id);

      if (error) throw error;

      setReminders((prev) =>
        prev.map((item) =>
          item.id === reminder.id ? { ...item, is_completed: updatedStatus } : item
        )
      );

      const actionType = updatedStatus ? 'REMINDER_MARKED_COMPLETE' : 'REMINDER_MARKED_PENDING';
      const statusText = updatedStatus ? 'הושלם' : 'הוחזר למצב ממתין';
      
      await logAudit(
        actionType,
        `שינוי סטטוס תזכורת "${reminder.title}" ל-${statusText} (משויכת לתורם: ${donorName})`
      );
    } catch (err) {
      console.error('שגיאה בעדכון סטטוס תזכורת:', err);
      alert('אירעה שגיאה בעדכון סטטוס התזכורת.');
    } finally {
      setActionLoadingId(null);
    }
  }

  /* ============================================================
     מחיקת תזכורת + לוג
  ============================================================ */
  async function handleDeleteReminder(reminder: Reminder, e: React.MouseEvent) {
    e.stopPropagation();

    if (!canDeleteReminders) {
      alert('אין לך הרשאה למחוק תזכורות.');
      return;
    }

    const confirmDelete = window.confirm(
      `האם אתה בטוח שברצונך למחוק את התזכורת "${reminder.title}"?`
    );
    if (!confirmDelete) return;

    setActionLoadingId(reminder.id);
    const donorName = getDonorNameForLog(reminder.donor_id);

    try {
      const { error } = await supabase
        .from('reminders')
        .delete()
        .eq('id', reminder.id);

      if (error) throw error;

      setReminders((prev) => prev.filter((item) => item.id !== reminder.id));

      await logAudit(
        'REMINDER_DELETED',
        `מחק תזכורת "${reminder.title}" שהייתה משויכת לתורם "${donorName}"`
      );
    } catch (err) {
      console.error('שגיאה במחיקת תזכורת:', err);
      alert('אירעה שגיאה במחיקת התזכורת.');
    } finally {
      setActionLoadingId(null);
    }
  }

  /* ============================================================
     חישוב תאריכים, סינון ומונים
  ============================================================ */
  const todayStr = new Date().toISOString().split('T')[0];

  const filteredReminders = useMemo(() => {
    return reminders.filter((rem) => {
      const donor = rem.donor_id ? donorMap.get(rem.donor_id) : null;
      const donorName = donor
        ? `${donor.first_name_he || ''} ${donor.last_name_he || ''}`.trim().toLowerCase()
        : '';

      const query = searchQuery.toLowerCase().trim();
      const titleMatch = rem.title.toLowerCase().includes(query);
      const descMatch = (rem.description || '').toLowerCase().includes(query);
      const matchesSearch = titleMatch || descMatch || donorName.includes(query);

      if (!matchesSearch) return false;

      const remDueDate = rem.gregorian_date ? rem.gregorian_date.split('T')[0] : '';
      const isOverdue = !rem.is_completed && remDueDate < todayStr;

      if (statusFilter === 'pending') return !rem.is_completed && !isOverdue;
      if (statusFilter === 'overdue') return isOverdue;
      if (statusFilter === 'completed') return rem.is_completed;

      return true;
    });
  }, [reminders, donorMap, searchQuery, statusFilter, todayStr]);

  const counts = useMemo(() => {
    let pending = 0;
    let overdue = 0;
    let completed = 0;

    reminders.forEach((r) => {
      if (r.is_completed) {
        completed++;
      } else {
        const dueDate = r.gregorian_date ? r.gregorian_date.split('T')[0] : '';
        if (dueDate < todayStr) {
          overdue++;
        } else {
          pending++;
        }
      }
    });

    return { total: reminders.length, pending, overdue, completed };
  }, [reminders, todayStr]);

  function formatDate(dateStr: string) {
    if (!dateStr) return 'ללא תאריך';
    const date = new Date(dateStr);
    return date.toLocaleDateString('he-IL', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  }

  function getReminderStatusBadge(reminder: Reminder) {
    if (reminder.is_completed) {
      return (
        <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200">
          <CheckCircle2 className="w-3 h-3" />
          הושלם
        </span>
      );
    }

    const remDueDate = reminder.gregorian_date ? reminder.gregorian_date.split('T')[0] : '';
    if (remDueDate < todayStr) {
      return (
        <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-md bg-red-50 text-red-700 border border-red-200 animate-pulse">
          <AlertCircle className="w-3 h-3" />
          באיחור
        </span>
      );
    }

    if (remDueDate === todayStr) {
      return (
        <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-md bg-amber-50 text-amber-700 border border-amber-200">
          <Clock className="w-3 h-3" />
          להיום
        </span>
      );
    }

    return (
      <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200">
        <Calendar className="w-3 h-3" />
        ממתין
      </span>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-6" dir="rtl">
      {/* סרגל כותרת, פעולות וחיפוש */}
      <div className="flex flex-col md:flex-row justify-between items-stretch md:items-center gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-200">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-purple-100 text-purple-700 rounded-xl">
            <Bell className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-800">ניהול תזכורות ומשימות</h2>
            <p className="text-xs text-slate-500">
              מעקב אחר שיחות חזרה, תזכורות תרומה ומשימות המשך
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={fetchReminders}
            disabled={loading}
            className="p-2.5 text-slate-600 bg-white hover:bg-slate-100 rounded-xl border border-slate-200 transition shadow-sm"
            title="רענן נתונים"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-purple-600' : ''}`} />
          </button>

          {canCreateReminders && (
            <button
              onClick={(e) => onAddReminder(undefined, e)}
              className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs px-4 py-2.5 rounded-xl transition shadow-sm"
            >
              <Plus className="w-4 h-4" />
              תזכורת חדשה
            </button>
          )}
        </div>
      </div>

      {/* כרטיסי סינון וסטטיסטיקה */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <button
          onClick={() => setStatusFilter('all')}
          className={`p-3.5 rounded-xl border text-right transition ${
            statusFilter === 'all'
              ? 'bg-purple-50 border-purple-300 ring-2 ring-purple-500/20'
              : 'bg-white border-slate-200 hover:bg-slate-50'
          }`}
        >
          <p className="text-xs font-medium text-slate-500">כל התזכורות</p>
          <p className="text-xl font-bold text-slate-800 mt-1">{counts.total}</p>
        </button>

        <button
          onClick={() => setStatusFilter('pending')}
          className={`p-3.5 rounded-xl border text-right transition ${
            statusFilter === 'pending'
              ? 'bg-blue-50 border-blue-300 ring-2 ring-blue-500/20'
              : 'bg-white border-slate-200 hover:bg-slate-50'
          }`}
        >
          <p className="text-xs font-medium text-blue-600">ממתינות לביצוע</p>
          <p className="text-xl font-bold text-blue-800 mt-1">{counts.pending}</p>
        </button>

        <button
          onClick={() => setStatusFilter('overdue')}
          className={`p-3.5 rounded-xl border text-right transition ${
            statusFilter === 'overdue'
              ? 'bg-red-50 border-red-300 ring-2 ring-red-500/20'
              : 'bg-white border-slate-200 hover:bg-slate-50'
          }`}
        >
          <p className="text-xs font-medium text-red-600">באיחור</p>
          <p className="text-xl font-bold text-red-800 mt-1">{counts.overdue}</p>
        </button>

        <button
          onClick={() => setStatusFilter('completed')}
          className={`p-3.5 rounded-xl border text-right transition ${
            statusFilter === 'completed'
              ? 'bg-emerald-50 border-emerald-300 ring-2 ring-emerald-500/20'
              : 'bg-white border-slate-200 hover:bg-slate-50'
          }`}
        >
          <p className="text-xs font-medium text-emerald-600">הושלמו</p>
          <p className="text-xl font-bold text-emerald-800 mt-1">{counts.completed}</p>
        </button>
      </div>

      {/* סרגל חיפוש */}
      <div className="relative">
        <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="חפש לפי נושא, פירוט או שם תורם..."
          className="w-full pr-10 pl-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition shadow-sm"
        />
      </div>

      {/* תוכן: טעינה / רשימה ריקה / טבלה */}
      {loading || loadingPerms ? (
        <div className="flex flex-col items-center justify-center py-16 bg-white rounded-2xl border border-slate-200">
          <Loader2 className="w-8 h-8 text-purple-600 animate-spin mb-3" />
          <p className="text-xs font-medium text-slate-500">טוען תזכורות...</p>
        </div>
      ) : filteredReminders.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 bg-white rounded-2xl border border-slate-200 text-center p-6">
          <div className="p-4 bg-purple-50 text-purple-600 rounded-full mb-3">
            <Bell className="w-8 h-8 opacity-60" />
          </div>
          <h3 className="text-base font-bold text-slate-800 mb-1">לא נמצאו תזכורות</h3>
          <p className="text-xs text-slate-500 max-w-sm mb-4">
            {searchQuery
              ? 'לא נמצאו תזכורות התואמות את מונח החיפוש.'
              : 'אין כרגע תזכורות בקטגוריה הנבחרת.'}
          </p>
          
          {canCreateReminders && (
            <button
              onClick={(e) => onAddReminder(undefined, e)}
              className="flex items-center gap-1.5 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs px-4 py-2 rounded-xl transition"
            >
              <Plus className="w-4 h-4" />
              צור תזכורת חדשה
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredReminders.map((reminder) => {
            const donor = reminder.donor_id ? donorMap.get(reminder.donor_id) : null;
            const donorName = donor
              ? `${donor.first_name_he || ''} ${donor.last_name_he || ''}`.trim()
              : null;

            const isActionLoading = actionLoadingId === reminder.id;

            return (
              <div
                key={reminder.id}
                className={`p-4 rounded-2xl border transition shadow-sm flex flex-col justify-between gap-3 ${
                  reminder.is_completed
                    ? 'bg-slate-50/70 border-slate-200 opacity-80'
                    : 'bg-white border-slate-200 hover:border-purple-200 hover:shadow-md'
                }`}
              >
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={(e) => handleToggleComplete(reminder, e)}
                        disabled={isActionLoading || !canEditReminders}
                        className={`p-1.5 rounded-lg border transition ${
                          reminder.is_completed
                            ? 'bg-emerald-500 text-white border-emerald-600 hover:bg-emerald-600'
                            : 'bg-white text-slate-300 border-slate-300 hover:border-emerald-500 hover:text-emerald-500'
                        } ${!canEditReminders ? 'opacity-50 cursor-not-allowed' : ''}`}
                        title={reminder.is_completed ? 'סמן כלא הושלם' : 'סמן כהושלם'}
                      >
                        {isActionLoading ? (
                          <Loader2 className="w-4 h-4 animate-spin text-purple-600" />
                        ) : (
                          <Check className="w-4 h-4 stroke-[3]" />
                        )}
                      </button>

                      <h3
                        className={`text-sm font-bold text-slate-800 leading-tight ${
                          reminder.is_completed ? 'line-through text-slate-500' : ''
                        }`}
                      >
                        {reminder.title}
                      </h3>
                    </div>

                    {getReminderStatusBadge(reminder)}
                  </div>

                  {reminder.description && (
                    <p className="text-xs text-slate-600 pr-8 whitespace-pre-wrap leading-relaxed">
                      {reminder.description}
                    </p>
                  )}
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2 text-xs text-slate-500">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1 font-medium">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      <span>{formatDate(reminder.gregorian_date)}</span>
                    </div>

                    {donor ? (
                      <button
                        onClick={() => onViewDonor(donor)}
                        className="flex items-center gap-1 font-medium text-blue-600 hover:text-blue-800 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-100 transition"
                      >
                        <User className="w-3 h-3" />
                        <span>{donorName || 'תורם'}</span>
                      </button>
                    ) : (
                      <span className="text-slate-400 text-[11px]">ללא תורם מקושר</span>
                    )}
                  </div>

                  <div className="flex items-center gap-1">
                    {canEditReminders && (
                      <button
                        onClick={(e) => onEditReminder(reminder, e)}
                        className="p-1.5 text-slate-500 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition"
                        title="ערוך תזכורת"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                    )}

                    {canDeleteReminders && (
                      <button
                        onClick={(e) => handleDeleteReminder(reminder, e)}
                        disabled={isActionLoading}
                        className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                        title="מחק תזכורת"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}