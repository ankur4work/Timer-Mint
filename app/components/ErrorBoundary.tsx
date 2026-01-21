import { useRouteError, isRouteErrorResponse, Link } from "@remix-run/react";
import {
  Page,
  Card,
  BlockStack,
  Text,
  Button,
  Box,
  InlineStack,
  Banner,
} from "@shopify/polaris";

interface ErrorDisplayProps {
  title?: string;
  message?: string;
  details?: string;
  showRetry?: boolean;
  showHomeLink?: boolean;
}

/**
 * Generic error display component
 */
export function ErrorDisplay({
  title = "Something went wrong",
  message = "We encountered an unexpected error. Please try again.",
  details,
  showRetry = true,
  showHomeLink = true,
}: ErrorDisplayProps) {
  const handleRetry = () => {
    window.location.reload();
  };

  return (
    <Page title={title}>
      <Card>
        <BlockStack gap="400">
          <Banner tone="critical">
            <BlockStack gap="200">
              <Text as="p" variant="bodyMd">
                {message}
              </Text>
              {details && (
                <Text as="p" variant="bodySm" tone="subdued">
                  Error details: {details}
                </Text>
              )}
            </BlockStack>
          </Banner>

          <InlineStack gap="300">
            {showRetry && (
              <Button onClick={handleRetry}>Try again</Button>
            )}
            {showHomeLink && (
              <Button variant="plain" url="/app">
                Go to Dashboard
              </Button>
            )}
          </InlineStack>
        </BlockStack>
      </Card>
    </Page>
  );
}

/**
 * 404 Not Found error display
 */
export function NotFoundError() {
  return (
    <Page title="Page Not Found">
      <Card>
        <BlockStack gap="400" inlineAlign="center">
          <Box paddingBlock="400">
            <Text as="p" variant="headingXl" alignment="center">
              404
            </Text>
          </Box>
          <Text as="p" variant="bodyMd" alignment="center">
            The page you're looking for doesn't exist or has been moved.
          </Text>
          <Button url="/app">Go to Dashboard</Button>
        </BlockStack>
      </Card>
    </Page>
  );
}

/**
 * Network error display
 */
export function NetworkError() {
  const handleRetry = () => {
    window.location.reload();
  };

  return (
    <Page title="Connection Error">
      <Card>
        <BlockStack gap="400">
          <Banner tone="warning">
            <Text as="p" variant="bodyMd">
              Unable to connect to the server. Please check your internet connection and try again.
            </Text>
          </Banner>
          <InlineStack gap="300">
            <Button onClick={handleRetry}>Retry</Button>
            <Button variant="plain" url="/app">
              Go to Dashboard
            </Button>
          </InlineStack>
        </BlockStack>
      </Card>
    </Page>
  );
}

/**
 * Form error banner component
 */
export function FormErrorBanner({
  errors,
  message,
}: {
  errors?: Record<string, string[]>;
  message?: string;
}) {
  if (!message && (!errors || Object.keys(errors).length === 0)) {
    return null;
  }

  const errorMessages = errors
    ? Object.entries(errors).flatMap(([field, messages]) =>
        messages.map(msg => `${field}: ${msg}`)
      )
    : [];

  return (
    <Banner tone="critical">
      <BlockStack gap="200">
        {message && <Text as="p" variant="bodyMd">{message}</Text>}
        {errorMessages.length > 0 && (
          <BlockStack gap="100">
            {errorMessages.map((msg, i) => (
              <Text key={i} as="p" variant="bodySm">
                {msg}
              </Text>
            ))}
          </BlockStack>
        )}
      </BlockStack>
    </Banner>
  );
}

/**
 * Route error boundary component
 * Use this with Remix's ErrorBoundary export
 */
export function RouteErrorBoundary() {
  const error = useRouteError();

  // Handle HTTP response errors (4xx, 5xx)
  if (isRouteErrorResponse(error)) {
    if (error.status === 404) {
      return <NotFoundError />;
    }

    if (error.status === 401 || error.status === 403) {
      return (
        <ErrorDisplay
          title="Access Denied"
          message="You don't have permission to view this page."
          showRetry={false}
        />
      );
    }

    if (error.status >= 500) {
      return (
        <ErrorDisplay
          title="Server Error"
          message="Something went wrong on our end. Please try again later."
          details={error.statusText}
        />
      );
    }

    return (
      <ErrorDisplay
        title={`Error ${error.status}`}
        message={error.statusText || "An error occurred"}
        details={typeof error.data === "string" ? error.data : undefined}
      />
    );
  }

  // Handle thrown errors
  if (error instanceof Error) {
    // Check for network errors
    if (
      error.message.includes("fetch") ||
      error.message.includes("network") ||
      error.message.includes("Failed to fetch")
    ) {
      return <NetworkError />;
    }

    return (
      <ErrorDisplay
        title="Application Error"
        message="An unexpected error occurred."
        details={error.message}
      />
    );
  }

  // Fallback for unknown errors
  return (
    <ErrorDisplay
      title="Unknown Error"
      message="Something unexpected happened. Please try again."
    />
  );
}

/**
 * Inline error message for form fields
 */
export function FieldError({ error }: { error?: string }) {
  if (!error) return null;

  return (
    <Text as="span" variant="bodySm" tone="critical">
      {error}
    </Text>
  );
}

/**
 * Error recovery wrapper component
 * Provides a try-again mechanism for network errors
 */
export function ErrorRecovery({
  children,
  fallback,
}: {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}) {
  // This is a simple wrapper - in a real app you'd use React's ErrorBoundary class
  // For now, we just render children
  return <>{children}</>;
}
