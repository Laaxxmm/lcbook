// Indian-numbering amount-to-words for the Bill of Supply PDF (lakh/crore).
// Input is integer PAISE (§4). Whole rupees → "Rupees … Only"; non-zero paise
// → "Rupees … and NN Paise Only". Self-check at the bottom (run this file directly).

const ONES = [
  "", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine",
  "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen",
  "Seventeen", "Eighteen", "Nineteen",
];
const TENS = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

function twoDigit(n: number): string {
  if (n < 20) return ONES[n]!;
  const o = n % 10;
  return TENS[Math.floor(n / 10)]! + (o ? " " + ONES[o]! : "");
}

function threeDigit(n: number): string {
  const h = Math.floor(n / 100);
  const rest = n % 100;
  let s = h ? ONES[h]! + " Hundred" : "";
  if (rest) s += (s ? " " : "") + twoDigit(rest);
  return s;
}

function intToWords(n: number): string {
  if (n === 0) return "Zero";
  let s = "";
  const crore = Math.floor(n / 10000000);
  n %= 10000000;
  const lakh = Math.floor(n / 100000);
  n %= 100000;
  const thousand = Math.floor(n / 1000);
  n %= 1000;
  if (crore) s += (crore > 999 ? intToWords(crore) : threeDigit(crore)) + " Crore ";
  if (lakh) s += twoDigit(lakh) + " Lakh ";
  if (thousand) s += twoDigit(thousand) + " Thousand ";
  if (n) s += threeDigit(n);
  return s.trim().replace(/\s+/g, " ");
}

/** Integer paise → "Rupees One Thousand Six Hundred Only" (Indian numbering). */
export function amountInWords(paise: number): string {
  if (!Number.isInteger(paise) || paise < 0) {
    throw new Error(`amountInWords: paise must be a non-negative integer, got ${paise}`);
  }
  const rupees = `Rupees ${intToWords(Math.floor(paise / 100))}`;
  const p = paise % 100;
  return p ? `${rupees} and ${twoDigit(p)} Paise Only` : `${rupees} Only`;
}

// Runnable self-check: `npx tsx lib/pdf/amount-in-words.ts`
if (process.argv[1] && import.meta.url === new URL(`file://${process.argv[1]}`).href) {
  const eq = (got: string, want: string) => {
    if (got !== want) throw new Error(`amountInWords self-check failed:\n  got : ${got}\n  want: ${want}`);
  };
  eq(amountInWords(160000), "Rupees One Thousand Six Hundred Only"); // 1600
  eq(amountInWords(25000000), "Rupees Two Lakh Fifty Thousand Only"); // lakh range
  eq(amountInWords(160050), "Rupees One Thousand Six Hundred and Fifty Paise Only"); // paise
  eq(amountInWords(0), "Rupees Zero Only");
  // eslint-disable-next-line no-console
  console.log("amount-in-words self-check passed");
}
