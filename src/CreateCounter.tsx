import { Transaction } from "@mysten/sui/transactions";
import { Button, Container, Text } from "@radix-ui/themes";
import { useSignAndExecuteTransaction, useSuiClient } from "@mysten/dapp-kit";
import { useNetworkVariable } from "./networkConfig";
import ClipLoader from "react-spinners/ClipLoader";
import { useState } from "react";

export function CreateCounter({
  onCreated,
}: {
  onCreated: (id: string) => void;
}) {
  const counterPackageId = useNetworkVariable("counterPackageId");
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
        target: `${counterPackageId}::counter::create`,
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

              // Get transaction effects
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
                onCreated(createdObjectId);
              } else {
                setError("Could not find created counter ID");
              }
            } catch (e) {
              setError(`Error processing transaction: ${e}`);
            }
          },
          onError: (e) => {
            setError(`Transaction failed: ${e.message}`);
          },
        },
      );
    } catch (e) {
      setError(`Failed to create counter: ${e}`);
    } finally {
      setIsCreating(false);
    }
  }

  return (
    <Container>
      {error && <Text color="red">{error}</Text>}
      <Button size="3" onClick={create} disabled={isCreating}>
        {isCreating ? <ClipLoader size={20} /> : "Create Counter"}
      </Button>
    </Container>
  );
}
