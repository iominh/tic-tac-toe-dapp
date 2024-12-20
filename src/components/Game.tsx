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

  const { data: gameData, refetch } = useSuiClientQuery("getObject", {
    id,
    options: {
      showContent: true,
      showOwner: true,
    },
  });

  const game = useMemo(() => {
    if (!gameData?.data?.content) return undefined;

    const raw = gameData.data.content as unknown as RawGameData;
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

  const joinGame = useCallback(() => {
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
        onSuccess: ({ digest }) => {
          suiClient.waitForTransaction({ digest }).then(() => refetch());
        },
        onError: (e) => setError(`Failed to join: ${e.message}`),
      },
    );
  }, [id, packageId, refetch, signAndExecute, suiClient]);

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
              // Wait for transaction
              await suiClient.waitForTransaction({ digest });

              // Get transaction details
              const txDetails = await suiClient.getTransactionBlock({
                digest,
                options: {
                  showEvents: true,
                },
              });

              // Update history if there's a game result event
              const gameResultEvent = txDetails.events?.find(
                (event) => event.type === `${packageId}::game::GameResult`,
              );

              if (gameResultEvent) {
                const result = gameResultEvent.parsedJson as GameResult;
                setGameHistory((prev) => [result, ...prev]);
              }

              // Refresh game state
              refetch();
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
    [id, packageId, refetch, signAndExecute, suiClient],
  );

  if (!game) {
    return (
      <Flex align="center" justify="center" className="h-full">
        <Text>Loading game...</Text>
      </Flex>
    );
  }

  const canJoin =
    currentAccount &&
    game.playerO === "0x0" &&
    game.playerX !== currentAccount.address;

  return (
    <Flex direction="column" align="center" gap="8" className="w-full">
      {error && (
        <Text color="red" align="center">
          {error}
        </Text>
      )}

      {canJoin ? (
        <Button onClick={joinGame}>Join Game</Button>
      ) : (
        <GameBoard
          game={game}
          onMove={makeMove}
          disabled={game.status !== 0}
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
