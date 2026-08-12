'use client';

import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Donor, Donation } from '@/types/donor';

import DashboardStats from '@/components/DashboardStats';
import DonorFormModal from '@/components/DonorFormModal';
import DonationFormModal from '@/components/DonationFormModal';
import DonationCardModal from '@/components/DonationCardModal';
import DonorsTab from '@/components/DonorsTab';
import DonationsTab from '@/components/DonationsTab';
import DonorCard from '@/components/DonorCard';

import {
  HeartHandshake,
  UserPlus,
  FileSpreadsheet,
  X,
} from 'lucide-react';

/* ============================================================
   דף הבית - מערכת ניהול תורמים ותרומות
============================================================ */

export default function HomePage() {
  /* ============================================================
     נתונים
  ============================================================ */

  const [donors, setDonors] = useState<Donor[]>([]);
  const [donations, setDonations] = useState<Donation[]>([]);

  const [loading, setLoading] = useState(true);
  const [donationsLoading, setDonationsLoading] = useState(false);

  const [totalsByCurrency, setTotalsByCurrency] =
    useState<Record<string, number>>({});

  /* ============================================================
     לשונית פעילה
  ============================================================ */

  const [activeTab, setActiveTab] =
    useState<'donors' | 'donations'>('donors');

  /* ============================================================
     תורם - צפייה
  ============================================================ */

  const [selectedDonorForView, setSelectedDonorForView] =
    useState<Donor | null>(null);

  /* ============================================================
     תורם - הוספה / עריכה
  ============================================================ */

  const [isDonorModalOpen, setIsDonorModalOpen] =
    useState(false);

  const [selectedDonorToEdit, setSelectedDonorToEdit] =
    useState<Donor | null>(null);

  /* ============================================================
     תרומה - הוספה / עריכה
  ============================================================ */

  const [isDonationModalOpen, setIsDonationModalOpen] =
    useState(false);

  const [selectedDonorForDonation, setSelectedDonorForDonation] =
    useState<string | null>(null);

  /*
    חשוב:
    אם יש ערך כאן - DonationFormModal נמצא במצב עריכה.
    אם null - מדובר בתרומה חדשה.
  */
  const [selectedDonationToEdit, setSelectedDonationToEdit] =
    useState<Donation | null>(null);

  /* ============================================================
     כרטיס תרומה
  ============================================================ */

  const [selectedDonation, setSelectedDonation] =
    useState<Donation | null>(null);

  /* ============================================================
     טעינת נתונים ראשונית
  ============================================================ */

  useEffect(() => {
    fetchData();
  }, []);

  /* ============================================================
     טעינת תורמים + תרומות
  ============================================================ */

  async function fetchData() {
    setLoading(true);

    const [
      { data: donorsData, error: donorsError },
      { data: donationsData, error: donationsError },
    ] = await Promise.all([
      supabase
        .from('donors')
        .select('*')
        .order('created_at', { ascending: false }),

      supabase
        .from('donations')
        .select('*')
        .order('donation_date', { ascending: false }),
    ]);

    /* -------------------------
       תורמים
    ------------------------- */

    if (donorsError) {
      console.error(
        'שגיאה בטעינת תורמים:',
        donorsError
      );
    } else if (donorsData) {
      setDonors(donorsData as Donor[]);
    }

    /* -------------------------
       תרומות
    ------------------------- */

    if (donationsError) {
      console.error(
        'שגיאה בטעינת תרומות:',
        donationsError
      );
    } else if (donationsData) {
      setDonations(donationsData as Donation[]);

      calculateTotals(donationsData as Donation[]);
    }

    setLoading(false);
  }

  /* ============================================================
     חישוב סכומי תרומות לפי מטבע
  ============================================================ */

  function calculateTotals(data: Donation[]) {
    const totals: Record<string, number> = {};

    data.forEach((item) => {
      const currency = item.currency || 'ILS';

      totals[currency] =
        (totals[currency] || 0) +
        Number(item.amount || 0);
    });

    setTotalsByCurrency(totals);
  }

  /* ============================================================
     טעינת תרומות מחדש
  ============================================================ */

  async function fetchDonations() {
    setDonationsLoading(true);

    const { data, error } = await supabase
      .from('donations')
      .select('*')
      .order('donation_date', { ascending: false });

    if (error) {
      console.error(
        'שגיאה בטעינת תרומות:',
        error
      );
    } else if (data) {
      const donationData = data as Donation[];

      setDonations(donationData);

      calculateTotals(donationData);
    }

    setDonationsLoading(false);
  }

  /* ============================================================
     מפת תורמים
  ============================================================ */

  const donorMap = useMemo(() => {
    const map = new Map<string, Donor>();

    donors.forEach((donor) => {
      map.set(donor.id, donor);
    });

    return map;
  }, [donors]);

  /* ============================================================
     שם תורם
  ============================================================ */

  function getDonorName(donorId: string | null) {
    if (!donorId) {
      return 'ללא תורם';
    }

    const donor = donorMap.get(donorId);

    if (!donor) {
      return 'תורם לא נמצא';
    }

    const name =
      `${donor.first_name_he || ''} ${donor.last_name_he || ''}`.trim();

    return name || 'ללא שם';
  }

  /* ============================================================
     פתיחת כרטיס תורם
  ============================================================ */

  function handleOpenViewDonor(donor: Donor) {
    setSelectedDonation(null);
    setSelectedDonationToEdit(null);

    setIsDonorModalOpen(false);
    setIsDonationModalOpen(false);

    setSelectedDonorToEdit(null);
    setSelectedDonorForDonation(null);

    setSelectedDonorForView(donor);
  }

  /* ============================================================
     תורם חדש
  ============================================================ */

  function handleOpenCreateDonor() {
    setSelectedDonation(null);
    setSelectedDonationToEdit(null);

    setIsDonationModalOpen(false);
    setSelectedDonorForView(null);
    setSelectedDonorForDonation(null);

    setSelectedDonorToEdit(null);

    setIsDonorModalOpen(true);
  }

  /* ============================================================
     עריכת תורם
  ============================================================ */

  function handleOpenEditDonor(donor: Donor) {
    setSelectedDonation(null);
    setSelectedDonationToEdit(null);

    setIsDonationModalOpen(false);
    setSelectedDonorForView(null);
    setSelectedDonorForDonation(null);

    setSelectedDonorToEdit(donor);

    setIsDonorModalOpen(true);
  }

  /* ============================================================
     תרומה חדשה
  ============================================================ */

  function handleOpenAddDonation(
    donorId?: string,
    e?: React.MouseEvent
  ) {
    if (e) {
      e.stopPropagation();
    }

    /*
      חשוב מאוד:
      איפוס selectedDonationToEdit גורם לטופס
      להיפתח במצב "תרומה חדשה".
    */
    setSelectedDonationToEdit(null);

    setSelectedDonation(null);

    setIsDonorModalOpen(false);
    setSelectedDonorForView(null);
    setSelectedDonorToEdit(null);

    setSelectedDonorForDonation(donorId || null);

    setIsDonationModalOpen(true);
  }

  /* ============================================================
     עריכת תרומה קיימת
  ============================================================ */

  function handleOpenEditDonation(
    donation: Donation,
    e?: React.MouseEvent
  ) {
    if (e) {
      e.stopPropagation();
    }

    /*
      כאן נמצאת התיקון המרכזי:
      אנחנו מעבירים את התרומה הקיימת
      ל־DonationFormModal דרך selectedDonationToEdit.
    */

    setSelectedDonation(null);

    setIsDonorModalOpen(false);
    setSelectedDonorForView(null);
    setSelectedDonorToEdit(null);

    setSelectedDonorForDonation(
      donation.donor_id || null
    );

    setSelectedDonationToEdit(donation);

    setIsDonationModalOpen(true);
  }

  /* ============================================================
     פתיחת כרטיס תרומה
  ============================================================ */

  function handleOpenDonationCard(
    donation: Donation,
    e?: React.MouseEvent
  ) {
    if (e) {
      e.stopPropagation();
    }

    setIsDonationModalOpen(false);
    setIsDonorModalOpen(false);

    setSelectedDonorForView(null);
    setSelectedDonorToEdit(null);
    setSelectedDonorForDonation(null);

    setSelectedDonationToEdit(null);

    setSelectedDonation(donation);
  }

  /* ============================================================
     סגירת מודאל תרומה
  ============================================================ */

  function handleCloseDonationModal() {
    setIsDonationModalOpen(false);
    setSelectedDonationToEdit(null);
    setSelectedDonorForDonation(null);
  }

  /* ============================================================
     סטטיסטיקות
  ============================================================ */

  const activeRecurring =
    donors.filter(
      (donor) => donor.is_recurring
    ).length;

  const yissacharZevulunCount =
    donors.filter(
      (donor) => donor.has_yissachar_zevulun
    ).length;

  /* ============================================================
     RENDER
  ============================================================ */

  return (
    <div
      dir="rtl"
      className="
        min-h-screen
        bg-slate-50
        p-4
        md:p-8
        font-sans
      "
    >
      <div className="max-w-7xl mx-auto space-y-6">

        {/* =====================================================
            כותרת
        ===================================================== */}

        <div
          className="
            flex
            flex-col
            md:flex-row
            justify-between
            items-start
            md:items-center
            gap-4
          "
        >
          <div>
            <h1
              className="
                text-2xl
                md:text-3xl
                font-bold
                text-slate-800
                flex
                items-center
                gap-2
              "
            >
              <HeartHandshake
                className="w-8 h-8 text-blue-600"
              />

              מערכת ניהול תורמים
            </h1>

            <p className="text-sm text-slate-500 mt-1">
              ניהול מעקב תרומות, הו"ק עבור ישיבת עטרת צבי אשדוד
            </p>
          </div>
        </div>

        {/* =====================================================
            סטטיסטיקות
        ===================================================== */}

        <DashboardStats
          totalDonors={donors.length}
          totalsByCurrency={totalsByCurrency}
          activeRecurring={activeRecurring}
          yissacharZevulunCount={yissacharZevulunCount}
        />

        {/* =====================================================
            לשוניות
        ===================================================== */}

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
          <div
            className="
              border-b
              border-slate-200
              bg-slate-50
              p-2
            "
          >
            <div className="flex gap-2">

              {/* תורמים */}

              <button
                onClick={() =>
                  setActiveTab('donors')
                }
                className={`
                  flex-1
                  md:flex-none
                  px-6
                  py-3
                  rounded-xl
                  text-sm
                  font-bold
                  transition
                  flex
                  items-center
                  justify-center
                  gap-2
                  ${
                    activeTab === 'donors'
                      ? 'bg-white text-blue-600 shadow-sm border border-slate-200'
                      : 'text-slate-500 hover:bg-white/70 hover:text-slate-700'
                  }
                `}
              >
                <UserPlus className="w-4 h-4" />

                תורמים
              </button>

              {/* תרומות */}

              <button
                onClick={() => {
                  setActiveTab('donations');
                  fetchDonations();
                }}
                className={`
                  flex-1
                  md:flex-none
                  px-6
                  py-3
                  rounded-xl
                  text-sm
                  font-bold
                  transition
                  flex
                  items-center
                  justify-center
                  gap-2
                  ${
                    activeTab === 'donations'
                      ? 'bg-white text-emerald-600 shadow-sm border border-slate-200'
                      : 'text-slate-500 hover:bg-white/70 hover:text-slate-700'
                  }
                `}
              >
                <FileSpreadsheet className="w-4 h-4" />

                תרומות
              </button>

            </div>
          </div>

          {/* ===================================================
              תורמים
          =================================================== */}

          {activeTab === 'donors' && (
            <DonorsTab
              donors={donors}
              loading={loading}
              activeRecurring={activeRecurring}
              yissacharZevulunCount={
                yissacharZevulunCount
              }
              onCreateDonor={
                handleOpenCreateDonor
              }
              onViewDonor={
                handleOpenViewDonor
              }
              onAddDonation={
                handleOpenAddDonation
              }
            />
          )}

          {/* ===================================================
              תרומות
          =================================================== */}

          {activeTab === 'donations' && (
            <DonationsTab
              donations={donations}
              donors={donors}
              donorMap={donorMap}
              loading={donationsLoading}
              getDonorName={getDonorName}
              onRefresh={fetchDonations}
              onAddDonation={
                handleOpenAddDonation
              }
              onViewDonation={
                handleOpenDonationCard
              }
              onViewDonor={
                handleOpenViewDonor
              }
            />
          )}
        </div>

        {/* =====================================================
            כרטיס תרומה
        ===================================================== */}

        {selectedDonation && (
          <DonationCardModal
            isOpen={true}
            donation={selectedDonation}
            donor={
              selectedDonation.donor_id
                ? donorMap.get(
                    selectedDonation.donor_id
                  ) || null
                : null
            }

            onClose={() => {
              setSelectedDonation(null);
            }}

            onDeleted={() => {
              setSelectedDonation(null);
              setSelectedDonationToEdit(null);

              fetchData();
              fetchDonations();
            }}

            /*
              ==================================================
              התיקון החשוב:
              במקום לפתוח תרומה חדשה,
              אנחנו פותחים את התרומה הקיימת לעריכה.
              ==================================================
            */

            onEdit={() => {
              const donationToEdit =
                selectedDonation;

              setSelectedDonation(null);

              handleOpenEditDonation(
                donationToEdit
              );
            }}
          />
        )}

        {/* =====================================================
            כרטיס תורם
        ===================================================== */}

        {selectedDonorForView && (
          <div
            className="
              fixed
              inset-0
              z-50
              bg-slate-900/40
              backdrop-blur-sm
              flex
              items-center
              justify-center
              p-4
              overflow-y-auto
            "
          >
            <div
              className="
                bg-white
                rounded-2xl
                shadow-xl
                border
                border-slate-200
                w-full
                max-w-5xl
                max-h-[95vh]
                overflow-y-auto
                relative
              "
            >

              {/* כפתור סגירה */}

              <button
                onClick={() =>
                  setSelectedDonorForView(null)
                }
                className="
                  absolute
                  top-4
                  left-4
                  z-10
                  p-1.5
                  text-slate-400
                  hover:text-slate-600
                  hover:bg-slate-100
                  rounded-lg
                  bg-white
                  shadow-sm
                "
              >
                <X className="w-5 h-5" />
              </button>

              <div className="p-5">

                <div
                  className="
                    mb-4
                    font-bold
                    text-slate-800
                    text-sm
                  "
                >
                  כרטיס תורם מלא
                </div>

                <div
                  className="
                    rounded-xl
                    overflow-hidden
                  "
                >
                  <DonorCard
                    donor={selectedDonorForView}
                    onAddDonation={(e) =>
                      handleOpenAddDonation(
                        selectedDonorForView.id,
                        e
                      )
                    }
                  />
                </div>

                <div
                  className="
                    mt-5
                    pt-4
                    border-t
                    border-slate-100
                    flex
                    justify-between
                    items-center
                  "
                >

                  {/* עריכת תורם */}

                  <button
                    onClick={() =>
                      handleOpenEditDonor(
                        selectedDonorForView
                      )
                    }
                    className="
                      bg-blue-600
                      hover:bg-blue-700
                      text-white
                      font-medium
                      px-4
                      py-2
                      rounded-xl
                      text-xs
                    "
                  >
                    ערוך פרטי תורם
                  </button>

                  {/* סגירה */}

                  <button
                    onClick={() =>
                      setSelectedDonorForView(null)
                    }
                    className="
                      bg-slate-100
                      hover:bg-slate-200
                      text-slate-700
                      font-medium
                      px-4
                      py-2
                      rounded-xl
                      text-xs
                    "
                  >
                    סגור
                  </button>

                </div>
              </div>
            </div>
          </div>
        )}

        {/* =====================================================
            מודאל תורם
        ===================================================== */}

        {isDonorModalOpen && (
          <DonorFormModal
            isOpen={isDonorModalOpen}

            onClose={() =>
              setIsDonorModalOpen(false)
            }

            onSuccess={() => {
              fetchData();
            }}

            donorToEdit={
              selectedDonorToEdit
            }
          />
        )}

        {/* =====================================================
            מודאל תרומה - חדשה / עריכה
        ===================================================== */}

        {isDonationModalOpen && (
          <DonationFormModal
            isOpen={isDonationModalOpen}

            onClose={
              handleCloseDonationModal
            }

            onSuccess={() => {
              fetchData();
              fetchDonations();
            }}

            /*
              אם selectedDonationToEdit הוא null
              -> תרומה חדשה.

              אם יש כאן תרומה
              -> עריכת תרומה קיימת.
            */

            editingDonation={
              selectedDonationToEdit
            }

            preselectedDonorId={
              selectedDonorForDonation
            }
          />
        )}

      </div>
    </div>
  );
}