import {
  autoUpdate,
  flip,
  hide,
  offset,
  shift,
  useFloating,
  type Placement,
} from "@floating-ui/react-dom";
import { cn } from "@heroui/react";
import {
  createContext,
  use,
  useCallback,
  useEffect,
  useEffectEvent,
  useMemo,
  useRef,
  useState,
  type ComponentPropsWithoutRef,
  type ReactNode,
  type RefObject,
} from "react";
import { deleteBackward, hasFocus, insertText, isEditable } from "./editing";

type Side = "top" | "right" | "bottom" | "left";
type Align = "start" | "center" | "end";

type NumpadProps = ComponentPropsWithoutRef<"div"> & {
  /**
   * The input the keypad types into. Keep the element in state, so the keypad
   * re-attaches when it changes: `<Input ref={setInput} />`.
   */
  anchor: HTMLInputElement | null;
  /** Controlled state. Leave it out and the keypad manages itself. */
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** The confirm key was pressed: the number is complete. The keypad closes by itself. */
  onConfirm?: () => void;
  /** Where the keypad goes. It flips to the other side when there is no room. */
  side?: Side;
  align?: Align;
  /** Gap between the input and the keypad, in pixels. */
  sideOffset?: number;
  /** Adds a key for decimals to the default layout, in the empty corner. */
  decimalSeparator?: "." | ",";
  /** Your own keys, for another layout. The grid has three columns. */
  children?: ReactNode;
};

/**
 * An on-screen keypad for an input: a second keyboard for whoever is using
 * only the mouse. It opens when the field is clicked and types into it like
 * real keys would, so the input stays focused and the keyboard keeps working.
 *
 * The keypad is attached to the input from the outside (DOM listeners on
 * `anchor`), so it works with any input: HeroUI, React Hook Form, a plain one.
 */
function Numpad({
  anchor,
  open: controlledOpen,
  defaultOpen = false,
  onOpenChange,
  onConfirm,
  side = "bottom",
  align = "start",
  sideOffset = 6,
  decimalSeparator,
  className,
  children,
  onMouseDown,
  ...props
}: NumpadProps) {
  const panel = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useOpenState({
    anchor,
    panel,
    open: controlledOpen,
    defaultOpen,
    onOpenChange,
  });
  // Closing plays an exit transition, so the keypad outlives `open` a little.
  const rendered = usePresence(open && anchor !== null, panel);

  const context = useMemo<NumpadContextValue | null>(() => {
    if (!anchor) return null;
    // The keys normally find the input focused. Where they don't (the keypad
    // was opened from code), typing starts by putting the caret back in it.
    const focus = () => anchor.focus({ preventScroll: true });
    return {
      anchor,
      type: (text) => {
        focus();
        return insertText(anchor, text);
      },
      backspace: () => {
        focus();
        return deleteBackward(anchor);
      },
      // The input keeps the focus: the keyboard can carry on, and a click
      // on the field brings the keypad back.
      confirm: () => {
        onConfirm?.();
        setOpen(false);
        return true;
      },
    };
  }, [anchor, onConfirm, setOpen]);

  if (!context || !rendered) return null;

  return (
    <NumpadContext value={context}>
      <Positioner
        anchor={context.anchor}
        placement={align === "center" ? side : `${side}-${align}`}
        sideOffset={sideOffset}
      >
        <div
          role="group"
          aria-label="Numeric keypad"
          // Digits read left to right in every script, so the keys do too.
          dir="ltr"
          {...props}
          ref={panel}
          data-slot="numpad"
          data-state={open ? "open" : "closed"}
          // What keeps the input focused: a mousedown that is not allowed to
          // move the focus. It covers the gaps between the keys as well.
          onMouseDown={(event) => {
            onMouseDown?.(event);
            event.preventDefault();
          }}
          className={cn(
            "grid grid-cols-3 gap-1 rounded-lg border border-border bg-overlay p-1.5 text-overlay-foreground shadow-md select-none",
            // A transition, not a keyframe animation: it can be interrupted
            // halfway and reverses from wherever it is.
            "transition-[opacity,scale] duration-150 ease-out motion-reduce:transition-none starting:scale-95 starting:opacity-0",
            "data-[state=closed]:pointer-events-none data-[state=closed]:scale-95 data-[state=closed]:opacity-0 data-[state=closed]:duration-100 data-[state=closed]:ease-in",
            // It grows out of the edge that touches the input.
            "group-data-[side=bottom]/numpad:origin-top group-data-[side=left]/numpad:origin-right group-data-[side=right]/numpad:origin-left group-data-[side=top]/numpad:origin-bottom",
            className,
          )}
        >
          {children ?? <DefaultKeys decimalSeparator={decimalSeparator} />}
        </div>
      </Positioner>
    </NumpadContext>
  );
}

