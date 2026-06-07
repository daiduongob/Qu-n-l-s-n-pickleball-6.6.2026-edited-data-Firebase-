export interface User {
  id: string;
  name: string;
  username: string;
  skillRating: number;
  isReady: boolean;
  status: 'free' | 'playing';
  courtId: string | null;
  waitStartTime: number | null;
}

export interface Court {
  id: string;
  name: string;
  status: 'empty' | 'playing' | 'waiting_list';
  players: string[];
  waitingTime?: number | null;
}

export interface MatchHistory {
  id: string;
  courtName: string;
  teamA: string[];
  teamB: string[];
  scoreA: number;
  scoreB: number;
  date: number;
}

export interface AppState {
  users: User[];
  courts: Court[];
  matches: MatchHistory[];
}
