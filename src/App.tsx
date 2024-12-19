import { ConnectButton, useCurrentAccount } from "@mysten/dapp-kit";
import { isValidSuiObjectId } from "@mysten/sui/utils";
import { Box, Container, Flex, Heading, Link } from "@radix-ui/themes";
import { useState } from "react";
import { TicTacToeIcon } from "./TicTacToeIcon";
import { CreateGame } from "./components/CreateGame";
import { Game } from "./components/Game";
import { ErrorBoundary } from "./components/ErrorBoundary";

function App() {
  const currentAccount = useCurrentAccount();
  const [gameId, setGameId] = useState(() => {
    const hash = window.location.hash.slice(1);
    return isValidSuiObjectId(hash) ? hash : null;
  });

  const handleHomeClick = () => {
    window.location.hash = "";
    setGameId(null);
  };

  return (
    <ErrorBoundary>
      <Flex
        position="sticky"
        px="4"
        py="2"
        justify="between"
        style={{
          borderBottom: "1px solid var(--gray-a2)",
        }}
      >
        <Box>
          <Link
            onClick={handleHomeClick}
            style={{ cursor: "pointer" }}
            className="hover:opacity-80"
          >
            <Flex align="center" gap="2">
              <TicTacToeIcon className="w-6 h-6" />
              <Heading>Tic Tac Toe</Heading>
            </Flex>
          </Link>
        </Box>

        <Box>
          <ConnectButton />
        </Box>
      </Flex>
      <Container>
        <Container
          mt="5"
          pt="2"
          px="4"
          style={{
            background: "var(--gray-a2)",
            minHeight: 500,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {currentAccount ? (
            gameId ? (
              <Game id={gameId} />
            ) : (
              <CreateGame
                onGameCreated={(id) => {
                  window.location.hash = id;
                  setGameId(id);
                }}
              />
            )
          ) : (
            <Heading>Please connect your wallet</Heading>
          )}
        </Container>
      </Container>
    </ErrorBoundary>
  );
}

export default App;