const DIGITS = ["1", "2", "3", "4", "5", "6", "7", "8", "9"] as const;

/**
 * The layout of a phone's number pad: 1 2 3 on top, 0 and backspace below,
 * and under them a key to confirm the number.
 */
function DefaultKeys({ decimalSeparator }: { decimalSeparator?: string }) {
  return (
    <>
      {DIGITS.map((digit) => (
        <NumpadKey key={digit} value={digit} />
      ))}
      {decimalSeparator ? (
        // A comma or a dot is a small mark: a size up, so it reads as a key.
        <NumpadKey value={decimalSeparator} className="text-xl" />
      ) : (
        <span aria-hidden="true" />
      )}
      <NumpadKey value="0" />
      <NumpadBackspace />
      <NumpadConfirm />
    </>
  );
}

// ---- keys --------------------------------------------------------------------

/** What a key needs from its keypad: the input, and how to write to it. */
type NumpadContextValue = {
  anchor: HTMLInputElement;
  /** Both say whether the value changed. */
  type: (text: string) => boolean;
  backspace: () => boolean;
  /** Closes the keypad and tells its owner. */
  confirm: () => boolean;
};

const NumpadContext = createContext<NumpadContextValue | null>(null);

function useNumpad(): NumpadContextValue {
  const context = use(NumpadContext);
  if (!context) throw new Error("Numpad keys must be inside <Numpad>.");
  return context;
}

// The press handlers are the key's own: it has to decide when a press counts.
type KeyProps = Omit<
  ComponentPropsWithoutRef<"button">,
  "type" | "value" | "onPointerDown" | "onPointerLeave" | "onClick"
>;

type NumpadKeyProps = KeyProps & {
  /** The text the key types. It is also the label, unless there are children. */
  value: string;
};

/** A key that types its `value` at the caret. */
function NumpadKey({ value, children, ...props }: NumpadKeyProps) {
  const { type } = useNumpad();
  return (
    <Key
      data-slot="numpad-key"
      {...props}
      mirrors={value}
      onPress={() => type(value)}
    >
      {children ?? value}
    </Key>
  );
}

/** Deletes like the Backspace key, and keeps deleting while it is held. */
function NumpadBackspace({ children, ...props }: KeyProps) {
  const { backspace } = useNumpad();
  return (
    <Key
      data-slot="numpad-backspace"
      aria-label="Backspace"
      {...props}
      mirrors="Backspace"
      repeats
      onPress={backspace}
    >
      {children ?? <BackspaceIcon />}
    </Key>
  );
}

/**
 * Says the number is complete and closes the keypad. As wide as the keypad
 * and in the accent colour: it is the one key that ends the typing.
 */
function NumpadConfirm({ children, className, ...props }: KeyProps) {
  const { confirm } = useNumpad();
  return (
    <Key
      data-slot="numpad-confirm"
      {...props}
      onPress={confirm}
      className={cn(
        "col-span-3 w-full bg-accent text-sm text-accent-foreground hover:bg-accent-hover data-pressed:bg-accent-hover",
        className,
      )}
    >
      {children ?? "Confirm"}
    </Key>
  );
}

/** How long a key is held before it repeats, then the pace: a keyboard's. */
const REPEAT_DELAY = 400;
const REPEAT_INTERVAL = 60;

type InternalKeyProps = KeyProps & {
  /** Does the key's job and says whether anything changed. */
  onPress: () => boolean;
  /** Keep pressing while the key is held down. */
  repeats?: boolean;
  /** The keyboard key this one stands for, if any: it lights up when that is typed. */
  mirrors?: string;
};

