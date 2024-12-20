import { useSuiClient } from "@mysten/dapp-kit";
import { Table, Text } from "@radix-ui/themes";
import { useEffect, useState, useCallback } from "react";
import { useNetworkVariable } from "../networkConfig";
import { GameResult, GameStatus } from "../types";
import { useNavigate } from "react-router-dom";

function parseGameResult(fields: Record<string, any>): GameResult {
  console.log("Parsing GameResult fields:", fields);

  return {
    gameId: fields.game_id.toLowerCase(),
    playerX: fields.player_x.toLowerCase(),
    playerO: fields.player_o.toLowerCase(),
    winner: fields.winner,
    status: fields.status as GameStatus,
    timestamp: Date.now(),
    betAmount: fields.bet_amount || 0,
  };
}

function formatGameResult(result: GameResult) {
  if (result.winner) {
    const isPlayerX = result.winner === result.playerX;
    const betInfo =
      result.betAmount > 0 ? (
        <>
          {" "}
          <span className="text-green-500">
            (+{(result.betAmount * 2) / 1_000_000_000} SUI)
          </span>
        </>
      ) : (
        ""
      );

    return (
      <span>
        <span className={isPlayerX ? "text-blue-500" : "text-violet-500"}>
          Player {isPlayerX ? "X" : "O"} Won
        </span>
        {betInfo}
      </span>
    );
  }

  // Handle draw with bet return info
  const betInfo =
    result.betAmount > 0 ? (
      <>
        {" "}
        <span className="text-gray-400">(Bets Returned)</span>
      </>
    ) : (
      ""
    );

  return <span>Draw{betInfo}</span>;
}

export function GameHistory() {
  const packageId = useNetworkVariable("ticTacToePackageId");
  const suiClient = useSuiClient();
  const [games, setGames] = useState<GameResult[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  // Fetch all game results
  const fetchGameResults = useCallback(async () => {
    try {
      const events = await suiClient.queryEvents({
        query: {
          MoveEventType: `${packageId}::game::GameResult`,
        },
        order: "descending",
        limit: 50,
      });

      const results = events.data.map((event) =>
        parseGameResult(event.parsedJson as Record<string, any>),
      );

      setGames((prev) => {
        // Check for new games
        const newGames = results.filter(
          (result) => !prev.some((game) => game.gameId === result.gameId),
        );
        if (newGames.length > 0) {
          // Add new games with animation
          return [...newGames, ...prev];
        }
        return prev;
      });

      setLoading(false);
    } catch (e) {
      console.error("Failed to fetch game history:", e);
      setLoading(false);
    }
  }, [packageId, suiClient]);

  // Poll for updates
  useEffect(() => {
    let mounted = true;
    let timeoutId: ReturnType<typeof setTimeout>;

    async function pollGameResults() {
      if (!mounted) return;

      await fetchGameResults();

      // Schedule next poll
      timeoutId = setTimeout(pollGameResults, 2000); // Poll every 2 seconds
    }

    // Initial fetch
    pollGameResults();

    return () => {
      mounted = false;
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [fetchGameResults]);

  if (loading) {
    return (
      <div className="text-center text-gray-500">Loading game history...</div>
    );
  }

  if (games.length === 0) {
    return (
      <div className="text-center text-gray-500">No completed games yet</div>
    );
  }

  return (
    <Table.Root>
      <Table.Header>
        <Table.Row>
          <Table.ColumnHeaderCell>Player X</Table.ColumnHeaderCell>
          <Table.ColumnHeaderCell>Player O</Table.ColumnHeaderCell>
          <Table.ColumnHeaderCell>Result</Table.ColumnHeaderCell>
        </Table.Row>
      </Table.Header>

      <Table.Body>
        {games.map((game) => (
          <Table.Row
            key={`${game.gameId}-${game.timestamp}`}
            className="animate-fade-in cursor-pointer transition-colors hover:bg-accent"
            onClick={() => navigate(`/game/${game.gameId}`)}
          >
            <Table.Cell className="font-mono">
              {game.playerX.slice(0, 6)}...
            </Table.Cell>
            <Table.Cell className="font-mono">
              {game.playerO.slice(0, 6)}...
            </Table.Cell>
            <Table.Cell>
              <Text size="2">{formatGameResult(game)}</Text>
            </Table.Cell>
          </Table.Row>
        ))}
      </Table.Body>
    </Table.Root>
  );
}
