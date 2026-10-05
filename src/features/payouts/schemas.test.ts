import { expect, test } from "vitest";
import { AmountStepSchema, RecipientStepSchema } from "./schemas";

// Boundary values are where validation bugs live: zero, one below the
// minimum, the limits themselves, one above the maximum.

test.each([
  ["", "Amount must be greater than 0"],
  ["0", "Amount must be greater than 0"],
  ["499", "The minimum is 500 F CFA"],
  ["2000001", "The maximum is 2000000 F CFA"],
  ["12.5", "XOF has no cents: use whole francs"],
  ["abc", "Enter the amount in digits"],
  // Numbers to JavaScript, not to a person filling in an amount.
  ["0x1F4", "Enter the amount in digits"],
  ["1e3", "Enter the amount in digits"],
])("rejects the amount %j with a message", (amount, message) => {
  const result = AmountStepSchema.safeParse({ amount, reference: "" });

  expect(result.error?.issues[0]?.message).toBe(message);
});

test.each(["500", "2000000"])("accepts the limit %s as a number", (amount) => {
  const result = AmountStepSchema.parse({ amount, reference: "" });

  // The form held text; what comes out is a number.
  expect(result.amount).toBe(Number(amount));
});

// The second one has the no-break spaces a pasted, formatted amount comes with.
test.each(["25 000", "25 000", " 25000 "])(
  "accepts thousands written with spaces: %j",
  (amount) => {
    const result = AmountStepSchema.parse({ amount, reference: "" });

    expect(result.amount).toBe(25000);
  },
);

const recipient = {
  operator: "orange_money",
  recipient_name: "Aminata Bamba",
  recipient_phone: "+225 07 01 02 03 04",
};

test("normalizes the phone number the way the API expects it", () => {
  const result = RecipientStepSchema.parse(recipient);

  expect(result.recipient_phone).toBe("+2250701020304");
});

test("rejects a number from another operator, on the phone field", () => {
  const result = RecipientStepSchema.safeParse({
    ...recipient,
    operator: "mtn_momo",
  });

  expect(result.error?.issues).toMatchObject([
    {
      path: ["recipient_phone"],
      message: "This number is not on MTN MoMo",
    },
  ]);
});

test("asks for an operator when none is chosen", () => {
  const result = RecipientStepSchema.safeParse({
    ...recipient,
    operator: undefined,
  });

  expect(result.error?.issues[0]?.message).toBe("Choose an operator");
});