function Key({
  onPress,
  repeats = false,
  mirrors,
  className,
  ...props
}: InternalKeyProps) {
  const { anchor } = useNumpad();
  const [held, setHeld] = useState(false);
  const [mirrored, setMirrored] = useState(false);
  const release = useRef<(() => void) | null>(null);
  const actedOnPointerDown = useRef(false);

  // The keypad can close under a held key (Escape): the repeat ends with it.
  useEffect(() => () => release.current?.(), []);

  // Typing on the real keyboard presses the matching key here too, which
  // shows that both keyboards write to the same place.
  useEffect(() => {
    if (mirrors === undefined) return;
    const controller = new AbortController();
    const { signal } = controller;

    anchor.addEventListener(
      "keydown",
      (event) => {
        const shortcut = event.ctrlKey || event.metaKey || event.altKey;
        if (event.key === mirrors && !shortcut) setMirrored(true);
      },
      { signal },
    );
    anchor.addEventListener(
      "keyup",
      (event) => {
        if (event.key === mirrors) setMirrored(false);
      },
      { signal },
    );
    // A key released after the focus left never reports its keyup here.
    anchor.addEventListener("blur", () => setMirrored(false), { signal });

    return () => controller.abort();
  }, [anchor, mirrors]);

  function hold(view: Window) {
    release.current?.();
    const controller = new AbortController();
    let timer: number | undefined;

    const letGo = () => {
      controller.abort();
      view.clearTimeout(timer);
      release.current = null;
      setHeld(false);
    };
    release.current = letGo;
    // The button can go up anywhere, or never: the window sees every ending.
    for (const ending of [
      "pointerup",
      "pointercancel",
      "blur",
      "contextmenu",
    ]) {
      view.addEventListener(ending, letGo, { signal: controller.signal });
    }

    setHeld(true);
    if (onPress() && repeats) {
      // Stops by itself when there is nothing left to do.
      const again = () => {
        if (onPress()) timer = view.setTimeout(again, REPEAT_INTERVAL);
      };
      timer = view.setTimeout(again, REPEAT_DELAY);
    }
  }

  return (
    <button
      {...props}
      type="button"
      // Out of the tab order: the keyboard already types into the input, and
      // Tab from the input must go to the next field, not into the keypad.
      tabIndex={-1}
      data-pressed={held || mirrored ? "" : undefined}
      onPointerDown={(event) => {
        // A mouse acts on the way down, as a physical key does (WCAG 2.5.2
        // makes this exception for keypads). Touch and pen wait for the
        // click, so a scroll that starts on a key types nothing.
        const acts = event.pointerType === "mouse" && event.button === 0;
        actedOnPointerDown.current = acts;
        if (acts) hold(event.currentTarget.ownerDocument.defaultView ?? window);
      }}
      onClick={(event) => {
        const alreadyActed = actedOnPointerDown.current;
        actedOnPointerDown.current = false;
        // `detail` is 0 for a click nobody pressed: element.click(), or a
        // screen reader activating the button.
        if (!alreadyActed || event.detail === 0) onPress();
      }}
      // Sliding off a held key lets go of it.
      onPointerLeave={() => release.current?.()}
      className={cn(
        "flex h-10 w-14 cursor-(--cursor-interactive) touch-manipulation items-center justify-center rounded-md text-base font-medium tabular-nums outline-none",
        "hover:bg-default focus-visible:ring-2 focus-visible:ring-focus",
        // Pressed in at once, released with an ease: even the shortest click
        // leaves something to see. With reduced motion the key no longer
        // moves, but its colour still answers the press.
        "transition-[background-color,scale] duration-150 ease-out",
        "data-pressed:scale-[0.96] data-pressed:bg-default-hover data-pressed:duration-0 motion-reduce:data-pressed:scale-100",
        "forced-colors:data-pressed:bg-[Highlight] forced-colors:data-pressed:text-[HighlightText]",
        className,
      )}
    />
  );
}

function BackspaceIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="size-5"
    >
      <path d="M10 5a2 2 0 0 0-1.344.519l-6.328 5.74a1 1 0 0 0 0 1.481l6.328 5.741A2 2 0 0 0 10 19h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2z" />
      <path d="m12 9 6 6" />
      <path d="m18 9-6 6" />
    </svg>
  );
}

// ---- when it is open ---------------------------------------------------------

type OpenStateOptions = Pick<
  NumpadProps,
  "anchor" | "open" | "onOpenChange"
> & {
  panel: RefObject<HTMLElement | null>;
  defaultOpen: boolean;
};

