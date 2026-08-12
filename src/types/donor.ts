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
  file_name: string;
  file_url: string;
  file_type?: string;
  created_at?: string;
}

export interface Donor {
  id: string;
  first_name_he?: string;
  last_name_he?: string;
  first_name_en?: string;
  last_name_en?: string;
  phone_1?: string;
  phone_2?: string;
  email?: string;
  country?: string;
  city?: string;
  street?: string;
  house_number?: string;
  is_recurring?: boolean;
  has_yissachar_zevulun?: boolean;
  yissachar_zevulun_with?: string;
  yissachar_zevulun_name?: string;
  birthday?: string;
  yahrzeit_date?: string;
  connected_contact?: string;
  special_dates?: SpecialDate[];
  notes?: string;
  created_at?: string;
}

export interface Donation {
  id: string;
  donor_id?: string;
  amount: number;
  currency: string;
  payment_method?: string;
  donation_date: string;
  receipt_number?: string;
  notes?: string;
  file_url?: string;
  attachments?: Attachment[];
  created_at?: string;
}

export interface ExtendedDonor extends Donor {
  total_donations?: number;
  donations?: Donation[];
  files?: Attachment[];
}