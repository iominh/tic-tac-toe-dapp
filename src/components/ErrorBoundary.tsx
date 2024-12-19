import { Component, ReactNode } from "react";
import { Box, Button, Flex, Heading, Text } from "@radix-ui/themes";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.hash = "";
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <Box className="p-4">
          <Flex direction="column" gap="4" align="center">
            <Heading>Something went wrong</Heading>
            <Text>{this.state.error?.message}</Text>
            <Button onClick={this.handleReset}>Reset App</Button>
          </Flex>
        </Box>
      );
    }

    return this.props.children;
  }
}
