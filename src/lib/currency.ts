export const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(value);
};

export const parseCurrency = (value: string): number => {
  return parseFloat(value.replace(/[^\d.]/g, '')) || 0;
};

// ₦ symbol for inline use
export const NGNSymbol = "₦" as const;
