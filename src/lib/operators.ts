import { z } from "zod";

export const OperatorSchema = z.enum([
  "orange_money",
  "mtn_momo",
  "moov_money",
  "wave",
]);
export type Operator = z.infer<typeof OperatorSchema>;

// `satisfies` checks that every operator has a label (add one to the enum and
// this stops compiling) while keeping the literal types of the values.
export const OPERATOR_LABEL = {
  orange_money: "Orange Money",
  mtn_momo: "MTN MoMo",
  moov_money: "Moov Money",
  wave: "Wave",
} as const satisfies Record<Operator, string>;

export const OPERATOR_OPTIONS = OperatorSchema.options.map((value) => ({
  value,
  label: OPERATOR_LABEL[value],
}));

// A plain annotation here, not `as const satisfies`: we want `string[]`, so
// `.includes(prefix)` accepts any string. The Record still forces every operator.
/** Mobile prefixes in Côte d'Ivoire. Wave is not a carrier, so any prefix works. */
export const OPERATOR_PREFIXES: Record<Operator, readonly string[]> = {
  orange_money: ["07"],
  mtn_momo: ["05"],
  moov_money: ["01"],
  wave: ["01", "05", "07"],
};
