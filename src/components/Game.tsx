import {
  useCurrentAccount,
  useSignAndExecuteTransaction,
  useSuiClient,
  useSuiClientQuery,
} from "@mysten/dapp-kit";
import { Transaction } from "@mysten/sui/transactions";
import { Button, Flex, Text } from "@radix-ui/themes";
import { useCallback, useEffect, useState, useMemo } from "react";
import { useNetworkVariable } from "../networkConfig";
import { Game as GameType, GameResult, GameStatus } from "../types";
import { GameBoard } from "./GameBoard";
import { GameHistory } from "./GameHistory";

interface GameProps {
  id: string;
}

interface RawGameData {
  type: string;
  fields: {
    id: { id: string };
    board: number[];
    player_x: string;
    player_o: string;
    current_turn: string;
    status: number;
  };
}

export function Game({ id }: GameProps) {
  const packageId = useNetworkVariable("ticTacToePackageId");
  const currentAccount = useCurrentAccount();
  const suiClient = useSuiClient();
  const { mutate: signAndExecute } = useSignAndExecuteTransaction();
  const [gameHistory, setGameHistory] = useState<GameResult[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [pendingMove, setPendingMove] = useState<number | null>(null);
  const [isPolling, setIsPolling] = useState(false);

  const { data: gameData, refetch } = useSuiClientQuery("getObject", {
    id,
    options: {
      showContent: true,
      showOwner: true,
    },
  });

  // Define refetchWithIndicator before it's used
  const refetchWithIndicator = useCallback(async () => {
    setIsPolling(true);
    try {
      await refetch();
    } finally {
      setIsPolling(false);
    }
  }, [refetch]);

  const game = useMemo(() => {
    if (!gameData?.data?.content) return undefined;

    const raw = gameData.data.content as unknown as RawGameData;
    console.log("Raw game data:", raw);

    // Validate fields
    if (!raw.fields.player_x || !raw.fields.current_turn) {
      console.error("Invalid game data:", raw.fields);
      return undefined;
    }

    return {
      id: raw.fields.id.id,
      board: raw.fields.board,
      playerX: raw.fields.player_x,
      playerO: raw.fields.player_o,
      currentTurn: raw.fields.current_turn,
      status: raw.fields.status as GameStatus,
    } satisfies GameType;
  }, [gameData]);

  // Subscribe to events and fetch initial history
  useEffect(() => {
    let unsubscribe: (() => void) | undefined;

    async function fetchHistory() {
      try {
        // Query all events from this package
        const events = await suiClient.queryEvents({
          query: {
            Package: packageId,
          },
          order: "descending",
          limit: 50,
        });

        console.log("Package ID:", packageId);
        console.log("Game ID:", id);
        console.log("Raw events:", events.data);

        const gameResults = events.data
          .filter((event) => {
            // Check if it's our event type
            const isGameResult =
              event.type === `${packageId}::game::GameResult`;
            console.log(
              "Event type:",
              event.type,
              "Is game result:",
              isGameResult,
            );

            if (!isGameResult) return false;

            const result = event.parsedJson as GameResult;
            const matchesGame = result.gameId === id;
            console.log(
              "Event game ID:",
              result.gameId,
              "Matches current game:",
              matchesGame,
            );

            return matchesGame;
          })
          .map((event) => {
            const result = event.parsedJson as GameResult;
            console.log("Adding result to history:", result);
            return result;
          });

        console.log("Final game results:", gameResults);
        setGameHistory(gameResults);
      } catch (e) {
        console.error("Failed to fetch game history:", e);
      }
    }

    async function subscribe() {
      try {
        unsubscribe = await suiClient.subscribeEvent({
          filter: {
            Package: packageId,
          },
          onMessage(event: any) {
            if (event.type !== `${packageId}::game::GameResult`) return;

            console.log("New event received:", event);
            const result = event.parsedJson as GameResult;

            if (result.gameId === id) {
              console.log("Adding new result to history:", result);
              setGameHistory((prev) => [result, ...prev]);
            }
          },
        });
      } catch (e) {
        setError(`Failed to subscribe to events: ${e}`);
      }
    }

    fetchHistory();
    subscribe();

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [packageId, suiClient, id]);

  const canJoin = useMemo(() => {
    if (!currentAccount || !game) return false;
    return (
      game.playerO ===
        "0x0000000000000000000000000000000000000000000000000000000000000000" &&
      game.playerX !== currentAccount.address
    );
  }, [currentAccount, game]);

  const joinGame = useCallback(() => {
    if (!game) return;

    const tx = new Transaction();
    tx.moveCall({
      arguments: [tx.object(id)],
      target: `${packageId}::game::join_game`,
    });

    signAndExecute(
      {
        transaction: tx,
      },
      {
        onSuccess: async ({ digest }) => {
          try {
            await suiClient.waitForTransaction({ digest });
            await refetchWithIndicator();
          } catch (e) {
            setError(`Failed to join game: ${e}`);
          }
        },
        onError: (e) => setError(`Failed to join: ${e.message}`),
      },
    );
  }, [id, packageId, refetchWithIndicator, signAndExecute, suiClient, game]);

  const makeMove = useCallback(
    (position: number) => {
      setPendingMove(position);
      const tx = new Transaction();
      tx.moveCall({
        arguments: [tx.object(id), tx.pure.u8(position)],
        target: `${packageId}::game::make_move`,
      });

      signAndExecute(
        {
          transaction: tx,
        },
        {
          onSuccess: async ({ digest }) => {
            try {
              await suiClient.waitForTransaction({ digest });
              await refetchWithIndicator();
            } catch (e) {
              setError(`Error processing move: ${e}`);
            } finally {
              setPendingMove(null);
            }
          },
          onError: (e) => {
            setError(`Failed to make move: ${e.message}`);
            setPendingMove(null);
          },
        },
      );
    },
    [id, packageId, refetchWithIndicator, signAndExecute, suiClient],
  );

  // Add polling effect
  useEffect(() => {
    // Only poll if we're in an active game
    if (!game || game.status !== 0) return;

    const pollInterval = setInterval(() => {
      refetch();
    }, 2000); // Poll every 2 seconds

    return () => {
      clearInterval(pollInterval);
    };
  }, [game, refetch]);

  if (!game) {
    return (
      <Flex align="center" justify="center" className="h-full">
        <Text>Loading game...</Text>
      </Flex>
    );
  }

  return (
    <Flex direction="column" align="center" gap="8" className="w-full">
      {error && (
        <Text color="red" align="center">
          {error}
        </Text>
      )}

      {/* Add polling indicator */}
      {isPolling && (
        <Text size="1" color="gray" className="animate-pulse">
          Updating...
        </Text>
      )}

      {canJoin ? (
        <Flex direction="column" gap="4" align="center">
          <Text>This game needs another player!</Text>
          <Button onClick={joinGame}>Join as Player O</Button>
        </Flex>
      ) : (
        <GameBoard
          game={game}
          onMove={makeMove}
          disabled={game.status !== 0 || isPolling}
          isMovePending={pendingMove !== null}
          pendingMoveIndex={pendingMove}
        />
      )}

      <div className="w-full max-w-2xl">
        <Text size="5" weight="bold" mb="4">
          Game History
        </Text>
        <GameHistory games={gameHistory} />
      </div>
    </Flex>
  );
}
