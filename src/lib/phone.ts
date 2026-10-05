/**
 * Phone numbers of one market, Côte d'Ivoire. The form and the API hold E.164
 * ("+2250701020304"); people type and read the ten national digits, in pairs.
 */
export const COUNTRY_CODE = "+225";

const NATIONAL_LENGTH = 10;

/**
 * The national digits in whatever was typed, pasted or stored:
 * "+225 07 01 02 03 04", "00225 0701020304" and "07.01.02.03.04" all give
 * "0701020304".
 */
function nationalDigits(text: string): string {
  return (
    text
      .replace(/\D/g, "")
      // A national number starts with 0, so 225 in front of it can only be
      // the country code, typed or pasted along with the number.
      .replace(/^((00)?225)+/, "")
      .slice(0, NATIONAL_LENGTH)
  );
}

/** For a text field: the form holds E.164, the screen shows "07 01 02 03 04". */
export const phoneMask = {
  format: (value: string) =>
    nationalDigits(value).replace(/(\d{2})(?=\d)/g, "$1 "),
  parse: (text: string) => {
    const digits = nationalDigits(text);
    // No digits is no number: an empty field stays empty for the form.
    return digits && COUNTRY_CODE + digits;
  },
};
