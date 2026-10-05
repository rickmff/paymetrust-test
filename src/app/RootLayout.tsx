import { RouterProvider as AriaRouterProvider, Spinner } from "@heroui/react";
import { useEffect, useRef } from "react";
import {
  Outlet,
  useHref,
  useLocation,
  useNavigate,
  type NavigateOptions,
} from "react-router";

// Declaration merging: the reason `interface` still matters. React Aria leaves
// `RouterConfig` open so each app can say what its router's options look like.
declare module "react-aria-components" {
  interface RouterConfig {
    routerOptions: NavigateOptions;
  }
}

/**
 * Root route. Teaches HeroUI (React Aria) to navigate with React Router, so
 * any HeroUI component with an `href` does a client-side navigation instead
 * of a full page load.
 */
export function RootLayout() {
  const navigate = useNavigate();
  useFocusOnNavigation();

  return (
    <AriaRouterProvider navigate={navigate} useHref={useHref}>
      <Outlet />
    </AriaRouterProvider>
  );
}

/**
 * A client-side navigation swaps the page without telling anyone: the focus
 * stays on a link that may be gone, and a screen reader says nothing. A full
 * page load would have started again from the top, so this does the same and
 * moves the focus to the new page's <main>. Every page has one, focusable
 * from code only (tabIndex -1).
 */
function useFocusOnNavigation() {
  const { pathname } = useLocation();
  const previous = useRef(pathname);

  useEffect(() => {
    // Not on the first render: the browser handles a page load. And not when
    // only the query string changes: a list being filtered is the same page.
    if (previous.current === pathname) return;
    previous.current = pathname;

    const main = document.querySelector("main");
    // A page that has already put the focus where it wants it knows better:
    // a form sent back by the server focuses its first invalid field, and
    // taking the focus away would also make the form validate that field.
    if (main && !main.contains(document.activeElement)) {
      main.focus({ preventScroll: true });
    }
  }, [pathname]);
}

/** On screen while the code of the first page is on its way. */
export function PageLoading() {
  return (
    <div className="grid min-h-dvh place-items-center">
      <Spinner aria-label="Loading" />
    </div>
  );
}
