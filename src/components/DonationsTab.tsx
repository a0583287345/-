'use client';

import { useEffect, useMemo, useState } from 'react';
import { Donor } from '@/types/donor';
import { usePermissions } from '@/hooks/usePermissions';
import { supabase } from '@/lib/supabase';

import {
  Search,
  FileSpreadsheet,
  PlusCircle,
  Filter,
  X,
  Download,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  CreditCard,
  Calendar,
  Receipt,
  Paperclip,
  StickyNote,
  ExternalLink,
} from 'lucide-react';

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

interface DonationDocument {
  id: string;
  donor_id: string | null;
  donation_id: string | null;
  file_name: string | null;
  file_url: string | null;
  file_type: string | null;
  created_at: string | null;
}

type DonationSort =
  | 'created_desc'
  | 'created_asc'
  | 'date_desc'
  | 'date_asc'
  | 'amount_desc'
  | 'amount_asc'
  | 'donor_asc'
  | 'donor_desc';

interface DonationsTabProps {
  donations: Donation[];
  donors: Donor[];
  donorMap: Map<string, Donor>;
  loading: boolean;

  getDonorName: (
    donorId: string | null
  ) => string;

  onRefresh: () => void;

  onAddDonation: (
    donorId?: string,
    e?: React.MouseEvent
  ) => void;

  onViewDonation: (
    donation: Donation,
    e?: React.MouseEvent
  ) => void;

  onViewDonor: (donor: Donor) => void;
}

function formatDate(
  date: string | null | undefined
) {
  if (!date) {
    return '-';
  }

  const d = new Date(date);

  if (Number.isNaN(d.getTime())) {
    return date;
  }

  return d.toLocaleDateString('he-IL');
}

function formatAmount(
  amount: number | null | undefined,
  currency: string | null | undefined
) {
  const value = Number(amount || 0);

  return `${value.toLocaleString('he-IL', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} ${currency || 'ILS'}`;
}

function escapeCsv(value: unknown) {
  const text = String(value ?? '');

  return `"${text.replace(/"/g, '""')}"`;
}

