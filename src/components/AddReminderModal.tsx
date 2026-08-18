'use client';

import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/components/AuthContext';
import { 
  X, Save, Loader2, Calendar, FileText, User, Type, 
  Repeat, Bell, CalendarDays, Paperclip, Trash2, Upload
} from 'lucide-react';

import { logActivity } from '@/lib/logger'; 

interface AddReminderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  preselectedDonorId?: string | null;
  editingReminder?: any | null;
}

export default function AddReminderModal({
  isOpen,
  onClose,
  onSuccess,
  preselectedDonorId,
  editingReminder,
}: AddReminderModalProps) {
  const { user } = useAuth();
  
  const [loading, setLoading] = useState(false);
  const [uploadingText, setUploadingText] = useState('');
  const [donors, setDonors] = useState<any[]>([]);

  // שדות הטופס
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [gregorianDate, setGregorianDate] = useState('');
  const [hebrewDate, setHebrewDate] = useState('');
  const [donorId, setDonorId] = useState<string>('');
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurringType, setRecurringType] = useState('yearly');
  const [notifyEmail, setNotifyEmail] = useState(false);

  // ניהול קבצים
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [newFiles, setNewFiles] = useState<File[]>([]);
  const [existingAttachments, setExistingAttachments] = useState<any[]>([]);

  useEffect(() => {
    if (isOpen) {
      fetchDonors();
      
      if (editingReminder) {
        setTitle(editingReminder.title || '');
        setDescription(editingReminder.description || '');
        setGregorianDate(editingReminder.gregorian_date ? editingReminder.gregorian_date.split('T')[0] : '');
        setHebrewDate(editingReminder.hebrew_date || '');
        setDonorId(editingReminder.donor_id || '');
        setIsRecurring(editingReminder.is_recurring || false);
        setRecurringType(editingReminder.recurring_type || 'yearly');
        setNotifyEmail(editingReminder.notify_email || false);
        setExistingAttachments(editingReminder.attachments || []);
        setNewFiles([]);
      } else {
        setTitle('');
        setDescription('');
        setGregorianDate(new Date().toISOString().split('T')[0]);
        setHebrewDate('');
        setDonorId(preselectedDonorId || '');
        setIsRecurring(false);
        setRecurringType('yearly');
        setNotifyEmail(false);
        setExistingAttachments([]);
        setNewFiles([]);
      }
    }
  }, [isOpen, editingReminder, preselectedDonorId]);

  const fetchDonors = async () => {
    const { data } = await supabase
      .from('donors')
      .select('id, first_name_he, last_name_he')
      .order('created_at', { ascending: false });
      
    if (data) setDonors(data);
  };

  // פונקציית עזר לשליפת שם התורם עבור הלוגים (עם הסוגריים המתוקנים)
  const getDonorNameForLog = (selectedDonorId: string) => {
    if (!selectedDonorId) return 'ללא תורם';
    const foundDonor = donors.find((d) => d.id === selectedDonorId);
    if (foundDonor) {
      return `${foundDonor.first_name_he || ''} ${foundDonor.last_name_he || ''}`.trim() || 'תורם ללא שם';
    }
    return 'תורם לא ידוע';
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setNewFiles(prev => [...prev, ...Array.from(e.target.files!)]);
    }
  };

  const removeNewFile = (indexToRemove: number) => {
    setNewFiles(prev => prev.filter((_, index) => index !== indexToRemove));
  };

  const removeExistingAttachment = (indexToRemove: number) => {
    setExistingAttachments(prev => prev.filter((_, index) => index !== indexToRemove));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !gregorianDate) {
      alert('נא למלא נושא ותאריך לזכרון (לועזי).');
      return;
    }

    setLoading(true);

    try {
      let finalAttachments = [...existingAttachments];
      const currentDonorName = getDonorNameForLog(donorId);

      // העלאת קבצים חדשים (אם יש)
      if (newFiles.length > 0) {
        setUploadingText('מעלה קבצים...');
        for (const file of newFiles) {
          const fileExt = file.name.split('.').pop();
          const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
          const filePath = `${user?.id}/${fileName}`;
          
          const { error: uploadError } = await supabase.storage
            .from('reminder_docs')
            .upload(filePath, file);
            
          if (uploadError) throw uploadError;
          
          const { data: { publicUrl } } = supabase.storage
            .from('reminder_docs')
            .getPublicUrl(filePath);
            
          finalAttachments.push({
            name: file.name,
            path: filePath,
            url: publicUrl,
            uploaded_at: new Date().toISOString()
          });

          // רישום מדויק ללוג עבור העלאת מסמך
          await logActivity(
            'FILE_UPLOAD', 
            'reminders', 
            `העלה מסמך חדש לתזכורת "${title.trim()}" משוייכת לתורם "${currentDonorName}" - שם המסמך: ${file.name}`
          );
        }
      }

      setUploadingText('שומר נתונים...');

      const reminderData = {
        title: title.trim(),
        description: description.trim() || null,
        gregorian_date: gregorianDate,
        hebrew_date: hebrewDate.trim() || null,
        donor_id: donorId || null,
        is_recurring: isRecurring,
        recurring_type: isRecurring ? recurringType : null,
        notify_email: notifyEmail,
        attachments: finalAttachments
      };

      if (editingReminder) {
        // עדכון
        const { error } = await supabase
          .from('reminders')
          .update(reminderData)
          .eq('id', editingReminder.id);

        if (error) throw error;

        // רישום ללוג - עריכה
        await logActivity(
          'UPDATE', 
          'reminders', 
          `ערך תזכורת "${title.trim()}" משוייכת לתורם "${currentDonorName}"`
        );

      } else {
        // יצירה חדשה
        const { error } = await supabase
          .from('reminders')
          .insert([{ ...reminderData, created_by: user?.id }]);

        if (error) throw error;

        // רישום ללוג - יצירה
        await logActivity(
          'CREATE', 
          'reminders', 
          `יצר תזכורת חדשה "${title.trim()}" משוייכת לתורם "${currentDonorName}"`
        );
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      console.error('שגיאה בשמירת התזכורת:', err);
      alert(`שגיאה בשמירת התזכורת: ${err.message || 'שגיאת שרת'}`);
    } finally {
      setLoading(false);
      setUploadingText('');
    }
  };

  if (!isOpen) return null;

  return (
    <div dir="rtl" className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-2xl max-h-[90vh] overflow-y-auto flex flex-col animate-in fade-in zoom-in-95 duration-200">
        
        <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50 sticky top-0 z-10">
          <h2 className="text-lg font-bold text-slate-800">
            {editingReminder ? 'עריכת תזכורת' : 'הוספת תזכורת חדשה'}
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-lg transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 flex flex-col gap-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            <div className="space-y-1.5 md:col-span-2">
              <label className="flex items-center gap-1.5 text-sm font-bold text-slate-700">
                <Type className="w-4 h-4 text-purple-600" />
                נושא התזכורת <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="לדוגמה: יום השנה / חידוש הוראת קבע..."
                className="w-full px-3 py-2.5 bg-white border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition"
              />
            </div>

            <div className="space-y-1.5">
              <label className="flex items-center gap-1.5 text-sm font-bold text-slate-700">
                <Calendar className="w-4 h-4 text-purple-600" />
                תאריך לועזי <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                required
                value={gregorianDate}
                onChange={(e) => setGregorianDate(e.target.value)}
                className="w-full px-3 py-2.5 bg-white border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition"
              />
            </div>

            <div className="space-y-1.5">
              <label className="flex items-center gap-1.5 text-sm font-bold text-slate-700">
                <CalendarDays className="w-4 h-4 text-purple-600" />
                תאריך עברי (אופציונלי)
              </label>
              <input
                type="text"
                value={hebrewDate}
                onChange={(e) => setHebrewDate(e.target.value)}
                placeholder="לדוגמה: י״ב אלול..."
                className="w-full px-3 py-2.5 bg-white border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition"
              />
            </div>

            <div className="space-y-1.5 md:col-span-2">
              <label className="flex items-center gap-1.5 text-sm font-bold text-slate-700">
                <User className="w-4 h-4 text-purple-600" />
                שיוך לתורם (אופציונלי)
              </label>
              <select
                value={donorId}
                onChange={(e) => setDonorId(e.target.value)}
                className="w-full px-3 py-2.5 bg-white border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition"
              >
                <option value="">-- ללא תורם מקושר --</option>
                {donors.map((donor) => (
                  <option key={donor.id} value={donor.id}>
                    {donor.first_name_he} {donor.last_name_he}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5 md:col-span-2">
              <label className="flex items-center gap-1.5 text-sm font-bold text-slate-700">
                <FileText className="w-4 h-4 text-purple-600" />
                פירוט (אופציונלי)
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="הערות ופרטים נוספים..."
                rows={3}
                className="w-full px-3 py-2.5 bg-white border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition resize-none"
              />
            </div>

            {/* ====== אזור מסמכים וקבצים מצורפים ====== */}
            <div className="md:col-span-2 bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
              <label className="flex items-center gap-1.5 text-sm font-bold text-slate-700">
                <Paperclip className="w-4 h-4 text-purple-600" />
                מסמכים מצורפים
              </label>
              
              <input 
                type="file" 
                multiple 
                className="hidden" 
                ref={fileInputRef}
                onChange={handleFileSelect}
                accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
              />
              
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-2 px-4 py-2 bg-white border border-purple-200 text-purple-700 rounded-lg hover:bg-purple-50 text-sm font-medium transition"
              >
                <Upload className="w-4 h-4" />
                בחר קבצים להעלאה...
              </button>

              {existingAttachments.length > 0 && (
                <div className="space-y-2 mt-2">
                  <span className="text-xs text-slate-500 font-bold">קבצים שמורים:</span>
                  {existingAttachments.map((file, idx) => (
                    <div key={idx} className="flex justify-between items-center p-2 bg-white border border-slate-200 rounded-lg">
                      <a href={file.url} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 hover:underline truncate max-w-[80%]">
                        {file.name}
                      </a>
                      <button type="button" onClick={() => removeExistingAttachment(idx)} className="text-red-500 hover:bg-red-50 p-1 rounded transition">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {newFiles.length > 0 && (
                <div className="space-y-2 mt-2">
                  <span className="text-xs text-slate-500 font-bold">קבצים להעלאה:</span>
                  {newFiles.map((file, idx) => (
                    <div key={idx} className="flex justify-between items-center p-2 bg-white border border-purple-100 rounded-lg">
                      <span className="text-sm text-slate-700 truncate max-w-[80%]">{file.name}</span>
                      <button type="button" onClick={() => removeNewFile(idx)} className="text-red-500 hover:bg-red-50 p-1 rounded transition">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* הגדרות נוספות */}
            <div className="md:col-span-2 bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-4 mt-2">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="isRecurring"
                  checked={isRecurring}
                  onChange={(e) => setIsRecurring(e.target.checked)}
                  className="w-4 h-4 text-purple-600 rounded border-slate-300 focus:ring-purple-500"
                />
                <label htmlFor="isRecurring" className="flex items-center gap-1.5 text-sm font-bold text-slate-700 cursor-pointer">
                  <Repeat className="w-4 h-4 text-purple-600" />
                  תזכורת מחזורית (קבועה)
                </label>
              </div>

              {isRecurring && (
                <div className="mr-6 space-y-1.5 transition-all">
                  <label className="text-sm text-slate-600">תדירות:</label>
                  <select
                    value={recurringType}
                    onChange={(e) => setRecurringType(e.target.value)}
                    className="w-full md:w-1/2 px-3 py-2 bg-white border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                  >
                    <option value="yearly">שנתי</option>
                    <option value="monthly">חודשי</option>
                    <option value="weekly">שבועי</option>
                  </select>
                </div>
              )}

              <div className="flex items-center gap-2 pt-2 border-t border-slate-200">
                <input
                  type="checkbox"
                  id="notifyEmail"
                  checked={notifyEmail}
                  onChange={(e) => setNotifyEmail(e.target.checked)}
                  className="w-4 h-4 text-purple-600 rounded border-slate-300 focus:ring-purple-500"
                />
                <label htmlFor="notifyEmail" className="flex items-center gap-1.5 text-sm font-bold text-slate-700 cursor-pointer">
                  <Bell className="w-4 h-4 text-purple-600" />
                  שלח התראת אימייל במועד
                </label>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-slate-100 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2.5 text-sm font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition"
            >
              ביטול
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-2 px-6 py-2.5 text-sm font-bold text-white bg-purple-600 hover:bg-purple-700 disabled:bg-purple-400 rounded-xl transition shadow-sm"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {uploadingText || 'שומר...'}
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  {editingReminder ? 'שמור שינויים' : 'צור תזכורת'}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}