/**
 * The rules, all in one place.
 *
 * Opens: a mouse press on the input or on its label. Not keyboard focus,
 * touch (the device brings its own number keyboard) or focus set from code.
 *
 * Closes: a mouse press anywhere else, the focus leaving the input, Escape,
 * the confirm key, or the input no longer being editable. Not the window
 * losing focus: coming back to the tab finds the keypad where it was.
 *
 * Returns the state and, for the confirm key, the way to change it.
 */
function useOpenState({
  anchor,
  panel,
  open: controlledOpen,
  defaultOpen,
  onOpenChange,
}: OpenStateOptions): [open: boolean, change: (next: boolean) => void] {
  const [uncontrolledOpen, setUncontrolledOpen] = useState(defaultOpen);
  const open = controlledOpen ?? uncontrolledOpen;

  const change = useCallback(
    (next: boolean) => {
      if (next === open) return;
      setUncontrolledOpen(next);
      onOpenChange?.(next);
    },
    [open, onOpenChange],
  );
  // The listeners below are attached once per input. Through an Effect Event
  // they still act on the state and the props of the latest render.
  const setOpen = useEffectEvent((next: boolean) => change(next));

  const onEscape = useEffectEvent((event: KeyboardEvent) => {
    // During composition, Escape belongs to the input method.
    if (!open || event.key !== "Escape" || event.isComposing) return;
    // The first Escape closes the keypad only. Kept from bubbling, it doesn't
    // also close the dialog the field may be in.
    event.preventDefault();
    event.stopPropagation();
    setOpen(false);
  });

  useEffect(() => {
    if (!anchor) return;
    const controller = new AbortController();
    const { signal } = controller;
    const doc = anchor.ownerDocument;
    // A click on a label reaches the input as a second, forwarded click that
    // doesn't say what caused it. The press on the label does.
    let mousePressedLabel = false;

    const openIfEditable = () => {
      if (isEditable(anchor)) setOpen(true);
    };

    doc.addEventListener(
      "pointerdown",
      (event) => {
        const path = event.composedPath();
        const onAnchor = path.includes(anchor);
        const onPanel = includes(path, panel.current);
        // A label can wrap the input, or the keypad: those presses are theirs.
        const onLabel =
          !onAnchor &&
          !onPanel &&
          [...(anchor.labels ?? [])].some((label) => path.includes(label));
        const mouse = event.pointerType === "mouse";
        const mainButton = mouse && event.button === 0;
        mousePressedLabel = onLabel && mainButton;

        if (onAnchor) {
          if (mainButton) openIfEditable();
        } else if (mouse && !onLabel && !onPanel) {
          // Only a mouse closes it from here. A finger going down elsewhere
          // may be the start of a scroll; a tap closes the keypad through the
          // blur it causes.
          setOpen(false);
        }
      },
      // Capture: nothing on the page can hide a press from the keypad.
      { capture: true, signal },
    );

    anchor.addEventListener(
      "click",
      () => {
        if (mousePressedLabel) openIfEditable();
        mousePressedLabel = false;
      },
      { signal },
    );

    anchor.addEventListener(
      "blur",
      () => {
        // The input is still the active element: it was the window that lost
        // focus (another tab, another app).
        if (hasFocus(anchor)) return;
        // A press on the label takes the focus away until its click gives it
        // back. Every other press outside was already handled above.
        if (mousePressedLabel) return;
        setOpen(false);
      },
      { signal },
    );

    anchor.addEventListener("keydown", (event) => onEscape(event), { signal });

    return () => controller.abort();
  }, [anchor, panel]);

  // A form that disables its fields while it submits takes the keypad away.
  useEffect(() => {
    if (!anchor || !open) return;
    const closeIfLocked = () => {
      if (!isEditable(anchor)) setOpen(false);
    };
    closeIfLocked();
    const observer = new MutationObserver(closeIfLocked);
    observer.observe(anchor, {
      attributes: true,
      attributeFilter: ["disabled", "readonly"],
    });
    return () => observer.disconnect();
  }, [anchor, open]);

  // Another element is another field: it doesn't inherit an open keypad.
  const previousAnchor = useRef(anchor);
  useEffect(() => {
    if (previousAnchor.current && previousAnchor.current !== anchor) {
      setOpen(false);
    }
    previousAnchor.current = anchor;
  }, [anchor]);

  return [open, change];
}

