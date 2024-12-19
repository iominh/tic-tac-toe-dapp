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
import { SuiObjectResponse } from "@mysten/sui/client";

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

  // Subscribe to events
  useEffect(() => {
    let unsubscribe: (() => void) | undefined;

    async function subscribe() {
      try {
        unsubscribe = await suiClient.subscribeEvent({
          filter: {
            Package: packageId,
          },
          onMessage(event: any) {
            const result = event.parsedJson as GameResult;
            setGameHistory((prev) => [result, ...prev]);
          },
        });
      } catch (e) {
        setError(`Failed to subscribe to events: ${e}`);
      }
    }

    subscribe();

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [packageId, suiClient]);

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
          onSuccess: ({ digest }) => {
            suiClient.waitForTransaction({ digest }).then(() => refetch());
          },
          onError: (e) => setError(`Failed to make move: ${e.message}`),
        },
      );
    },
    [id, packageId, refetch, signAndExecute, suiClient],
  );

  if (!game) {
    return <Text>Loading game...</Text>;
  }

  const canJoin =
    currentAccount &&
    game.playerO === "0x0" &&
    game.playerX !== currentAccount.address;

  return (
    <Flex direction="column" gap="4">
      {error && <Text color="red">{error}</Text>}

      {canJoin ? (
        <Button onClick={joinGame}>Join Game</Button>
      ) : (
        <GameBoard game={game} onMove={makeMove} disabled={game.status !== 0} />
      )}

      <div className="mt-8">
        <Text size="5" mb="4">
          Game History
        </Text>
        <GameHistory games={gameHistory} />
      </div>
    </Flex>
  );
}
