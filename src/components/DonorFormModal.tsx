'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { usePermissions } from '@/hooks/usePermissions';
import { logActivity } from '@/lib/logger';

import {
  X,
  Save,
  User,
  Phone,
  MapPin,
  FileText,
  Heart,
  Loader2,
  Mail,
  Globe,
  Users,
  BookOpen,
  Trash2,
  Calendar,
} from 'lucide-react';

interface DonorFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  donorToEdit?: any | null;
}

interface DonorFormData {
  first_name_he: string;
  last_name_he: string;
  first_name_en: string;
  last_name_en: string;
  phone_1: string;
  phone_2: string;
  email: string;
  country: string;
  city: string;
  street: string;
  house_number: string;
  is_recurring: boolean;
  has_yissachar_zevulun: boolean;
  yissachar_zevulun_name: string;
  connected_contact: string;
  birthday: string;
  yahrzeit_date: string;
  notes: string;
}

const emptyFormData: DonorFormData = {
  first_name_he: '',
  last_name_he: '',
  first_name_en: '',
  last_name_en: '',
  phone_1: '',
  phone_2: '',
  email: '',
  country: 'ישראל',
  city: '',
  street: '',
  house_number: '',
  is_recurring: false,
  has_yissachar_zevulun: false,
  yissachar_zevulun_name: '',
  connected_contact: '',
  birthday: '',
  yahrzeit_date: '',
  notes: '',
};

