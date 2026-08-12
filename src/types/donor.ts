export interface SpecialDate {
  id?: string;
  title: string;
  date: string;
  notes?: string;
}

export interface Attachment {
  id?: string;
  donation_id?: string;
  donor_id?: string;
  file_name?: string;
  name?: string;
  file_url?: string;
  url?: string;
  file_type?: string;
  created_at?: string | null;
}

export interface Donor {
  id: string;
  first_name_he: string | null;
  last_name_he: string | null;
  first_name_en: string | null;
  last_name_en: string | null;
  phone_1: string | null;
  phone_2: string | null;
  email: string | null;
  country: string | null;
  city: string | null;
  street: string | null;
  house_number: string | null;
  is_recurring: boolean;
  has_yissachar_zevulun: boolean;
  yissachar_zevulun_with: string | null;
  yissachar_zevulun_name: string | null;
  birthday: string | null;
  yahrzeit_date: string | null;
  connected_contact: string | null;
  special_dates?: SpecialDate[] | null;
  notes: string | null;
  created_at: string | null;
}

export interface Donation {
  id: string;
  donor_id: string | null;
  amount: number;
  currency: string | null;
  payment_method: string | null;
  donation_date: string | null;
  receipt_number: string | null;
  notes: string | null;
  file_url: string | null;
  attachments?: Attachment[];
  created_at: string | null;
}

export interface ExtendedDonor extends Donor {
  total_donations?: number;
  donations?: Donation[];
  files?: Attachment[];
}