import { useCurrentAccount } from "@mysten/dapp-kit";
import { Box, Button, Flex, Text } from "@radix-ui/themes";
import { Game } from "../types";
import { useMemo, useState } from "react";
import ClipLoader from "react-spinners/ClipLoader";

interface GameBoardProps {
  game: Game;
  onMove: (position: number) => void;
  disabled?: boolean;
  isMovePending?: boolean;
  pendingMoveIndex?: number | null;
}

// Helper function to format addresses
function formatAddress(address: string): string {
  if (address === "0x0") return "Waiting for player";
  return `${address.slice(0, 8)}...${address.slice(-4)}`;
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
  const [copied, setCopied] = useState(false);

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

  const handleCopyLink = () => {
    const gameUrl = `${window.location.origin}${window.location.pathname}#${game.id}`;
    navigator.clipboard.writeText(gameUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const isWaitingForPlayer =
    game.playerO ===
    "0x0000000000000000000000000000000000000000000000000000000000000000";
  const gameUrl = `${window.location.origin}${window.location.pathname}#${game.id}`;

  return (
    <div className="select-none">
      <div className="text-center mb-4 h-24 flex flex-col justify-center">
        <Text size="2" color="gray">
          Player X: {formatAddress(game.playerX)}
        </Text>
        {isWaitingForPlayer ? (
          <Flex direction="column" align="center" gap="2">
            <Text size="2" color="gray">
              Waiting for friend to join...
            </Text>
            <Flex align="center" gap="2" className="w-full max-w-md">
              <Text
                size="2"
                className="font-mono px-3 py-1 bg-gray-a3 rounded flex-1 truncate"
              >
                {gameUrl}
              </Text>
              <Button
                onClick={handleCopyLink}
                size="1"
                className="transition-colors shrink-0"
              >
                {copied ? "Copied!" : "Copy link to share with friend"}
              </Button>
            </Flex>
          </Flex>
        ) : (
          <>
            <Text size="2" color="gray">
              Player O: {formatAddress(game.playerO)}
            </Text>
            <Text size="2" color="gray">
              Current Turn:{" "}
              {game.currentTurn === "0x0"
                ? "Not started"
                : formatAddress(game.currentTurn)}
            </Text>
          </>
        )}
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
            ? game.status === 1
              ? "Game Draw!"
              : "Winner!"
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
