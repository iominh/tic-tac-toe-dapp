import { useCurrentAccount } from "@mysten/dapp-kit";
import { Box, Button, Flex, Text } from "@radix-ui/themes";
import { Game } from "../types";
import { useMemo } from "react";

interface GameBoardProps {
  game: Game;
  onMove: (position: number) => void;
  disabled?: boolean;
}

export function GameBoard({ game, onMove, disabled }: GameBoardProps) {
  const currentAccount = useCurrentAccount();

  const isMyTurn = useMemo(() => {
    return currentAccount?.address === game.currentTurn;
  }, [currentAccount, game.currentTurn]);

  const getSymbol = (value: number) => {
    if (value === 0) return "";
    return value === 1 ? "X" : "O";
  };

  const isWinningCell = (index: number): boolean => {
    // Add logic to determine if this cell is part of winning line
    // This would need to be added to your Game type and passed from the backend
    return false; // TODO: implement with actual game state
  };

  return (
    <div className="select-none">
      <div className="grid grid-cols-3 gap-4 mb-2">
        {game.board.map((value, index) => (
          <Box
            key={index}
            onClick={() =>
              !disabled && isMyTurn && value === 0 && onMove(index)
            }
            className={`w-20 h-20 flex items-center justify-center text-4xl font-bold border-2 rounded-lg transition-all duration-200 ${
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
            <span
              className={`transform transition-all duration-200 ${
                value ? "scale-100" : "scale-0"
              } ${isWinningCell(index) ? "text-blue-500" : ""}`}
            >
              {getSymbol(value)}
            </span>
          </Box>
        ))}
      </div>

      <div className="text-center mt-2">
        <Text size="2" color="gray" className="transition-opacity duration-500">
          {game.status !== 0
            ? game.status === 1
              ? "Game Draw!"
              : "Winner!"
            : isMyTurn
              ? "Your Turn!"
              : "Opponent's Turn"}
        </Text>
      </div>
    </div>
  );
}
