'use client';

import { useMemo, useState } from 'react';
import { Donor } from '@/types/donor';
import * as XLSX from 'xlsx';

import {
  Search,
  UserPlus,
  Phone,
  MapPin,
  User,
  Mail,
  Download,
  RotateCcw,
  Navigation,
  X,
} from 'lucide-react';

interface DonorsTabProps {
  donors: Donor[];
  loading: boolean;
  activeRecurring: number;
  yissacharZevulunCount: number;

  onCreateDonor: () => void;
  onViewDonor: (donor: Donor) => void;
  onAddDonation: (
    donorId?: string,
    e?: React.MouseEvent
  ) => void;
}

type NavigationOption =
  | 'google'
  | 'waze'
  | 'apple';

export default function DonorsTab({
  donors,
  loading,
  activeRecurring,
  yissacharZevulunCount,
  onCreateDonor,
  onViewDonor,
  onAddDonation,
}: DonorsTabProps) {
  /* ============================================================
     חיפוש כללי
  ============================================================ */

  const [searchQuery, setSearchQuery] = useState('');

  /* ============================================================
     פילטרים
  ============================================================ */

  const [countryFilter, setCountryFilter] = useState('');
  const [cityFilter, setCityFilter] = useState('');
  const [streetFilter, setStreetFilter] = useState('');
  const [contactFilter, setContactFilter] = useState('');
  const [recurringFilter, setRecurringFilter] = useState('');
  const [yissacharFilter, setYissacharFilter] = useState('');
  const [emailFilter, setEmailFilter] = useState('');
  const [phoneFilter, setPhoneFilter] = useState('');
  const [notesFilter, setNotesFilter] = useState('');

  /* ============================================================
     מצב הצגת סינון מתקדם
  ============================================================ */

  const [showFilters, setShowFilters] = useState(false);

  /* ============================================================
     חלון בחירת ניווט
  ============================================================ */

  const [navigationAddress, setNavigationAddress] =
    useState<string | null>(null);

  /* ============================================================
     ערכים ייחודיים
  ============================================================ */

  const countries = useMemo(() => {
    return Array.from(
      new Set(
        donors
          .map((d) => d.country)
          .filter(Boolean)
      )
    ).sort((a, b) =>
      String(a).localeCompare(String(b), 'he')
    );
  }, [donors]);

  const cities = useMemo(() => {
    return Array.from(
      new Set(
        donors
          .map((d) => d.city)
          .filter(Boolean)
      )
    ).sort((a, b) =>
      String(a).localeCompare(String(b), 'he')
    );
  }, [donors]);

  const streets = useMemo(() => {
    return Array.from(
      new Set(
        donors
          .map((d) => d.street)
          .filter(Boolean)
      )
    ).sort((a, b) =>
      String(a).localeCompare(String(b), 'he')
    );
  }, [donors]);

  const contacts = useMemo(() => {
    return Array.from(
      new Set(
        donors
          .map((d) => d.connected_contact)
          .filter(Boolean)
      )
    ).sort((a, b) =>
      String(a).localeCompare(String(b), 'he')
    );
  }, [donors]);

  /* ============================================================
     איפוס סינונים
  ============================================================ */

  const resetFilters = () => {
    setSearchQuery('');
    setCountryFilter('');
    setCityFilter('');
    setStreetFilter('');
    setContactFilter('');
    setRecurringFilter('');
    setYissacharFilter('');
    setEmailFilter('');
    setPhoneFilter('');
    setNotesFilter('');
  };

  /* ============================================================
     סינון
  ============================================================ */

  const filteredDonors = useMemo(() => {
    const query = searchQuery.toLowerCase().trim();

    return donors.filter((donor) => {
      const fullNameHe =
        `${donor.first_name_he || ''} ${donor.last_name_he || ''}`
          .toLowerCase();

      const fullNameEn =
        `${donor.first_name_en || ''} ${donor.last_name_en || ''}`
          .toLowerCase();

      const phone1 =
        (donor.phone_1 || '').toLowerCase();

      const phone2 =
        (donor.phone_2 || '').toLowerCase();

      const email =
        (donor.email || '').toLowerCase();

      const country =
        (donor.country || '').toLowerCase();

      const city =
        (donor.city || '').toLowerCase();

      const street =
        (donor.street || '').toLowerCase();

      const houseNumber =
        (donor.house_number || '').toLowerCase();

      const contact =
        (donor.connected_contact || '').toLowerCase();

      const yissacharName =
        (donor.yissachar_zevulun_name || '').toLowerCase();

      const notes =
        (donor.notes || '').toLowerCase();

      const birthday =
        donor.birthday
          ? String(donor.birthday).toLowerCase()
          : '';

      const yahrzeit =
        donor.yahrzeit_date
          ? String(donor.yahrzeit_date).toLowerCase()
          : '';

      const matchesSearch =
        !query ||
        fullNameHe.includes(query) ||
        fullNameEn.includes(query) ||
        phone1.includes(query) ||
        phone2.includes(query) ||
        email.includes(query) ||
        country.includes(query) ||
        city.includes(query) ||
        street.includes(query) ||
        houseNumber.includes(query) ||
        contact.includes(query) ||
        yissacharName.includes(query) ||
        notes.includes(query) ||
        birthday.includes(query) ||
        yahrzeit.includes(query);

      if (!matchesSearch) {
        return false;
      }

      /* מדינה */

      if (
        countryFilter &&
        donor.country !== countryFilter
      ) {
        return false;
      }

      /* עיר */

      if (
        cityFilter &&
        donor.city !== cityFilter
      ) {
        return false;
      }

      /* רחוב */

      if (
        streetFilter &&
        donor.street !== streetFilter
      ) {
        return false;
      }

      /* איש קשר */

      if (
        contactFilter &&
        donor.connected_contact !== contactFilter
      ) {
        return false;
      }

      /* אימייל */

      if (
        emailFilter &&
        !(donor.email || '')
          .toLowerCase()
          .includes(emailFilter.toLowerCase())
      ) {
        return false;
      }

      /* טלפון */

      if (
        phoneFilter &&
        !(
          `${donor.phone_1 || ''} ${donor.phone_2 || ''}`
        )
          .toLowerCase()
          .includes(phoneFilter.toLowerCase())
      ) {
        return false;
      }

      /* הערות */

      if (
        notesFilter &&
        !(donor.notes || '')
          .toLowerCase()
          .includes(notesFilter.toLowerCase())
      ) {
        return false;
      }

      /* הוראת קבע */

      if (
        recurringFilter === 'yes' &&
        !donor.is_recurring
      ) {
        return false;
      }

      if (
        recurringFilter === 'no' &&
        donor.is_recurring
      ) {
        return false;
      }

      /* יששכר וזבולון */

      if (
        yissacharFilter === 'yes' &&
        !donor.has_yissachar_zevulun
      ) {
        return false;
      }

      if (
        yissacharFilter === 'no' &&
        donor.has_yissachar_zevulun
      ) {
        return false;
      }

      return true;
    });
  }, [
    donors,
    searchQuery,
    countryFilter,
    cityFilter,
    streetFilter,
    contactFilter,
    recurringFilter,
    yissacharFilter,
    emailFilter,
    phoneFilter,
    notesFilter,
  ]);

  /* ============================================================
     כתובת מלאה
  ============================================================ */

  const getFullAddress = (donor: Donor) => {
    return [
      donor.street,
      donor.house_number,
      donor.city,
      donor.country,
    ]
      .filter(Boolean)
      .join(', ');
  };

  /* ============================================================
     פתיחת ניווט
  ============================================================ */

  const openNavigation = (
    option: NavigationOption
  ) => {
    if (!navigationAddress) {
      return;
    }

    const encodedAddress =
      encodeURIComponent(navigationAddress);

    let url = '';

    if (option === 'google') {
      url =
        `https://www.google.com/maps/dir/?api=1&destination=${encodedAddress}`;
    }

    if (option === 'waze') {
      url =
        `https://www.waze.com/ul?q=${encodedAddress}&navigate=yes`;
    }

    if (option === 'apple') {
      url =
        `https://maps.apple.com/?daddr=${encodedAddress}`;
    }

    if (url) {
      window.open(
        url,
        '_blank',
        'noopener,noreferrer'
      );
    }

    setNavigationAddress(null);
  };

  /* ============================================================
     ייצוא לאקסל
     מייצא בדיוק את הרשימה לאחר הסינון
  ============================================================ */

  const exportToExcel = () => {
    const excelData = filteredDonors.map((donor) => ({
      'שם פרטי': donor.first_name_he || '',
      'שם משפחה': donor.last_name_he || '',

      'שם באנגלית':
        `${donor.first_name_en || ''} ${
          donor.last_name_en || ''
        }`.trim(),

      'טלפון 1': donor.phone_1 || '',
      'טלפון 2': donor.phone_2 || '',
      'אימייל': donor.email || '',

      'מדינה': donor.country || '',
      'עיר': donor.city || '',
      'רחוב': donor.street || '',
      'מספר בית': donor.house_number || '',

      'הוראת קבע':
        donor.is_recurring
          ? 'כן'
          : 'לא',

      'יששכר וזבולון':
        donor.has_yissachar_zevulun
          ? 'כן'
          : 'לא',

      'שם יששכר וזבולון':
        donor.yissachar_zevulun_name || '',

      'איש קשר':
        donor.connected_contact || '',

      'תאריך לידה':
        donor.birthday || '',

      'יארצייט':
        donor.yahrzeit_date || '',

      'הערות':
        donor.notes || '',

      'תאריך יצירה':
        donor.created_at
          ? new Date(
              donor.created_at
            ).toLocaleDateString('he-IL')
          : '',
    }));

    const worksheet =
      XLSX.utils.json_to_sheet(
        excelData
      );

    worksheet['!cols'] = [
      { wch: 14 },
      { wch: 15 },
      { wch: 21 },
      { wch: 14 },
      { wch: 14 },
      { wch: 25 },
      { wch: 13 },
      { wch: 17 },
      { wch: 20 },
      { wch: 11 },
      { wch: 14 },
      { wch: 20 },
      { wch: 21 },
      { wch: 21 },
      { wch: 14 },
      { wch: 14 },
      { wch: 40 },
      { wch: 17 },
    ];

    const workbook =
      XLSX.utils.book_new();

    XLSX.utils.book_append_sheet(
      workbook,
      worksheet,
      'תורמים'
    );

    const today =
      new Date()
        .toLocaleDateString('he-IL')
        .replace(/\./g, '-');

    XLSX.writeFile(
      workbook,
      `רשימת-תורמים-${today}.xlsx`
    );
  };

  /* ============================================================
     RENDER
  ============================================================ */

  return (
    <div
      className="p-4 md:p-5 space-y-5"
      dir="rtl"
    >

      {/* ======================================================
          כותרת
      ====================================================== */}

      <div
        className="
          flex
          flex-col
          md:flex-row
          justify-between
          items-start
          md:items-center
          gap-3
        "
      >
        <div>
          <h2 className="text-lg font-bold text-slate-800">
            תורמים
          </h2>

          <p className="text-xs text-slate-400 mt-1">
            ניהול רשימת התורמים והפרטים שלהם
          </p>
        </div>

        <div className="flex items-center gap-2">

          <button
            onClick={exportToExcel}
            disabled={filteredDonors.length === 0}
            className="
              flex
              items-center
              gap-2
              px-3.5
              py-2.5
              rounded-xl
              text-xs
              font-medium
              bg-emerald-600
              hover:bg-emerald-700
              disabled:bg-slate-300
              disabled:cursor-not-allowed
              text-white
              transition
              shadow-sm
            "
          >
            <Download className="w-4 h-4" />
            ייצוא לאקסל
          </button>

          <button
            onClick={onCreateDonor}
            className="
              bg-blue-600
              hover:bg-blue-700
              text-white
              font-medium
              px-3.5
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
            <UserPlus className="w-4 h-4" />
            הוספת תורם חדש
          </button>

        </div>
      </div>

      {/* ======================================================
          חיפוש וסינון ראשי
      ====================================================== */}

      <div
        className="
          bg-slate-50
          p-3
          rounded-2xl
          border
          border-slate-200
          space-y-3
        "
      >

        {/* חיפוש */}

        <div className="flex flex-col xl:flex-row gap-2.5">

          <div className="relative flex-1">

            <Search
              className="
                w-4
                h-4
                text-slate-400
                absolute
                right-3
                top-1/2
                -translate-y-1/2
              "
            />

            <input
              type="text"
              placeholder="חיפוש בכל פרטי התורם..."
              value={searchQuery}
              onChange={(e) =>
                setSearchQuery(e.target.value)
              }
              className="
                w-full
                pr-9
                pl-4
                py-2.5
                border
                border-slate-200
                bg-white
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
              setShowFilters(!showFilters)
            }
            className="
              px-4
              py-2
              rounded-xl
              bg-white
              border
              border-slate-200
              text-xs
              font-medium
              text-slate-600
              hover:bg-slate-100
              whitespace-nowrap
            "
          >
            {showFilters
              ? 'הסתר סינון מתקדם'
              : 'סינון מתקדם'}
          </button>

          <button
            onClick={resetFilters}
            className="
              px-3
              py-2
              rounded-xl
              bg-white
              border
              border-slate-200
              text-slate-500
              hover:bg-slate-100
              flex
              items-center
              justify-center
            "
            title="איפוס סינונים"
          >
            <RotateCcw className="w-4 h-4" />
          </button>

        </div>

        {/* ====================================================
            פילטרים נגישים ישירות
        ==================================================== */}

        <div
          className="
            grid
            grid-cols-2
            sm:grid-cols-4
            lg:grid-cols-4
            xl:grid-cols-4
            gap-2
          "
        >

          {/* מדינה */}

          <select
            value={countryFilter}
            onChange={(e) =>
              setCountryFilter(e.target.value)
            }
            className="
              w-full
              px-3
              py-2
              bg-white
              border
              border-slate-200
              rounded-xl
              text-xs
              text-slate-600
              focus:outline-none
              focus:ring-2
              focus:ring-blue-500/20
            "
          >
            <option value="">
              כל המדינות
            </option>

            {countries.map((country) => (
              <option
                key={country}
                value={country}
              >
                {country}
              </option>
            ))}
          </select>

          {/* עיר */}

          <select
            value={cityFilter}
            onChange={(e) =>
              setCityFilter(e.target.value)
            }
            className="
              w-full
              px-3
              py-2
              bg-white
              border
              border-slate-200
              rounded-xl
              text-xs
              text-slate-600
              focus:outline-none
              focus:ring-2
              focus:ring-blue-500/20
            "
          >
            <option value="">
              כל הערים
            </option>

            {cities.map((city) => (
              <option
                key={city}
                value={city}
              >
                {city}
              </option>
            ))}
          </select>

          {/* הוראת קבע */}

          <select
            value={recurringFilter}
            onChange={(e) =>
              setRecurringFilter(e.target.value)
            }
            className="
              w-full
              px-3
              py-2
              bg-white
              border
              border-slate-200
              rounded-xl
              text-xs
              text-slate-600
              focus:outline-none
              focus:ring-2
              focus:ring-blue-500/20
            "
          >
            <option value="">
              כל התורמים
            </option>

            <option value="yes">
              עם הוראת קבע
            </option>

            <option value="no">
              ללא הוראת קבע
            </option>
          </select>

          {/* יששכר וזבולון */}

          <select
            value={yissacharFilter}
            onChange={(e) =>
              setYissacharFilter(e.target.value)
            }
            className="
              w-full
              px-3
              py-2
              bg-white
              border
              border-slate-200
              rounded-xl
              text-xs
              text-slate-600
              focus:outline-none
              focus:ring-2
              focus:ring-blue-500/20
            "
          >
            <option value="">
              כל התורמים
            </option>

            <option value="yes">
              יששכר וזבולון
            </option>

            <option value="no">
              ללא יששכר וזבולון
            </option>
          </select>

        </div>

        {/* ====================================================
            סינון מתקדם
        ==================================================== */}

        {showFilters && (
          <div
            className="
              grid
              grid-cols-1
              sm:grid-cols-2
              lg:grid-cols-3
              gap-2.5
              pt-3
              border-t
              border-slate-200
            "
          >

            {/* רחוב */}

            <div>
              <label className="block text-[11px] text-slate-500 mb-1">
                רחוב
              </label>

              <select
                value={streetFilter}
                onChange={(e) =>
                  setStreetFilter(e.target.value)
                }
                className="
                  w-full
                  px-3
                  py-2
                  bg-white
                  border
                  border-slate-200
                  rounded-xl
                  text-xs
                "
              >
                <option value="">
                  כל הרחובות
                </option>

                {streets.map((street) => (
                  <option
                    key={street}
                    value={street}
                  >
                    {street}
                  </option>
                ))}
              </select>
            </div>

            {/* איש קשר */}

            <div>
              <label className="block text-[11px] text-slate-500 mb-1">
                איש קשר
              </label>

              <select
                value={contactFilter}
                onChange={(e) =>
                  setContactFilter(e.target.value)
                }
                className="
                  w-full
                  px-3
                  py-2
                  bg-white
                  border
                  border-slate-200
                  rounded-xl
                  text-xs
                "
              >
                <option value="">
                  כל אנשי הקשר
                </option>

                {contacts.map((contact) => (
                  <option
                    key={contact}
                    value={contact}
                  >
                    {contact}
                  </option>
                ))}
              </select>
            </div>

            {/* טלפון */}

            <div>
              <label className="block text-[11px] text-slate-500 mb-1">
                טלפון
              </label>

              <input
                value={phoneFilter}
                onChange={(e) =>
                  setPhoneFilter(e.target.value)
                }
                placeholder="חיפוש טלפון..."
                className="
                  w-full
                  px-3
                  py-2
                  bg-white
                  border
                  border-slate-200
                  rounded-xl
                  text-xs
                "
                dir="ltr"
              />
            </div>

            {/* אימייל */}

            <div>
              <label className="block text-[11px] text-slate-500 mb-1">
                אימייל
              </label>

              <input
                value={emailFilter}
                onChange={(e) =>
                  setEmailFilter(e.target.value)
                }
                placeholder="חיפוש אימייל..."
                className="
                  w-full
                  px-3
                  py-2
                  bg-white
                  border
                  border-slate-200
                  rounded-xl
                  text-xs
                "
                dir="ltr"
              />
            </div>

            {/* הערות */}

            <div className="sm:col-span-2 lg:col-span-2">

              <label className="block text-[11px] text-slate-500 mb-1">
                הערות
              </label>

              <input
                value={notesFilter}
                onChange={(e) =>
                  setNotesFilter(e.target.value)
                }
                placeholder="חיפוש בתוך הערות התורם..."
                className="
                  w-full
                  px-3
                  py-2
                  bg-white
                  border
                  border-slate-200
                  rounded-xl
                  text-xs
                "
              />

            </div>

          </div>
        )}

        {/* ====================================================
            סטטיסטיקה
        ==================================================== */}

        <div className="flex items-center gap-2 flex-wrap">

          <span
            className="
              px-3
              py-1.5
              rounded-lg
              bg-blue-50
              text-blue-700
              border
              border-blue-100
              text-xs
              font-medium
            "
          >
            נמצאו {filteredDonors.length} תורמים
          </span>

          <span
            className="
              px-3
              py-1.5
              rounded-lg
              bg-emerald-50
              text-emerald-700
              border
              border-emerald-100
              text-xs
            "
          >
            הו"ק: {activeRecurring}
          </span>

          <span
            className="
              px-3
              py-1.5
              rounded-lg
              bg-amber-50
              text-amber-700
              border
              border-amber-100
              text-xs
            "
          >
            יששכר וזבולון: {yissacharZevulunCount}
          </span>

        </div>

      </div>

      {/* ======================================================
          טבלה
      ====================================================== */}

      {loading ? (

        <div className="text-center py-20 text-slate-500">
          טוען נתונים...
        </div>

      ) : filteredDonors.length === 0 ? (

        <div
          className="
            bg-white
            rounded-2xl
            p-12
            text-center
            border
            border-slate-200
            text-slate-400
          "
        >
          לא נמצאו תורמים התואמים את הסינון.
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

            <table
              className="
                w-full
                text-right
                text-[11px]
              "
            >

              <thead
                className="
                  bg-slate-50
                  border-b
                  border-slate-200
                  text-slate-500
                  sticky
                  top-0
                  z-10
                "
              >
                <tr>

                  <th className="px-2.5 py-3 font-medium whitespace-nowrap">
                    שם התורם
                  </th>

                  <th className="px-2.5 py-3 font-medium whitespace-nowrap">
                    טלפונים
                  </th>

                  <th className="px-2.5 py-3 font-medium whitespace-nowrap">
                    אימייל
                  </th>

                  <th className="px-2.5 py-3 font-medium whitespace-nowrap">
                    כתובת
                  </th>

                  <th className="px-2.5 py-3 font-medium whitespace-nowrap">
                    איש קשר
                  </th>

                  <th className="px-2.5 py-3 font-medium whitespace-nowrap">
                    הו"ק
                  </th>

                  <th className="px-2.5 py-3 font-medium whitespace-nowrap">
                    יששכר וזבולון
                  </th>

                  <th className="px-2.5 py-3 font-medium whitespace-nowrap">
                    הערות
                  </th>

                  <th className="px-2.5 py-3 font-medium whitespace-nowrap">
                    פעולות
                  </th>

                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">

                {filteredDonors.map((donor) => {

                  const fullName =
                    `${donor.first_name_he || ''} ${
                      donor.last_name_he || ''
                    }`.trim();

                  const englishName =
                    `${donor.first_name_en || ''} ${
                      donor.last_name_en || ''
                    }`.trim();

                  const fullAddress =
                    getFullAddress(donor);

                  return (
                    <tr
                      key={donor.id}
                      className="
                        hover:bg-slate-50
                        transition
                      "
                    >

                      {/* ==================================================
                          שם
                      ================================================== */}

                      <td className="px-2.5 py-3 min-w-[145px]">

                        <button
                          type="button"
                          onClick={() =>
                            onViewDonor(donor)
                          }
                          className="
                            text-right
                            group
                            max-w-full
                          "
                        >

                          <div
                            className="
                              font-bold
                              text-blue-700
                              group-hover:text-blue-900
                              group-hover:underline
                              transition
                              truncate
                              max-w-[170px]
                            "
                          >
                            {fullName || 'ללא שם'}
                          </div>

                          {englishName && (
                            <div
                              dir="ltr"
                              className="
                                text-[9px]
                                text-slate-400
                                mt-0.5
                                text-right
                                truncate
                                max-w-[160px]
                              "
                            >
                              {englishName}
                            </div>
                          )}

                        </button>

                      </td>

                      {/* ==================================================
                          טלפונים
                      ================================================== */}

                      <td className="px-2.5 py-3 min-w-[115px]">

                        <div className="flex flex-col gap-1">

                          {donor.phone_1 && (
                            <a
                              href={`tel:${donor.phone_1}`}
                              onClick={(e) =>
                                e.stopPropagation()
                              }
                              dir="ltr"
                              className="
                                flex
                                items-center
                                gap-1
                                text-blue-600
                                hover:text-blue-800
                                hover:underline
                                whitespace-nowrap
                              "
                            >
                              <Phone className="w-3 h-3" />
                              {donor.phone_1}
                            </a>
                          )}

                          {donor.phone_2 && (
                            <a
                              href={`tel:${donor.phone_2}`}
                              onClick={(e) =>
                                e.stopPropagation()
                              }
                              dir="ltr"
                              className="
                                flex
                                items-center
                                gap-1
                                text-blue-600
                                hover:text-blue-800
                                hover:underline
                                whitespace-nowrap
                              "
                            >
                              <Phone className="w-3 h-3" />
                              {donor.phone_2}
                            </a>
                          )}

                          {!donor.phone_1 &&
                            !donor.phone_2 && (
                              <span className="text-slate-400">
                                -
                              </span>
                            )}

                        </div>

                      </td>

                      {/* ==================================================
                          אימייל
                      ================================================== */}

                      <td className="px-2.5 py-3 min-w-[155px]">

                        {donor.email ? (
                          <a
                            href={`mailto:${donor.email}`}
                            onClick={(e) =>
                              e.stopPropagation()
                            }
                            dir="ltr"
                            className="
                              flex
                              items-center
                              gap-1
                              text-blue-600
                              hover:text-blue-800
                              hover:underline
                              max-w-[175px]
                            "
                          >
                            <Mail className="w-3 h-3 shrink-0" />

                            <span className="truncate">
                              {donor.email}
                            </span>
                          </a>
                        ) : (
                          <span className="text-slate-400">
                            -
                          </span>
                        )}

                      </td>

                      {/* ==================================================
                          כתובת + ניווט
                      ================================================== */}

                      <td className="px-2.5 py-3 min-w-[175px]">

                        {fullAddress ? (

                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setNavigationAddress(
                                fullAddress
                              );
                            }}
                            className="
                              flex
                              items-start
                              gap-1.5
                              text-right
                              group
                              max-w-[210px]
                            "
                            title="לחץ לבחירת אפליקציית ניווט"
                          >

                            <MapPin
                              className="
                                w-3.5
                                h-3.5
                                text-blue-500
                                shrink-0
                                mt-0.5
                                group-hover:text-blue-700
                              "
                            />

                            <span
                              className="
                                text-slate-600
                                group-hover:text-blue-700
                                group-hover:underline
                                transition
                              "
                            >
                              {fullAddress}
                            </span>

                          </button>

                        ) : (
                          <span className="text-slate-400">
                            -
                          </span>
                        )}

                      </td>

                      {/* ==================================================
                          איש קשר
                      ================================================== */}

                      <td className="px-2.5 py-3 min-w-[125px]">

                        {donor.connected_contact ? (
                          <div className="flex items-center gap-1">

                            <User className="w-3 h-3 text-slate-400 shrink-0" />

                            <span
                              className="
                                text-slate-600
                                truncate
                                max-w-[130px]
                              "
                              title={
                                donor.connected_contact
                              }
                            >
                              {donor.connected_contact}
                            </span>

                          </div>
                        ) : (
                          <span className="text-slate-400">
                            -
                          </span>
                        )}

                      </td>

                      {/* ==================================================
                          הוראת קבע
                      ================================================== */}

                      <td className="px-2.5 py-3">

                        {donor.is_recurring ? (
                          <span
                            className="
                              bg-emerald-50
                              text-emerald-700
                              text-[9px]
                              px-1.5
                              py-0.5
                              rounded
                              border
                              border-emerald-200
                              whitespace-nowrap
                            "
                          >
                            הו"ק
                          </span>
                        ) : (
                          <span className="text-slate-400">
                            -
                          </span>
                        )}

                      </td>

                      {/* ==================================================
                          יששכר וזבולון
                      ================================================== */}

                      <td className="px-2.5 py-3 min-w-[120px]">

                        {donor.has_yissachar_zevulun ? (

                          <div>

                            <span
                              className="
                                bg-amber-50
                                text-amber-700
                                text-[9px]
                                px-1.5
                                py-0.5
                                rounded
                                border
                                border-amber-200
                                whitespace-nowrap
                              "
                            >
                              יששכר וזבולון
                            </span>

                            {donor.yissachar_zevulun_name && (
                              <div
                                className="
                                  text-[9px]
                                  text-slate-500
                                  mt-1
                                  truncate
                                  max-w-[120px]
                                "
                                title={
                                  donor.yissachar_zevulun_name
                                }
                              >
                                {donor.yissachar_zevulun_name}
                              </div>
                            )}

                          </div>

                        ) : (
                          <span className="text-slate-400">
                            -
                          </span>
                        )}

                      </td>

                      {/* ==================================================
                          הערות
                      ================================================== */}

                      <td className="px-2.5 py-3 min-w-[150px] max-w-[220px]">

                        {donor.notes ? (
                          <div
                            className="
                              text-slate-600
                              whitespace-pre-line
                              line-clamp-2
                              max-w-[210px]
                            "
                            title={donor.notes}
                          >
                            {donor.notes}
                          </div>
                        ) : (
                          <span className="text-slate-400">
                            -
                          </span>
                        )}

                      </td>

                      {/* ==================================================
                          פעולות
                      ================================================== */}

                      <td className="px-2.5 py-3 whitespace-nowrap">

                        <button
                          type="button"
                          onClick={(e) =>
                            onAddDonation(
                              donor.id,
                              e
                            )
                          }
                          className="
                            px-2.5
                            py-1.5
                            bg-emerald-50
                            text-emerald-700
                            border
                            border-emerald-200
                            hover:bg-emerald-100
                            rounded-lg
                            text-[10px]
                            font-medium
                            transition
                          "
                        >
                          + תרומה
                        </button>

                      </td>

                    </tr>
                  );
                })}

              </tbody>

            </table>

          </div>

          {/* ==================================================
              תחתית הטבלה
          ================================================== */}

          <div
            className="
              px-3
              py-2.5
              bg-slate-50
              border-t
              border-slate-100
              flex
              flex-col
              sm:flex-row
              items-start
              sm:items-center
              justify-between
              gap-2
              text-[11px]
              text-slate-500
            "
          >
            <span>
              מציג {filteredDonors.length} מתוך{' '}
              {donors.length} תורמים
            </span>

            <span>
              ייצוא לאקסל יכלול רק את התורמים
              המוצגים לאחר הסינון
            </span>
          </div>

        </div>
      )}

      {/* ======================================================
          חלון בחירת אפליקציית ניווט
      ====================================================== */}

      {navigationAddress && (
        <div
          className="
            fixed
            inset-0
            z-[100]
            bg-black/40
            flex
            items-center
            justify-center
            p-4
          "
          onClick={() =>
            setNavigationAddress(null)
          }
        >

          <div
            className="
              bg-white
              rounded-2xl
              shadow-2xl
              w-full
              max-w-sm
              overflow-hidden
            "
            onClick={(e) =>
              e.stopPropagation()
            }
          >

            {/* כותרת */}

            <div
              className="
                flex
                items-center
                justify-between
                px-5
                py-4
                border-b
                border-slate-100
              "
            >

              <div className="flex items-center gap-2">

                <div
                  className="
                    w-9
                    h-9
                    rounded-xl
                    bg-blue-50
                    text-blue-600
                    flex
                    items-center
                    justify-center
                  "
                >
                  <Navigation className="w-4 h-4" />
                </div>

                <div>

                  <h3 className="font-bold text-slate-800 text-sm">
                    בחירת אפליקציית ניווט
                  </h3>

                  <p className="text-[10px] text-slate-400 mt-0.5">
                    לאן תרצה לנווט?
                  </p>

                </div>

              </div>

              <button
                type="button"
                onClick={() =>
                  setNavigationAddress(null)
                }
                className="
                  w-8
                  h-8
                  rounded-lg
                  flex
                  items-center
                  justify-center
                  text-slate-400
                  hover:bg-slate-100
                  hover:text-slate-600
                "
              >
                <X className="w-4 h-4" />
              </button>

            </div>

            {/* כתובת */}

            <div
              className="
                mx-5
                mt-4
                p-3
                bg-slate-50
                rounded-xl
                border
                border-slate-100
                text-xs
                text-slate-600
              "
            >
              <div className="flex items-start gap-2">

                <MapPin
                  className="
                    w-4
                    h-4
                    text-slate-400
                    shrink-0
                    mt-0.5
                  "
                />

                <span>
                  {navigationAddress}
                </span>

              </div>
            </div>

            {/* אפליקציות */}

            <div className="p-5 space-y-2">

              <button
                type="button"
                onClick={() =>
                  openNavigation('waze')
                }
                className="
                  w-full
                  flex
                  items-center
                  justify-between
                  px-4
                  py-3
                  rounded-xl
                  border
                  border-slate-200
                  bg-white
                  hover:bg-slate-50
                  hover:border-blue-200
                  transition
                  text-right
                "
              >

                <div className="flex items-center gap-3">

                  <div
                    className="
                      w-9
                      h-9
                      rounded-lg
                      bg-blue-50
                      text-blue-600
                      flex
                      items-center
                      justify-center
                      font-bold
                      text-xs
                    "
                  >
                    W
                  </div>

                  <span className="text-sm font-medium text-slate-700">
                    Waze
                  </span>

                </div>

                <Navigation className="w-4 h-4 text-slate-400" />

              </button>

              <button
                type="button"
                onClick={() =>
                  openNavigation('google')
                }
                className="
                  w-full
                  flex
                  items-center
                  justify-between
                  px-4
                  py-3
                  rounded-xl
                  border
                  border-slate-200
                  bg-white
                  hover:bg-slate-50
                  hover:border-blue-200
                  transition
                  text-right
                "
              >

                <div className="flex items-center gap-3">

                  <div
                    className="
                      w-9
                      h-9
                      rounded-lg
                      bg-slate-100
                      text-slate-700
                      flex
                      items-center
                      justify-center
                      font-bold
                      text-xs
                    "
                  >
                    G
                  </div>

                  <span className="text-sm font-medium text-slate-700">
                    Google Maps
                  </span>

                </div>

                <Navigation className="w-4 h-4 text-slate-400" />

              </button>

              <button
                type="button"
                onClick={() =>
                  openNavigation('apple')
                }
                className="
                  w-full
                  flex
                  items-center
                  justify-between
                  px-4
                  py-3
                  rounded-xl
                  border
                  border-slate-200
                  bg-white
                  hover:bg-slate-50
                  hover:border-blue-200
                  transition
                  text-right
                "
              >

                <div className="flex items-center gap-3">

                  <div
                    className="
                      w-9
                      h-9
                      rounded-lg
                      bg-slate-100
                      text-slate-700
                      flex
                      items-center
                      justify-center
                      font-bold
                      text-xs
                    "
                  >
                    
                  </div>

                  <span className="text-sm font-medium text-slate-700">
                    Apple Maps
                  </span>

                </div>

                <Navigation className="w-4 h-4 text-slate-400" />

              </button>

            </div>

            <div
              className="
                px-5
                pb-5
                text-[10px]
                text-slate-400
                text-center
              "
            >
              האפליקציה תיפתח בחלון חדש
            </div>

          </div>

        </div>
      )}

    </div>
  );
}