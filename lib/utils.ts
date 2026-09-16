export const currency = (amount: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0
  }).format(amount || 0);

export const feeStatus = (due: number) => (due <= 0 ? "Paid" : "Pending");

export function numberToWordsIndian(num: number): string {
  if (!num || isNaN(num) || num <= 0) return "Zero Rupees Only";
  
  const a = [
    "", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine",
    "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen",
    "Seventeen", "Eighteen", "Nineteen"
  ];
  const b = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

  function inWords(n: number): string {
    if (n < 20) return a[n];
    const digit = n % 10;
    return b[Math.floor(n / 10)] + (digit ? " " + a[digit] : "");
  }

  const rounded = Math.floor(num);
  let str = "";
  
  const crore = Math.floor(rounded / 10000000);
  const lakh = Math.floor((rounded % 10000000) / 100000);
  const thousand = Math.floor((rounded % 100000) / 1000);
  const hundred = Math.floor((rounded % 1000) / 100);
  const rest = rounded % 100;

  if (crore > 0) {
    str += inWords(crore) + " Crore ";
  }
  if (lakh > 0) {
    str += inWords(lakh) + " Lakh ";
  }
  if (thousand > 0) {
    str += inWords(thousand) + " Thousand ";
  }
  if (hundred > 0) {
    str += inWords(hundred) + " Hundred ";
  }
  if (rest > 0) {
    if (str !== "") str += "and ";
    str += inWords(rest) + " ";
  }

  const suffix = rounded === 1 ? " Rupee Only" : " Rupees Only";
  return (str.trim() + suffix).replace(/\s+/g, " ");
}
