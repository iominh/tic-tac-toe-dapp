import { ConnectButton, useCurrentAccount } from "@mysten/dapp-kit";
import { Box, Container, Flex, Heading, Link } from "@radix-ui/themes";
import { Routes, Route, useNavigate } from "react-router-dom";
import { useState } from "react";
import { TicTacToeIcon } from "./TicTacToeIcon";
import { CreateGame } from "./components/CreateGame";
import { Game } from "./components/Game";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { LandingPage } from "./components/LandingPage";
import { ProgressBar } from "./components/ProgressBar";

function App() {
  const currentAccount = useCurrentAccount();
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleHomeClick = () => {
    navigate("/");
  };

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
              <Routes>
                <Route
                  path="/"
                  element={
                    <CreateGame
                      onGameCreated={(id) => navigate(`/game/${id}`)}
                    />
                  }
                />
                <Route
                  path="/game/:gameId"
                  element={<Game onLoadingChange={setIsLoading} />}
                />
              </Routes>
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
