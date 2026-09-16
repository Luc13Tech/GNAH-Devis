import type { Quote } from "./types";

/**
 * Formate un montant avec le symbole de devise.
 */
export function money(
  amount: number,
  symbol: string,
): string {
  const formatted = new Intl.NumberFormat("fr-FR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);

  return `${formatted} ${symbol}`;
}

/**
 * Transforme un texte en format compatible avec
 * un nom de fichier.
 */
export function slug(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .substring(0, 80);
}

/**
 * Retourne la date actuelle au format YYYY-MM-DD.
 */
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

/**
 * Calcule les totaux d'un devis.
 */
export function quoteTotals(quote: Quote) {
  const subtotal = quote.items.reduce(
    (total, item) =>
      total +
      Number(item.quantity || 0) *
        Number(item.unitPrice || 0),
    0,
  );

  const discount = Math.max(
    0,
    Number(quote.discount || 0),
  );

  const taxableBase = Math.max(
    0,
    subtotal - discount,
  );

  const tax =
    quote.applyTax
      ? taxableBase *
        (Number(quote.taxRate || 0) / 100)
      : 0;

  const total = taxableBase + tax;

  return {
    subtotal,
    discount,
    taxableBase,
    tax,
    total,
  };
}

/**
 * Formate une date YYYY-MM-DD en date française.
 */
export function formatDate(
  value: string,
): string {
  if (!value) {
    return "";
  }

  const date = new Date(`${value}T00:00:00`);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

/**
 * Génère un numéro de devis à partir
 * du compteur automatique.
 */
export function formatQuoteNumber(
  number: number,
): string {
  return `N°${String(number).padStart(4, "0")}`;
}

/**
 * Génère le nom de fichier PDF du devis.
 *
 * Exemple :
 * Devis_N°0001_16-09-2026_Nom_Prenom.pdf
 */
export function quoteFileName(
  quote: Quote,
): string {
  const date = quote.date
    .split("-")
    .reverse()
    .join("-");

  const clientName =
    slug(quote.client.name) || "Client";

  return `Devis_${quote.number}_${date}_${clientName}.pdf`;
}
