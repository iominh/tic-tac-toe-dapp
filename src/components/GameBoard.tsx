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

  return (
    <Box className="w-full max-w-md mx-auto">
      <div className="grid grid-cols-3 gap-2">
        {game.board.map((value, index) => (
          <Button
            key={index}
            size="4"
            variant={value === 0 ? "surface" : "solid"}
            onClick={() => onMove(index)}
            disabled={disabled || !isMyTurn || value !== 0}
            className="aspect-square text-2xl font-bold"
          >
            {getSymbol(value)}
          </Button>
        ))}
      </div>

      <Flex direction="column" gap="2" align="center" className="mt-4">
        <Text>
          {game.status === 0
            ? `Current Turn: ${game.currentTurn === game.playerX ? "X" : "O"}`
            : game.status === 1
              ? "Game Draw!"
              : `Winner: ${game.currentTurn === game.playerX ? "X" : "O"}`}
        </Text>
        {currentAccount && (
          <Text size="2">
            You are: {currentAccount.address === game.playerX ? "X" : "O"}
          </Text>
        )}
      </Flex>
    </Box>
  );
}
