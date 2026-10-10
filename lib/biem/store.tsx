import AsyncStorage from "@react-native-async-storage/async-storage";
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";

import { calculatePrice, isoDateFromNow } from "@/lib/biem/finance";
import { AccountWorkspaceContext } from "@/lib/account-workspace";

export type Product = {
  id: string;
  name: string;
  unit: string;
  cost: number;
  expenses: number;
  margin: number;
  taxRate: number;
  netPrice: number;
  suggestedPrice: number;
  category: "Producto" | "Servicio";
  updatedAt: string;
};

export type Client = {
  id: string;
  name: string;
  company: string;
  email: string;
  phone: string;
  address: string;
};

export type QuoteItem = {
  productId: string;
  name: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  taxRate: number;
  source?: "catalog" | "manual";
};

export type QuoteStatus = "Borrador" | "Enviada" | "Aprobada" | "Rechazada" | "Completada" | "Cancelada";

export type Quote = {
  id: string;
  number: string;
  clientId?: string;
  clientName?: string;
  title: string;
  items: QuoteItem[];
  discount: number;
  issuedAt: string;
  validUntil: string;
  conditions: string;
  status: QuoteStatus;
};

export type BusinessProfile = {
  name: string;
  owner: string;
  logoUrl: string;
  email: string;
  phone: string;
  city: string;
  conditions: string;
  validityDays: number;
};

type StoreData = {
  products: Product[];
  clients: Client[];
  quotes: Quote[];
  business: BusinessProfile;
  pendingQuoteProductId?: string;
};

type BiemStore = StoreData & {
  hydrated: boolean;
  upsertProduct: (product: Omit<Product, "id" | "netPrice" | "suggestedPrice" | "updatedAt"> & { id?: string }) => Product;
  upsertClient: (client: Omit<Client, "id"> & { id?: string }) => Client;
  createQuote: (quote: Omit<Quote, "id" | "number" | "issuedAt" | "status"> & Partial<Pick<Quote, "status" | "issuedAt">>) => Quote;
  updateQuote: (quoteId: string, changes: Partial<Omit<Quote, "id" | "number" | "issuedAt">>) => Quote | null;
  duplicateQuote: (quote: Quote) => Quote;
  updateQuoteStatus: (quoteId: string, status: QuoteStatus) => void;
  setPendingQuoteProduct: (productId: string | null) => void;
  updateBusiness: (profile: Partial<BusinessProfile>) => void;
};

const STORAGE_KEY = "biem-cotiza-state-v1";

function productFromInput(input: Omit<Product, "id" | "netPrice" | "suggestedPrice" | "updatedAt"> & { id?: string }): Product {
  const breakdown = calculatePrice(input);
  return { ...input, id: input.id ?? `product-${Date.now()}`, netPrice: breakdown.netPrice, suggestedPrice: breakdown.suggestedPrice, updatedAt: new Date().toISOString() };
}

const initialProducts: Product[] = [
  productFromInput({ id: "product-brand", name: "Identidad visual express", unit: "proyecto", cost: 310, expenses: 55, margin: 35, taxRate: 0, category: "Servicio" }),
  productFromInput({ id: "product-menu", name: "Menú digital para negocio", unit: "unidad", cost: 80, expenses: 20, margin: 40, taxRate: 0, category: "Producto" }),
];

const initialData: StoreData = {
  products: initialProducts,
  clients: [
    { id: "client-violeta", name: "Camila Rojas", company: "Violeta Studio", email: "camila@violetastudio.co", phone: "+57 300 210 1840", address: "Bogotá, Colombia" },
    { id: "client-luma", name: "Diego Marín", company: "Luma Café", email: "diego@lumacafe.co", phone: "+57 310 444 8821", address: "Medellín, Colombia" },
  ],
  quotes: [
    {
      id: "quote-047", number: "COT-047", clientId: "client-violeta", clientName: "Violeta Studio", title: "Identidad visual express",
      items: [{ productId: "product-brand", name: "Identidad visual express", quantity: 1, unit: "proyecto", unitPrice: initialProducts[0].netPrice, taxRate: initialProducts[0].taxRate, source: "catalog" }],
      discount: 5, issuedAt: "2026-10-07", validUntil: "2026-10-17", conditions: "50% para iniciar y 50% contra entrega. Incluye hasta dos rondas de ajustes.", status: "Enviada",
    },
  ],
  business: {
    name: "BIEM Estudio", owner: "Mariana Gómez", logoUrl: "https://files.manuscdn.com/user_upload_by_module/session_file/310519663488441868/xTQuHndVlhKyicwJ.png",
    email: "hola@biemestudio.co", phone: "+57 301 553 0202", city: "Bogotá, Colombia", conditions: "50% para iniciar y 50% contra entrega. Incluye hasta dos rondas de ajustes.", validityDays: 10,
  },
};

const BiemContext = createContext<BiemStore | null>(null);

