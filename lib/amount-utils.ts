export const validate_amount = (amount: string | number | null | undefined): string => {
  if (amount === null || amount === undefined || amount === "") {
    return "0.00";
  }
  const num = typeof amount === "string" ? parseFloat(amount.replace(/,/g, "")) : amount;
  if (isNaN(num) || !isFinite(num) || num < 0) {
    throw new Error(`Invalid amount: ${amount}`);
  }
  if (Math.abs(num) > 999999999999.99) {
    throw new Error("Amount exceeds maximum allowed value");
  }
  return num.toFixed(2);
};

export const format_amount = (amount: string | number, type: "debit" | "credit"): string => {
  const num = typeof amount === "string" ? parseFloat(amount) : amount;
  if (isNaN(num)) return "₹0.00";
  const formatted = new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num);
  return type === "debit" ? `-${formatted}` : formatted;
};

export const format_balance = (balance: string | number): string => {
  const num = typeof balance === "string" ? parseFloat(balance) : balance;
  if (isNaN(num)) return "₹0.00";
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num);
};

