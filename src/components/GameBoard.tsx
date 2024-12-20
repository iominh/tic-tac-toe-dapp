import { useCurrentAccount } from "@mysten/dapp-kit";
import { Box, Text } from "@radix-ui/themes";
import { Game } from "../types";
import { useMemo } from "react";
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

  const isWinningCell = (_index: number): boolean => {
    return false; // TODO: implement with actual game state
  };

  return (
    <div className="select-none">
      <div className="text-center mb-4 h-24 flex flex-col justify-center">
        <Text size="2" color="gray">
          Game State:
        </Text>
        <Text size="2" color="gray">
          Player X: {formatAddress(game.playerX)}
        </Text>
        <Text size="2" color="gray">
          Player O:{" "}
          {game.playerO === "0x0"
            ? "Waiting for player"
            : formatAddress(game.playerO)}
        </Text>
        <Text size="2" color="gray">
          Current Turn:{" "}
          {game.currentTurn === "0x0"
            ? "Not started"
            : formatAddress(game.currentTurn)}
        </Text>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-2 w-[300px] mx-auto">
        {game.board.map((value, index) => (
          <Box
            key={index}
            onClick={() =>
              !disabled && isMyTurn && value === 0 && onMove(index)
            }
            className={`aspect-square flex items-center justify-center text-4xl font-bold border-2 rounded-lg transition-all duration-200 ${
              value === 0 && isMyTurn && !disabled
                ? "cursor-pointer hover:bg-gray-a4"
                : ""
            } ${isWinningCell(index) ? "bg-blue-500/20 border-blue-500" : ""}`}
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
