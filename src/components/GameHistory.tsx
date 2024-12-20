import { useSuiClient } from "@mysten/dapp-kit";
import { Table } from "@radix-ui/themes";
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
  };
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
              {game.status === 1 ? (
                "Draw"
              ) : game.status === 2 && game.winner ? (
                <span>
                  {game.winner === game.playerX ? (
                    <span>
                      <span className="text-blue-500">Player X</span> won!
                      <br />
                      <span className="text-sm text-gray-500 font-mono">
                        {game.playerX.slice(0, 10)}...{game.playerX.slice(-4)}
                      </span>
                    </span>
                  ) : (
                    <span>
                      <span className="text-red-500">Player O</span> won!
                      <br />
                      <span className="text-sm text-gray-500 font-mono">
                        {game.playerO.slice(0, 10)}...{game.playerO.slice(-4)}
                      </span>
                    </span>
                  )}
                </span>
              ) : (
                "Complete"
              )}
            </Table.Cell>
          </Table.Row>
        ))}
      </Table.Body>
    </Table.Root>
  );
}
