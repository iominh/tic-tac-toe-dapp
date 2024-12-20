import { useSignAndExecuteTransaction, useSuiClient } from "@mysten/dapp-kit";
import { Button, Flex, Text } from "@radix-ui/themes";
import { useState, useCallback } from "react";
import { useNetworkVariable } from "../networkConfig";
import { Transaction } from "@mysten/sui/transactions";
import ClipLoader from "react-spinners/ClipLoader";

interface CreateGameProps {
  onGameCreated: (id: string) => void;
}

export function CreateGame({ onGameCreated }: CreateGameProps) {
  const packageId = useNetworkVariable("ticTacToePackageId");
  const suiClient = useSuiClient();
  const { mutate: signAndExecute } = useSignAndExecuteTransaction();
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [betAmount, setBetAmount] = useState<number>(0);

  const handleCreateGame = useCallback(() => {
    setIsCreating(true);
    setError(null);

    try {
      const tx = new Transaction();

      // Split coins from gas object if bet amount > 0
      if (betAmount > 0) {
        const [coin] = tx.splitCoins(tx.gas, [
          tx.pure.u64(betAmount * 1_000_000_000),
        ]); // Convert to MIST
        tx.moveCall({
          arguments: [coin], // Use the split coin directly
          target: `${packageId}::game::create_game`,
        });
      } else {
        // Create game with zero bet
        const [zeroCoin] = tx.splitCoins(tx.gas, [tx.pure.u64(0)]);
        tx.moveCall({
          arguments: [zeroCoin],
          target: `${packageId}::game::create_game`,
        });
      }

      signAndExecute(
        { transaction: tx },
        {
          onSuccess: async ({ digest }) => {
            try {
              await suiClient.waitForTransaction({ digest });

              console.log("Transaction digest:", digest);
              console.log("Package ID:", packageId);

              // Get full transaction details
              const txDetails = await suiClient.getTransactionBlock({
                digest,
                options: {
                  showEffects: true,
                  showInput: true,
                  showEvents: true,
                },
              });

              console.log("Transaction details:", txDetails);
              console.log("Created objects:", txDetails.effects?.created);

              // Look for the created Game object
              const createdGameId = txDetails.effects?.created?.find(
                (item) => item.owner?.Shared !== undefined, // Check for Shared ownership structure
              )?.reference?.objectId;

              if (createdGameId) {
                console.log("Found game with ID:", createdGameId);
                onGameCreated(createdGameId);
              } else {
                console.error("Transaction effects:", txDetails.effects);
                setError(
                  "Could not find created game ID. Check console for details.",
                );
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
  }, [betAmount, packageId, signAndExecute, suiClient, onGameCreated]);

  return (
    <Flex direction="column" gap="4" align="center">
      {error && <Text color="red">{error}</Text>}

      <Flex direction="column" gap="2" className="w-full max-w-xs">
        <Text as="label" size="2" color="gray">
          SUI Bet Amount (Optional)
        </Text>
        <input
          type="number"
          min="0"
          step="0.1"
          value={betAmount}
          onChange={(e) => setBetAmount(Number(e.target.value))}
          placeholder="Amount in SUI"
          className="px-3 py-2 rounded border border-gray-a6 bg-gray-a2"
        />
        <Text size="1" color="gray">
          Leave empty or 0 for a friendly game. Winner takes all.
        </Text>
      </Flex>

      <Button size="3" onClick={handleCreateGame} disabled={isCreating}>
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