export default function DonationsTab({
  donations,
  donors,
  donorMap,
  loading,
  getDonorName,
  onRefresh,
  onAddDonation,
  onViewDonation,
  onViewDonor,
}: DonationsTabProps) {
  /* ============================================================
     הרשאות
  ============================================================ */

  const {
    hasPermission,
    loadingPerms,
  } = usePermissions();

  /* ============================================================
     מסמכים של תרומות
  ============================================================ */

  const [donationDocuments, setDonationDocuments] =
    useState<Record<string, DonationDocument[]>>({});

  const [loadingDonationDocuments, setLoadingDonationDocuments] =
    useState(false);

  useEffect(() => {
    async function loadDonationDocuments() {
      if (!donations || donations.length === 0) {
        setDonationDocuments({});
        return;
      }

      setLoadingDonationDocuments(true);

      try {
        const donationIds = donations.map(
          (donation) => donation.id
        );

        const { data, error } = await supabase
          .from('donor_documents')
          .select(
            'id, donor_id, donation_id, file_name, file_url, file_type, created_at'
          )
          .in('donation_id', donationIds)
          .order('created_at', {
            ascending: false,
          });

        if (error) {
          console.error(
            'Error loading donation documents:',
            error
          );

          setDonationDocuments({});
          return;
        }

        const grouped: Record<
          string,
          DonationDocument[]
        > = {};

        (data || []).forEach((document) => {
          if (!document.donation_id) {
            return;
          }

          if (!grouped[document.donation_id]) {
            grouped[document.donation_id] = [];
          }

          grouped[document.donation_id].push(
            document as DonationDocument
          );
        });

        setDonationDocuments(grouped);
      } catch (error) {
        console.error(
          'Unexpected error loading donation documents:',
          error
        );

        setDonationDocuments({});
      } finally {
        setLoadingDonationDocuments(false);
      }
    }

    loadDonationDocuments();
  }, [donations]);

  /* ============================================================
     חיפוש
  ============================================================ */

  const [donationSearch, setDonationSearch] =
    useState('');

  /* ============================================================
     פילטרים
  ============================================================ */

  const [donationCurrency, setDonationCurrency] =
    useState('all');

  const [donationPaymentMethod, setDonationPaymentMethod] =
    useState('all');

  const [donationDonorId, setDonationDonorId] =
    useState('all');

  const [donationMinAmount, setDonationMinAmount] =
    useState('');

  const [donationMaxAmount, setDonationMaxAmount] =
    useState('');

  const [donationDateFrom, setDonationDateFrom] =
    useState('');

  const [donationDateTo, setDonationDateTo] =
    useState('');

  const [donationHasReceipt, setDonationHasReceipt] =
    useState<'all' | 'yes' | 'no'>('all');

  const [donationHasFile, setDonationHasFile] =
    useState<'all' | 'yes' | 'no'>('all');

  const [donationHasNotes, setDonationHasNotes] =
    useState<'all' | 'yes' | 'no'>('all');

  /*
   * ברירת המחדל היא מיון לפי תאריך יצירת הרשומה.
   * חדש -> ישן.
   */
  const [donationSort, setDonationSort] =
    useState<DonationSort>('created_desc');

  const [
    showAdvancedDonationFilters,
    setShowAdvancedDonationFilters,
  ] = useState(false);

  /* ============================================================
     מטבעות
  ============================================================ */

  const donationCurrencies = useMemo(() => {
    return Array.from(
      new Set(
        donations.map(
          (donation) =>
            donation.currency || 'ILS'
        )
      )
    ).sort();
  }, [donations]);

  /* ============================================================
     אמצעי תשלום
  ============================================================ */

  const donationPaymentMethods = useMemo(() => {
    return Array.from(
      new Set(
        donations
          .map(
            (donation) =>
              donation.payment_method
          )
          .filter(Boolean) as string[]
      )
    ).sort();
  }, [donations]);

  /* ============================================================
     פונקציה שבודקת האם לתרומה יש קובץ
  ============================================================ */

  function donationHasDocuments(
    donation: Donation
  ) {
    const documents =
      donationDocuments[donation.id] || [];

    return (
      !!donation.file_url?.trim() ||
      documents.some(
        (document) =>
          !!document.file_url?.trim()
      )
    );
  }

  /* ============================================================
     סינון + מיון
  ============================================================ */

  const filteredDonations = useMemo(() => {
    const query =
      donationSearch.trim().toLowerCase();

    const minAmount =
      donationMinAmount === ''
        ? null
        : Number(donationMinAmount);

    const maxAmount =
      donationMaxAmount === ''
        ? null
        : Number(donationMaxAmount);

    const result = donations.filter(
      (donation) => {
        const donor = donation.donor_id
          ? donorMap.get(donation.donor_id)
          : null;

        const donorName =
          getDonorName(
            donation.donor_id
          ).toLowerCase();

        const donorPhone =
          `${donor?.phone_1 || ''} ${donor?.phone_2 || ''}`
            .toLowerCase();

        const receipt =
          (
            donation.receipt_number || ''
          ).toLowerCase();

        const notes =
          (
            donation.notes || ''
          ).toLowerCase();

        const payment =
          (
            donation.payment_method || ''
          ).toLowerCase();

        const currency =
          (
            donation.currency || 'ILS'
          ).toLowerCase();

        const searchMatches =
          !query ||
          donorName.includes(query) ||
          donorPhone.includes(query) ||
          receipt.includes(query) ||
          notes.includes(query) ||
          payment.includes(query) ||
          currency.includes(query) ||
          String(
            donation.amount
          ).includes(query);

        if (!searchMatches) {
          return false;
        }

        if (
          donationCurrency !== 'all' &&
          (
            donation.currency || 'ILS'
          ) !== donationCurrency
        ) {
          return false;
        }

        if (
          donationPaymentMethod !== 'all' &&
          (
            donation.payment_method || ''
          ) !== donationPaymentMethod
        ) {
          return false;
        }

        if (
          donationDonorId !== 'all' &&
          donation.donor_id !== donationDonorId
        ) {
          return false;
        }

        if (
          minAmount !== null &&
          Number.isFinite(minAmount) &&
          Number(donation.amount) < minAmount
        ) {
          return false;
        }

        if (
          maxAmount !== null &&
          Number.isFinite(maxAmount) &&
          Number(donation.amount) > maxAmount
        ) {
          return false;
        }

        if (donationDateFrom) {
          if (!donation.donation_date) {
            return false;
          }

          const donationDate =
            donation.donation_date.slice(0, 10);

          if (
            donationDate <
            donationDateFrom
          ) {
            return false;
          }
        }

        if (donationDateTo) {
          if (!donation.donation_date) {
            return false;
          }

          const donationDate =
            donation.donation_date.slice(0, 10);

          if (
            donationDate >
            donationDateTo
          ) {
            return false;
          }
        }

        const hasReceipt =
          !!donation.receipt_number?.trim();

        const hasFile =
          donationHasDocuments(donation);

        const hasNotes =
          !!donation.notes?.trim();

        if (
          donationHasReceipt === 'yes' &&
          !hasReceipt
        ) {
          return false;
        }

        if (
          donationHasReceipt === 'no' &&
          hasReceipt
        ) {
          return false;
        }

        if (
          donationHasFile === 'yes' &&
          !hasFile
        ) {
          return false;
        }

        if (
          donationHasFile === 'no' &&
          hasFile
        ) {
          return false;
        }

        if (
          donationHasNotes === 'yes' &&
          !hasNotes
        ) {
          return false;
        }

        if (
          donationHasNotes === 'no' &&
          hasNotes
        ) {
          return false;
        }

        return true;
      }
    );

    result.sort((a, b) => {
      switch (donationSort) {
        /*
         * המיון החשוב:
         * לפי created_at ולא donation_date.
         */

        case 'created_asc':
          return (
            new Date(
              a.created_at || 0
            ).getTime() -
            new Date(
              b.created_at || 0
            ).getTime()
          );

        case 'created_desc':
          return (
            new Date(
              b.created_at || 0
            ).getTime() -
            new Date(
              a.created_at || 0
            ).getTime()
          );

        case 'date_asc':
          return (
            new Date(
              a.donation_date || 0
            ).getTime() -
            new Date(
              b.donation_date || 0
            ).getTime()
          );

        case 'date_desc':
          return (
            new Date(
              b.donation_date || 0
            ).getTime() -
            new Date(
              a.donation_date || 0
            ).getTime()
          );

        case 'amount_desc':
          return (
            Number(b.amount) -
            Number(a.amount)
          );

        case 'amount_asc':
          return (
            Number(a.amount) -
            Number(b.amount)
          );

        case 'donor_asc':
          return getDonorName(
            a.donor_id
          ).localeCompare(
            getDonorName(
              b.donor_id
            ),
            'he'
          );

        case 'donor_desc':
          return getDonorName(
            b.donor_id
          ).localeCompare(
            getDonorName(
              a.donor_id
            ),
            'he'
          );

        default:
          return (
            new Date(
              b.created_at || 0
            ).getTime() -
            new Date(
              a.created_at || 0
            ).getTime()
          );
      }
    });

    return result;
  }, [
    donations,
    donorMap,
    donationDocuments,
    donationSearch,
    donationCurrency,
    donationPaymentMethod,
    donationDonorId,
    donationMinAmount,
    donationMaxAmount,
    donationDateFrom,
    donationDateTo,
    donationHasReceipt,
    donationHasFile,
    donationHasNotes,
    donationSort,
    getDonorName,
  ]);

  /* ============================================================
     סיכומים
  ============================================================ */

  const filteredDonationTotals = useMemo(() => {
    const totals: Record<string, number> = {};

    filteredDonations.forEach(
      (donation) => {
        const currency =
          donation.currency || 'ILS';

        totals[currency] =
          (totals[currency] || 0) +
          Number(donation.amount || 0);
      }
    );

    return totals;
  }, [filteredDonations]);

  /* ============================================================
     ניקוי סינון
  ============================================================ */

  function clearDonationFilters() {
    setDonationSearch('');
    setDonationCurrency('all');
    setDonationPaymentMethod('all');
    setDonationDonorId('all');
    setDonationMinAmount('');
    setDonationMaxAmount('');
    setDonationDateFrom('');
    setDonationDateTo('');
    setDonationHasReceipt('all');
    setDonationHasFile('all');
    setDonationHasNotes('all');

    /*
     * לאחר ניקוי הסינון חוזרים לברירת המחדל:
     * תאריך יצירה - חדש לישן.
     */
    setDonationSort('created_desc');
  }

  /* ============================================================
     סינון פעיל
  ============================================================ */

  const hasActiveDonationFilters =
    donationSearch !== '' ||
    donationCurrency !== 'all' ||
    donationPaymentMethod !== 'all' ||
    donationDonorId !== 'all' ||
    donationMinAmount !== '' ||
    donationMaxAmount !== '' ||
    donationDateFrom !== '' ||
    donationDateTo !== '' ||
    donationHasReceipt !== 'all' ||
    donationHasFile !== 'all' ||
    donationHasNotes !== 'all';

  /* ============================================================
     ייצוא
  ============================================================ */

  function exportFilteredDonations() {
    if (
      filteredDonations.length === 0
    ) {
      alert(
        'אין תרומות לייצוא לפי הסינון הנוכחי.'
      );
      return;
    }

    const headers = [
      'שם תורם',
      'טלפון',
      'אימייל',
      'עיר',
      'מדינה',
      'סכום',
      'מטבע',
      'אמצעי תשלום',
      'תאריך תרומה',
      'תאריך יצירה',
      'מספר קבלה',
      'קובץ מצורף',
      'הערות',
      'מזהה תרומה',
    ];

    const rows =
      filteredDonations.map(
        (donation) => {
          const donor =
            donation.donor_id
              ? donorMap.get(
                  donation.donor_id
                )
              : null;

          return [
            getDonorName(
              donation.donor_id
            ),
            donor?.phone_1 || '',
            donor?.email || '',
            donor?.city || '',
            donor?.country || '',
            donation.amount,
            donation.currency || 'ILS',
            donation.payment_method || '',
            donation.donation_date || '',
            donation.created_at || '',
            donation.receipt_number || '',
            donationHasDocuments(
              donation
            )
              ? 'כן'
              : 'לא',
            donation.notes || '',
            donation.id,
          ];
        }
      );

    const csv = [
      headers
        .map(escapeCsv)
        .join(','),
      ...rows.map(
        (row) =>
          row
            .map(escapeCsv)
            .join(',')
      ),
    ].join('\r\n');

    const blob = new Blob(
      ['\uFEFF' + csv],
      {
        type:
          'text/csv;charset=utf-8;',
      }
    );

    const url =
      URL.createObjectURL(blob);

    const link =
      document.createElement('a');

    link.href = url;

    const today =
      new Date()
        .toISOString()
        .slice(0, 10);

    link.download =
      `תרומות_מסוננות_${today}.csv`;

    document.body.appendChild(link);

    link.click();

    document.body.removeChild(link);

    URL.revokeObjectURL(url);
  }

  /* ============================================================
     הרשאות
  ============================================================ */

  if (loadingPerms) {
    return (
      <div className="p-8 text-center">
        טוען הרשאות...
      </div>
    );
  }

  if (
    !hasPermission('donations_view')
  ) {
    return (
      <div className="p-8 text-center text-red-600 font-bold">
        אין גישה למסך תרומות.
      </div>
    );
  }

  /* ============================================================
     RENDER
  ============================================================ */

  return (
    <div className="p-4 md:p-5 space-y-5">

      {/* ======================================================
          כותרת
      ====================================================== */}

      <div
        className="
          flex
          flex-col
          lg:flex-row
          justify-between
          items-start
          lg:items-center
          gap-3
        "
      >
        <div>
          <h2 className="text-lg font-bold text-slate-800">
            תרומות
          </h2>

          <p className="text-xs text-slate-400 mt-1">
            חיפוש, סינון וניהול כל התרומות
          </p>
        </div>

        <div className="flex flex-wrap gap-2">

          <button
            onClick={exportFilteredDonations}
            className="
              bg-blue-600
              hover:bg-blue-700
              text-white
              font-medium
              px-4
              py-2.5
              rounded-xl
              text-xs
              flex
              items-center
              gap-2
              transition
              shadow-sm
            "
          >
            <Download className="w-4 h-4" />

            ייצוא לאקסל

            {filteredDonations.length > 0 &&
              ` (${filteredDonations.length})`}
          </button>

          <button
            onClick={() =>
              onAddDonation()
            }
            className="
              bg-emerald-600
              hover:bg-emerald-700
              text-white
              font-medium
              px-4
              py-2.5
              rounded-xl
              text-xs
              flex
              items-center
              gap-2
              transition
              shadow-sm
            "
          >
            <PlusCircle className="w-4 h-4" />
            הוספת תרומה חדשה
          </button>

          <button
            onClick={onRefresh}
            className="
              bg-white
              hover:bg-slate-50
              border
              border-slate-200
              text-slate-600
              px-3
              py-2.5
              rounded-xl
              text-xs
              flex
              items-center
              gap-2
            "
            title="רענון תרומות"
          >
            <RefreshCw
              className={`w-4 h-4 ${
                loading
                  ? 'animate-spin'
                  : ''
              }`}
            />
          </button>
        </div>
      </div>

      {/* ======================================================
          סינון
      ====================================================== */}

      <div
        className="
          bg-slate-50
          rounded-2xl
          border
          border-slate-200
          p-4
          space-y-3
        "
      >
        <div
          className="
            flex
            flex-col
            lg:flex-row
            gap-3
          "
        >
          <div className="relative flex-1">

            <Search
              className="
                absolute
                right-3
                top-1/2
                -translate-y-1/2
                w-4
                h-4
                text-slate-400
              "
            />

            <input
              type="text"
              value={donationSearch}
              onChange={(e) =>
                setDonationSearch(
                  e.target.value
                )
              }
              placeholder="חפש לפי שם תורם, טלפון, סכום, קבלה, אמצעי תשלום, הערות..."
              className="
                w-full
                pr-9
                pl-4
                py-2.5
                bg-white
                border
                border-slate-200
                rounded-xl
                text-sm
                focus:outline-none
                focus:ring-2
                focus:ring-blue-500/20
                focus:border-blue-500
              "
            />
          </div>

          <button
            onClick={() =>
              setShowAdvancedDonationFilters(
                !showAdvancedDonationFilters
              )
            }
            className="
              bg-white
              border
              border-slate-200
              text-slate-700
              rounded-xl
              px-4
              py-2.5
              text-xs
              font-medium
              flex
              items-center
              justify-center
              gap-2
            "
          >
            <Filter className="w-4 h-4" />

            סינון מתקדם

            {showAdvancedDonationFilters ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </button>

          {hasActiveDonationFilters && (
            <button
              onClick={clearDonationFilters}
              className="
                bg-white
                border
                border-red-200
                text-red-600
                rounded-xl
                px-4
                py-2.5
                text-xs
                font-medium
                flex
                items-center
                justify-center
                gap-2
              "
            >
              <X className="w-4 h-4" />
              נקה סינון
            </button>
          )}
        </div>

        {/* פילטרים מהירים */}

        <div
          className="
            grid
            grid-cols-2
            md:grid-cols-4
            lg:grid-cols-6
            gap-2
          "
        >
          <select
            value={donationCurrency}
            onChange={(e) =>
              setDonationCurrency(
                e.target.value
              )
            }
            className="
              bg-white
              border
              border-slate-200
              rounded-xl
              px-3
              py-2
              text-xs
              text-slate-700
            "
          >
            <option value="all">
              כל המטבעות
            </option>

            {donationCurrencies.map(
              (currency) => (
                <option
                  key={currency}
                  value={currency}
                >
                  {currency}
                </option>
              )
            )}
          </select>

          <select
            value={donationPaymentMethod}
            onChange={(e) =>
              setDonationPaymentMethod(
                e.target.value
              )
            }
            className="
              bg-white
              border
              border-slate-200
              rounded-xl
              px-3
              py-2
              text-xs
              text-slate-700
            "
          >
            <option value="all">
              כל אמצעי התשלום
            </option>

            {donationPaymentMethods.map(
              (method) => (
                <option
                  key={method}
                  value={method}
                >
                  {method}
                </option>
              )
            )}
          </select>

          <select
            value={donationDonorId}
            onChange={(e) =>
              setDonationDonorId(
                e.target.value
              )
            }
            className="
              bg-white
              border
              border-slate-200
              rounded-xl
              px-3
              py-2
              text-xs
              text-slate-700
            "
          >
            <option value="all">
              כל התורמים
            </option>

            {donors
              .slice()
              .sort((a, b) =>
                getDonorName(
                  a.id
                ).localeCompare(
                  getDonorName(
                    b.id
                  ),
                  'he'
                )
              )
              .map((donor) => (
                <option
                  key={donor.id}
                  value={donor.id}
                >
                  {getDonorName(
                    donor.id
                  )}
                </option>
              ))}
          </select>

          <select
            value={donationSort}
            onChange={(e) =>
              setDonationSort(
                e.target.value as DonationSort
              )
            }
            className="
              bg-white
              border
              border-slate-200
              rounded-xl
              px-3
              py-2
              text-xs
              text-slate-700
            "
          >
            <option value="created_desc">
              נוצרה: חדש → ישן
            </option>

            <option value="created_asc">
              נוצרה: ישן → חדש
            </option>

            <option value="date_desc">
              תאריך תרומה: חדש → ישן
            </option>

            <option value="date_asc">
              תאריך תרומה: ישן → חדש
            </option>

            <option value="amount_desc">
              סכום: גבוה → נמוך
            </option>

            <option value="amount_asc">
              סכום: נמוך → גבוה
            </option>

            <option value="donor_asc">
              תורם: א → ת
            </option>

            <option value="donor_desc">
              תורם: ת → א
            </option>
          </select>

          <select
            value={donationHasReceipt}
            onChange={(e) =>
              setDonationHasReceipt(
                e.target.value as
                  | 'all'
                  | 'yes'
                  | 'no'
              )
            }
            className="
              bg-white
              border
              border-slate-200
              rounded-xl
              px-3
              py-2
              text-xs
              text-slate-700
            "
          >
            <option value="all">
              כל הקבלות
            </option>

            <option value="yes">
              יש מספר קבלה
            </option>

            <option value="no">
              אין מספר קבלה
            </option>
          </select>

          <select
            value={donationHasFile}
            onChange={(e) =>
              setDonationHasFile(
                e.target.value as
                  | 'all'
                  | 'yes'
                  | 'no'
              )
            }
            className="
              bg-white
              border
              border-slate-200
              rounded-xl
              px-3
              py-2
              text-xs
              text-slate-700
            "
          >
            <option value="all">
              כל הקבצים
            </option>

            <option value="yes">
              יש קובץ
            </option>

            <option value="no">
              אין קובץ
            </option>
          </select>
        </div>

        {/* סינון מתקדם */}

        {showAdvancedDonationFilters && (
          <div
            className="
              border-t
              border-slate-200
              pt-3
              grid
              grid-cols-1
              md:grid-cols-2
              lg:grid-cols-4
              gap-3
            "
          >
            <div>
              <label className="block text-[11px] text-slate-500 mb-1">
                סכום מינימום
              </label>

              <input
                type="number"
                min="0"
                step="0.01"
                value={donationMinAmount}
                onChange={(e) =>
                  setDonationMinAmount(
                    e.target.value
                  )
                }
                placeholder="ללא הגבלה"
                className="
                  w-full
                  bg-white
                  border
                  border-slate-200
                  rounded-xl
                  px-3
                  py-2
                  text-xs
                "
              />
            </div>

            <div>
              <label className="block text-[11px] text-slate-500 mb-1">
                סכום מקסימום
              </label>

              <input
                type="number"
                min="0"
                step="0.01"
                value={donationMaxAmount}
                onChange={(e) =>
                  setDonationMaxAmount(
                    e.target.value
                  )
                }
                placeholder="ללא הגבלה"
                className="
                  w-full
                  bg-white
                  border
                  border-slate-200
                  rounded-xl
                  px-3
                  py-2
                  text-xs
                "
              />
            </div>

            <div>
              <label className="block text-[11px] text-slate-500 mb-1">
                מתאריך
              </label>

              <input
                type="date"
                value={donationDateFrom}
                onChange={(e) =>
                  setDonationDateFrom(
                    e.target.value
                  )
                }
                className="
                  w-full
                  bg-white
                  border
                  border-slate-200
                  rounded-xl
                  px-3
                  py-2
                  text-xs
                "
              />
            </div>

            <div>
              <label className="block text-[11px] text-slate-500 mb-1">
                עד תאריך
              </label>

              <input
                type="date"
                value={donationDateTo}
                onChange={(e) =>
                  setDonationDateTo(
                    e.target.value
                  )
                }
                className="
                  w-full
                  bg-white
                  border
                  border-slate-200
                  rounded-xl
                  px-3
                  py-2
                  text-xs
                "
              />
            </div>

            <div>
              <label className="block text-[11px] text-slate-500 mb-1">
                הערות
              </label>

              <select
                value={donationHasNotes}
                onChange={(e) =>
                  setDonationHasNotes(
                    e.target.value as
                      | 'all'
                      | 'yes'
                      | 'no'
                  )
                }
                className="
                  w-full
                  bg-white
                  border
                  border-slate-200
                  rounded-xl
                  px-3
                  py-2
                  text-xs
                "
              >
                <option value="all">
                  עם ובלי הערות
                </option>

                <option value="yes">
                  יש הערות
                </option>

                <option value="no">
                  אין הערות
                </option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] text-slate-500 mb-1">
                קובץ מצורף
              </label>

              <select
                value={donationHasFile}
                onChange={(e) =>
                  setDonationHasFile(
                    e.target.value as
                      | 'all'
                      | 'yes'
                      | 'no'
                  )
                }
                className="
                  w-full
                  bg-white
                  border
                  border-slate-200
                  rounded-xl
                  px-3
                  py-2
                  text-xs
                "
              >
                <option value="all">
                  עם ובלי קובץ
                </option>

                <option value="yes">
                  יש קובץ
                </option>

                <option value="no">
                  אין קובץ
                </option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] text-slate-500 mb-1">
                מספר קבלה
              </label>

              <select
                value={donationHasReceipt}
                onChange={(e) =>
                  setDonationHasReceipt(
                    e.target.value as
                      | 'all'
                      | 'yes'
                      | 'no'
                  )
                }
                className="
                  w-full
                  bg-white
                  border
                  border-slate-200
                  rounded-xl
                  px-3
                  py-2
                  text-xs
                "
              >
                <option value="all">
                  עם ובלי קבלה
                </option>

                <option value="yes">
                  יש מספר קבלה
                </option>

                <option value="no">
                  אין מספר קבלה
                </option>
              </select>
            </div>
          </div>
        )}
      </div>

      {/* ======================================================
          סיכום
      ====================================================== */}

      <div
        className="
          grid
          grid-cols-1
          md:grid-cols-3
          gap-3
        "
      >
        <div
          className="
            bg-white
            border
            border-slate-200
            rounded-2xl
            p-4
          "
        >
          <div className="text-xs text-slate-400">
            מספר תרומות
          </div>

          <div className="text-2xl font-bold text-slate-800 mt-1">
            {filteredDonations.length}
          </div>

          <div className="text-[10px] text-slate-400 mt-1">
            מתוך {donations.length} תרומות
          </div>
        </div>

        {Object.entries(
          filteredDonationTotals
        )
          .slice(0, 2)
          .map(
            ([currency, total]) => (
              <div
                key={currency}
                className="
                  bg-white
                  border
                  border-slate-200
                  rounded-2xl
                  p-4
                "
              >
                <div className="text-xs text-slate-400">
                  סה"כ {currency}
                </div>

                <div className="text-2xl font-bold text-emerald-600 mt-1">
                  {total.toLocaleString(
                    'he-IL',
                    {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    }
                  )}
                </div>

                <div className="text-[10px] text-slate-400 mt-1">
                  לפי הסינון הנוכחי
                </div>
              </div>
            )
          )}
      </div>

      {/* ======================================================
          טבלת תרומות
      ====================================================== */}

      {loading ? (
        <div
          className="
            bg-white
            rounded-2xl
            border
            border-slate-200
            p-16
            text-center
            text-slate-400
          "
        >
          <RefreshCw
            className="
              w-6
              h-6
              animate-spin
              mx-auto
              mb-3
            "
          />

          טוען תרומות...
        </div>
      ) : filteredDonations.length === 0 ? (
        <div
          className="
            bg-white
            rounded-2xl
            border
            border-slate-200
            p-16
            text-center
          "
        >
          <FileSpreadsheet
            className="
              w-10
              h-10
              mx-auto
              text-slate-300
              mb-3
            "
          />

          <div className="font-bold text-slate-600">
            לא נמצאו תרומות
          </div>

          <div className="text-xs text-slate-400 mt-1">
            נסה לשנות את תנאי החיפוש או הסינון
          </div>
        </div>
      ) : (
        <div
          className="
            bg-white
            rounded-2xl
            border
            border-slate-200
            shadow-sm
            overflow-hidden
          "
        >
          <div className="overflow-x-auto">

            <table className="w-full text-right text-xs">

              <thead
                className="
                  bg-slate-50
                  border-b
                  border-slate-200
                  text-slate-500
                "
              >
                <tr>
                  <th className="p-3.5 font-medium">
                    תורם
                  </th>

                  <th className="p-3.5 font-medium">
                    סכום
                  </th>

                  <th className="p-3.5 font-medium">
                    אמצעי תשלום
                  </th>

                  <th className="p-3.5 font-medium">
                    תאריך תרומה
                  </th>

                  <th className="p-3.5 font-medium">
                    נוצרה
                  </th>

                  <th className="p-3.5 font-medium">
                    קבלה
                  </th>

                  <th className="p-3.5 font-medium">
                    קובץ
                  </th>

                  <th className="p-3.5 font-medium">
                    הערות
                  </th>

                  <th className="p-3.5 font-medium">
                    פעולות
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">

                {filteredDonations.map(
                  (donation) => {
                    const donor =
                      donation.donor_id
                        ? donorMap.get(
                            donation.donor_id
                          )
                        : null;

                    const documents =
                      donationDocuments[
                        donation.id
                      ] || [];

                    const validDocuments =
                      documents.filter(
                        (document) =>
                          !!document.file_url?.trim()
                      );

                    const hasDonationFile =
                      !!donation.file_url?.trim() ||
                      validDocuments.length > 0;

                    const firstDocument =
                      validDocuments[0];

                    return (
                      <tr
                        key={donation.id}
                        onClick={() =>
                          onViewDonation(
                            donation
                          )
                        }
                        className="
                          hover:bg-slate-50
                          transition
                          cursor-pointer
                        "
                      >

                        <td className="p-3.5">
                          <div className="font-bold text-slate-800">
                            {getDonorName(
                              donation.donor_id
                            )}
                          </div>

                          {donor?.phone_1 && (
                            <div
                              dir="ltr"
                              className="
                                text-[10px]
                                text-slate-400
                                mt-1
                              "
                            >
                              {donor.phone_1}
                            </div>
                          )}
                        </td>

                        <td className="p-3.5">
                          <div
                            className="
                              font-bold
                              text-emerald-700
                            "
                          >
                            {formatAmount(
                              donation.amount,
                              donation.currency
                            )}
                          </div>
                        </td>

                        <td className="p-3.5">
                          {donation.payment_method ? (
                            <span
                              className="
                                inline-flex
                                items-center
                                gap-1.5
                                bg-slate-100
                                text-slate-700
                                rounded-lg
                                px-2
                                py-1
                              "
                            >
                              <CreditCard className="w-3 h-3" />

                              {donation.payment_method}
                            </span>
                          ) : (
                            <span className="text-slate-400">
                              -
                            </span>
                          )}
                        </td>

                        <td className="p-3.5">
                          <div
                            className="
                              flex
                              items-center
                              gap-1.5
                              text-slate-600
                            "
                          >
                            <Calendar className="w-3.5 h-3.5 text-slate-400" />

                            {formatDate(
                              donation.donation_date
                            )}
                          </div>
                        </td>

                        <td className="p-3.5">
                          <div
                            className="
                              flex
                              items-center
                              gap-1.5
                              text-slate-600
                            "
                            title={
                              donation.created_at || ''
                            }
                          >
                            <Calendar className="w-3.5 h-3.5 text-slate-400" />

                            {formatDate(
                              donation.created_at
                            )}
                          </div>
                        </td>

                        <td className="p-3.5">
                          {donation.receipt_number ? (
                            <span
                              className="
                                inline-flex
                                items-center
                                gap-1
                                bg-blue-50
                                text-blue-700
                                border
                                border-blue-200
                                rounded-lg
                                px-2
                                py-1
                              "
                            >
                              <Receipt className="w-3 h-3" />

                              {donation.receipt_number}
                            </span>
                          ) : (
                            <span className="text-slate-400">
                              אין
                            </span>
                          )}
                        </td>

                        <td className="p-3.5">
                          {hasDonationFile ? (
                            firstDocument?.file_url ? (
                              <a
                                href={
                                  firstDocument.file_url
                                }
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={(e) =>
                                  e.stopPropagation()
                                }
                                className="
                                  inline-flex
                                  items-center
                                  gap-1
                                  bg-purple-50
                                  text-purple-700
                                  border
                                  border-purple-200
                                  rounded-lg
                                  px-2
                                  py-1
                                  hover:bg-purple-100
                                "
                                title={
                                  firstDocument.file_name ||
                                  'מסמך מצורף'
                                }
                              >
                                <Paperclip className="w-3 h-3" />

                                צפייה
                              </a>
                            ) : donation.file_url ? (
                              <a
                                href={
                                  donation.file_url
                                }
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={(e) =>
                                  e.stopPropagation()
                                }
                                className="
                                  inline-flex
                                  items-center
                                  gap-1
                                  bg-purple-50
                                  text-purple-700
                                  border
                                  border-purple-200
                                  rounded-lg
                                  px-2
                                  py-1
                                  hover:bg-purple-100
                                "
                              >
                                <ExternalLink className="w-3 h-3" />

                                צפייה
                              </a>
                            ) : (
                              <span
                                className="
                                  inline-flex
                                  items-center
                                  gap-1
                                  bg-purple-50
                                  text-purple-700
                                  border
                                  border-purple-200
                                  rounded-lg
                                  px-2
                                  py-1
                                "
                              >
                                <Paperclip className="w-3 h-3" />

                                יש קובץ
                              </span>
                            )
                          ) : loadingDonationDocuments ? (
                            <span className="text-slate-400">
                              בודק...
                            </span>
                          ) : (
                            <span className="text-slate-400">
                              אין
                            </span>
                          )}
                        </td>

                        <td className="p-3.5 max-w-[220px]">
                          {donation.notes ? (
                            <div
                              className="
                                flex
                                items-start
                                gap-1.5
                                text-slate-600
                              "
                              title={
                                donation.notes
                              }
                            >
                              <StickyNote
                                className="
                                  w-3.5
                                  h-3.5
                                  text-slate-400
                                  shrink-0
                                  mt-0.5
                                "
                              />

                              <span className="truncate">
                                {donation.notes}
                              </span>
                            </div>
                          ) : (
                            <span className="text-slate-400">
                              -
                            </span>
                          )}
                        </td>

                        <td className="p-3.5">
                          {donor ? (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();

                                onViewDonor(
                                  donor
                                );
                              }}
                              className="
                                px-2.5
                                py-1
                                bg-blue-50
                                text-blue-700
                                border
                                border-blue-200
                                hover:bg-blue-100
                                rounded-lg
                                text-[11px]
                              "
                            >
                              תורם
                            </button>
                          ) : (
                            <span className="text-slate-400">
                              -
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  }
                )}

              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}