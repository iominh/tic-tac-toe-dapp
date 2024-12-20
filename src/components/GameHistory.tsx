import { useSuiClient } from "@mysten/dapp-kit";
import { Table } from "@radix-ui/themes";
import { useEffect, useState } from "react";
import { useNetworkVariable } from "../networkConfig";
import { GameResult, GameStatus } from "../types";
import { Link } from "react-router-dom";

function parseGameResult(fields: Record<string, any>): GameResult {
  return {
    gameId: fields.game_id.toLowerCase(),
    playerX: fields.player_x.toLowerCase(),
    playerO: fields.player_o.toLowerCase(),
    winner: fields.winner.none ? null : fields.winner,
    status: fields.status as GameStatus,
  };
}

export function GameHistory() {
  const packageId = useNetworkVariable("ticTacToePackageId");
  const suiClient = useSuiClient();
  const [games, setGames] = useState<GameResult[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchAllGameResults() {
      try {
        const events = await suiClient.queryEvents({
          query: {
            MoveEventType: `${packageId}::game::GameResult`,
          },
          order: "descending",
          limit: 50,
        });

        console.log("All game results:", events.data);

        const results = events.data.map((event) =>
          parseGameResult(event.parsedJson as Record<string, any>),
        );

        setGames(results);
      } catch (e) {
        console.error("Failed to fetch game history:", e);
      } finally {
        setLoading(false);
      }
    }

    fetchAllGameResults();
  }, [packageId, suiClient]);

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
          <Table.ColumnHeaderCell>Game ID</Table.ColumnHeaderCell>
          <Table.ColumnHeaderCell>Player X</Table.ColumnHeaderCell>
          <Table.ColumnHeaderCell>Player O</Table.ColumnHeaderCell>
          <Table.ColumnHeaderCell>Result</Table.ColumnHeaderCell>
        </Table.Row>
      </Table.Header>

      <Table.Body>
        {games.map((game, index) => (
          <Table.Row key={`${game.gameId}-${index}`}>
            <Table.Cell className="font-mono">
              <Link
                to={`/game/${game.gameId}`}
                className="text-blue-500 hover:text-blue-600"
              >
                {game.gameId.slice(0, 8)}...
              </Link>
            </Table.Cell>
            <Table.Cell className="font-mono">
              {game.playerX.slice(0, 6)}...
            </Table.Cell>
            <Table.Cell className="font-mono">
              {game.playerO.slice(0, 6)}...
            </Table.Cell>
            <Table.Cell>
              {game.status === 1
                ? "Draw"
                : game.winner
                  ? `Winner: ${game.winner.slice(0, 6)}...`
                  : "In Progress"}
            </Table.Cell>
          </Table.Row>
        ))}
      </Table.Body>
    </Table.Root>
  );
}
