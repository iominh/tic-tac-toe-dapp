import { useCurrentAccount } from "@mysten/dapp-kit";
import { Box, Text } from "@radix-ui/themes";
import { Game as GameType } from "../types";
import { useMemo, useState } from "react";
import ClipLoader from "react-spinners/ClipLoader";

interface GameBoardProps {
  game: GameType;
  onMove: (position: number) => void;
  disabled?: boolean;
  isMovePending?: boolean;
  pendingMoveIndex?: number | null;
}

const WINNING_LINES = [
  [0, 1, 2], // Rows
  [3, 4, 5],
  [6, 7, 8],
  [0, 3, 6], // Columns
  [1, 4, 7],
  [2, 5, 8],
  [0, 4, 8], // Diagonals
  [2, 4, 6],
];

export function GameBoard({
  game,
  onMove,
  disabled,
  isMovePending = false,
  pendingMoveIndex,
}: GameBoardProps) {
  const currentAccount = useCurrentAccount();

  const isMyTurn = useMemo(() => {
    if (!currentAccount) return false;
    const myAddress = currentAccount.address;

    // Check if it's my turn based on current turn and my player role
    const amPlayerX = myAddress === game.playerX;
    const amPlayerO = myAddress === game.playerO;
    const isXTurn = game.currentTurn === game.playerX;

    console.log("Turn Debug:", {
      myAddress,
      currentTurn: game.currentTurn,
      playerX: game.playerX,
      playerO: game.playerO,
      amPlayerX,
      amPlayerO,
      isXTurn,
      canMove: (amPlayerX && isXTurn) || (amPlayerO && !isXTurn),
    });

    return (amPlayerX && isXTurn) || (amPlayerO && !isXTurn);
  }, [currentAccount, game.currentTurn, game.playerX, game.playerO]);

  const getSymbol = (value: number) => {
    if (value === 0) return "";
    return value === 1 ? "X" : "O";
  };

  const winningLine = useMemo(() => {
    if (game.status !== 2) return null; // Not a win

    // Check each possible winning line
    for (const line of WINNING_LINES) {
      const [a, b, c] = line;
      if (
        game.board[a] &&
        game.board[a] === game.board[b] &&
        game.board[a] === game.board[c]
      ) {
        return line;
      }
    }
    return null;
  }, [game.board, game.status]);

  const isWinningCell = (index: number): boolean => {
    return winningLine?.includes(index) ?? false;
  };

  return (
    <div className="select-none mt-8">
      <div className="mb-8">
        <GameStatus game={game} />
      </div>

      <div className="grid grid-cols-3 gap-4 mb-2 w-[300px] mx-auto">
        {game.board.map((value, index) => (
          <Box
            key={index}
            onClick={() =>
              !disabled && isMyTurn && value === 0 && onMove(index)
            }
            className={`aspect-square flex items-center justify-center text-4xl font-bold border-2 rounded-lg transition-all duration-500 ${
              value === 0 && isMyTurn && !disabled
                ? "cursor-pointer hover:bg-gray-a4"
                : ""
            } ${isWinningCell(index) ? "bg-blue-500/20 border-blue-500 animate-pulse" : ""}`}
            style={{
              borderColor: isWinningCell(index)
                ? "var(--blue-a8)"
                : "var(--gray-a8)",
              background:
                value && !isWinningCell(index)
                  ? "var(--gray-a3)"
                  : "var(--gray-a2)",
            }}
          >
            {isMovePending && index === pendingMoveIndex ? (
              <ClipLoader size={32} color="currentColor" />
            ) : (
              <span
                className={`transform transition-all duration-200 ${
                  value ? "scale-100" : "scale-0"
                } ${isWinningCell(index) ? "text-blue-500" : ""}`}
              >
                {getSymbol(value)}
              </span>
            )}
          </Box>
        ))}
      </div>

      <div className="text-center mt-2 h-6">
        <Text size="2" color="gray" className="transition-opacity duration-500">
          {game.status !== 0
            ? ""
            : isMyTurn
              ? isMovePending
                ? "Making move..."
                : "Your Turn!"
              : "Waiting on Opponent's Turn"}
        </Text>
      </div>
    </div>
  );
}

function GameStatus({ game }: { game: GameType }) {
  const [copied, setCopied] = useState(false);
  const isWaitingForPlayer =
    game.playerO ===
    "0x0000000000000000000000000000000000000000000000000000000000000000";
  const gameUrl = `${window.location.origin}/game/${game.id}`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(gameUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (isWaitingForPlayer) {
    return (
      <div className="text-center mb-8">
        <Text size="3" color="gray" mb="2">
          Waiting for another player to join...
        </Text>
        <div className="flex items-center gap-2 max-w-md mx-auto">
          <Text className="font-mono px-3 py-1 bg-gray-a3 rounded flex-1 truncate">
            {gameUrl}
          </Text>
          <button
            onClick={handleCopyLink}
            className="px-3 py-1 rounded bg-gray-a3 hover:bg-gray-a4 transition-colors"
          >
            {copied ? "Copied!" : "Copy"}
          </button>
        </div>
      </div>
    );
  }

  if (game.status === 2) {
    const winner = game.currentTurn;
    const isPlayerX = winner === game.playerX;
    const betInfo =
      game.betAmount > 0
        ? ` and won ${(game.betAmount * 2) / 1_000_000_000} SUI!`
        : "!";

    return (
      <Text size="3" align="center" className="mb-4">
        <span className={isPlayerX ? "text-blue-500" : "text-red-500"}>
          Player {isPlayerX ? "X" : "O"} Won{betInfo}
        </span>
        <br />
        <span className="text-sm text-gray-500 font-mono">
          {winner.slice(0, 10)}...{winner.slice(-4)}
        </span>
      </Text>
    );
  }

  if (game.status === 1) {
    return (
      <Text size="3" align="center" className="mb-4">
        Game ended in a draw!
      </Text>
    );
  }

  return (
    <Text size="3" align="center" className="mb-4">
      Current Turn:{" "}
      <span className="font-mono">
        {game.currentTurn.slice(0, 10)}...{game.currentTurn.slice(-4)}
      </span>
    </Text>
  );
}
