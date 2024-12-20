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
import { useParams } from "react-router-dom";

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

function parseGameResult(fields: Record<string, any>): GameResult {
  console.log("Parsing fields:", fields);

  let winner = null;
  if (fields.winner && !fields.winner.none) {
    winner = fields.winner.some?.toLowerCase() || null;
  }

  return {
    gameId: fields.game_id.toLowerCase(),
    playerX: fields.player_x.toLowerCase(),
    playerO: fields.player_o.toLowerCase(),
    winner: winner,
    status: fields.status as GameStatus,
  };
}

export function Game({
  onLoadingChange,
}: {
  onLoadingChange?: (loading: boolean) => void;
}) {
  const { gameId } = useParams();
  const packageId = useNetworkVariable("ticTacToePackageId");
  const currentAccount = useCurrentAccount();
  const suiClient = useSuiClient();
  const { mutate: signAndExecute } = useSignAndExecuteTransaction();
  const [, setGameHistory] = useState<GameResult[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [pendingMove, setPendingMove] = useState<number | null>(null);

  // Validate gameId
  if (!gameId) {
    return <div>Invalid game ID</div>;
  }

  // Use page progress bar only for initial load
  const { data: gameData, refetch } = useSuiClientQuery("getObject", {
    id: gameId,
    options: {
      showContent: true,
      showOwner: true,
    },
  });

  // Handle loading state based on game data
  useEffect(() => {
    if (!gameData) {
      onLoadingChange?.(true);
    } else {
      onLoadingChange?.(false);
    }
  }, [gameData, onLoadingChange]);

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

  // Efficient polling with proper cleanup and error handling
  useEffect(() => {
    let mounted = true;
    let timeoutId: ReturnType<typeof setTimeout>;

    async function pollGameState() {
      if (!mounted) return;

      try {
        await refetch();

        // Schedule next poll if game is active
        if (mounted && game?.status === 0) {
          timeoutId = setTimeout(pollGameState, 1000);
        }
      } catch (e) {
        console.error("Poll error:", e);
        // Retry on error with backoff
        if (mounted) {
          timeoutId = setTimeout(pollGameState, 2000);
        }
      }
    }

    // Start polling
    pollGameState();

    // Cleanup
    return () => {
      mounted = false;
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [game?.status, refetch]);

  // Fetch initial history and subscribe to game results
  useEffect(() => {
    let mounted = true;
    let unsubscribe: (() => void) | undefined;

    async function fetchHistory() {
      try {
        const resultEvents = await suiClient.queryEvents({
          query: {
            MoveEventType: `${packageId}::game::GameResult`,
          },
          order: "descending",
          limit: 50,
        });

        console.log("Raw GameResult events:", resultEvents.data);

        if (!mounted) return;

        // Filter and parse events for this specific game
        const gameResults = resultEvents.data
          .filter((event) => {
            if (!event.parsedJson) {
              console.log("Event missing parsedJson:", event);
              return false;
            }
            const parsedJson = event.parsedJson as Record<string, any>;
            if (!parsedJson.game_id) {
              console.log("Event missing game_id:", parsedJson);
              return false;
            }
            return parsedJson.game_id.toLowerCase() === gameId.toLowerCase();
          })
          .map((event) => {
            try {
              return parseGameResult(event.parsedJson as Record<string, any>);
            } catch (e) {
              console.error("Failed to parse event:", event, e);
              return null;
            }
          })
          .filter((result): result is GameResult => result !== null);

        console.log("Final filtered game results:", gameResults);
        setGameHistory(gameResults);
      } catch (e) {
        console.error("Failed to fetch game history:", e);
      }
    }

    async function setupSubscription() {
      try {
        unsubscribe = await suiClient.subscribeEvent({
          filter: {
            MoveEventType: `${packageId}::game::GameResult`,
          },
          onMessage: (event) => {
            const result = parseGameResult(
              event.parsedJson as Record<string, any>,
            );
            if (result.gameId === gameId) {
              setGameHistory((prev) => [result, ...prev]);
            }
          },
        });
      } catch (e) {
        console.error("Failed to subscribe to events:", e);
      }
    }

    fetchHistory();
    setupSubscription();

    return () => {
      mounted = false;
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [packageId, suiClient, gameId]);

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
      arguments: [tx.object(gameId)],
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
            await refetch();
          } catch (e) {
            setError(`Failed to join game: ${e}`);
          }
        },
        onError: (e) => setError(`Failed to join: ${e.message}`),
      },
    );
  }, [gameId, packageId, refetch, signAndExecute, suiClient, game]);

  const makeMove = useCallback(
    (position: number) => {
      setPendingMove(position);
      setError(null);

      const tx = new Transaction();
      tx.moveCall({
        arguments: [tx.object(gameId), tx.pure.u8(position)],
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
              await refetch();
              setError(null);
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
    [gameId, packageId, refetch, signAndExecute, suiClient],
  );

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

      {canJoin ? (
        <Flex direction="column" gap="4" align="center">
          <Text>This game needs another player!</Text>
          <Button onClick={joinGame}>Join as Player O</Button>
        </Flex>
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
        <GameHistory />
      </div>
    </Flex>
  );
}
