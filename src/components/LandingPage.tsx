import { ConnectButton } from "@mysten/dapp-kit";
import { Box, Flex, Heading, Text } from "@radix-ui/themes";
import { useState, useEffect } from "react";

const WINNING_LINES = [
  [0, 1, 2],
  [3, 4, 5],
  [6, 7, 8],
  [0, 3, 6],
  [1, 4, 7],
  [2, 5, 8],
  [0, 4, 8],
  [2, 4, 6],
];

const MOVE_DURATION = 1000; // Duration for each move
const GAME_RESET_DELAY = 3000; // Time to show winning state

export function LandingPage() {
  const [board, setBoard] = useState<string[]>(Array(9).fill(""));
  const [isX, setIsX] = useState(true);
  const [winningLine, setWinningLine] = useState<number[] | null>(null);

  // Check for winning line
  const checkWinner = (squares: string[], piece: string) => {
    for (const line of WINNING_LINES) {
      if (
        squares[line[0]] === piece &&
        squares[line[1]] === piece &&
        squares[line[2]] === piece
      ) {
        return line;
      }
    }
    return null;
  };

  useEffect(() => {
    // Winning sequence for X
    const sequence = [
      { player: "X", position: 4 }, // center
      { player: "O", position: 0 }, // top left
      { player: "X", position: 1 }, // top middle
      { player: "O", position: 3 }, // middle left
      { player: "X", position: 7 }, // bottom middle - wins
    ];

    function startGame() {
      let moveIndex = 0;
      setBoard(Array(9).fill(""));
      setIsX(true);
      setWinningLine(null);

      function playNextMove() {
        if (moveIndex >= sequence.length) {
          // Show winning state before resetting
          setTimeout(startGame, GAME_RESET_DELAY);
          return;
        }

        const move = sequence[moveIndex];
        setBoard((prev) => {
          const newBoard = [...prev];
          newBoard[move.position] = move.player;

          // Check for win after each move
          const winner = checkWinner(newBoard, move.player);
          if (winner) {
            setWinningLine(winner);
          }

          return newBoard;
        });

        setIsX(move.player === "O");
        moveIndex++;

        // Schedule next move if not won
        if (!checkWinner(board, move.player)) {
          setTimeout(playNextMove, MOVE_DURATION);
        } else {
          setTimeout(startGame, GAME_RESET_DELAY);
        }
      }

      // Start the sequence
      setTimeout(playNextMove, MOVE_DURATION);
    }

    startGame();

    return () => {
      const highestId = Number(setTimeout(() => {}, 0));
      for (let i = 0; i < highestId; i++) {
        clearTimeout(i);
      }
    };
  }, []);

  return (
    <Flex direction="column" align="center" gap="8" className="text-center">
      <div className="animate-fade-in">
        <Heading size="8" mb="4">
          Play Tic Tac Toe on Sui
        </Heading>
        <Text size="5" color="gray" mb="8">
          Challenge friends to a game of Tic Tac Toe on the blockchain
        </Text>
      </div>

      <div className="select-none">
        <div className="grid grid-cols-3 gap-4 mb-2">
          {board.map((cell, index) => (
            <Box
              key={index}
              className={`w-20 h-20 flex items-center justify-center text-4xl font-bold border-2 rounded-lg transition-all duration-200 animate-fade-in pointer-events-none ${
                winningLine?.includes(index)
                  ? "bg-blue-500/20 border-blue-500"
                  : ""
              }`}
              style={{
                borderColor: winningLine?.includes(index)
                  ? "var(--blue-a8)"
                  : "var(--gray-a8)",
                background:
                  cell && !winningLine?.includes(index)
                    ? "var(--gray-a3)"
                    : "var(--gray-a2)",
              }}
            >
              <span
                className={`transform transition-all duration-200 ${
                  cell ? "scale-100" : "scale-0"
                } ${winningLine?.includes(index) ? "text-blue-500" : ""}`}
              >
                {cell}
              </span>
            </Box>
          ))}
        </div>

        <div className="text-center mt-2">
          <Text
            size="2"
            color="gray"
            className="transition-opacity duration-500"
          >
            {winningLine ? "Winner!" : `${isX ? "X" : "O"}'s Turn...`}
          </Text>
        </div>
      </div>

      <Flex direction="column" gap="4" className="animate-slide-up">
        <ConnectButton />
        <Text size="2" color="gray">
          Connect your wallet to start playing
        </Text>
      </Flex>
    </Flex>
  );
}
