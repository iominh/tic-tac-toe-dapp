import { Table } from "@radix-ui/themes";
import { GameResult } from "../types";

interface GameHistoryProps {
  games: GameResult[];
}

export function GameHistory({ games }: GameHistoryProps) {
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
          <Table.Row key={game.gameId}>
            <Table.Cell className="font-mono">{game.playerX}</Table.Cell>
            <Table.Cell className="font-mono">{game.playerO}</Table.Cell>
            <Table.Cell>
              {game.status === 1
                ? "Draw"
                : `Winner: ${game.winner?.slice(0, 6)}...`}
            </Table.Cell>
          </Table.Row>
        ))}
      </Table.Body>
    </Table.Root>
  );
}
