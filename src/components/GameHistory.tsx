import { Table } from "@radix-ui/themes";
import { GameResult } from "../types";

interface GameHistoryProps {
  games: GameResult[];
}

export function GameHistory({ games }: GameHistoryProps) {
  console.log("Rendering game history with:", games);

  if (games.length === 0) {
    return <div className="text-center text-gray-500">No game history yet</div>;
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
        {games.map((game, index) => (
          <Table.Row key={`${game.gameId}-${index}`}>
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
