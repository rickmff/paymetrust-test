import { zodResolver } from "@hookform/resolvers/zod";
import { Button, Card, Form } from "@heroui/react";
import { useQuery } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { Navigate, useLocation } from "react-router";
import { z } from "zod";
import { ErrorState } from "@/components/ErrorState";
import { FormTextField } from "@/components/FormTextField";
import { PageTitle } from "@/components/PageTitle";
import { meQuery, useLogin } from "./api";
import { CredentialsSchema } from "./schemas";

const DEMO_ACCOUNTS = [
  { role: "Viewer", email: "viewer@demo.test" },
  { role: "Maker", email: "maker@demo.test" },
  { role: "Approver", email: "approver@demo.test" },
] as const;

// Router state is `any`. Parse it like any other outside input. Only a path
// inside the app is accepted: "//host" starts with a slash too, and a browser
// reads it as another site.
const RedirectState = z.object({ from: z.string().regex(/^\/(?![/\\])/) });

export function LoginPage() {
  const location = useLocation();
  const session = useQuery(meQuery);
  const login = useLogin();
  const form = useForm({
    resolver: zodResolver(CredentialsSchema),
    defaultValues: { email: "", password: "" },
  });

  // No navigate() after login: logging in only updates the session in the
  // cache, and the route reacts to that state. One source of truth.
  if (session.data) {
    const from = RedirectState.safeParse(location.state).data?.from ?? "/";
    return <Navigate to={from} replace />;
  }

  return (
    <main
      tabIndex={-1}
      className="grid min-h-dvh place-items-center p-4 outline-none"
    >
      <PageTitle>Sign in</PageTitle>
      <Card className="w-full max-w-sm">
        <Card.Header>
          <h1 className="text-lg font-semibold">Sign in to Merchant Console</h1>
        </Card.Header>
        <Card.Content>
          <Form
            className="flex flex-col gap-4"
            validationBehavior="aria"
            onSubmit={form.handleSubmit((credentials) =>
              login.mutate(credentials),
            )}
          >
            <FormTextField
              control={form.control}
              name="email"
              label="Email"
              type="email"
              autoComplete="username"
              placeholder="name@company.com"
            />
            <FormTextField
              control={form.control}
              name="password"
              label="Password"
              type="password"
              autoComplete="current-password"
              placeholder="Enter your password"
            />
            {login.isError && (
              <ErrorState title="Could not sign in" error={login.error} />
            )}
            <Button type="submit" fullWidth isPending={login.isPending}>
              Sign in
            </Button>
          </Form>
        </Card.Content>
        {/* A shortcut for whoever runs the project. `import.meta.env.DEV` is
            a constant at build time, so the production bundle is built
            without the accounts and their password. */}
        {import.meta.env.DEV && (
          <Card.Footer className="flex flex-wrap items-center gap-2 text-sm text-muted">
            Demo accounts:
            {DEMO_ACCOUNTS.map((account) => (
              <Button
                key={account.email}
                size="sm"
                variant="tertiary"
                onPress={() =>
                  form.reset({ email: account.email, password: "demo1234" })
                }
              >
                {account.role}
              </Button>
            ))}
          </Card.Footer>
        )}
      </Card>
    </main>
  );
}
