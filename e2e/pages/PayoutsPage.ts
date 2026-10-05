import type { Locator, Page } from "@playwright/test";

type NewPayout = {
  operator: string;
  name: string;
  phone: string;
  amount: string;
  reference: string;
};

/**
 * Page object: how to *use* the payouts screens, in one place. If a label or
 * a step changes, this file changes and the tests don't.
 * It holds actions and locators only. Assertions stay in the tests, so each
 * test still reads like its requirement.
 */
export class PayoutsPage {
  readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  async goto() {
    await this.page.goto("/payouts");
  }

  /** The table row of the payout with this reference. */
  row(reference: string): Locator {
    return this.page.getByRole("row").filter({ hasText: reference });
  }

  async fillRecipient({ operator, name, phone }: NewPayout) {
    await this.page.getByRole("button", { name: /operator/i }).click();
    await this.page.getByRole("option", { name: operator }).click();
    await this.page.getByLabel("Recipient name").fill(name);
    await this.page.getByLabel("Mobile money number").fill(phone);
    await this.page.getByRole("button", { name: "Continue" }).click();
  }

  async fillAmount({ amount, reference }: NewPayout) {
    await this.page.getByLabel("Amount (F CFA)").fill(amount);
    await this.page.getByLabel("Reference (optional)").fill(reference);
    await this.page.getByRole("button", { name: "Continue" }).click();
  }

  /** Goes through the three steps of the wizard and submits. */
  async create(payout: NewPayout) {
    await this.page.getByRole("link", { name: "New payout" }).click();
    await this.fillRecipient(payout);
    await this.fillAmount(payout);
    await this.page.getByRole("button", { name: "Create payout" }).click();
  }

  async approve(reference: string) {
    await this.row(reference)
      .getByRole("button", { name: /^Approve/ })
      .click();
    await this.page
      .getByRole("alertdialog")
      .getByRole("button", { name: "Approve payout" })
      .click();
  }

  async reject(reference: string, reason: string) {
    await this.row(reference)
      .getByRole("button", { name: /^Reject/ })
      .click();
    const dialog = this.page.getByRole("alertdialog");
    await dialog.getByLabel("Reason").fill(reason);
    await dialog.getByRole("button", { name: "Reject payout" }).click();
  }
}
