export type MucusType = 'none' | 'dry' | 'sticky' | 'creamy' | 'watery' | 'eggwhite' | 'not_observed';
export type SensationType = 'dry' | 'moist' | 'slippery' | 'not_observed';
export type FertilityStatus = 'menstrual' | 'infertile' | 'potentially-fertile' | 'high-fertility' | 'post-ovulatory';

export interface DailyLog {
  date: string; // ISO format
  mucus?: MucusType;
  sensation?: SensationType;
  temperature?: number;
  mood?: number; // 1-5
  libido?: number; // 1-5
  bleeding?: 'none' | 'light' | 'medium' | 'heavy';
  isPeak?: boolean;
  notes?: string;
  disturbances?: string[]; // fever, stress, etc.
}

export interface MethodHistoryEntry {
  methodId: string;
  startDate: string; // ISO
}

export interface UserProfile {
  name: string;
  birthDate?: string;
  height?: number;
  weight?: number;
  selectedMethod: string;
  methodHistory: MethodHistoryEntry[];
  cycleLength?: number;
  isRegular?: boolean;
  remindersEnabled: boolean;
  reminderTime: string;
  tutorialCompleted: boolean;
}

export const MUCUS_VALUES: Record<MucusType, number> = {
  'none': 0,
  'not_observed': 0,
  'dry': 1,
  'sticky': 2,
  'creamy': 3,
  'watery': 4,
  'eggwhite': 5
};

export type LogField = 'bleeding' | 'mucus' | 'sensation' | 'temperature' | 'notes' | 'isPeak';

export interface MethodInfo {
  id: string;
  name: string;
  author: string;
  basis: string;
  description: string;
  history: string;
  accuracy: string;
  steps: string[];
  tips: string[];
  limitations: string[];
  regularCycleAdvice: string;
  irregularCycleAdvice: string;
  requiredFields: LogField[];
}
