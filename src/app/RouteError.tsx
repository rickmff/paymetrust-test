import { Alert, Button, Link } from "@heroui/react";
import { useRouteError } from "react-router";
import { PageTitle } from "@/components/PageTitle";

/** Last line of defence: a render error anywhere shows this instead of a blank page. */
export function RouteError() {
  const error = useRouteError();
  console.error(error);

  return (
    <main className="mx-auto flex max-w-xl flex-col gap-4 p-6">
      <PageTitle>Something went wrong</PageTitle>
      {/* Not <ErrorState>: that one speaks for a failed request. What lands
          here is a bug in a page, or a page whose code did not download, and
          for both the way out is to load the app again. */}
      <Alert status="danger" role="alert">
        <Alert.Indicator />
        <Alert.Content>
          <Alert.Title>Something broke on this page</Alert.Title>
          <Alert.Description>
            Reload the page. If it keeps happening, contact support.
          </Alert.Description>
        </Alert.Content>
        <Button
          size="sm"
          variant="danger"
          onPress={() => window.location.reload()}
        >
          Reload
        </Button>
      </Alert>
      <Link href="/">Back to the dashboard</Link>
    </main>
  );
}

export function NotFound() {
  return (
    <div className="flex flex-col items-start gap-2">
      <PageTitle>Page not found</PageTitle>
      <h1 className="text-2xl font-semibold">Page not found</h1>
      <Link href="/">Back to the dashboard</Link>
    </div>
  );
}
