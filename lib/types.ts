export type QuoteStatus =
  | "Brouillon"
  | "Envoyé"
  | "Accepté"
  | "Refusé"
  | "En attente";

export type Client = {
  id: string;
  name: string;
  company?: string;
  phone?: string;
  whatsapp?: string;
  email?: string;
  address?: string;
};

export type QuoteItem = {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
};

export type Quote = {
  id: string;
  number: string;
  date: string;

  client: Client;

  projectName: string;
  projectDescription: string;

  currency: string;
  currencySymbol: string;

  applyTax: boolean;
  taxRate: number;

  discount: number;

  items: QuoteItem[];

  notes: string;
  terms: string;

  status: QuoteStatus;

  createdAt: string;
  updatedAt: string;
};

export type CompanySettings = {
  name: string;
  legalForm: string;

  ninea: string;
  rcs: string;

  address: string;

  phone: string;
  whatsapp: string;
  email: string;
  website: string;

  logoPath: string;
  stampPath: string;
  signaturePath: string;

  footerText: string;
};

export type Currency = {
  code: string;
  symbol: string;
  label: string;
};

export type AppSettings = {
  company: CompanySettings;

  currencies: Currency[];

  nextQuoteNumber: number;
};

export const defaultSettings: AppSettings = {
  company: {
    name: "GROUPE NDOYE AFRICA HOLDING",
    legalForm: "SUARL",

    ninea: "005554789",
    rcs: "RCSN DKR 2015 B13085",

    address: "Ngor Sunugal 11045, Sénégal",

    phone: "+221 77 939 84 84",
    whatsapp: "+221 77 939 84 84",
    email: "contact@groupendoyeafrica.com",
    website: "https://groupendoyeafrica.com",

    logoPath: "/assets/logo.png",
    stampPath: "/assets/cachet.png",
    signaturePath: "/assets/signature.png",

    footerText:
      "Document généré par GROUPE NDOYE AFRICA HOLDING - DEVIS",
  },

  currencies: [
    {
      code: "XOF",
      symbol: "FCFA",
      label: "Franc CFA (XOF)",
    },
    {
      code: "EUR",
      symbol: "€",
      label: "Euro (EUR)",
    },
    {
      code: "USD",
      symbol: "$",
      label: "Dollar américain (USD)",
    },
    {
      code: "GBP",
      symbol: "£",
      label: "Livre sterling (GBP)",
    },
    {
      code: "MAD",
      symbol: "MAD",
      label: "Dirham marocain (MAD)",
    },
    {
      code: "CAD",
      symbol: "CA$",
      label: "Dollar canadien (CAD)",
    },
  ],

  nextQuoteNumber: 1,
};
