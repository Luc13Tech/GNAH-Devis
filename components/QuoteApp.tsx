"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  Calculator,
  Check,
  ChevronLeft,
  CirclePlus,
  Download,
  FileDown,
  FileText,
  LayoutDashboard,
  Pencil,
  Plus,
  Printer,
  Search,
  Settings,
  Trash2,
  Upload,
  Users,
  X,
} from "lucide-react";

import {
  defaultSettings,
  type AppSettings,
  type Client,
  type Quote,
  type QuoteItem,
  type QuoteStatus,
} from "@/lib/types";

import {
  deleteQuote,
  exportBackup,
  getClients,
  getQuotes,
  getSettings,
  importBackup,
  saveClient,
  saveQuote,
  saveSettings,
} from "@/lib/db";

import {
  formatDate,
  formatQuoteNumber,
  money,
  quoteFileName,
  quoteTotals,
  today,
} from "@/lib/format";

import {
  downloadQuotePDF,
  printQuotePDF,
} from "./pdf";

type View =
  | "dashboard"
  | "quotes"
  | "clients"
  | "services"
  | "settings";

const createEmptyClient = (): Client => ({
  id: crypto.randomUUID(),
  name: "",
  company: "",
  phone: "",
  whatsapp: "",
  email: "",
  address: "",
});

const createEmptyItem = (): QuoteItem => ({
  id: crypto.randomUUID(),
  description: "",
  quantity: 1,
  unitPrice: 0,
});

function createNewQuote(
  settings: AppSettings,
): Quote {
  const defaultCurrency =
    settings.currencies.find(
      (currency) => currency.code === "XOF",
    ) ?? settings.currencies[0];

  return {
    id: crypto.randomUUID(),

    number: formatQuoteNumber(
      settings.nextQuoteNumber,
    ),

    date: today(),

    client: createEmptyClient(),

    projectName: "",
    projectDescription: "",

    currency:
      defaultCurrency?.code ?? "XOF",

    currencySymbol:
      defaultCurrency?.symbol ?? "FCFA",

    applyTax: false,
    taxRate: 18,

    discount: 0,

    items: [createEmptyItem()],

    notes: "",

    terms:
      "Validité du devis : 30 jours. Toute prestation supplémentaire fera l’objet d’un devis complémentaire.",

    status: "Brouillon",

    createdAt:
      new Date().toISOString(),

    updatedAt:
      new Date().toISOString(),
  };
}

