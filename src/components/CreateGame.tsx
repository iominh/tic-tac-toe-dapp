import { useSignAndExecuteTransaction, useSuiClient } from "@mysten/dapp-kit";
import { Button, Flex, Text } from "@radix-ui/themes";
import { useState } from "react";
import { useNetworkVariable } from "../networkConfig";
import { Transaction } from "@mysten/sui/transactions";
import ClipLoader from "react-spinners/ClipLoader";

interface CreateGameProps {
  onGameCreated: (gameId: string) => void;
}

export function CreateGame({ onGameCreated }: CreateGameProps) {
  const packageId = useNetworkVariable("ticTacToePackageId");
  const suiClient = useSuiClient();
  const { mutate: signAndExecute } = useSignAndExecuteTransaction();
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function create() {
    setIsCreating(true);
    setError(null);

    try {
      const tx = new Transaction();
      tx.moveCall({
        arguments: [],
        target: `${packageId}::game::create_game`,
      });

      signAndExecute(
        {
          transaction: tx,
        },
        {
          onSuccess: async ({ digest }) => {
            try {
              await suiClient.waitForTransaction({
                digest,
              });

              const txDetails = await suiClient.getTransactionBlock({
                digest,
                options: {
                  showEffects: true,
                  showInput: true,
                  showEvents: true,
                },
              });

              const createdObjectId =
                txDetails.effects?.created?.[0]?.reference?.objectId;

              if (createdObjectId) {
                onGameCreated(createdObjectId);
              } else {
                setError("Could not find created game ID");
              }
            } catch (e) {
              setError(`Error processing transaction: ${e}`);
            } finally {
              setIsCreating(false);
            }
          },
          onError: (e) => {
            setError(`Transaction failed: ${e.message}`);
            setIsCreating(false);
          },
        },
      );
    } catch (e) {
      setError(`Failed to create game: ${e}`);
      setIsCreating(false);
    }
  }

  return (
    <Flex direction="column" gap="4" align="center">
      {error && <Text color="red">{error}</Text>}
      <Button size="3" onClick={create} disabled={isCreating}>
        {isCreating ? (
          <Flex align="center" gap="2">
            <ClipLoader size={16} color="currentColor" />
            <span>Creating Game...</span>
          </Flex>
        ) : (
          "Create New Game"
        )}
      </Button>
    </Flex>
  );
}
