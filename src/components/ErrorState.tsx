import { Alert, Button } from "@heroui/react";
import { isApiError } from "@/lib/api";

type ErrorStateProps = {
  title: string;
  /** Whatever the query or mutation threw. Narrowed here, once. */
  error: unknown;
  onRetry?: () => void;
};

/** The app's one way of showing a failed request. */
export function ErrorState({ title, error, onRetry }: ErrorStateProps) {
  // Retrying helps with a network failure or a 5xx. A 403 or 404 gives the same answer again.
  const canRetry = !isApiError(error) || error.status >= 500;
  const detail = isApiError(error)
    ? error.message
    : "Check your connection and try again.";

  return (
    // HeroUI's Alert is only visual. role="alert" makes screen readers announce it.
    <Alert status="danger" role="alert">
      <Alert.Indicator />
      <Alert.Content>
        <Alert.Title>{title}</Alert.Title>
        <Alert.Description>{detail}</Alert.Description>
      </Alert.Content>
      {onRetry && canRetry && (
        <Button size="sm" variant="danger" onPress={onRetry}>
          Retry
        </Button>
      )}
    </Alert>
  );
}
