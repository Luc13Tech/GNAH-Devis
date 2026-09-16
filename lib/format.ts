import type { Quote } from "@/lib/types";

export function today(): string {
  const date = new Date();

  const year = date.getFullYear();
  const month = String(
    date.getMonth() + 1,
  ).padStart(2, "0");
  const day = String(
    date.getDate(),
  ).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

export function formatDate(
  date: string,
): string {
  if (!date) {
    return "";
  }

  const parts = date.split("-");

  if (parts.length !== 3) {
    return date;
  }

  return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

export function formatQuoteNumber(
  number: number,
): string {
  return `N°${String(number).padStart(
    4,
    "0",
  )}`;
}

/**
 * Formatage professionnel des montants.
 *
 * Exemple :
 * 200000   → 200.000 FCFA
 * 3200000  → 3.200.000 FCFA
 * 17500000 → 17.500.000 FCFA
 *
 * Le séparateur des milliers est volontairement
 * un point "." et jamais "/" ou une virgule.
 */
export function money(
  value: number,
  currencySymbol: string,
): string {
  const amount = Number(value) || 0;

  const rounded =
    Math.round(
      (amount + Number.EPSILON) *
        100,
    ) / 100;

  const [integerPart, decimalPart] =
    rounded
      .toFixed(2)
      .split(".");

  const formattedInteger =
    integerPart.replace(
      /\B(?=(\d{3})+(?!\d))/g,
      ".",
    );

  const formatted =
    decimalPart === "00"
      ? formattedInteger
      : `${formattedInteger},${decimalPart}`;

  return `${formatted} ${currencySymbol}`;
}

export function quoteTotals(
  quote: Quote,
) {
  const subtotal =
    quote.items.reduce(
      (sum, item) => {
        const quantity =
          Number(
            item.quantity,
          ) || 0;

        const unitPrice =
          Number(
            item.unitPrice,
          ) || 0;

        return (
          sum +
          quantity *
            unitPrice
        );
      },
      0,
    );

  const discount =
    Math.max(
      0,
      Number(
        quote.discount,
      ) || 0,
    );

  const taxableAmount =
    Math.max(
      0,
      subtotal - discount,
    );

  const tax =
    quote.applyTax
      ? taxableAmount *
        ((Number(
          quote.taxRate,
        ) || 0) /
          100)
      : 0;

  const total =
    taxableAmount + tax;

  return {
    subtotal,
    discount,
    taxableAmount,
    tax,
    total,
  };
}

export function slug(
  value: string,
): string {
  return value
    .normalize("NFD")
    .replace(
      /[\u0300-\u036f]/g,
      "",
    )
    .toLowerCase()
    .trim()
    .replace(
      /[^a-z0-9]+/g,
      "-",
    )
    .replace(
      /^-+|-+$/g,
      "",
    );
}

export function quoteFileName(
  quote: Quote,
): string {
  const clientName =
    slug(
      quote.client.name ||
        "Client",
    ) || "Client";

  const date =
    quote.date ||
    today();

  return `Devis_${quote.number}_${date}_${clientName}.pdf`;
    }
