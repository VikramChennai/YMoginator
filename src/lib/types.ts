export interface Profile {
  id: string;
  name: string;
  company: string;
  batch: string;
  email: string;
  yc_verification_code: string;
  avatar_url: string | null;
  current_streak: number;
  longest_streak: number;
  total_days: number;
  last_verified_date: string | null;
  created_at: string;
  updated_at: string;
}

export interface Location {
  id: string;
  name: string;
  address: string;
  city: string;
  max_capacity_per_slot: number;
  opening_hour: number;
  closing_hour: number;
  created_at: string;
}

export interface TimeSlot {
  id: string;
  location_id: string;
  date: string;
  start_time: string;
  end_time: string;
  max_capacity: number;
  current_bookings: number;
  created_at: string;
}

export interface Booking {
  id: string;
  user_id: string;
  time_slot_id: string;
  status: "confirmed" | "cancelled";
  created_at: string;
  time_slot?: TimeSlot & { location?: Location };
  profile?: Pick<Profile, "id" | "name" | "avatar_url">;
}

export interface GymCheckin {
  id: string;
  user_id: string;
  photo_url: string;
  verified: boolean;
  verification_result: string;
  checkin_date: string;
  created_at: string;
}

export interface YCVerificationData {
  name: string;
  company: string;
  batch: string;
  email: string;
  code: string;
}

export type StreakBadge = {
  label: string;
  min: number;
  max: number;
  color: string;
};

export const STREAK_BADGES: StreakBadge[] = [
  { label: "Normie", min: 1, max: 2, color: "bg-slate-500" },
  { label: "Chadlite", min: 3, max: 6, color: "bg-blue-500" },
  { label: "Chad", min: 7, max: 13, color: "bg-orange-500" },
  { label: "GigaChad", min: 14, max: 29, color: "bg-purple-500" },
  { label: "Tera Chad", min: 30, max: Infinity, color: "bg-amber-500" },
];

export function getStreakBadge(streak: number): StreakBadge | null {
  if (streak < 1) return null;
  return STREAK_BADGES.find((b) => streak >= b.min && streak <= b.max) ?? null;
}
