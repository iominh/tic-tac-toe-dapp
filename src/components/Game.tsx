import {
  useCurrentAccount,
  useSignAndExecuteTransaction,
  useSuiClient,
  useSuiClientQuery,
} from "@mysten/dapp-kit";
import { Transaction } from "@mysten/sui/transactions";
import { Button, Flex, Text } from "@radix-ui/themes";
import { useCallback, useEffect, useState } from "react";
import { useNetworkVariable } from "../networkConfig";
import { Game as GameType, GameResult } from "../types";
import { GameBoard } from "./GameBoard";
import { GameHistory } from "./GameHistory";

interface GameProps {
  id: string;
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

  const game = gameData?.data?.content?.fields as GameType | undefined;

  // Subscribe to events
  useEffect(() => {
    const subscription = suiClient.subscribeEvent({
      filter: {
        Package: packageId,
      },
      onMessage(event: any) {
        const result = event.parsedJson as GameResult;
        setGameHistory((prev) => [result, ...prev]);
      },
    });

    return () => {
      subscription.unsubscribe();
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
