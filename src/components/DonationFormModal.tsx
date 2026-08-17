'use client';

import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { Donor, Donation } from '@/types/donor';
import { logActivity } from '@/lib/logger';
import { usePermissions } from '@/hooks/usePermissions';
import {
  X,
  Save,
  DollarSign,
  Calendar,
  FileText,
  CreditCard,
  Upload,
  Camera,
  Trash2,
  Search,
  Paperclip,
  ChevronDown,
  Loader2,
} from 'lucide-react';

interface DonationFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  preselectedDonorId?: string | null;
  editingDonation?: Donation | null;
  canEdit?: boolean;
}

export default function DonationFormModal({
  isOpen,
  onClose,
  onSuccess,
  preselectedDonorId,
  editingDonation = null,
  canEdit = true,
}: DonationFormModalProps) {
  const { hasPermission, loadingPerms } = usePermissions();

  const [loading, setLoading] = useState(false);
  const [donors, setDonors] = useState<Donor[]>([]);
  const [donorSearch, setDonorSearch] = useState('');
  const [showDonorDropdown, setShowDonorDropdown] = useState(false);

  const [uploadingFiles, setUploadingFiles] = useState(false);
  const [filesToUpload, setFilesToUpload] = useState<
    { file: File; name: string }[]
  >([]);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const [formData, setFormData] = useState<Partial<Donation>>({
    donor_id: preselectedDonorId || '',
    amount: 0,
    currency: 'ILS',
    payment_method: 'credit_card',
    donation_date: new Date().toISOString().split('T')[0],
    receipt_number: '',
    notes: '',
  });

  const isEditMode = !!editingDonation;
  
  // בדיקת הרשאות משולבת (גם ברמת הקומפוננטה וגם מול ההרשאות של המשתמש)
  const hasFormPermission = isEditMode ? hasPermission('donations_edit') : hasPermission('donations_create');
  const isActionAllowed = canEdit && hasFormPermission;

  useEffect(() => {
    if (!isOpen) return;

    fetchDonors();
    setFilesToUpload([]);

    if (editingDonation) {
      setFormData({
        id: editingDonation.id,
        donor_id: editingDonation.donor_id || '',
        amount: Number(editingDonation.amount) || 0,
        currency: editingDonation.currency || 'ILS',
        payment_method:
          editingDonation.payment_method || 'credit_card',
        donation_date:
          editingDonation.donation_date ||
          new Date().toISOString().split('T')[0],
        receipt_number: editingDonation.receipt_number || '',
        notes: editingDonation.notes || '',
      });

      setDonorSearch('');
    } else {
      setFormData({
        donor_id: preselectedDonorId || '',
        amount: 0,
        currency: 'ILS',
        payment_method: 'credit_card',
        donation_date: new Date().toISOString().split('T')[0],
        receipt_number: '',
        notes: '',
      });
    }
  }, [isOpen, preselectedDonorId, editingDonation]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setShowDonorDropdown(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () =>
      document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  async function fetchDonors() {
    const { data, error } = await supabase
      .from('donors')
      .select('*')
      .order('first_name_he', { ascending: true });

    if (error) {
      console.error('שגיאה בטעינת תורמים:', error);
      return;
    }

    if (data) {
      setDonors(data as Donor[]);

      const donorId =
        editingDonation?.donor_id || preselectedDonorId;

      if (donorId) {
        const found = data.find((d) => d.id === donorId);
        if (found) {
          setDonorSearch(
            `${found.first_name_he || ''} ${
              found.last_name_he || ''
            }`.trim()
          );
        }
      } else {
        setDonorSearch('');
      }
    }
  }

  if (!isOpen) return null;

  const filteredDonors = donors.filter((d) => {
    const query = donorSearch.toLowerCase();
    const nameHe = `${d.first_name_he || ''} ${d.last_name_he || ''}`.toLowerCase();
    const nameEn = `${d.first_name_en || ''} ${d.last_name_en || ''}`.toLowerCase();
    const phone = `${d.phone_1 || ''} ${d.phone_2 || ''}`;

    return (
      nameHe.includes(query) ||
      nameEn.includes(query) ||
      phone.includes(query)
    );
  });

  function handleSelectDonor(donor: Donor) {
    if (!isActionAllowed) return;

    setFormData((prev) => ({
      ...prev,
      donor_id: donor.id,
    }));

    setDonorSearch(
      `${donor.first_name_he || ''} ${
        donor.last_name_he || ''
      }`.trim()
    );

    setShowDonorDropdown(false);
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    if (!isActionAllowed || !e.target.files) return;

    if (!hasPermission('documents_upload')) {
      alert('אין לך הרשאה להעלות מסמכים!');
      e.target.value = '';
      return;
    }

    const selected = Array.from(e.target.files);
    const newFiles = selected.map((file) => ({
      file,
      name: file.name,
    }));

    setFilesToUpload((prev) => [...prev, ...newFiles]);
    e.target.value = '';
  }

  function removeFile(index: number) {
    if (!isActionAllowed) return;
    setFilesToUpload((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    // חסימה נוספת בפונקציית השמירה
    if (isEditMode && !hasPermission('donations_edit')) {
      alert('אין לך הרשאה לערוך תרומות!');
      return;
    }

    if (!isEditMode && !hasPermission('donations_create')) {
      alert('אין לך הרשאה ליצור תרומות!');
      return;
    }

    if (!formData.amount || formData.amount <= 0) {
      alert('נא להזין סכום תרומה תקין');
      return;
    }

    setLoading(true);

    const donorId = formData.donor_id || null;
    const payload = {
      donor_id: donorId,
      amount: Number(formData.amount),
      currency: formData.currency || 'ILS',
      payment_method: formData.payment_method || null,
      donation_date:
        formData.donation_date ||
        new Date().toISOString().split('T')[0],
      receipt_number: formData.receipt_number || null,
      notes: formData.notes || null,
    };

    const selectedDonor = donors.find((d) => d.id === donorId);
    const donorNameForLog = selectedDonor 
      ? `${selectedDonor.first_name_he || ''} ${selectedDonor.last_name_he || ''}`.trim()
      : 'אנונימי / ללא שיוך';

    let donationId: string;

    try {
      if (isEditMode && editingDonation?.id) {
        const { data: updatedDonation, error } = await supabase
          .from('donations')
          .update(payload)
          .eq('id', editingDonation.id)
          .select()
          .single();

        if (error || !updatedDonation) {
          throw new Error('שגיאה בעדכון התרומה: ' + (error?.message || 'לא נמצאה התרומה'));
        }

        donationId = updatedDonation.id;

        await logActivity(
          'update',
          'donations',
          `נערכה תרומה על סך ${payload.amount} ${payload.currency} עבור: ${donorNameForLog}`
        );

      } else {
        const { data: insertedDonation, error } = await supabase
          .from('donations')
          .insert([payload])
          .select()
          .single();

        if (error || !insertedDonation) {
          throw new Error('שגיאה ברישום תרומה: ' + (error?.message || 'לא ניתן ליצור את התרומה'));
        }

        donationId = insertedDonation.id;

        await logActivity(
          'create',
          'donations',
          `נרשמה תרומה חדשה על סך ${payload.amount} ${payload.currency} עבור: ${donorNameForLog}`
        );
      }

      if (filesToUpload.length > 0) {
        setUploadingFiles(true);

        for (const item of filesToUpload) {
          const fileExt = item.file.name.includes('.')
              ? item.file.name.split('.').pop()?.toLowerCase() || 'file'
              : 'file';

          const uniqueId = typeof crypto !== 'undefined' && crypto.randomUUID
              ? crypto.randomUUID()
              : `${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

          const filePath = `donations/${donationId}/${uniqueId}.${fileExt}`;

          const { error: uploadError } = await supabase.storage
              .from('attachments')
              .upload(filePath, item.file, {
                cacheControl: '3600',
                upsert: false,
              });

          if (uploadError) throw new Error(`שגיאה בהעלאת הקובץ "${item.name}": ${uploadError.message}`);

          const { data: publicUrlData } = supabase.storage
              .from('attachments')
              .getPublicUrl(filePath);

          const publicUrl = publicUrlData?.publicUrl;
          if (!publicUrl) throw new Error(`לא ניתן לקבל כתובת לקובץ "${item.name}"`);

          const { error: documentError } = await supabase.from('donor_documents').insert([{
                donor_id: donorId,
                donation_id: donationId,
                file_name: item.name,
                file_url: publicUrl,
                file_type: item.file.type || null,
          }]);

          if (documentError) throw new Error(`הקובץ הועלה אך לא נשמר ברשימת המסמכים: ${documentError.message}`);

          await logActivity(
            'create',
            'donor_documents',
            `הועלה מסמך חדש: "${item.name}" עבור תרומה של: ${donorNameForLog}`
          );
        }

        setUploadingFiles(false);
      }

      setLoading(false);
      setUploadingFiles(false);
      onSuccess();
      onClose();
      
    } catch (error: any) {
      console.error('שגיאה בשמירת התרומה:', error);
      setUploadingFiles(false);
      setLoading(false);
      alert(error?.message || (isEditMode ? 'אירעה שגיאה בעדכון התרומה' : 'אירעה שגיאה ברישום התרומה'));
    }
  }

  const isBusy = loading || uploadingFiles || loadingPerms;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white w-full max-w-lg rounded-2xl shadow-xl border border-slate-200 overflow-hidden my-8">
        <div className="flex items-center justify-between p-5 border-b border-slate-100 bg-slate-50">
          <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-emerald-600" />
            {isEditMode ? 'עריכת תרומה' : 'רישום תרומה חדשה'}
          </h2>
          <button
            onClick={onClose}
            disabled={isBusy}
            className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200/50 transition disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="relative" ref={dropdownRef}>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              שיוך לתורם (חפש או בחר מהרשימה)
            </label>
            <div className="relative">
              <input
                type="text"
                placeholder="הקלד שם או טלפון לבחירה..."
                value={donorSearch}
                disabled={!isActionAllowed || isBusy}
                onFocus={() => setShowDonorDropdown(true)}
                onChange={(e) => {
                  setDonorSearch(e.target.value);
                  setShowDonorDropdown(true);
                  if (!e.target.value) {
                    setFormData((prev) => ({ ...prev, donor_id: '' }));
                  }
                }}
                className="w-full pr-9 pl-9 py-2.5 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 disabled:bg-slate-100"
              />
              <Search className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
              <button
                type="button"
                disabled={!isActionAllowed || isBusy}
                onClick={() => setShowDonorDropdown(!showDonorDropdown)}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 disabled:opacity-50"
              >
                <ChevronDown className="w-4 h-4" />
              </button>
            </div>

            {showDonorDropdown && isActionAllowed && (
              <div className="absolute top-full right-0 left-0 mt-1 bg-white border rounded-xl shadow-lg z-30 max-h-56 overflow-y-auto divide-y">
                <div
                  onClick={() => {
                    setFormData((prev) => ({ ...prev, donor_id: '' }));
                    setDonorSearch('');
                    setShowDonorDropdown(false);
                  }}
                  className="p-2.5 hover:bg-slate-50 cursor-pointer text-xs text-slate-500 italic"
                >
                  -- תרומה אנונימית / ללא שיוך --
                </div>
                {filteredDonors.length > 0 ? (
                  filteredDonors.map((d) => (
                    <div
                      key={d.id}
                      onClick={() => handleSelectDonor(d)}
                      className="p-2.5 hover:bg-blue-50/50 cursor-pointer text-xs flex justify-between items-center transition"
                    >
                      <div>
                        <span className="font-bold text-slate-800">
                          {d.first_name_he} {d.last_name_he}
                        </span>
                        {d.city && <span className="text-slate-400 mr-2">({d.city})</span>}
                      </div>
                      <span className="text-slate-400 font-mono" dir="ltr">{d.phone_1 || ''}</span>
                    </div>
                  ))
                ) : (
                  <div className="p-3 text-xs text-slate-400 text-center">לא נמצאו תורמים תואמים</div>
                )}
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">סכום התרומה</label>
              <input
                type="number"
                step="0.01"
                required
                min="0.01"
                disabled={!isActionAllowed || isBusy}
                value={formData.amount || ''}
                onChange={(e) => setFormData((prev) => ({ ...prev, amount: parseFloat(e.target.value) || 0 }))}
                placeholder="0.00"
                className="w-full p-2.5 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-bold text-slate-800 disabled:bg-slate-100"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">מטבע</label>
              <select
                value={formData.currency || 'ILS'}
                disabled={!isActionAllowed || isBusy}
                onChange={(e) => setFormData((prev) => ({ ...prev, currency: e.target.value }))}
                className="w-full p-2.5 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white disabled:bg-slate-100"
              >
                <option value="ILS">₪ - שקל חדש</option>
                <option value="USD">$ - דולר ארה"ב</option>
                <option value="EUR">€ - אירו</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1 flex items-center gap-1">
                <CreditCard className="w-3.5 h-3.5 text-slate-400" /> אופן תשלום
              </label>
              <select
                value={formData.payment_method || 'credit_card'}
                disabled={!isActionAllowed || isBusy}
                onChange={(e) => setFormData((prev) => ({ ...prev, payment_method: e.target.value }))}
                className="w-full p-2.5 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white disabled:bg-slate-100"
              >
                <option value="credit_card">כרטיס אשראי</option>
                <option value="bank_transfer_israel">העברה בנקאית ישראל</option>
                <option value="bank_transfer_usa">העברה בנקאית ארה"ב</option>
                <option value="bank_transfer_panama">העברה בנקאית פנמה</option>
                <option value="bank_transfer_france">העברה בנקאית צרפת</option>
                <option value="bit">ביט (Bit)</option>
                <option value="paybox">פייבוקס (PayBox)</option>
                <option value="cash">מזומן</option>
                <option value="check">שיק</option>
                <option value="paypal">פייפאל</option>
                <option value="other">אחר</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-slate-400" /> תאריך תרומה
              </label>
              <input
                type="date"
                required
                disabled={!isActionAllowed || isBusy}
                value={formData.donation_date || ''}
                onChange={(e) => setFormData((prev) => ({ ...prev, donation_date: e.target.value }))}
                className="w-full p-2.5 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white disabled:bg-slate-100"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">מספר קבלה / אסמכתא</label>
            <input
              type="text"
              disabled={!isActionAllowed || isBusy}
              value={formData.receipt_number || ''}
              onChange={(e) => setFormData((prev) => ({ ...prev, receipt_number: e.target.value }))}
              placeholder="לדוגמה: 100245"
              className="w-full p-2.5 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 disabled:bg-slate-100"
            />
          </div>

          <div className="space-y-2 pt-2 border-t">
            <label className="block text-xs font-medium text-slate-700 flex items-center gap-1">
              <Paperclip className="w-3.5 h-3.5 text-slate-400" /> העלאת מסמכים / קבלות
            </label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={!isActionAllowed || isBusy || !hasPermission('documents_upload')}
                className="flex-1 p-2.5 border border-dashed rounded-xl text-xs text-slate-600 hover:bg-slate-50 flex items-center justify-center gap-2 transition disabled:opacity-50"
              >
                <Upload className="w-4 h-4 text-blue-600" /> בחר קבצים
              </button>
              <button
                type="button"
                onClick={() => cameraInputRef.current?.click()}
                disabled={!isActionAllowed || isBusy || !hasPermission('documents_upload')}
                className="flex-1 p-2.5 border border-dashed rounded-xl text-xs text-slate-600 hover:bg-slate-50 flex items-center justify-center gap-2 transition disabled:opacity-50"
              >
                <Camera className="w-4 h-4 text-emerald-600" /> צילום ישיר
              </button>
              <input type="file" ref={fileInputRef} multiple onChange={handleFileSelect} className="hidden" />
              <input type="file" ref={cameraInputRef} accept="image/*" capture="environment" onChange={handleFileSelect} className="hidden" />
            </div>

            {filesToUpload.length > 0 && (
              <div className="space-y-1.5 pt-2">
                {filesToUpload.map((f, i) => (
                  <div key={i} className="flex items-center justify-between p-2 bg-slate-50 border rounded-lg text-xs">
                    <span className="truncate max-w-[200px] font-medium text-slate-700">{f.name}</span>
                    <button
                      type="button"
                      onClick={() => removeFile(i)}
                      disabled={!isActionAllowed || isBusy}
                      className="text-slate-400 hover:text-red-500 p-1 disabled:opacity-50"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1 flex items-center gap-1">
              <FileText className="w-3.5 h-3.5 text-slate-400" /> הערות לתרומה
            </label>
            <textarea
              rows={2}
              disabled={!isActionAllowed || isBusy}
              value={formData.notes || ''}
              onChange={(e) => setFormData((prev) => ({ ...prev, notes: e.target.value }))}
              placeholder="פירוט נוסף, ייעוד התרומה..."
              className="w-full p-2.5 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 disabled:bg-slate-100"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t">
            <button
              type="button"
              onClick={onClose}
              disabled={isBusy}
              className="px-4 py-2 border rounded-xl text-xs font-medium text-slate-600 hover:bg-slate-100 transition disabled:opacity-50"
            >
              ביטול
            </button>
            
            {isActionAllowed && (
              <button
                type="submit"
                disabled={isBusy}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-medium flex items-center gap-2 transition shadow-sm disabled:opacity-50"
              >
                {isBusy ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    {uploadingFiles ? 'מעלה קבצים...' : 'שומר...'}
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    {isEditMode ? 'שמור שינויים' : 'רשום תרומה'}
                  </>
                )}
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}