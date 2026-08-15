'use client';

import { useEffect, useMemo, useState, useCallback, Suspense, useRef } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Donor, Donation } from '@/types/donor';

// --- הייבוא של ה-Context שלך ---
import { useAuth } from '@/components/AuthContext';

// 1. הייבוא של השומר שיצרנו!
import { usePermissions } from '@/hooks/usePermissions';

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
  LogOut,
  Loader2,
  Settings,
  UserCircle,
  Radio,
  ShieldAlert
} from 'lucide-react';

/* ============================================================
   תוכן הדף - הופרד כדי שנוכל לעטוף אותו ב-Suspense
============================================================ */
function DashboardContent() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  /* ============================================================
     אימות משתמש (Auth) - מחובר למערכת החדשה שלנו!
  ============================================================ */
  const { user, profile, loading: authLoading } = useAuth();
  
  // הפעלת השומר החדש שלנו!
  const { hasPermission, loadingPerms } = usePermissions();
  
  const isAdmin = hasPermission('manage_users');
  const currentUserNickname = profile?.full_name || user?.email?.split('@')[0] || 'משתמש לא ידוע';
  const currentUserRole = profile?.role?.name || 'ללא הרשאה';

  const [onlineUsers, setOnlineUsers] = useState<any[]>([]);
  
  /* ============================================================
     נתונים
  ============================================================ */
  const [donors, setDonors] = useState<Donor[]>([]);
  const [donations, setDonations] = useState<Donation[]>([]);

  const [loading, setLoading] = useState(true);
  const [donationsLoading, setDonationsLoading] = useState(false);

  const [totalsByCurrency, setTotalsByCurrency] = useState<Record<string, number>>({});

  // פותר הלופ: שומר שמוודא שמשכנו נתונים פעם אחת בלבד
  const hasFetchedData = useRef(false);

  /* ============================================================
     לשונית פעילה + סנכרון נתיבים (Routing)
  ============================================================ */
  const currentTabFromUrl = searchParams.get('tab') === 'donations' ? 'donations' : 'donors';
  const [activeTab, setActiveTab] = useState<'donors' | 'donations'>(currentTabFromUrl);

  const handleTabChange = useCallback((tab: 'donors' | 'donations') => {
    setActiveTab(tab);
    const params = new URLSearchParams(searchParams.toString());
    params.set('tab', tab);
    router.push(`${pathname}?${params.toString()}`);
  }, [pathname, router, searchParams]);

  useEffect(() => {
    const tabFromUrl = searchParams.get('tab');
    if (tabFromUrl === 'donations' || tabFromUrl === 'donors') {
      setActiveTab(tabFromUrl);
    }
  }, [searchParams]);

  /* ============================================================
     תורם - צפייה
  ============================================================ */
  const [selectedDonorForView, setSelectedDonorForView] = useState<Donor | null>(null);

  /* ============================================================
     תורם - הוספה / עריכה
  ============================================================ */
  const [isDonorModalOpen, setIsDonorModalOpen] = useState(false);
  const [selectedDonorToEdit, setSelectedDonorToEdit] = useState<Donor | null>(null);

  /* ============================================================
     תרומה - הוספה / עריכה
  ============================================================ */
  const [isDonationModalOpen, setIsDonationModalOpen] = useState(false);
  const [selectedDonorForDonation, setSelectedDonorForDonation] = useState<string | null>(null);
  const [selectedDonationToEdit, setSelectedDonationToEdit] = useState<Donation | null>(null);

  /* ============================================================
     כרטיס תרומה
  ============================================================ */
  const [selectedDonation, setSelectedDonation] = useState<Donation | null>(null);

  /* ============================================================
     בדיקת אימות משתמש, טעינת נתונים ומעקב חי אחרי משתמשים 
  ============================================================ */
  useEffect(() => {
    let presenceChannel: any;

    async function initSystem() {
      // אם הקונטקסט של המשתמש או של ההרשאות עדיין בטעינה, נחכה
      if (authLoading || loadingPerms) return;

      // אם המשתמש לא מחובר, זורקים ללוגין
      if (!user) {
        router.push('/login');
        return;
      }

      // חוסמים כניסה לדאשבורד במידה ולמשתמש המחובר אין הרשאה בכלל
      if (!hasPermission('view_dashboard')) {
        return; 
      }

      // הפתרון ללופ: מוודאים ש-fetchData ירוץ רק פעם אחת!
      if (!hasFetchedData.current) {
        fetchData();
        hasFetchedData.current = true;
      }

      // הפעלת מעקב משתמשים מחוברים (Presence)
      presenceChannel = supabase.channel('online-users');
      presenceChannel
        .on('presence', { event: 'sync' }, () => {
          const newState = presenceChannel.presenceState();
          const usersMap = new Map();
          for (const key in newState) {
            const presences = newState[key] as any[];
            if (presences.length > 0) {
              usersMap.set(presences[0].user_id, presences[0]);
            }
          }
          setOnlineUsers(Array.from(usersMap.values()));
        })
        .subscribe(async (status: string) => {
          if (status === 'SUBSCRIBED') {
            await presenceChannel.track({
              user_id: user.id,
              nickname: currentUserNickname,
              role: currentUserRole,
            });
          }
        });
    }

    initSystem();

    return () => {
      if (presenceChannel) {
        supabase.removeChannel(presenceChannel);
      }
    };
  // צמצמתי את מערך התלויות כך שלא יעורר רינדורים מיותרים ולופים
  }, [user?.id, authLoading, loadingPerms, router, currentUserNickname, currentUserRole]);

  /* ============================================================
     התנתקות מהמערכת
  ============================================================ */
  async function handleLogout() {
    await supabase.auth.signOut();
    router.push('/login');
  }

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

    if (donorsError) {
      console.error('שגיאה בטעינת תורמים:', donorsError);
    } else if (donorsData) {
      setDonors(donorsData as Donor[]);
    }

    if (donationsError) {
      console.error('שגיאה בטעינת תרומות:', donationsError);
    } else if (donationsData) {
      setDonations(donationsData as Donation[]);
      calculateTotals(donationsData as Donation[]);
    }

    setLoading(false);
  }

  function calculateTotals(data: Donation[]) {
    const totals: Record<string, number> = {};

    data.forEach((item) => {
      const currency = item.currency || 'ILS';
      totals[currency] = (totals[currency] || 0) + Number(item.amount || 0);
    });

    setTotalsByCurrency(totals);
  }

  async function fetchDonations() {
    setDonationsLoading(true);

    const { data, error } = await supabase
      .from('donations')
      .select('*')
      .order('donation_date', { ascending: false });

    if (error) {
      console.error('שגיאה בטעינת תרומות:', error);
    } else if (data) {
      const donationData = data as Donation[];
      setDonations(donationData);
      calculateTotals(donationData);
    }

    setDonationsLoading(false);
  }

  const donorMap = useMemo(() => {
    const map = new Map<string, Donor>();
    donors.forEach((donor) => {
      map.set(donor.id, donor);
    });
    return map;
  }, [donors]);

  function getDonorName(donorId: string | null) {
    if (!donorId) return 'ללא תורם';
    const donor = donorMap.get(donorId);
    if (!donor) return 'תורם לא נמצא';

    const name = `${donor.first_name_he || ''} ${donor.last_name_he || ''}`.trim();
    return name || 'ללא שם';
  }

  /* ============================================================
     טיפול במודאלים ואירועים
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

  function handleOpenCreateDonor() {
    setSelectedDonation(null);
    setSelectedDonationToEdit(null);
    setIsDonationModalOpen(false);
    setSelectedDonorForView(null);
    setSelectedDonorForDonation(null);
    setSelectedDonorToEdit(null);
    setIsDonorModalOpen(true);
  }

  function handleOpenEditDonor(donor: Donor) {
    setSelectedDonation(null);
    setSelectedDonationToEdit(null);
    setIsDonationModalOpen(false);
    setSelectedDonorForView(null);
    setSelectedDonorForDonation(null);
    setSelectedDonorToEdit(donor);
    setIsDonorModalOpen(true);
  }

  function handleOpenAddDonation(donorId?: string, e?: React.MouseEvent) {
    if (e) e.stopPropagation();
    setSelectedDonationToEdit(null);
    setSelectedDonation(null);
    setIsDonorModalOpen(false);
    setSelectedDonorForView(null);
    setSelectedDonorToEdit(null);
    setSelectedDonorForDonation(donorId || null);
    setIsDonationModalOpen(true);
  }

  function handleOpenEditDonation(donation: Donation, e?: React.MouseEvent) {
    if (e) e.stopPropagation();
    setSelectedDonation(null);
    setIsDonorModalOpen(false);
    setSelectedDonorForView(null);
    setSelectedDonorToEdit(null);
    setSelectedDonorForDonation(donation.donor_id || null);
    setSelectedDonationToEdit(donation);
    setIsDonationModalOpen(true);
  }

  function handleOpenDonationCard(donation: Donation, e?: React.MouseEvent) {
    if (e) e.stopPropagation();
    setIsDonationModalOpen(false);
    setIsDonorModalOpen(false);
    setSelectedDonorForView(null);
    setSelectedDonorToEdit(null);
    setSelectedDonorForDonation(null);
    setSelectedDonationToEdit(null);
    setSelectedDonation(donation);
  }

  function handleCloseDonationModal() {
    setIsDonationModalOpen(false);
    setSelectedDonationToEdit(null);
    setSelectedDonorForDonation(null);
  }

  const activeRecurring = donors.filter((donor) => donor.is_recurring).length;
  const yissacharZevulunCount = donors.filter((donor) => donor.has_yissachar_zevulun).length;

  /* ============================================================
     3. חומת המגן
  ============================================================ */
  if (authLoading || loadingPerms) {
    return (
      <div className="flex h-screen w-full flex-col items-center justify-center bg-slate-50">
        <Loader2 className="w-10 h-10 animate-spin text-blue-600 mb-4" />
        <span className="text-slate-600 font-medium">טוען הרשאות מערכת...</span>
      </div>
    );
  }

  if (!user || !hasPermission('view_dashboard')) {
    return (
      <div className="flex h-screen w-full flex-col items-center justify-center bg-slate-50 p-6 text-center">
        <ShieldAlert className="w-20 h-20 text-red-400 mb-4" />
        <h2 className="text-2xl font-bold text-slate-800 mb-2">אין לך גישה למערכת</h2>
        <p className="text-slate-600 max-w-md">
          החשבון שלך מחובר, אך אין לך הרשאה מתאימה לצפות בלוח הבקרה. אנא פנה למנהל המערכת.
        </p>
      </div>
    );
  }

  return (
    <div dir="rtl" className="min-h-screen bg-slate-50 p-4 md:p-8 font-sans">
      <div className="max-w-7xl mx-auto space-y-6">

        {/* =====================================================
            כותרת + פרטי משתמש + כפתורי ניהול והתנתקות
        ===================================================== */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-slate-800 flex items-center gap-2">
              <HeartHandshake className="w-8 h-8 text-blue-600" />
              מערכת ניהול תורמים
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              ניהול מעקב תרומות, הו"ק עבור ישיבת עטרת צבי אשדוד
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-end sm:items-center gap-4 w-full md:w-auto">
            
            {/* --- חלון המשתמש המחובר --- */}
            <div className="bg-white border border-slate-200 rounded-xl p-2.5 shadow-sm flex items-center gap-3 w-full sm:w-auto">
              <div className="bg-blue-50 p-2 rounded-full hidden sm:block">
                <UserCircle className="w-6 h-6 text-blue-600" />
              </div>
              <div className="text-right">
                <p className="text-[11px] text-slate-500 font-medium leading-none mb-1">מחובר/ת כעת:</p>
                <p className="font-bold text-slate-800 text-sm leading-none mb-1">{currentUserNickname}</p>
                <p className="text-[10px] font-bold">
                  הרשאה: <span className="bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded border border-slate-200 ml-1">{currentUserRole}</span>
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {isAdmin && (
                <button
                  onClick={() => router.push('/admin')}
                  className="flex items-center gap-2 px-4 py-2.5 bg-purple-50 hover:bg-purple-100 text-purple-700 text-sm font-bold rounded-xl border border-purple-200 transition shadow-sm"
                >
                  <Settings className="w-4 h-4 text-purple-600" />
                  פאנל ניהול
                </button>
              )}

              <button
                onClick={handleLogout}
                className="flex items-center gap-2 px-4 py-2.5 bg-white hover:bg-red-50 hover:text-red-600 hover:border-red-200 text-slate-700 text-sm font-medium rounded-xl border border-slate-200 transition shadow-sm"
              >
                <LogOut className="w-4 h-4 text-slate-500" />
                התנתק
              </button>
            </div>
          </div>
        </div>

        {/* =====================================================
            חיווי בזמן אמת של משתמשים נוספים (מוצג למנהלים בלבד!)
        ===================================================== */}
        {isAdmin && onlineUsers.filter(u => u.nickname !== currentUserNickname).length > 0 && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 flex flex-wrap items-center gap-3 shadow-sm animate-in fade-in slide-in-from-top-2">
            <div className="flex items-center gap-2 text-emerald-800 font-bold text-sm">
              <Radio className="w-4 h-4 animate-pulse text-emerald-600" />
              משתמשים נוספים שמחוברים למערכת כעת:
            </div>
            {onlineUsers
              .filter((u) => u.nickname !== currentUserNickname)
              .map((u, i) => (
                <div key={i} className="bg-white border border-emerald-200 text-emerald-700 px-2.5 py-1 rounded-lg text-xs font-medium shadow-sm flex items-center gap-1.5">
                  <UserCircle className="w-3.5 h-3.5" />
                  {u.nickname}
                  <span className="opacity-75">({u.role})</span>
                </div>
            ))}
          </div>
        )}

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
            לשוניות (מוגדרות נתיב)
        ===================================================== */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="border-b border-slate-200 bg-slate-50 p-2">
            <div className="flex gap-2">
              <button
                onClick={() => handleTabChange('donors')}
                className={`
                  flex-1 md:flex-none px-6 py-3 rounded-xl text-sm font-bold transition flex items-center justify-center gap-2
                  ${activeTab === 'donors'
                    ? 'bg-white text-blue-600 shadow-sm border border-slate-200'
                    : 'text-slate-500 hover:bg-white/70 hover:text-slate-700'
                  }
                `}
              >
                <UserPlus className="w-4 h-4" />
                תורמים
              </button>

              <button
                onClick={() => {
                  handleTabChange('donations');
                  fetchDonations();
                }}
                className={`
                  flex-1 md:flex-none px-6 py-3 rounded-xl text-sm font-bold transition flex items-center justify-center gap-2
                  ${activeTab === 'donations'
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

          {activeTab === 'donors' && (
            <DonorsTab
              donors={donors}
              loading={loading}
              activeRecurring={activeRecurring}
              yissacharZevulunCount={yissacharZevulunCount}
              onCreateDonor={handleOpenCreateDonor}
              onViewDonor={handleOpenViewDonor}
              onAddDonation={handleOpenAddDonation}
            />
          )}

          {activeTab === 'donations' && (
            <DonationsTab
              donations={donations}
              donors={donors}
              donorMap={donorMap}
              loading={donationsLoading}
              getDonorName={getDonorName}
              onRefresh={fetchDonations}
              onAddDonation={handleOpenAddDonation}
              onViewDonation={handleOpenDonationCard}
              onViewDonor={handleOpenViewDonor}
            />
          )}
        </div>

        {/* =====================================================
            מודאלים
        ===================================================== */}

        {selectedDonation && (
          <DonationCardModal
            isOpen={true}
            donation={selectedDonation}
            donor={
              selectedDonation.donor_id
                ? donorMap.get(selectedDonation.donor_id) || null
                : null
            }
            onClose={() => setSelectedDonation(null)}
            onDeleted={() => {
              setSelectedDonation(null);
              setSelectedDonationToEdit(null);
              fetchData();
              fetchDonations();
            }}
            onEdit={() => {
              const donationToEdit = selectedDonation;
              setSelectedDonation(null);
              handleOpenEditDonation(donationToEdit);
            }}
          />
        )}

        {selectedDonorForView && (
          <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
            <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-5xl max-h-[95vh] overflow-y-auto relative">
              <button
                onClick={() => setSelectedDonorForView(null)}
                className="absolute top-4 left-4 z-10 p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg bg-white shadow-sm"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="p-5">
                <div className="mb-4 font-bold text-slate-800 text-sm">
                  כרטיס תורם מלא
                </div>

                <div className="rounded-xl overflow-hidden">
                  <DonorCard
                    donor={selectedDonorForView}
                    onAddDonation={(e) => handleOpenAddDonation(selectedDonorForView.id, e)}
                  />
                </div>

                <div className="mt-5 pt-4 border-t border-slate-100 flex justify-between items-center">
                  <button
                    onClick={() => handleOpenEditDonor(selectedDonorForView)}
                    className="bg-blue-600 hover:bg-blue-700 text-white font-medium px-4 py-2 rounded-xl text-xs"
                  >
                    ערוך פרטי תורם
                  </button>

                  <button
                    onClick={() => setSelectedDonorForView(null)}
                    className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium px-4 py-2 rounded-xl text-xs"
                  >
                    סגור
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {isDonorModalOpen && (
          <DonorFormModal
            isOpen={isDonorModalOpen}
            onClose={() => setIsDonorModalOpen(false)}
            onSuccess={() => fetchData()}
            donorToEdit={selectedDonorToEdit}
          />
        )}

        {isDonationModalOpen && (
          <DonationFormModal
            isOpen={isDonationModalOpen}
            onClose={handleCloseDonationModal}
            onSuccess={() => {
              fetchData();
              fetchDonations();
            }}
            editingDonation={selectedDonationToEdit}
            preselectedDonorId={selectedDonorForDonation}
          />
        )}

      </div>
    </div>
  );
}

/* ============================================================
   עטיפת הדף ב-Suspense כדי ש-Next.js יוכל לבצע בנייה סטטית
============================================================ */
export default function HomePage() {
  return (
    <Suspense fallback={
      <div dir="rtl" className="min-h-screen bg-slate-50 flex flex-col items-center justify-center gap-3">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
        <p className="text-slate-600 text-sm font-medium">טוען את המערכת...</p>
      </div>
    }>
      <DashboardContent />
    </Suspense>
  );
}