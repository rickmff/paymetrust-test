import { Chip } from "@heroui/react";
import type { ComponentProps } from "react";

/** Derived from HeroUI instead of retyped: if the library adds a color, we get it. */
type Tone = NonNullable<ComponentProps<typeof Chip>["color"]>;

export type StatusMeta = { label: string; tone: Tone; icon: string };

/** A status is never color alone: it always carries an icon and a text label. */
export function StatusChip({ label, tone, icon }: StatusMeta) {
  return (
    <Chip color={tone} variant="soft" size="sm">
      <span aria-hidden="true">{icon}</span>
      <Chip.Label>{label}</Chip.Label>
    </Chip>
  );
}
