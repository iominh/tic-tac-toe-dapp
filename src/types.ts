export type GameStatus = 0 | 1 | 2; // ACTIVE = 0, DRAW = 1, WON = 2

export interface Game {
  id: string;
  board: number[];
  playerX: string;
  playerO: string;
  currentTurn: string;
  status: GameStatus;
  betAmount: number;
}

export interface GameResult {
  gameId: string;
  playerX: string;
  playerO: string;
  winner: string | null;
  status: GameStatus;
  timestamp: number; // Add timestamp for animation
}
