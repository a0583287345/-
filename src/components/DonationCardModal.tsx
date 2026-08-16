'use client';

import { useState } from 'react';
import { logActivity } from '@/lib/logger';
import { usePermissions } from '@/hooks/usePermissions';
import { Protect } from '@/components/Protect'; 

import {
  Calendar,
  CreditCard,
  FileText,
  User,
  Hash,
  FileCheck,
  StickyNote,
  X,
  Trash2,
} from 'lucide-react';

import { supabase } from '@/lib/supabase';

interface Donation {
  id: string;
  donor_id: string | null;
  amount: number;
  currency: string | null;
  payment_method: string | null;
  donation_date: string | null;
  receipt_number: string | null;
  file_url: string | null;
  notes: string | null;
  created_at: string | null;
}

interface Donor {
  id: string;
  first_name_he: string | null;
  last_name_he: string | null;
  first_name_en?: string | null;
  last_name_en?: string | null;
}

interface DonationCardModalProps {
  isOpen: boolean;
  donation: Donation;
  donor?: Donor | null;
  onClose: () => void;
  onEdit?: () => void;
  onDeleted?: () => void;
}

export default function DonationCardModal({
  isOpen,
  donation,
  donor,
  onClose,
  onEdit,
  onDeleted,
}: DonationCardModalProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const { hasPermission } = usePermissions(); 

  if (!isOpen) {
    return null;
  }

  const donorName = donor
    ? `${donor.first_name_he || ''} ${donor.last_name_he || ''}`.trim()
    : 'תורם לא ידוע';

  const formattedAmount = new Intl.NumberFormat('he-IL', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(donation.amount || 0));

  const formattedDate = donation.donation_date
    ? new Date(donation.donation_date).toLocaleDateString('he-IL')
    : '-';

  const createdDate = donation.created_at
    ? new Date(donation.created_at).toLocaleDateString('he-IL')
    : '-';

  const currencyLabels: Record<string, string> = {
    ILS: '₪',
    USD: '$',
    EUR: '€',
    GBP: '£',
  };

  const currencySymbol =
    currencyLabels[donation.currency || 'ILS'] ||
    donation.currency ||
    '₪';

  // --- פעולת מחיקה ---
  async function handleDelete() {
    if (!hasPermission('donations_delete')) {
      alert('אין לך הרשאה למחוק תרומות!');
      return;
    }

    const confirmed = window.confirm(
      'האם אתה בטוח שברצונך למחוק את התרומה?\n\nהפעולה אינה ניתנת לביטול.'
    );

    if (!confirmed) {
      return;
    }

    setIsProcessing(true);

    try {
      const { error } = await supabase
        .from('donations')
        .delete()
        .eq('id', donation.id);

      if (error) {
        console.error('Error deleting donation:', error);
        alert(`אירעה שגיאה במחיקת התרומה:\n${error.message}`);
        return;
      }

      await logActivity('DELETE', 'donations', `מחק תרומה ע"ס ${currencySymbol}${formattedAmount} של התורם ${donorName} (מזהה: ${donation.id})`);

      onDeleted?.();
      onClose();
    } catch (error) {
      console.error('Unexpected error deleting donation:', error);
      alert('אירעה שגיאה לא צפויה במחיקת התרומה.');
    } finally {
      setIsProcessing(false);
    }
  }

  // --- פעולת פתיחת עריכה ---
  async function handleEditClick() {
    if (!hasPermission('donations_edit')) {
      alert('אין לך הרשאה לערוך תרומות!');
      return;
    }

    try {
      // רישום הפעולה ללוג לפני פתיחת העריכה
      await logActivity('EDIT_ACCESS', 'donations', `ניגש לערוך תרומה ע"ס ${currencySymbol}${formattedAmount} של התורם ${donorName} (מזהה: ${donation.id})`);
      
      onEdit?.();
    } catch (error) {
      console.error('Error logging edit activity:', error);
      // במקרה של שגיאה בלוג עדיין נאפשר לערוך כדי לא לתקוע את המשתמש
      onEdit?.(); 
    }
  }

  return (
    <div
      dir="rtl"
      className="
        fixed
        inset-0
        z-[9999]
        bg-slate-900/50
        backdrop-blur-sm
        flex
        items-center
        justify-center
        p-4
      "
      onClick={onClose}
    >
      <div
        className="
          relative
          bg-white
          rounded-2xl
          shadow-2xl
          border
          border-slate-200
          w-full
          max-w-3xl
          max-h-[90vh]
          overflow-y-auto
        "
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          disabled={isProcessing}
          className="
            absolute
            top-4
            left-4
            z-10
            w-9
            h-9
            rounded-xl
            bg-white
            border
            border-slate-200
            text-slate-400
            hover:text-slate-700
            hover:bg-slate-100
            flex
            items-center
            justify-center
            transition
            shadow-sm
            disabled:opacity-50
            disabled:cursor-not-allowed
          "
          aria-label="סגור"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="p-5 md:p-6">
          <div className="flex items-start gap-3 mb-6 pl-10">
            <div
              className="
                w-12
                h-12
                rounded-2xl
                bg-emerald-50
                border
                border-emerald-200
                text-emerald-600
                flex
                items-center
                justify-center
                shrink-0
              "
            >
              <CreditCard className="w-6 h-6" />
            </div>

            <div>
              <h2 className="text-xl font-bold text-slate-800">
                פרטי תרומה
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                פרטי התרומה המלאים
              </p>
            </div>
          </div>

          {/* הגנה על צפייה בסכום */}
          <Protect permId="donations_view_amount">
            <div
              className="
                rounded-2xl
                bg-emerald-50
                border
                border-emerald-200
                p-6
                mb-5
                text-center
              "
            >
              <div className="text-xs text-emerald-600 font-medium mb-2">
                סכום התרומה
              </div>

              <div
                dir="ltr"
                className="text-3xl md:text-4xl font-bold text-emerald-700"
              >
                {currencySymbol}
                {formattedAmount}
              </div>

              <div className="text-xs text-emerald-600 mt-2">
                {donation.currency || 'ILS'}
              </div>
            </div>
          </Protect>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="bg-slate-50 rounded-xl border border-slate-200 p-4">
              <div className="flex items-center gap-2 mb-2">
                <User className="w-4 h-4 text-slate-400" />
                <span className="text-xs text-slate-400">תורם</span>
              </div>
              <div className="font-bold text-sm text-slate-800">
                {donorName}
              </div>
            </div>

            <div className="bg-slate-50 rounded-xl border border-slate-200 p-4">
              <div className="flex items-center gap-2 mb-2">
                <Calendar className="w-4 h-4 text-slate-400" />
                <span className="text-xs text-slate-400">תאריך התרומה</span>
              </div>
              <div className="font-bold text-sm text-slate-800">
                {formattedDate}
              </div>
            </div>

            <div className="bg-slate-50 rounded-xl border border-slate-200 p-4">
              <div className="flex items-center gap-2 mb-2">
                <CreditCard className="w-4 h-4 text-slate-400" />
                <span className="text-xs text-slate-400">אמצעי תשלום</span>
              </div>
              <div className="font-bold text-sm text-slate-800">
                {donation.payment_method || '-'}
              </div>
            </div>

            <div className="bg-slate-50 rounded-xl border border-slate-200 p-4">
              <div className="flex items-center gap-2 mb-2">
                <Hash className="w-4 h-4 text-slate-400" />
                <span className="text-xs text-slate-400">מספר קבלה</span>
              </div>
              <div dir="ltr" className="font-bold text-sm text-slate-800">
                {donation.receipt_number || '-'}
              </div>
            </div>

            <div className="bg-slate-50 rounded-xl border border-slate-200 p-4 md:col-span-2">
              <div className="flex items-center gap-2 mb-2">
                <FileCheck className="w-4 h-4 text-slate-400" />
                <span className="text-xs text-slate-400">מזהה תרומה</span>
              </div>
              <div dir="ltr" className="text-[11px] text-slate-600 break-all font-mono">
                {donation.id}
              </div>
            </div>

            <div className="bg-slate-50 rounded-xl border border-slate-200 p-4">
              <div className="flex items-center gap-2 mb-2">
                <Calendar className="w-4 h-4 text-slate-400" />
                <span className="text-xs text-slate-400">נרשם במערכת</span>
              </div>
              <div className="font-bold text-sm text-slate-800">
                {createdDate}
              </div>
            </div>

            <div className="bg-slate-50 rounded-xl border border-slate-200 p-4">
              <div className="flex items-center gap-2 mb-2">
                <FileText className="w-4 h-4 text-slate-400" />
                <span className="text-xs text-slate-400">קובץ מצורף</span>
              </div>
              {donation.file_url ? (
                <a
                  href={donation.file_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="inline-flex items-center gap-2 text-sm font-medium text-blue-600 hover:text-blue-700"
                >
                  <FileText className="w-4 h-4" />
                  צפייה בקובץ
                </a>
              ) : (
                <div className="text-sm text-slate-400">
                  אין קובץ מצורף
                </div>
              )}
            </div>

            {donation.notes && (
              <div className="bg-slate-50 rounded-xl border border-slate-200 p-4 md:col-span-2">
                <div className="flex items-center gap-2 mb-2">
                  <StickyNote className="w-4 h-4 text-slate-400" />
                  <span className="text-xs text-slate-400">הערות</span>
                </div>
                <div className="text-sm text-slate-700 whitespace-pre-wrap leading-6">
                  {donation.notes}
                </div>
              </div>
            )}
          </div>

          <div
            className="
              mt-6
              pt-4
              border-t
              border-slate-100
              flex
              items-center
              justify-between
              gap-3
            "
          >
            <div className="flex items-center gap-2">
              {/* הגנה על מחיקה */}
              <Protect permId="donations_delete">
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={isProcessing}
                  className="
                    bg-red-50
                    hover:bg-red-100
                    text-red-600
                    border
                    border-red-200
                    font-medium
                    px-4
                    py-2.5
                    rounded-xl
                    text-xs
                    transition
                    flex
                    items-center
                    gap-2
                    disabled:opacity-50
                    disabled:cursor-not-allowed
                  "
                >
                  <Trash2 className="w-4 h-4" />
                  {isProcessing ? 'מעבד...' : 'מחק תרומה'}
                </button>
              </Protect>

              {/* הגנה על עריכה */}
              {onEdit && (
                <Protect permId="donations_edit">
                  <button
                    type="button"
                    onClick={handleEditClick}
                    disabled={isProcessing}
                    className="
                      bg-blue-600
                      hover:bg-blue-700
                      text-white
                      font-medium
                      px-4
                      py-2.5
                      rounded-xl
                      text-xs
                      transition
                      disabled:opacity-50
                      disabled:cursor-not-allowed
                    "
                  >
                    ערוך תרומה
                  </button>
                </Protect>
              )}
            </div>

            <button
              type="button"
              onClick={onClose}
              disabled={isProcessing}
              className="
                bg-slate-100
                hover:bg-slate-200
                text-slate-700
                font-medium
                px-4
                py-2.5
                rounded-xl
                text-xs
                transition
                disabled:opacity-50
                disabled:cursor-not-allowed
              "
            >
              סגור
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}