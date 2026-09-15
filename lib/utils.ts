export const currency = (amount: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0
  }).format(amount || 0);

export const feeStatus = (due: number) => (due <= 0 ? "Paid" : "Pending");