export default function QuoteApp() {
  const [view, setView] =
    useState<View>("dashboard");

  const [settings, setSettings] =
    useState<AppSettings | null>(null);

  const [quotes, setQuotes] =
    useState<Quote[]>([]);

  const [clients, setClients] =
    useState<Client[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [editingQuote, setEditingQuote] =
    useState<Quote | null>(null);

  const [search, setSearch] =
    useState("");

  const [toast, setToast] =
    useState("");

  const [
    showClientModal,
    setShowClientModal,
  ] = useState(false);

  const [editingClient, setEditingClient] =
    useState<Client>(createEmptyClient());

  const fileInputRef =
    useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    async function loadData() {
      try {
        const [
          loadedSettings,
          loadedQuotes,
          loadedClients,
        ] = await Promise.all([
          getSettings(),
          getQuotes(),
          getClients(),
        ]);

        setSettings(loadedSettings);
        setQuotes(loadedQuotes);
        setClients(loadedClients);
      } catch (error) {
        console.error(error);

        setToast(
          "Impossible de charger les données.",
        );
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, []);

  useEffect(() => {
    if (!toast) {
      return;
    }

    const timer = window.setTimeout(() => {
      setToast("");
    }, 3000);

    return () => {
      window.clearTimeout(timer);
    };
  }, [toast]);

  const filteredQuotes = useMemo(() => {
    const query =
      search.trim().toLowerCase();

    if (!query) {
      return quotes;
    }

    return quotes.filter((quote) => {
      return (
        quote.number
          .toLowerCase()
          .includes(query) ||
        quote.client.name
          .toLowerCase()
          .includes(query) ||
        (quote.client.company ?? "")
          .toLowerCase()
          .includes(query) ||
        quote.projectName
          .toLowerCase()
          .includes(query)
      );
    });
  }, [quotes, search]);

  const statistics = useMemo(() => {
    let total = 0;
    let accepted = 0;
    let pending = 0;

    for (const quote of quotes) {
      total += quoteTotals(quote).total;

      if (quote.status === "Accepté") {
        accepted += 1;
      }

      if (
        quote.status === "Envoyé" ||
        quote.status === "En attente"
      ) {
        pending += 1;
      }
    }

    return {
      count: quotes.length,
      total,
      accepted,
      pending,
    };
  }, [quotes]);

  function notify(message: string) {
    setToast(message);
  }

  async function refreshData() {
    const [
      loadedSettings,
      loadedQuotes,
      loadedClients,
    ] = await Promise.all([
      getSettings(),
      getQuotes(),
      getClients(),
    ]);

    setSettings(loadedSettings);
    setQuotes(loadedQuotes);
    setClients(loadedClients);
  }

  function startNewQuote() {
    if (!settings) {
      return;
    }

    const newQuote =
      createNewQuote(settings);

    setEditingQuote(newQuote);
    setView("quotes");
  }

  function editQuote(quote: Quote) {
    setEditingQuote({
      ...quote,
      client: {
        ...quote.client,
      },
      items: quote.items.map(
        (item) => ({
          ...item,
        }),
      ),
    });

    setView("quotes");
  }

  async function saveCurrentQuote() {
    if (
      !editingQuote ||
      !settings
    ) {
      return;
    }

    if (
      !editingQuote.client.name.trim()
    ) {
      notify(
        "Le nom du client est obligatoire.",
      );
      return;
    }

    if (
      !editingQuote.projectName.trim()
    ) {
      notify(
        "Le nom du projet est obligatoire.",
      );
      return;
    }

    const now =
      new Date().toISOString();

    const quoteToSave: Quote = {
      ...editingQuote,
      updatedAt: now,
    };

    const existingQuote =
      quotes.find(
        (quote) =>
          quote.id ===
          quoteToSave.id,
      );

    await saveQuote(quoteToSave);

    const existingClient =
      clients.find(
        (client) =>
          client.name
            .trim()
            .toLowerCase() ===
          quoteToSave.client.name
            .trim()
            .toLowerCase(),
      );

    if (!existingClient) {
      await saveClient(
        quoteToSave.client,
      );
    }

    if (!existingQuote) {
      const nextSettings: AppSettings =
        {
          ...settings,
          nextQuoteNumber:
            settings.nextQuoteNumber +
            1,
        };

      await saveSettings(
        nextSettings,
      );

      setSettings(nextSettings);
    }

    await refreshData();

    setEditingQuote(quoteToSave);

    notify(
      existingQuote
        ? "Devis mis à jour."
        : "Devis créé et enregistré.",
    );
  }

  async function removeQuote(
    quote: Quote,
  ) {
    const confirmed =
      window.confirm(
        `Voulez-vous supprimer le devis ${quote.number} ?`,
      );

    if (!confirmed) {
      return;
    }

    await deleteQuote(quote.id);

    await refreshData();

    if (
      editingQuote?.id ===
      quote.id
    ) {
      setEditingQuote(null);
    }

    notify("Devis supprimé.");
  }

  function updateQuote<
    K extends keyof Quote,
  >(
    key: K,
    value: Quote[K],
  ) {
    setEditingQuote(
      (current) => {
        if (!current) {
          return current;
        }

        return {
          ...current,
          [key]: value,
        };
      },
    );
  }

  function updateClient<
    K extends keyof Client,
  >(
    key: K,
    value: Client[K],
  ) {
    setEditingQuote(
      (current) => {
        if (!current) {
          return current;
        }

        return {
          ...current,

          client: {
            ...current.client,
            [key]: value,
          },
        };
      },
    );
  }

  function updateItem(
    id: string,
    key: keyof QuoteItem,
    value: string | number,
  ) {
    setEditingQuote(
      (current) => {
        if (!current) {
          return current;
        }

        return {
          ...current,

          items: current.items.map(
            (item) =>
              item.id === id
                ? {
                    ...item,
                    [key]: value,
                  }
                : item,
          ),
        };
      },
    );
  }

  function addItem() {
    setEditingQuote(
      (current) => {
        if (!current) {
          return current;
        }

        return {
          ...current,

          items: [
            ...current.items,
            createEmptyItem(),
          ],
        };
      },
    );
  }

  function removeItem(
    id: string,
  ) {
    setEditingQuote(
      (current) => {
        if (!current) {
          return current;
        }

        if (
          current.items.length <= 1
        ) {
          return current;
        }

        return {
          ...current,

          items:
            current.items.filter(
              (item) =>
                item.id !== id,
            ),
        };
      },
    );
  }

  function selectClient(
    clientId: string,
  ) {
    const client =
      clients.find(
        (item) =>
          item.id === clientId,
      );

    if (!client) {
      return;
    }

    updateQuote("client", {
      ...client,
    });
  }

  async function saveNewClient() {
    if (
      !editingClient.name.trim()
    ) {
      notify(
        "Le nom du client est obligatoire.",
      );
      return;
    }

    await saveClient(
      editingClient,
    );

    await refreshData();

    setShowClientModal(false);

    setEditingClient(
      createEmptyClient(),
    );

    notify("Client enregistré.");
  }

  async function saveCompanySettings() {
    if (!settings) {
      return;
    }

    await saveSettings(settings);

    notify(
      "Paramètres enregistrés.",
    );
  }

  function updateCompany(
    key: keyof AppSettings["company"],
    value: string,
  ) {
    setSettings(
      (current) => {
        if (!current) {
          return current;
        }

        return {
          ...current,

          company: {
            ...current.company,
            [key]: value,
          },
        };
      },
    );
  }

  function updateCurrency(
    index: number,
    key:
      | "code"
      | "symbol"
      | "label",
    value: string,
  ) {
    setSettings(
      (current) => {
        if (!current) {
          return current;
        }

        return {
          ...current,

          currencies:
            current.currencies.map(
              (
                currency,
                currencyIndex,
              ) =>
                currencyIndex ===
                index
                  ? {
                      ...currency,
                      [key]: value,
                    }
                  : currency,
            ),
        };
      },
    );
  }

  function addCurrency() {
    setSettings(
      (current) => {
        if (!current) {
          return current;
        }

        return {
          ...current,

          currencies: [
            ...current.currencies,
            {
              code: "NEW",
              symbol: "",
              label:
                "Nouvelle devise",
            },
          ],
        };
      },
    );
  }

  function removeCurrency(
    index: number,
  ) {
    setSettings(
      (current) => {
        if (!current) {
          return current;
        }

        return {
          ...current,

          currencies:
            current.currencies.filter(
              (_, currencyIndex) =>
                currencyIndex !==
                index,
            ),
        };
      },
    );
  }

  async function handleExport() {
    try {
      const json =
        await exportBackup();

      const blob = new Blob(
        [json],
        {
          type: "application/json",
        },
      );

      const url =
        URL.createObjectURL(blob);

      const link =
        document.createElement("a");

      link.href = url;

      link.download =
        `GNA_Devis_Backup_${today()}.json`;

      document.body.appendChild(
        link,
      );

      link.click();

      link.remove();

      URL.revokeObjectURL(url);

      notify(
        "Sauvegarde exportée.",
      );
    } catch (error) {
      console.error(error);

      notify(
        "Erreur lors de l'export.",
      );
    }
  }

  function openImport() {
    fileInputRef.current?.click();
  }

  async function handleImport(
    event: React.ChangeEvent<HTMLInputElement>,
  ) {
    const file =
      event.target.files?.[0];

    if (!file) {
      return;
    }

    try {
      const json =
        await file.text();

      await importBackup(json);

      await refreshData();

      notify(
        "Sauvegarde importée.",
      );
    } catch (error) {
      console.error(error);

      notify(
        "Le fichier de sauvegarde est invalide.",
      );
    } finally {
      event.target.value = "";
    }
  }

  async function handlePDF(
    quote: Quote,
  ) {
    if (!settings) {
      return;
    }

    try {
      await downloadQuotePDF(
        quote,
        settings,
      );

      notify(
        `PDF généré : ${quoteFileName(
          quote,
        )}`,
      );
    } catch (error) {
      console.error(error);

      notify(
        "Impossible de générer le PDF.",
      );
    }
  }

  async function handlePrint(
    quote: Quote,
  ) {
    if (!settings) {
      return;
    }

    try {
      await printQuotePDF(
        quote,
        settings,
      );
    } catch (error) {
      console.error(error);

      notify(
        "Impossible d'imprimer le devis.",
      );
    }
  }

  if (
    loading ||
    !settings
  ) {
    return (
      <div className="loading">
        <div className="loading-card">
          <img
            src="/assets/logo.png"
            alt="GROUPE NDOYE AFRICA HOLDING"
          />

          <h2>
            GROUPE NDOYE AFRICA HOLDING
          </h2>

          <p>
            Chargement de votre
            espace devis...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <img
            className="brand-logo"
            src={
              settings.company
                .logoPath
            }
            alt="Logo"
          />

          <div className="brand-title">
            <strong>
              GROUPE NDOYE
              <br />
              AFRICA HOLDING
            </strong>

            <span>
              Gestion des devis
            </span>
          </div>
        </div>

        <nav className="nav">
          <NavButton
            active={
              view === "dashboard"
            }
            icon={
              <LayoutDashboard
                size={18}
              />
            }
            label="Tableau de bord"
            onClick={() =>
              setView(
                "dashboard",
              )
            }
          />

          <NavButton
            active={
              view === "quotes"
            }
            icon={
              <FileText
                size={18}
              />
            }
            label="Devis"
            onClick={() =>
              setView("quotes")
            }
          />

          <NavButton
            active={
              view === "clients"
            }
            icon={
              <Users size={18} />
            }
            label="Clients"
            onClick={() =>
              setView("clients")
            }
          />

          <NavButton
            active={
              view === "services"
            }
            icon={
              <Calculator
                size={18}
              />
            }
            label="Services"
            onClick={() =>
              setView("services")
            }
          />

          <NavButton
            active={
              view === "settings"
            }
            icon={
              <Settings
                size={18}
              />
            }
            label="Paramètres"
            onClick={() =>
              setView("settings")
            }
          />
        </nav>

        <div className="sidebar-bottom">
          <small>
            NINEA :{" "}
            {settings.company.ninea}
          </small>

          <small>
            {settings.company.rcs}
          </small>

          <small>
            {settings.company.website}
          </small>
        </div>
      </aside>

      <main className="main">
        <header className="topbar">
          <div className="topbar-title">
            <h1>
              {view ===
                "dashboard" &&
                "Tableau de bord"}

              {view ===
                "quotes" &&
                "Gestion des devis"}

              {view ===
                "clients" &&
                "Clients"}

              {view ===
                "services" &&
                "Services"}

              {view ===
                "settings" &&
                "Paramètres"}
            </h1>

            <p>
              GROUPE NDOYE AFRICA
              HOLDING • Devis
              professionnel
            </p>
          </div>

          <div className="topbar-actions">
            <button
              className="btn btn-secondary"
              onClick={
                handleExport
              }
            >
              <Download
                size={15}
              />

              <span>
                Sauvegarder
              </span>
            </button>

            <button
              className="btn btn-primary"
              onClick={
                startNewQuote
              }
            >
              <Plus size={16} />

              <span>
                Nouveau devis
              </span>
            </button>
          </div>
        </header>

        <div className="page">
          {view ===
            "dashboard" && (
            <Dashboard
              settings={settings}
              quotes={quotes}
              stats={statistics}
              onNewQuote={
                startNewQuote
              }
              onQuotes={() =>
                setView(
                  "quotes",
                )
              }
              onEditQuote={
                editQuote
              }
            />
          )}

          {view ===
            "quotes" && (
            <>
              {!editingQuote ? (
                <QuotesList
                  quotes={
                    filteredQuotes
                  }
                  search={search}
                  setSearch={
                    setSearch
                  }
                  onNew={
                    startNewQuote
                  }
                  onEdit={
                    editQuote
                  }
                  onDelete={
                    removeQuote
                  }
                  onPDF={
                    handlePDF
                  }
                />
              ) : (
                <QuoteEditor
                  quote={
                    editingQuote
                  }
                  settings={
                    settings
                  }
                  clients={clients}
                  onBack={() =>
                    setEditingQuote(
                      null,
                    )
                  }
                  onSave={
                    saveCurrentQuote
                  }
                  onPDF={() =>
                    handlePDF(
                      editingQuote,
                    )
                  }
                  onPrint={() =>
                    handlePrint(
                      editingQuote,
                    )
                  }
                  updateQuote={
                    updateQuote
                  }
                  updateClient={
                    updateClient
                  }
                  updateItem={
                    updateItem
                  }
                  addItem={
                    addItem
                  }
                  removeItem={
                    removeItem
                  }
                  selectClient={
                    selectClient
                  }
                />
              )}
            </>
          )}

          {view ===
            "clients" && (
            <ClientsView
              clients={clients}
              onNew={() => {
                setEditingClient(
                  createEmptyClient(),
                );

                setShowClientModal(
                  true,
                );
              }}
              onEdit={(client) => {
                setEditingClient({
                  ...client,
                });

                setShowClientModal(
                  true,
                );
              }}
            />
          )}

          {view ===
            "services" && (
            <ServicesView />
          )}

          {view ===
            "settings" && (
            <SettingsView
              settings={settings}
              updateCompany={
                updateCompany
              }
              updateCurrency={
                updateCurrency
              }
              addCurrency={
                addCurrency
              }
              removeCurrency={
                removeCurrency
              }
              save={
                saveCompanySettings
              }
              onExport={
                handleExport
              }
              onImport={
                openImport
              }
            />
          )}
        </div>
      </main>

      <input
        ref={fileInputRef}
        type="file"
        accept=".json,application/json"
        hidden
        onChange={
          handleImport
        }
      />

      {showClientModal && (
        <ClientModal
          client={editingClient}
          onChange={
            setEditingClient
          }
          onClose={() =>
            setShowClientModal(
              false,
            )
          }
          onSave={
            saveNewClient
          }
        />
      )}

      {toast && (
        <div className="toast">
          <Check size={16} />
          <span>{toast}</span>
        </div>
      )}
    </div>
  );
}

/* =========================================
   NAVIGATION
========================================= */

function NavButton({
  active,
  icon,
  label,
  onClick,
}: {
  active: boolean;
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      className={`nav-button ${
        active ? "active" : ""
      }`}
      onClick={onClick}
    >
      {icon}

      <span>{label}</span>
    </button>
  );
}

/* =========================================
   DASHBOARD
========================================= */

function Dashboard({
  settings,
  quotes,
  stats,
  onNewQuote,
  onQuotes,
  onEditQuote,
}: {
  settings: AppSettings;
  quotes: Quote[];
  stats: {
    count: number;
    total: number;
    accepted: number;
    pending: number;
  };
  onNewQuote: () => void;
  onQuotes: () => void;
  onEditQuote: (
    quote: Quote,
  ) => void;
}) {
  const recentQuotes =
    quotes.slice(0, 5);

  return (
    <>
      <section className="hero">
        <div className="hero-content">
          <h2>
            Bienvenue dans votre
            espace devis.
          </h2>

          <p>
            Créez, personnalisez,
            sauvegardez et exportez
            vos devis professionnels
            avec l'identité de{" "}
            {
              settings.company.name
            }
            .
          </p>
        </div>

        <div className="hero-actions">
          <button
            className="btn btn-gold"
            onClick={
              onNewQuote
            }
          >
            <Plus size={16} />
            Nouveau devis
          </button>

          <button
            className="btn btn-secondary"
            onClick={onQuotes}
          >
            <FileText
              size={16}
            />
            Voir les devis
          </button>
        </div>
      </section>

      <section className="stats-grid">
        <StatCard
          label="Devis créés"
          value={String(
            stats.count,
          )}
          note="Total enregistré"
        />

        <StatCard
          label="Montant total"
          value={money(
            stats.total,
            "FCFA",
          )}
          note="Tous les devis"
        />

        <StatCard
          label="Acceptés"
          value={String(
            stats.accepted,
          )}
          note="Devis acceptés"
        />

        <StatCard
          label="En attente"
          value={String(
            stats.pending,
          )}
          note="Envoyés / attente"
        />
      </section>

      <section className="card">
        <div className="card-header">
          <div>
            <h3>
              Derniers devis
            </h3>

            <p>
              Les derniers documents
              enregistrés.
            </p>
          </div>

          <button
            className="btn btn-secondary btn-small"
            onClick={onQuotes}
          >
            Voir tout
          </button>
        </div>

        {recentQuotes.length ===
        0 ? (
          <div className="empty">
            Aucun devis pour le
            moment.
          </div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>N°</th>
                  <th>Client</th>
                  <th>Projet</th>
                  <th>Date</th>
                  <th>Total</th>
                  <th>Statut</th>
                  <th />
                </tr>
              </thead>

              <tbody>
                {recentQuotes.map(
                  (quote) => (
                    <tr
                      key={
                        quote.id
                      }
                    >
                      <td>
                        <strong>
                          {
                            quote.number
                          }
                        </strong>
                      </td>

                      <td>
                        {
                          quote.client
                            .name
                        }
                      </td>

                      <td>
                        {
                          quote.projectName
                        }
                      </td>

                      <td>
                        {formatDate(
                          quote.date,
                        )}
                      </td>

                      <td>
                        <strong>
                          {money(
                            quoteTotals(
                              quote,
                            ).total,
                            quote.currencySymbol,
                          )}
                        </strong>
                      </td>

                      <td>
                        <StatusBadge
                          status={
                            quote.status
                          }
                        />
                      </td>

                      <td>
                        <button
                          className="icon-button"
                          onClick={() =>
                            onEditQuote(
                              quote,
                            )
                          }
                        >
                          <Pencil
                            size={14}
                          />
                        </button>
                      </td>
                    </tr>
                  ),
                )}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
}

/* =========================================
   QUOTES LIST
========================================= */

function QuotesList({
  quotes,
  search,
  setSearch,
  onNew,
  onEdit,
  onDelete,
  onPDF,
}: {
  quotes: Quote[];
  search: string;
  setSearch: (
    value: string,
  ) => void;
  onNew: () => void;
  onEdit: (
    quote: Quote,
  ) => void;
  onDelete: (
    quote: Quote,
  ) => void;
  onPDF: (
    quote: Quote,
  ) => void;
}) {
  return (
    <section className="card">
      <div className="card-header">
        <div>
          <h3>
            Tous les devis
          </h3>

          <p>
            Création, modification
            et export de vos devis.
          </p>
        </div>

        <div className="topbar-actions">
          <div className="search-box">
            <Search size={15} />

            <input
              value={search}
              onChange={(event) =>
                setSearch(
                  event.target.value,
                )
              }
              placeholder="Rechercher..."
            />
          </div>

          <button
            className="btn btn-primary"
            onClick={onNew}
          >
            <Plus size={15} />
            Nouveau
          </button>
        </div>
      </div>

      {quotes.length === 0 ? (
        <div className="empty">
          Aucun devis trouvé.
        </div>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>N°</th>
                <th>Client</th>
                <th>Projet</th>
                <th>Date</th>
                <th>Total</th>
                <th>Statut</th>
                <th>Actions</th>
              </tr>
            </thead>

            <tbody>
              {quotes.map(
                (quote) => (
                  <tr
                    key={
                      quote.id
                    }
                  >
                    <td>
                      <strong>
                        {
                          quote.number
                        }
                      </strong>
                    </td>

                    <td>
                      <strong>
                        {
                          quote.client
                            .name
                        }
                      </strong>

                      {quote.client
                        .company && (
                        <div
                          style={{
                            color:
                              "var(--muted)",
                            fontSize: 10,
                            marginTop: 3,
                          }}
                        >
                          {
                            quote.client
                              .company
                          }
                        </div>
                      )}
                    </td>

                    <td>
                      {
                        quote.projectName
                      }
                    </td>

                    <td>
                      {formatDate(
                        quote.date,
                      )}
                    </td>

                    <td>
                      <strong>
                        {money(
                          quoteTotals(
                            quote,
                          ).total,
                          quote.currencySymbol,
                        )}
                      </strong>
                    </td>

                    <td>
                      <StatusBadge
                        status={
                          quote.status
                        }
                      />
                    </td>

                    <td>
                      <div
                        style={{
                          display:
                            "flex",
                          gap: 6,
                        }}
                      >
                        <button
                          className="icon-button"
                          title="Modifier"
                          onClick={() =>
                            onEdit(
                              quote,
                            )
                          }
                        >
                          <Pencil
                            size={
                              14
                            }
                          />
                        </button>

                        <button
                          className="icon-button"
                          title="PDF"
                          onClick={() =>
                            onPDF(
                              quote,
                            )
                          }
                        >
                          <FileDown
                            size={
                              14
                            }
                          />
                        </button>

                        <button
                          className="icon-button"
                          title="Supprimer"
                          onClick={() =>
                            onDelete(
                              quote,
                            )
                          }
                        >
                          <Trash2
                            size={
                              14
                            }
                          />
                        </button>
                      </div>
                    </td>
                  </tr>
                ),
              )}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

/* =========================================
   QUOTE EDITOR
========================================= */

function QuoteEditor({
  quote,
  settings,
  clients,
  onBack,
  onSave,
  onPDF,
  onPrint,
  updateQuote,
  updateClient,
  updateItem,
  addItem,
  removeItem,
  selectClient,
}: {
  quote: Quote;
  settings: AppSettings;
  clients: Client[];
  onBack: () => void;
  onSave: () => void;
  onPDF: () => void;
  onPrint: () => void;
  updateQuote: <
    K extends keyof Quote,
  >(
    key: K,
    value: Quote[K],
  ) => void;
  updateClient: <
    K extends keyof Client,
  >(
    key: K,
    value: Client[K],
  ) => void;
  updateItem: (
    id: string,
    key: keyof QuoteItem,
    value: string | number,
  ) => void;
  addItem: () => void;
  removeItem: (
    id: string,
  ) => void;
  selectClient: (
    id: string,
  ) => void;
}) {
  const totals =
    quoteTotals(quote);

  return (
    <>
      <div
        style={{
          display: "flex",
          justifyContent:
            "space-between",
          alignItems: "center",
          gap: 12,
          marginBottom: 18,
          flexWrap: "wrap",
        }}
      >
        <button
          className="btn btn-secondary"
          onClick={onBack}
        >
          <ChevronLeft
            size={15}
          />
          Retour
        </button>

        <div
          style={{
            display: "flex",
            gap: 7,
            flexWrap: "wrap",
            justifyContent:
              "flex-end",
          }}
        >
          <button
            className="btn btn-secondary"
            onClick={onPrint}
          >
            <Printer size={15} />
            Imprimer
          </button>

          <button
            className="btn btn-gold"
            onClick={onPDF}
          >
            <FileDown
              size={15}
            />
            Télécharger PDF
          </button>

          <button
            className="btn btn-primary"
            onClick={onSave}
          >
            <Check size={15} />
            Enregistrer
          </button>
        </div>
      </div>

      <div className="editor-layout">
        <div className="editor-main">
          <section className="card">
            <div className="card-body">
              <div className="section-title">
                <div>
                  <h3>
                    Informations du
                    devis
                  </h3>

                  <span>
                    {quote.number}
                  </span>
                </div>

                <StatusSelect
                  value={
                    quote.status
                  }
                  onChange={(
                    value,
                  ) =>
                    updateQuote(
                      "status",
                      value,
                    )
                  }
                />
              </div>

              <div className="form-grid-3">
                <Field
                  label="Numéro du devis"
                  value={
                    quote.number
                  }
                  onChange={(
                    value,
                  ) =>
                    updateQuote(
                      "number",
                      value,
                    )
                  }
                />

                <Field
                  label="Date"
                  type="date"
                  value={
                    quote.date
                  }
                  onChange={(
                    value,
                  ) =>
                    updateQuote(
                      "date",
                      value,
                    )
                  }
                />

                <SelectField
                  label="Devise"
                  value={
                    quote.currency
                  }
                  onChange={(
                    value,
                  ) => {
                    const currency =
                      settings.currencies.find(
                        (
                          item,
                        ) =>
                          item.code ===
                          value,
                      );

                    updateQuote(
                      "currency",
                      value,
                    );

                    updateQuote(
                      "currencySymbol",
                      currency?.symbol ??
                        value,
                    );
                  }}
                  options={settings.currencies.map(
                    (
                      currency,
                    ) => ({
                      value:
                        currency.code,
                      label:
                        currency.label,
                    }),
                  )}
                />

                <Field
                  label="Nom du projet"
                  value={
                    quote.projectName
                  }
                  onChange={(
                    value,
                  ) =>
                    updateQuote(
                      "projectName",
                      value,
                    )
                  }
                  full
                />

                <Field
                  label="Description du projet"
                  value={
                    quote.projectDescription
                  }
                  onChange={(
                    value,
                  ) =>
                    updateQuote(
                      "projectDescription",
                      value,
                    )
                  }
                  textarea
                  full
                />
              </div>
            </div>
          </section>

          <section className="card">
            <div className="card-body">
              <div className="section-title">
                <div>
                  <h3>
                    Client
                  </h3>

                  <span>
                    Coordonnées du
                    client
                  </span>
                </div>
              </div>

              <div className="form-grid-3">
                <SelectField
                  label="Client enregistré"
                  value=""
                  onChange={
                    selectClient
                  }
                  options={[
                    {
                      value: "",
                      label:
                        "Sélectionner un client...",
                    },
                    ...clients.map(
                      (
                        client,
                      ) => ({
                        value:
                          client.id,
                        label:
                          client.company
                            ? `${client.name} — ${client.company}`
                            : client.name,
                      }),
                    ),
                  ]}
                />

                <Field
                  label="Nom / Prénom"
                  value={
                    quote.client
                      .name
                  }
                  onChange={(
                    value,
                  ) =>
                    updateClient(
                      "name",
                      value,
                    )
                  }
                />

                <Field
                  label="Entreprise"
                  value={
                    quote.client
                      .company ??
                    ""
                  }
                  onChange={(
                    value,
                  ) =>
                    updateClient(
                      "company",
                      value,
                    )
                  }
                />

                <Field
                  label="Téléphone"
                  value={
                    quote.client
                      .phone ??
                    ""
                  }
                  onChange={(
                    value,
                  ) =>
                    updateClient(
                      "phone",
                      value,
                    )
                  }
                />

                <Field
                  label="WhatsApp"
                  value={
                    quote.client
                      .whatsapp ??
                    ""
                  }
                  onChange={(
                    value,
                  ) =>
                    updateClient(
                      "whatsapp",
                      value,
                    )
                  }
                />

                <Field
                  label="Email"
                  value={
                    quote.client
                      .email ??
                    ""
                  }
                  onChange={(
                    value,
                  ) =>
                    updateClient(
                      "email",
                      value,
                    )
                  }
                />

                <Field
                  label="Adresse"
                  value={
                    quote.client
                      .address ??
                    ""
                  }
                  onChange={(
                    value,
                  ) =>
                    updateClient(
                      "address",
                      value,
                    )
                  }
                  full
                />
              </div>
            </div>
          </section>

          <section className="card">
            <div className="card-header">
              <div>
                <h3>
                  Prestations /
                  articles
                </h3>

                <p>
                  Ajoutez toutes les
                  lignes nécessaires.
                </p>
              </div>

              <button
                className="btn btn-secondary btn-small"
                onClick={addItem}
              >
                <CirclePlus
                  size={14}
                />
                Ajouter une ligne
              </button>
            </div>

            <div className="card-body">
              <div className="table-wrap">
                <table className="items-table">
                  <thead>
                    <tr>
                      <th>
                        Description
                      </th>
                      <th>
                        Quantité
                      </th>
                      <th>
                        Prix unitaire
                      </th>
                      <th>
                        Total
                      </th>
                      <th />
                    </tr>
                  </thead>

                  <tbody>
                    {quote.items.map(
                      (item) => {
                        const lineTotal =
                          Number(
                            item.quantity ||
                              0,
                          ) *
                          Number(
                            item.unitPrice ||
                              0,
                          );

                        return (
                          <tr
                            key={
                              item.id
                            }
                          >
                            <td>
                              <input
                                className="description"
                                value={
                                  item.description
                                }
                                onChange={(
                                  event,
                                ) =>
                                  updateItem(
                                    item.id,
                                    "description",
                                    event
                                      .target
                                      .value,
                                  )
                                }
                                placeholder="Description de la prestation"
                              />
                            </td>

                            <td>
                              <input
                                className="number"
                                type="number"
                                min="0"
                                step="0.01"
                                value={
                                  item.quantity
                                }
                                onChange={(
                                  event,
                                ) =>
                                  updateItem(
                                    item.id,
                                    "quantity",
                                    Number(
                                      event
                                        .target
                                        .value,
                                    ),
                                  )
                                }
                              />
                            </td>

                            <td>
                              <input
                                className="number"
                                type="number"
                                min="0"
                                step="0.01"
                                value={
                                  item.unitPrice
                                }
                                onChange={(
                                  event,
                                ) =>
                                  updateItem(
                                    item.id,
                                    "unitPrice",
                                    Number(
                                      event
                                        .target
                                        .value,
                                    ),
                                  )
                                }
                              />
                            </td>

                            <td>
                              <span className="item-total">
                                {money(
                                  lineTotal,
                                  quote.currencySymbol,
                                )}
                              </span>
                            </td>

                            <td>
                              <button
                                className="icon-button"
                                onClick={() =>
                                  removeItem(
                                    item.id,
                                  )
                                }
                              >
                                <Trash2
                                  size={
                                    14
                                  }
                                />
                              </button>
                            </td>
                          </tr>
                        );
                      },
                    )}
                  </tbody>
                </table>
              </div>

              <div className="form-grid-3">
                <Field
                  label="Remise"
                  type="number"
                  value={String(
                    quote.discount,
                  )}
                  onChange={(
                    value,
                  ) =>
                    updateQuote(
                      "discount",
                      Number(
                        value,
                      ),
                    )
                  }
                />

                <div className="field">
                  <label>
                    TVA
                  </label>

                  <div className="checkbox-field">
                    <input
                      type="checkbox"
                      checked={
                        quote.applyTax
                      }
                      onChange={(
                        event,
                      ) =>
                        updateQuote(
                          "applyTax",
                          event
                            .target
                            .checked,
                        )
                      }
                    />

                    <span>
                      Appliquer la TVA
                    </span>
                  </div>
                </div>

                {quote.applyTax && (
                  <Field
                    label="Taux TVA (%)"
                    type="number"
                    value={String(
                      quote.taxRate,
                    )}
                    onChange={(
                      value,
                    ) =>
                      updateQuote(
                        "taxRate",
                        Number(
                          value,
                        ),
                      )
                    }
                  />
                )}
              </div>

              <div className="totals">
                <div className="total-line">
                  <span>
                    Sous-total
                  </span>

                  <strong>
                    {money(
                      totals.subtotal,
                      quote.currencySymbol,
                    )}
                  </strong>
                </div>

                {totals.discount >
                  0 && (
                  <div className="total-line">
                    <span>
                      Remise
                    </span>

                    <strong>
                      -
                      {money(
                        totals.discount,
                        quote.currencySymbol,
                      )}
                    </strong>
                  </div>
                )}

                {quote.applyTax && (
                  <div className="total-line">
                    <span>
                      TVA{" "}
                      {quote.taxRate}
                      %
                    </span>

                    <strong>
                      {money(
                        totals.tax,
                        quote.currencySymbol,
                      )}
                    </strong>
                  </div>
                )}

                <div className="total-line grand">
                  <span>
                    TOTAL TTC
                  </span>

                  <strong>
                    {money(
                      totals.total,
                      quote.currencySymbol,
                    )}
                  </strong>
                </div>
              </div>
            </div>
          </section>

          <section className="card">
            <div className="card-body">
              <div className="form-grid">
                <Field
                  label="Notes"
                  value={
                    quote.notes
                  }
                  onChange={(
                    value,
                  ) =>
                    updateQuote(
                      "notes",
                      value,
                    )
                  }
                  textarea
                />

                <Field
                  label="Conditions"
                  value={
                    quote.terms
                  }
                  onChange={(
                    value,
                  ) =>
                    updateQuote(
                      "terms",
                      value,
                    )
                  }
                  textarea
                />
              </div>
            </div>
          </section>
        </div>

        <aside className="editor-side">
          <QuotePreview
            quote={quote}
            settings={
              settings
            }
          />
        </aside>
      </div>
    </>
  );
}

/* =========================================
   QUOTE PREVIEW
========================================= */

function QuotePreview({
  quote,
  settings,
}: {
  quote: Quote;
  settings: AppSettings;
}) {
  const totals =
    quoteTotals(quote);

  return (
    <div className="quote-preview">
      <div className="quote-preview-page">
        <div className="preview-header">
          <div className="preview-company">
            <img
              className="preview-logo"
              src={
                settings.company
                  .logoPath
              }
              alt="Logo"
            />

            <div>
              <h4>
                {
                  settings.company
                    .name
                }{" "}
                {
                  settings.company
                    .legalForm
                }
              </h4>

              <p>
                NINEA :{" "}
                {
                  settings.company
                    .ninea
                }
                <br />
                {
                  settings.company
                    .rcs
                }
                <br />
                {
                  settings.company
                    .address
                }
                <br />
                {
                  settings.company
                    .phone
                }{" "}
                •{" "}
                {
                  settings.company
                    .email
                }
              </p>
            </div>
          </div>

          <div className="preview-number">
            <small>
              DEVIS
            </small>

            <strong>
              {quote.number}
            </strong>

            <small>
              {formatDate(
                quote.date,
              )}
            </small>
          </div>
        </div>

        <div className="preview-info">
          <div className="preview-box">
            <small>
              Client
            </small>

            <strong>
              {quote.client.name ||
                "Nom du client"}
            </strong>

            {quote.client
              .company && (
              <span>
                {
                  quote.client
                    .company
                }
              </span>
            )}

            {quote.client
              .phone && (
              <span>
                {
                  quote.client
                    .phone
                }
              </span>
            )}
          </div>

          <div className="preview-box">
            <small>
              Projet
            </small>

            <strong>
              {quote.projectName ||
                "Nom du projet"}
            </strong>

            <span>
              {quote.projectDescription ||
                "Description du projet"}
            </span>
          </div>
        </div>

        <table className="preview-table">
          <thead>
            <tr>
              <th>
                Désignation
              </th>
              <th>
                Qté
              </th>
              <th>
                P.U.
              </th>
              <th>
                Total
              </th>
            </tr>
          </thead>

          <tbody>
            {quote.items.map(
              (item) => (
                <tr
                  key={
                    item.id
                  }
                >
                  <td>
                    {item.description ||
                      "Prestation"}
                  </td>

                  <td>
                    {
                      item.quantity
                    }
                  </td>

                  <td>
                    {money(
                      item.unitPrice,
                      quote.currencySymbol,
                    )}
                  </td>

                  <td>
                    {money(
                      item.quantity *
                        item.unitPrice,
                      quote.currencySymbol,
                    )}
                  </td>
                </tr>
              ),
            )}
          </tbody>
        </table>

        <div className="preview-total">
          <div>
            <span>
              Sous-total
            </span>

            <strong>
              {money(
                totals.subtotal,
                quote.currencySymbol,
              )}
            </strong>
          </div>

          {totals.discount >
            0 && (
            <div>
              <span>
                Remise
              </span>

              <strong>
                -
                {money(
                  totals.discount,
                  quote.currencySymbol,
                )}
              </strong>
            </div>
          )}

          {quote.applyTax && (
            <div>
              <span>
                TVA{" "}
                {quote.taxRate}%
              </span>

              <strong>
                {money(
                  totals.tax,
                  quote.currencySymbol,
                )}
              </strong>
            </div>
          )}

          <div className="grand">
            <span>
              TOTAL
            </span>

            <strong>
              {money(
                totals.total,
                quote.currencySymbol,
              )}
            </strong>
          </div>
        </div>

        {quote.notes && (
          <div
            style={{
              marginTop: 15,
              fontSize: 8,
            }}
          >
            <strong>
              Notes
            </strong>

            <div
              style={{
                color:
                  "var(--muted)",
                marginTop: 3,
                whiteSpace:
                  "pre-wrap",
              }}
            >
              {quote.notes}
            </div>
          </div>
        )}

        {quote.terms && (
          <div
            style={{
              marginTop: 10,
              fontSize: 8,
            }}
          >
            <strong>
              Conditions
            </strong>

            <div
              style={{
                color:
                  "var(--muted)",
                marginTop: 3,
                whiteSpace:
                  "pre-wrap",
              }}
            >
              {quote.terms}
            </div>
          </div>
        )}

        <div className="preview-signatures">
          <div className="signature-box">
            <small>
              Cachet
            </small>

            {settings.company
              .stampPath && (
              <img
                src={
                  settings.company
                    .stampPath
                }
                alt="Cachet"
              />
            )}
          </div>

          <div className="signature-box">
            <small>
              Signature
            </small>

            {settings.company
              .signaturePath && (
              <img
                src={
                  settings.company
                    .signaturePath
                }
                alt="Signature"
              />
            )}
          </div>
        </div>

        <div className="preview-footer">
          {
            settings.company
              .footerText
          }
          {" • "}
          {
            settings.company
              .website
          }
        </div>
      </div>
    </div>
  );
}

/* =========================================
   CLIENTS
========================================= */

function ClientsView({
  clients,
  onNew,
  onEdit,
}: {
  clients: Client[];
  onNew: () => void;
  onEdit: (
    client: Client,
  ) => void;
}) {
  return (
    <section className="card">
      <div className="card-header">
        <div>
          <h3>
            Base clients
          </h3>

          <p>
            Les coordonnées peuvent
            être réutilisées dans vos
            devis.
          </p>
        </div>

        <button
          className="btn btn-primary"
          onClick={onNew}
        >
          <Plus size={15} />
          Nouveau client
        </button>
      </div>

      {clients.length ===
      0 ? (
        <div className="empty">
          Aucun client enregistré.
        </div>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Nom</th>
                <th>
                  Entreprise
                </th>
                <th>
                  Téléphone
                </th>
                <th>Email</th>
                <th>Adresse</th>
                <th />
              </tr>
            </thead>

            <tbody>
              {clients.map(
                (client) => (
                  <tr
                    key={
                      client.id
                    }
                  >
                    <td>
                      <strong>
                        {
                          client.name
                        }
                      </strong>
                    </td>

                    <td>
                      {client.company ||
                        "—"}
                    </td>

                    <td>
                      {client.phone ||
                        "—"}
                    </td>

                    <td>
                      {client.email ||
                        "—"}
                    </td>

                    <td>
                      {client.address ||
                        "—"}
                    </td>

                    <td>
                      <button
                        className="icon-button"
                        onClick={() =>
                          onEdit(
                            client,
                          )
                        }
                      >
                        <Pencil
                          size={
                            14
                          }
                        />
                      </button>
                    </td>
                  </tr>
                ),
              )}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

/* =========================================
   SERVICES
========================================= */

function ServicesView() {
  return (
    <section className="card">
      <div className="card-header">
        <div>
          <h3>
            Services
          </h3>

          <p>
            Catalogue de prestations.
          </p>
        </div>

        <button
          className="btn btn-primary"
          disabled
        >
          <Plus size={15} />
          Nouveau service
        </button>
      </div>

      <div className="empty">
        Le catalogue de services
        pourra être ajouté à une
        prochaine version.
      </div>
    </section>
  );
}

/* =========================================
   SETTINGS
========================================= */

function SettingsView({
  settings,
  updateCompany,
  updateCurrency,
  addCurrency,
  removeCurrency,
  save,
  onExport,
  onImport,
}: {
  settings: AppSettings;
  updateCompany: (
    key: keyof AppSettings["company"],
    value: string,
  ) => void;
  updateCurrency: (
    index: number,
    key:
      | "code"
      | "symbol"
      | "label",
    value: string,
  ) => void;
  addCurrency: () => void;
  removeCurrency: (
    index: number,
  ) => void;
  save: () => void;
  onExport: () => void;
  onImport: () => void;
}) {
  return (
    <div className="settings-grid">
      <section className="card">
        <div className="card-header">
          <div>
            <h3>
              Informations de
              l'entreprise
            </h3>

            <p>
              Toutes ces informations
              sont modifiables.
            </p>
          </div>

          <button
            className="btn btn-primary btn-small"
            onClick={save}
          >
            <Check size={14} />
            Enregistrer
          </button>
        </div>

        <div className="card-body">
          <div className="form-grid">
            <Field
              label="Nom de l'entreprise"
              value={
                settings.company
                  .name
              }
              onChange={(
                value,
              ) =>
                updateCompany(
                  "name",
                  value,
                )
              }
            />

            <Field
              label="Forme juridique"
              value={
                settings.company
                  .legalForm
              }
              onChange={(
                value,
              ) =>
                updateCompany(
                  "legalForm",
                  value,
                )
              }
            />

            <Field
              label="NINEA"
              value={
                settings.company
                  .ninea
              }
              onChange={(
                value,
              ) =>
                updateCompany(
                  "ninea",
                  value,
                )
              }
            />

            <Field
              label="RCS"
              value={
                settings.company
                  .rcs
              }
              onChange={(
                value,
              ) =>
                updateCompany(
                  "rcs",
                  value,
                )
              }
            />

            <Field
              label="Adresse"
              value={
                settings.company
                  .address
              }
              onChange={(
                value,
              ) =>
                updateCompany(
                  "address",
                  value,
                )
              }
              full
            />

            <Field
              label="Téléphone"
              value={
                settings.company
                  .phone
              }
              onChange={(
                value,
              ) =>
                updateCompany(
                  "phone",
                  value,
                )
              }
            />

            <Field
              label="WhatsApp"
              value={
                settings.company
                  .whatsapp
              }
              onChange={(
                value,
              ) =>
                updateCompany(
                  "whatsapp",
                  value,
                )
              }
            />

            <Field
              label="Email"
              value={
                settings.company
                  .email
              }
              onChange={(
                value,
              ) =>
                updateCompany(
                  "email",
                  value,
                )
              }
            />

            <Field
              label="Site web"
              value={
                settings.company
                  .website
              }
              onChange={(
                value,
              ) =>
                updateCompany(
                  "website",
                  value,
                )
              }
            />

            <Field
              label="Chemin du logo"
              value={
                settings.company
                  .logoPath
              }
              onChange={(
                value,
              ) =>
                updateCompany(
                  "logoPath",
                  value,
                )
              }
            />

            <Field
              label="Chemin du cachet"
              value={
                settings.company
                  .stampPath
              }
              onChange={(
                value,
              ) =>
                updateCompany(
                  "stampPath",
                  value,
                )
              }
            />

            <Field
              label="Chemin de la signature"
              value={
                settings.company
                  .signaturePath
              }
              onChange={(
                value,
              ) =>
                updateCompany(
                  "signaturePath",
                  value,
                )
              }
            />

            <Field
              label="Texte du pied de page"
              value={
                settings.company
                  .footerText
              }
              onChange={(
                value,
              ) =>
                updateCompany(
                  "footerText",
                  value,
                )
              }
              textarea
              full
            />
          </div>
        </div>
      </section>

      <div
        style={{
          display: "grid",
          gap: 16,
        }}
      >
        <section className="card">
          <div className="card-header">
            <div>
              <h3>
                Devises
              </h3>

              <p>
                Ajoutez ou modifiez
                les devises disponibles.
              </p>
            </div>

            <button
              className="btn btn-secondary btn-small"
              onClick={
                addCurrency
              }
            >
              <Plus size={14} />
              Ajouter
            </button>
          </div>

          <div className="card-body">
            <div className="currency-list">
              {settings.currencies.map(
                (
                  currency,
                  index,
                ) => (
                  <div
                    className="currency-row"
                    key={`${currency.code}-${index}`}
                  >
                    <input
                      value={
                        currency.code
                      }
                      onChange={(
                        event,
                      ) =>
                        updateCurrency(
                          index,
                          "code",
                          event
                            .target
                            .value,
                        )
                      }
                      placeholder="Code"
                    />

                    <input
                      value={
                        currency.symbol
                      }
                      onChange={(
                        event,
                      ) =>
                        updateCurrency(
                          index,
                          "symbol",
                          event
                            .target
                            .value,
                        )
                      }
                      placeholder="Symbole"
                    />

                    <input
                      value={
                        currency.label
                      }
                      onChange={(
                        event,
                      ) =>
                        updateCurrency(
                          index,
                          "label",
                          event
                            .target
                            .value,
                        )
                      }
                      placeholder="Nom"
                    />

                    <button
                      className="icon-button"
                      onClick={() =>
                        removeCurrency(
                          index,
                        )
                      }
                    >
                      <Trash2
                        size={
                          14
                        }
                      />
                    </button>
                  </div>
                ),
              )}
            </div>
          </div>
        </section>

        <section className="card">
          <div className="card-header">
            <div>
              <h3>
                Sauvegarde
              </h3>

              <p>
                Les données sont
                stockées localement.
              </p>
            </div>
          </div>

          <div className="card-body">
            <div
              className="alert alert-info"
              style={{
                marginBottom: 12,
              }}
            >
              <FileText
                size={16}
              />

              <span>
                Exportez régulièrement
                vos données afin de
                conserver une copie de
                sécurité.
              </span>
            </div>

            <div
              style={{
                display: "flex",
                gap: 8,
                flexWrap:
                  "wrap",
              }}
            >
              <button
                className="btn btn-secondary"
                onClick={
                  onExport
                }
              >
                <Download
                  size={15}
                />
                Exporter
              </button>

              <button
                className="btn btn-secondary"
                onClick={
                  onImport
                }
              >
                <Upload size={15} />
                Importer
              </button>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

/* =========================================
   CLIENT MODAL
========================================= */

function ClientModal({
  client,
  onChange,
  onClose,
  onSave,
}: {
  client: Client;
  onChange: (
    client: Client,
  ) => void;
  onClose: () => void;
  onSave: () => void;
}) {
  return (
    <div
      className="modal-overlay"
      onMouseDown={onClose}
    >
      <div
        className="modal"
        onMouseDown={(event) =>
          event.stopPropagation()
        }
      >
        <div className="modal-header">
          <h3>
            Nouveau client
          </h3>

          <button
            className="icon-button"
            onClick={onClose}
          >
            <X size={16} />
          </button>
        </div>

        <div className="modal-body">
          <div className="form-grid">
            <Field
              label="Nom / Prénom"
              value={
                client.name
              }
              onChange={(value) =>
                onChange({
                  ...client,
                  name: value,
                })
              }
            />

            <Field
              label="Entreprise"
              value={
                client.company ??
                ""
              }
              onChange={(value) =>
                onChange({
                  ...client,
                  company: value,
                })
              }
            />

            <Field
              label="Téléphone"
              value={
                client.phone ??
                ""
              }
              onChange={(value) =>
                onChange({
                  ...client,
                  phone: value,
                })
              }
            />

            <Field
              label="WhatsApp"
              value={
                client.whatsapp ??
                ""
              }
              onChange={(value) =>
                onChange({
                  ...client,
                  whatsapp: value,
                })
              }
            />

            <Field
              label="Email"
              value={
                client.email ??
                ""
              }
              onChange={(value) =>
                onChange({
                  ...client,
                  email: value,
                })
              }
            />

            <Field
              label="Adresse"
              value={
                client.address ??
                ""
              }
              onChange={(value) =>
                onChange({
                  ...client,
                  address: value,
                })
              }
              full
            />
          </div>
        </div>

        <div className="modal-footer">
          <button
            className="btn btn-secondary"
            onClick={onClose}
          >
            Annuler
          </button>

          <button
            className="btn btn-primary"
            onClick={onSave}
          >
            <Check size={15} />
            Enregistrer
          </button>
        </div>
      </div>
    </div>
  );
}

/* =========================================
   SMALL COMPONENTS
========================================= */

function StatCard({
  label,
  value,
  note,
}: {
  label: string;
  value: string;
  note: string;
}) {
  return (
    <div className="stat-card">
      <div className="stat-label">
        {label}
      </div>

      <div className="stat-value">
        {value}
      </div>

      <div className="stat-note">
        {note}
      </div>
    </div>
  );
}

function StatusBadge({
  status,
}: {
  status: QuoteStatus;
}) {
  const classes: Record<
    QuoteStatus,
    string
  > = {
    Brouillon:
      "status-brouillon",
    Envoyé:
      "status-envoye",
    Accepté:
      "status-accepte",
    Refusé:
      "status-refuse",
    "En attente":
      "status-attente",
  };

  return (
    <span
      className={`status ${classes[status]}`}
    >
      {status}
    </span>
  );
}

function StatusSelect({
  value,
  onChange,
}: {
  value: QuoteStatus;
  onChange: (
    value: QuoteStatus,
  ) => void;
}) {
  const statuses: QuoteStatus[] =
    [
      "Brouillon",
      "Envoyé",
      "En attente",
      "Accepté",
      "Refusé",
    ];

  return (
    <select
      value={value}
      onChange={(event) =>
        onChange(
          event.target
            .value as QuoteStatus,
        )
      }
      style={{
        minHeight: 34,
        padding:
          "7px 9px",
        border:
          "1px solid var(--line)",
        borderRadius: 8,
        background:
          "white",
        fontSize: 11,
        fontWeight: 700,
      }}
    >
      {statuses.map(
        (status) => (
          <option
            key={status}
            value={status}
          >
            {status}
          </option>
        ),
      )}
    </select>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  textarea = false,
  full = false,
}: {
  label: string;
  value: string;
  onChange: (
    value: string,
  ) => void;
  type?: string;
  textarea?: boolean;
  full?: boolean;
}) {
  return (
    <div
      className={`field ${
        full ? "full" : ""
      }`}
    >
      <label>
        {label}
      </label>

      {textarea ? (
        <textarea
          value={value}
          onChange={(event) =>
            onChange(
              event.target
                .value,
            )
          }
        />
      ) : (
        <input
          type={type}
          value={value}
          onChange={(event) =>
            onChange(
              event.target
                .value,
            )
          }
        />
      )}
    </div>
  );
}

function SelectField({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (
    value: string,
  ) => void;
  options: {
    value: string;
    label: string;
  }[];
}) {
  return (
    <div className="field">
      <label>
        {label}
      </label>

      <select
        value={value}
        onChange={(event) =>
          onChange(
            event.target
              .value,
          )
        }
      >
        {options.map(
          (option) => (
            <option
              key={
                option.value
              }
              value={
                option.value
              }
            >
              {option.label}
            </option>
          ),
        )}
      </select>
    </div>
  );
}
