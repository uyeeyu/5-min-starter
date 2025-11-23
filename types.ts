export enum RecordType {
  SUCCESS = 'SUCCESS',
  FAILURE = 'FAILURE',
  LOTTERY = 'LOTTERY',
}

export interface HistoryRecord {
  id: string;
  type: RecordType;
  amount: number;
  timestamp: number;
  description: string;
}

export interface AppState {
  fund: number;
  target: number;
  successCount: number; // Total successful sessions
  spinsAvailable: number; // Number of lottery spins earned
  records: HistoryRecord[];
  sessionStartTime: number | null; // Timestamp when current session started
}

export interface LotteryRule {
  label: string;
  amount: number;
  probability: number; // 0.0 to 1.0
  color: string;
}