export function BiemProvider({ children }: { children: ReactNode }) {
  const workspaceId = useContext(AccountWorkspaceContext);
  const storageKey = workspaceId ? `${STORAGE_KEY}:workspace:${workspaceId}` : null;
  const [data, setData] = useState<StoreData>({ ...initialData, products: [], clients: [], quotes: [], business: { name: "Mi negocio", owner: "", logoUrl: "", email: "", phone: "", city: "", conditions: "", validityDays: 10 } });
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    if (!storageKey) { setHydrated(true); return; }
    AsyncStorage.getItem(storageKey).then((saved) => {
      if (saved) {
        const parsed = JSON.parse(saved) as Partial<StoreData>;
        setData((current) => ({ ...current, ...parsed, products: parsed.products ?? [], clients: parsed.clients ?? [], quotes: parsed.quotes ?? [], business: { ...current.business, ...parsed.business } }));
      }
    }).catch(() => undefined).finally(() => setHydrated(true));
  }, [storageKey]);

  useEffect(() => { if (hydrated && storageKey) AsyncStorage.setItem(storageKey, JSON.stringify(data)).catch(() => undefined); }, [data, hydrated, storageKey]);

  const upsertProduct = useCallback((input: Omit<Product, "id" | "netPrice" | "suggestedPrice" | "updatedAt"> & { id?: string }) => {
    const product = productFromInput(input);
    setData((current) => ({ ...current, products: current.products.some((item) => item.id === product.id) ? current.products.map((item) => item.id === product.id ? product : item) : [product, ...current.products] }));
    return product;
  }, []);

  const upsertClient = useCallback((input: Omit<Client, "id"> & { id?: string }) => {
    const client: Client = { ...input, id: input.id ?? `client-${Date.now()}` };
    setData((current) => ({ ...current, clients: current.clients.some((item) => item.id === client.id) ? current.clients.map((item) => item.id === client.id ? client : item) : [client, ...current.clients] }));
    return client;
  }, []);

  const createQuote = useCallback((input: Omit<Quote, "id" | "number" | "issuedAt" | "status"> & Partial<Pick<Quote, "status" | "issuedAt">>) => {
    const quote: Quote = { ...input, id: `quote-${Date.now()}`, number: `COT-${String(data.quotes.length + 48).padStart(3, "0")}`, issuedAt: input.issuedAt ?? new Date().toISOString().slice(0, 10), status: input.status ?? "Borrador" };
    setData((current) => ({ ...current, quotes: [quote, ...current.quotes] }));
    return quote;
  }, [data.quotes.length]);

  const updateQuote = useCallback((quoteId: string, changes: Partial<Omit<Quote, "id" | "number" | "issuedAt">>) => {
    const existing = data.quotes.find((quote) => quote.id === quoteId);
    if (!existing) return null;
    const updated = { ...existing, ...changes };
    setData((current) => ({ ...current, quotes: current.quotes.map((quote) => quote.id === quoteId ? updated : quote) }));
    return updated;
  }, [data.quotes]);

  const duplicateQuote = useCallback((quote: Quote) => createQuote({ clientId: quote.clientId, clientName: quote.clientName, title: quote.title, items: quote.items, discount: quote.discount, validUntil: isoDateFromNow(data.business.validityDays), conditions: quote.conditions }), [createQuote, data.business.validityDays]);
  const updateQuoteStatus = useCallback((quoteId: string, status: QuoteStatus) => setData((current) => ({ ...current, quotes: current.quotes.map((quote) => quote.id === quoteId ? { ...quote, status } : quote) })), []);
  const setPendingQuoteProduct = useCallback((productId: string | null) => setData((current) => ({ ...current, pendingQuoteProductId: productId ?? undefined })), []);
  const updateBusiness = useCallback((profile: Partial<BusinessProfile>) => setData((current) => ({ ...current, business: { ...current.business, ...profile } })), []);

  const value = useMemo<BiemStore>(() => ({ ...data, hydrated, upsertProduct, upsertClient, createQuote, updateQuote, duplicateQuote, updateQuoteStatus, setPendingQuoteProduct, updateBusiness }), [createQuote, data, duplicateQuote, hydrated, setPendingQuoteProduct, updateBusiness, updateQuote, updateQuoteStatus, upsertClient, upsertProduct]);
  return <BiemContext.Provider value={value}>{hydrated ? children : <HydrationScreen />}</BiemContext.Provider>;
}

function HydrationScreen() {
  return <View style={storeStyles.loading}><View style={storeStyles.loadingMark}><ActivityIndicator color="#087DBB" /><Text style={storeStyles.loadingWord}>BIEM</Text></View><Text style={storeStyles.loadingTitle}>Preparando tu espacio comercial</Text><Text style={storeStyles.loadingText}>Cargando tus cotizaciones y preferencias guardadas.</Text></View>;
}

export function useBiem() {
  const store = useContext(BiemContext);
  if (!store) throw new Error("useBiem debe usarse dentro de BiemProvider");
  return store;
}

const storeStyles = StyleSheet.create({
  loading: { flex: 1, backgroundColor: "#F6F9FC", alignItems: "center", justifyContent: "center", padding: 32, gap: 9 },
  loadingMark: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 13, paddingVertical: 10, borderRadius: 14, backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: "#D9E2EC" },
  loadingWord: { color: "#087DBB", fontSize: 13, fontWeight: "900", letterSpacing: 0.8 },
  loadingTitle: { color: "#172B49", fontSize: 16, fontWeight: "900", marginTop: 4 },
  loadingText: { color: "#64778E", fontSize: 12, textAlign: "center" },
});