function includes(path: EventTarget[], element: Element | null): boolean {
  return element !== null && path.includes(element);
}

/**
 * True while the element should be in the document: when it is `present`,
 * and after that for as long as its exit transition runs.
 */
function usePresence(
  present: boolean,
  element: RefObject<HTMLElement | null>,
): boolean {
  const [lingering, setLingering] = useState(false);
  if (present && !lingering) setLingering(true);

  useEffect(() => {
    if (present || !lingering) return;
    let cancelled = false;
    // The closed styles are in the DOM by now. getAnimations() applies them
    // and returns the transitions they started: none with reduced motion (or
    // in jsdom), and then the element leaves right away.
    const transitions = element.current?.getAnimations?.({ subtree: true });
    void Promise.allSettled(
      (transitions ?? []).map((transition) => transition.finished),
    ).then(() => {
      if (!cancelled) setLingering(false);
    });
    return () => {
      cancelled = true;
    };
  }, [present, lingering, element]);

  return present || lingering;
}

// ---- where it is -------------------------------------------------------------

/** Room kept between the keypad and the edges of the window. */
const EDGE_PADDING = 8;

type PositionerProps = {
  anchor: HTMLInputElement;
  placement: Placement;
  sideOffset: number;
  children: ReactNode;
};

/**
 * Puts the keypad next to the input and keeps it there.
 *
 * It is rendered where it is written, next to the input, and lifted to the
 * browser's top layer (the Popover API). No portal: the keypad keeps the
 * theme, the text direction and the modal it belongs to, and nothing can
 * clip it or be stacked above it.
 */
function Positioner({
  anchor,
  placement,
  sideOffset,
  children,
}: PositionerProps) {
  const [topLayer] = useState(supportsPopover);

  const floating = useFloating({
    elements: { reference: anchor },
    placement,
    // Positioned in the page, not in the window: the browser itself moves the
    // keypad with the input while the page scrolls, with no frame of delay.
    strategy: "absolute",
    middleware: [
      offset(sideOffset),
      // No room on its side: the opposite side, then the other axis (a keypad
      // meant for the side of the field goes below it in a narrow window).
      flip({ padding: EDGE_PADDING, fallbackAxisSideDirection: "end" }),
      shift({ padding: EDGE_PADDING }),
      hide(),
    ],
    // Scrolling containers, resizes and layout shifts: stay with the input.
    whileElementsMounted: autoUpdate,
  });

  const { setFloating } = floating.refs;
  const attach = useCallback(
    (element: HTMLDivElement | null) => {
      // Shown before it is measured: a closed popover has no size, and
      // Floating UI needs to see that it is in the top layer.
      if (element && topLayer && !element.matches(":popover-open")) {
        element.showPopover();
      }
      setFloating(element);
    },
    [setFloating, topLayer],
  );

  const [finalSide] = floating.placement.split("-");
  // The input scrolled out of sight (or under the edge of its container).
  // The keypad waits, hidden but still open, and is back when the input is.
  const anchorHidden = floating.middlewareData.hide?.referenceHidden === true;

  return (
    <div
      ref={attach}
      popover={topLayer ? "manual" : undefined}
      data-slot="numpad-positioner"
      data-side={finalSide}
      data-anchor-hidden={anchorHidden ? "" : undefined}
      style={{
        ...floating.floatingStyles,
        // Never a frame in the corner of the page, before the first measure.
        visibility: floating.isPositioned ? undefined : "hidden",
      }}
      className={cn(
        "group/numpad transition-[opacity,visibility] duration-150 ease-out motion-reduce:transition-none",
        "data-anchor-hidden:pointer-events-none data-anchor-hidden:invisible data-anchor-hidden:opacity-0",
        topLayer
          ? // Everything the browser gives a [popover] by default, undone.
            "inset-auto m-0 h-auto max-h-none w-max max-w-none overflow-visible border-0 bg-transparent p-0 text-inherit"
          : "z-50 w-max",
      )}
    >
      {children}
    </div>
  );
}

function supportsPopover(): boolean {
  return typeof HTMLElement.prototype.showPopover === "function";
}

export { Numpad, NumpadBackspace, NumpadConfirm, NumpadKey };
export type { NumpadProps };
