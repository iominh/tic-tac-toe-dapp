import { ConnectButton, useCurrentAccount } from "@mysten/dapp-kit";
import { isValidSuiObjectId } from "@mysten/sui/utils";
import { Box, Container, Flex, Heading, Link } from "@radix-ui/themes";
import { useState, useCallback } from "react";
import { TicTacToeIcon } from "./TicTacToeIcon";
import { CreateGame } from "./components/CreateGame";
import { Game } from "./components/Game";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { LandingPage } from "./components/LandingPage";
import { ProgressBar } from "./components/ProgressBar";

function App() {
  const currentAccount = useCurrentAccount();
  const [gameId, setGameId] = useState(() => {
    const hash = window.location.hash.slice(1);
    return isValidSuiObjectId(hash) ? hash : null;
  });
  const [isLoading, setIsLoading] = useState(false);

  const handleHomeClick = () => {
    window.location.hash = "";
    setGameId(null);
  };

  const setLoading = useCallback((loading: boolean) => {
    setIsLoading(loading);
  }, []);

  return (
    <>
      <ProgressBar isLoading={isLoading} />
      <ErrorBoundary>
        <Flex
          position="sticky"
          px="4"
          py="2"
          justify="between"
          style={{
            borderBottom: "1px solid var(--gray-a2)",
            zIndex: 50,
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
            pt="6"
            pb="8"
            px="8"
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
                <Game id={gameId} onLoadingChange={setLoading} />
              ) : (
                <CreateGame
                  onGameCreated={(id) => {
                    window.location.hash = id;
                    setGameId(id);
                  }}
                  onLoadingChange={setLoading}
                />
              )
            ) : (
              <LandingPage />
            )}
          </Container>
        </Container>
      </ErrorBoundary>
    </>
  );
}

export default App;