export default function DonorFormModal({
  isOpen,
  onClose,
  onSuccess,
  donorToEdit,
}: DonorFormModalProps) {
  const [loading, setLoading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const [formData, setFormData] =
    useState<DonorFormData>(emptyFormData);

  // =====================================================
  // טעינת נתוני התורם לעריכה / איפוס לתורם חדש
  // =====================================================

  useEffect(() => {
    if (!isOpen) return;

    if (donorToEdit) {
      setFormData({
        first_name_he: donorToEdit.first_name_he || '',
        last_name_he: donorToEdit.last_name_he || '',
        first_name_en: donorToEdit.first_name_en || '',
        last_name_en: donorToEdit.last_name_en || '',
        phone_1: donorToEdit.phone_1 || '',
        phone_2: donorToEdit.phone_2 || '',
        email: donorToEdit.email || '',
        country: donorToEdit.country || 'ישראל',
        city: donorToEdit.city || '',
        street: donorToEdit.street || '',
        house_number: donorToEdit.house_number || '',

        is_recurring: Boolean(
          donorToEdit.is_recurring
        ),

        has_yissachar_zevulun: Boolean(
          donorToEdit.has_yissachar_zevulun
        ),

        yissachar_zevulun_name:
          donorToEdit.yissachar_zevulun_name || '',

        connected_contact:
          donorToEdit.connected_contact || '',

        birthday: donorToEdit.birthday
          ? String(donorToEdit.birthday).slice(0, 10)
          : '',

        yahrzeit_date: donorToEdit.yahrzeit_date
          ? String(donorToEdit.yahrzeit_date).slice(0, 10)
          : '',

        notes: donorToEdit.notes || '',
      });
    } else {
      setFormData({ ...emptyFormData });
    }
  }, [donorToEdit, isOpen]);

  if (!isOpen) return null;

  // =====================================================
  // שינוי שדה בטופס
  // =====================================================

  function updateField<K extends keyof DonorFormData>(
    field: K,
    value: DonorFormData[K]
  ) {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  }

  // =====================================================
  // שמירת תורם
  // =====================================================

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (
      !formData.first_name_he.trim() &&
      !formData.last_name_he.trim()
    ) {
      alert(
        'נא להזין לפחות שם פרטי או שם משפחה בעברית'
      );
      return;
    }

    setLoading(true);

    try {
      // =================================================
      // payload תואם בדיוק לסכמת donors
      // =================================================

      const payload = {
        first_name_he:
          formData.first_name_he.trim() || null,

        last_name_he:
          formData.last_name_he.trim() || null,

        first_name_en:
          formData.first_name_en.trim() || null,

        last_name_en:
          formData.last_name_en.trim() || null,

        phone_1:
          formData.phone_1.trim() || null,

        phone_2:
          formData.phone_2.trim() || null,

        email:
          formData.email.trim() || null,

        country:
          formData.country.trim() || null,

        city:
          formData.city.trim() || null,

        street:
          formData.street.trim() || null,

        house_number:
          formData.house_number.trim() || null,

        is_recurring:
          Boolean(formData.is_recurring),

        has_yissachar_zevulun:
          Boolean(formData.has_yissachar_zevulun),

        yissachar_zevulun_name:
          formData.has_yissachar_zevulun &&
          formData.yissachar_zevulun_name.trim()
            ? formData.yissachar_zevulun_name.trim()
            : null,

        connected_contact:
          formData.connected_contact.trim() || null,

        birthday:
          formData.birthday || null,

        yahrzeit_date:
          formData.yahrzeit_date || null,

        notes:
          formData.notes.trim() || null,
      };

      let error = null;
    const donorFullName = `${formData.first_name_he || ''} ${formData.last_name_he || ''}`.trim() || 'תורם';

    if (donorToEdit?.id) {
      // ===============================================
      // עדכון תורם קיים
      // ===============================================

      const res = await supabase
        .from('donors')
        .update(payload)
        .eq('id', donorToEdit.id);

      error = res.error;

      if (!error) {
        // ===================================================
        // 📝 רישום ביומן הפעילות (Audit Log) - עדכון
        // ===================================================
        await logActivity(
          'UPDATE',
          'donors',
          `ערך תורם קיים בשם ${donorFullName}`
        );
      }
    } else {
      // ===============================================
      // יצירת תורם חדש
      // ===============================================

      const res = await supabase
        .from('donors')
        .insert([payload]);

      error = res.error;

      if (!error) {
        // ===================================================
        // 📝 רישום ביומן הפעילות (Audit Log) - יצירה
        // ===================================================
        await logActivity(
          'INSERT',
          'donors',
          `יצר תורם חדש בשם ${donorFullName}`
        );
      }
    }

      if (error) {
        console.error(
          'Error saving donor:',
          error
        );

        alert(
          'שגיאה בשמירת נתוני התורם:\n\n' +
            error.message
        );

        return;
      }

      onSuccess();
      onClose();
    } catch (error) {
      console.error(
        'Unexpected save error:',
        error
      );

      alert(
        'אירעה שגיאה בלתי צפויה בעת שמירת התורם.'
      );
    } finally {
      setLoading(false);
    }
  }

  // =====================================================
// מחיקת תורם
  // =====================================================

  async function handleDeleteDonor() {
    if (!donorToEdit?.id) return;

    if (isDeleting || loading) return;

    const donorName =
      `${donorToEdit.first_name_he || ''} ${
        donorToEdit.last_name_he || ''
      }`.trim() || 'התורם';

    // ---------------------------------------------------
    // בדיקה כמה תרומות קיימות לתורם
    // ---------------------------------------------------

    const { count, error: countError } =
      await supabase
        .from('donations')
        .select('*', {
          count: 'exact',
          head: true,
        })
        .eq('donor_id', donorToEdit.id);

    if (countError) {
      console.error(
        'Error checking donations:',
        countError
      );

      alert(
        'לא ניתן לבדוק את מספר התרומות של התורם.'
      );

      return;
    }

    const donationCount = count || 0;

    // ---------------------------------------------------
    // הודעת אישור
    // ---------------------------------------------------

    let confirmationMessage = '';

    if (donationCount > 0) {
      confirmationMessage =
        `⚠️ מחיקת תורם\n\n` +
        `האם אתה בטוח שברצונך למחוק את ${donorName}?\n\n` +
        `לתורם זה קיימות ${donationCount} תרומות במערכת.\n\n` +
        `מחיקת התורם תמחק גם את כל התרומות ` +
        `המקושרות אליו.\n\n` +
        `הפעולה אינה ניתנת לביטול.`;
    } else {
      confirmationMessage =
        `⚠️ מחיקת תורם\n\n` +
        `האם אתה בטוח שברצונך למחוק את ${donorName}?\n\n` +
        `לתורם זה אין תרומות רשומות.\n\n` +
        `הפעולה אינה ניתנת לביטול.`;
    }

    const confirmed =
      window.confirm(confirmationMessage);

    if (!confirmed) return;

    // ---------------------------------------------------
    // ביצוע המחיקה
    // ---------------------------------------------------

    setIsDeleting(true);

    try {
      const { error } = await supabase
        .from('donors')
        .delete()
        .eq('id', donorToEdit.id);

      if (error) {
        console.error(
          'Error deleting donor:',
          error
        );

        alert(
          'לא ניתן למחוק את התורם.\n\n' +
            error.message
        );

        return;
      }

      // ===================================================
      // 📝 רישום ביומן הפעילות (Audit Log)
      // ===================================================
      await logActivity(
        'DELETE',
        'donors',
        `מחק את התורם ${donorName} (כולל ${donationCount} תרומות)`
      );

      onClose();
      onSuccess();
    } catch (error) {
      console.error(
        'Unexpected delete error:',
        error
      );

      alert(
        'אירעה שגיאה בלתי צפויה בעת מחיקת התורם.'
      );
    } finally {
      setIsDeleting(false);
    }
  }

  // =====================================================
  // UI
  // =====================================================

  return (
    <div
      className="
        fixed inset-0
        z-50
        flex items-center justify-center
        bg-slate-900/50
        backdrop-blur-sm
        p-4
        overflow-y-auto
      "
      dir="rtl"
    >
      <div
        className="
          bg-white
          w-full
          max-w-2xl
          rounded-2xl
          shadow-xl
          border border-slate-200
          overflow-hidden
          my-8
          max-h-[90vh]
          flex flex-col
        "
      >
        {/* ================================================= */}
        {/* כותרת החלון */}
        {/* ================================================= */}

        <div
          className="
            flex items-center justify-between
            p-5
            border-b border-slate-100
            bg-slate-50
            shrink-0
          "
        >
          <h2
            className="
              text-lg
              font-bold
              text-slate-800
              flex items-center gap-2
            "
          >
            <User className="w-5 h-5 text-blue-600" />

            {donorToEdit
              ? 'עריכת פרטי תורם'
              : 'הוספת תורם חדש'}
          </h2>

          <button
            type="button"
            onClick={onClose}
            disabled={loading || isDeleting}
            className="
              p-1
              text-slate-400
              hover:text-slate-600
              rounded-lg
              hover:bg-slate-200/50
              transition
              disabled:opacity-50
            "
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* ================================================= */}
        {/* תוכן נגלל */}
        {/* ================================================= */}

        <div className="overflow-y-auto p-6">
          <form
            id="donor-form"
            onSubmit={handleSubmit}
            className="space-y-6"
          >
            {/* --------------------------------------------- */}
            {/* פרטי זיהוי */}
            {/* --------------------------------------------- */}

            <section className="space-y-3">
              <h3 className="text-sm font-semibold text-slate-800 border-b pb-1">
                פרטי זיהוי
              </h3>

              <div className="grid grid-cols-2 gap-3">
                {/* שם פרטי עברית */}

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    שם פרטי (עברית)
                    <span className="text-red-500">
                      {' '}*
                    </span>
                  </label>

                  <input
                    type="text"
                    required
                    value={formData.first_name_he}
                    onChange={(e) =>
                      updateField(
                        'first_name_he',
                        e.target.value
                      )
                    }
                    placeholder="לדוגמה: אברהם"
                    className="
                      w-full
                      p-2.5
                      border
                      rounded-xl
                      text-sm
                      focus:outline-none
                      focus:ring-2
                      focus:ring-blue-500/20
                      focus:border-blue-500
                    "
                  />
                </div>

                {/* שם משפחה עברית */}

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    שם משפחה (עברית)
                  </label>

                  <input
                    type="text"
                    value={formData.last_name_he}
                    onChange={(e) =>
                      updateField(
                        'last_name_he',
                        e.target.value
                      )
                    }
                    placeholder="לדוגמה: כהן"
                    className="
                      w-full
                      p-2.5
                      border
                      rounded-xl
                      text-sm
                      focus:outline-none
                      focus:ring-2
                      focus:ring-blue-500/20
                      focus:border-blue-500
                    "
                  />
                </div>

                {/* שם פרטי אנגלית */}

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    שם פרטי (אנגלית)
                  </label>

                  <input
                    type="text"
                    dir="ltr"
                    value={formData.first_name_en}
                    onChange={(e) =>
                      updateField(
                        'first_name_en',
                        e.target.value
                      )
                    }
                    placeholder="Abraham"
                    className="
                      w-full
                      p-2.5
                      border
                      rounded-xl
                      text-sm
                      focus:outline-none
                      focus:ring-2
                      focus:ring-blue-500/20
                      focus:border-blue-500
                      text-left
                    "
                  />
                </div>

                {/* שם משפחה אנגלית */}

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    שם משפחה (אנגלית)
                  </label>

                  <input
                    type="text"
                    dir="ltr"
                    value={formData.last_name_en}
                    onChange={(e) =>
                      updateField(
                        'last_name_en',
                        e.target.value
                      )
                    }
                    placeholder="Cohen"
                    className="
                      w-full
                      p-2.5
                      border
                      rounded-xl
                      text-sm
                      focus:outline-none
                      focus:ring-2
                      focus:ring-blue-500/20
                      focus:border-blue-500
                      text-left
                    "
                  />
                </div>
              </div>
            </section>

            {/* --------------------------------------------- */}
            {/* תאריכים */}
            {/* --------------------------------------------- */}

            <section className="space-y-3">
              <h3 className="text-sm font-semibold text-slate-800 border-b pb-1">
                תאריכים
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {/* יום הולדת */}

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1 flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    תאריך לידה
                  </label>

                  <input
                    type="date"
                    value={formData.birthday}
                    onChange={(e) =>
                      updateField(
                        'birthday',
                        e.target.value
                      )
                    }
                    className="
                      w-full
                      p-2.5
                      border
                      rounded-xl
                      text-sm
                      focus:outline-none
                      focus:ring-2
                      focus:ring-blue-500/20
                      focus:border-blue-500
                    "
                  />
                </div>

                {/* יארצייט */}

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1 flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    תאריך יארצייט
                  </label>

                  <input
                    type="date"
                    value={formData.yahrzeit_date}
                    onChange={(e) =>
                      updateField(
                        'yahrzeit_date',
                        e.target.value
                      )
                    }
                    className="
                      w-full
                      p-2.5
                      border
                      rounded-xl
                      text-sm
                      focus:outline-none
                      focus:ring-2
                      focus:ring-blue-500/20
                      focus:border-blue-500
                    "
                  />
                </div>
              </div>
            </section>

            {/* --------------------------------------------- */}
            {/* פרטי התקשרות */}
            {/* --------------------------------------------- */}

            <section className="space-y-3">
              <h3 className="text-sm font-semibold text-slate-800 border-b pb-1">
                פרטי התקשרות
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {/* טלפון ראשי */}

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1 flex items-center gap-1">
                    <Phone className="w-3.5 h-3.5 text-slate-400" />
                    טלפון ראשי
                  </label>

                  <input
                    type="tel"
                    dir="ltr"
                    value={formData.phone_1}
                    onChange={(e) =>
                      updateField(
                        'phone_1',
                        e.target.value
                      )
                    }
                    placeholder="050-0000000"
                    className="
                      w-full
                      p-2.5
                      border
                      rounded-xl
                      text-sm
                      focus:outline-none
                      focus:ring-2
                      focus:ring-blue-500/20
                      focus:border-blue-500
                      text-left
                    "
                  />
                </div>

                {/* טלפון משני */}

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1 flex items-center gap-1">
                    <Phone className="w-3.5 h-3.5 text-slate-400" />
                    טלפון משני
                  </label>

                  <input
                    type="tel"
                    dir="ltr"
                    value={formData.phone_2}
                    onChange={(e) =>
                      updateField(
                        'phone_2',
                        e.target.value
                      )
                    }
                    placeholder="02-0000000"
                    className="
                      w-full
                      p-2.5
                      border
                      rounded-xl
                      text-sm
                      focus:outline-none
                      focus:ring-2
                      focus:ring-blue-500/20
                      focus:border-blue-500
                      text-left
                    "
                  />
                </div>

                {/* אימייל */}

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1 flex items-center gap-1">
                    <Mail className="w-3.5 h-3.5 text-slate-400" />
                    אימייל
                  </label>

                  <input
                    type="email"
                    dir="ltr"
                    value={formData.email}
                    onChange={(e) =>
                      updateField(
                        'email',
                        e.target.value
                      )
                    }
                    placeholder="email@example.com"
                    className="
                      w-full
                      p-2.5
                      border
                      rounded-xl
                      text-sm
                      focus:outline-none
                      focus:ring-2
                      focus:ring-blue-500/20
                      focus:border-blue-500
                      text-left
                    "
                  />
                </div>
              </div>
            </section>

            {/* --------------------------------------------- */}
            {/* כתובת מגורים */}
            {/* --------------------------------------------- */}

            <section className="space-y-3">
              <h3 className="text-sm font-semibold text-slate-800 border-b pb-1">
                כתובת מגורים
              </h3>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {/* ארץ */}

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1 flex items-center gap-1">
                    <Globe className="w-3.5 h-3.5 text-slate-400" />
                    ארץ
                  </label>

                  <input
                    type="text"
                    value={formData.country}
                    onChange={(e) =>
                      updateField(
                        'country',
                        e.target.value
                      )
                    }
                    placeholder="ישראל"
                    className="
                      w-full
                      p-2.5
                      border
                      rounded-xl
                      text-sm
                      focus:outline-none
                      focus:ring-2
                      focus:ring-blue-500/20
                      focus:border-blue-500
                    "
                  />
                </div>

                {/* עיר */}

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1 flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-slate-400" />
                    עיר
                  </label>

                  <input
                    type="text"
                    value={formData.city}
                    onChange={(e) =>
                      updateField(
                        'city',
                        e.target.value
                      )
                    }
                    placeholder="ירושלים"
                    className="
                      w-full
                      p-2.5
                      border
                      rounded-xl
                      text-sm
                      focus:outline-none
                      focus:ring-2
                      focus:ring-blue-500/20
                      focus:border-blue-500
                    "
                  />
                </div>

                {/* רחוב */}

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    רחוב
                  </label>

                  <input
                    type="text"
                    value={formData.street}
                    onChange={(e) =>
                      updateField(
                        'street',
                        e.target.value
                      )
                    }
                    placeholder="יפו"
                    className="
                      w-full
                      p-2.5
                      border
                      rounded-xl
                      text-sm
                      focus:outline-none
                      focus:ring-2
                      focus:ring-blue-500/20
                      focus:border-blue-500
                    "
                  />
                </div>

                {/* מספר בית */}

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    מספר בית
                  </label>

                  <input
                    type="text"
                    value={formData.house_number}
                    onChange={(e) =>
                      updateField(
                        'house_number',
                        e.target.value
                      )
                    }
                    placeholder="12"
                    className="
                      w-full
                      p-2.5
                      border
                      rounded-xl
                      text-sm
                      focus:outline-none
                      focus:ring-2
                      focus:ring-blue-500/20
                      focus:border-blue-500
                    "
                  />
                </div>
              </div>
            </section>

            {/* --------------------------------------------- */}
            {/* ניהול */}
            {/* --------------------------------------------- */}

            <section className="space-y-3">
              <h3 className="text-sm font-semibold text-slate-800 border-b pb-1">
                ניהול
              </h3>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1 flex items-center gap-1">
                  <Users className="w-3.5 h-3.5 text-slate-400" />
                  איש קשר בארגון
                </label>

                <input
                  type="text"
                  value={formData.connected_contact}
                  onChange={(e) =>
                    updateField(
                      'connected_contact',
                      e.target.value
                    )
                  }
                  placeholder="שם איש הקשר..."
                  className="
                    w-full
                    p-2.5
                    border
                    rounded-xl
                    text-sm
                    focus:outline-none
                    focus:ring-2
                    focus:ring-blue-500/20
                    focus:border-blue-500
                  "
                />
              </div>
            </section>

            {/* --------------------------------------------- */}
            {/* הו"ק + יששכר וזבולון */}
            {/* --------------------------------------------- */}

            <section className="p-4 bg-slate-50 border rounded-xl space-y-4">
              {/* הוראת קבע */}

              <label className="flex items-center gap-2.5 text-sm font-medium text-slate-700 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={formData.is_recurring}
                  onChange={(e) =>
                    updateField(
                      'is_recurring',
                      e.target.checked
                    )
                  }
                  className="
                    w-4 h-4
                    rounded
                    border-slate-300
                    text-blue-600
                    focus:ring-blue-500
                  "
                />

                <span className="flex items-center gap-1.5">
                  <Heart className="w-4 h-4 text-emerald-600" />
                  תורם בהוראת קבע פעילה (הו"ק)
                </span>
              </label>

              <div className="space-y-3 pt-3 border-t border-slate-200/60">
                {/* יששכר וזבולון */}

                <label className="flex items-center gap-2.5 text-sm font-medium text-slate-700 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={
                      formData.has_yissachar_zevulun
                    }
                    onChange={(e) =>
                      updateField(
                        'has_yissachar_zevulun',
                        e.target.checked
                      )
                    }
                    className="
                      w-4 h-4
                      rounded
                      border-slate-300
                      text-blue-600
                      focus:ring-blue-500
                    "
                  />

                  <span className="flex items-center gap-1.5">
                    <BookOpen className="w-4 h-4 text-amber-600" />
                    קיים הסכם יששכר וזבולון
                  </span>
                </label>

                {formData.has_yissachar_zevulun && (
                  <div className="pt-1 pr-7">
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">
                        שם האברך בכולל
                      </label>

                      <input
                        type="text"
                        value={
                          formData.yissachar_zevulun_name
                        }
                        onChange={(e) =>
                          updateField(
                            'yissachar_zevulun_name',
                            e.target.value
                          )
                        }
                        placeholder="שם האברך..."
                        className="
                          w-full
                          p-2.5
                          border
                          rounded-xl
                          text-sm
                          bg-white
                          focus:outline-none
                          focus:ring-2
                          focus:ring-blue-500/20
                          focus:border-blue-500
                        "
                      />
                    </div>
                  </div>
                )}
              </div>
            </section>

            {/* --------------------------------------------- */}
            {/* הערות */}
            {/* --------------------------------------------- */}

            <section>
              <label className="block text-xs font-medium text-slate-700 mb-1 flex items-center gap-1">
                <FileText className="w-3.5 h-3.5 text-slate-400" />
                הערות כלליות
              </label>

              <textarea
                rows={4}
                value={formData.notes}
                onChange={(e) =>
                  updateField(
                    'notes',
                    e.target.value
                  )
                }
                placeholder="הערות לגבי התורם..."
                className="
                  w-full
                  p-2.5
                  border
                  rounded-xl
                  text-sm
                  focus:outline-none
                  focus:ring-2
                  focus:ring-blue-500/20
                  focus:border-blue-500
                  resize-none
                "
              />
            </section>
          </form>
        </div>

        {/* ================================================= */}
        {/* כפתורי פעולה */}
        {/* ================================================= */}

        <div
          className="
            flex
            items-center
            justify-between
            gap-3
            p-5
            border-t border-slate-100
            bg-slate-50
            shrink-0
          "
        >
          {/* --------------------------------------------- */}
          {/* מחיקה — רק בעריכת תורם */}
          {/* --------------------------------------------- */}

          {donorToEdit ? (
            <button
              type="button"
              onClick={handleDeleteDonor}
              disabled={loading || isDeleting}
              className="
                px-4
                py-2
                rounded-xl
                border
                border-red-200
                bg-red-50
                text-red-600
                hover:bg-red-100
                hover:border-red-300
                disabled:opacity-50
                disabled:cursor-not-allowed
                text-sm
                font-medium
                flex
                items-center
                gap-2
                transition
              "
            >
              {isDeleting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  מוחק...
                </>
              ) : (
                <>
                  <Trash2 className="w-4 h-4" />
                  מחיקת תורם
                </>
              )}
            </button>
          ) : (
            <div />
          )}

          {/* --------------------------------------------- */}
          {/* ביטול + שמירה */}
          {/* --------------------------------------------- */}

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={loading || isDeleting}
              className="
                px-4
                py-2
                border
                rounded-xl
                text-sm
                font-medium
                text-slate-600
                hover:bg-slate-100
                transition
                disabled:opacity-50
              "
            >
              ביטול
            </button>

            <button
              type="submit"
              form="donor-form"
              disabled={loading || isDeleting}
              className="
                px-6
                py-2
                bg-blue-600
                hover:bg-blue-700
                text-white
                rounded-xl
                text-sm
                font-medium
                flex
                items-center
                gap-2
                transition
                shadow-sm
                disabled:opacity-50
                disabled:cursor-not-allowed
              "
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  שומר...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  {donorToEdit
                    ? 'עדכן תורם'
                    : 'שמור תורם'}
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}