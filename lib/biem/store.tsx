import AsyncStorage from "@react-native-async-storage/async-storage";
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

import { calculatePrice, isoDateFromNow } from "@/lib/biem/finance";

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
};

export type Quote = {
  id: string;
  number: string;
  clientId: string;
  clientName: string;
  title: string;
  items: QuoteItem[];
  discount: number;
  issuedAt: string;
  validUntil: string;
  conditions: string;
  status: "Borrador" | "Enviada" | "Aceptada";
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
  duplicateQuote: (quote: Quote) => Quote;
  setPendingQuoteProduct: (productId: string | null) => void;
  updateBusiness: (profile: Partial<BusinessProfile>) => void;
};

const STORAGE_KEY = "biem-cotiza-state-v1";

function productFromInput(
  input: Omit<Product, "id" | "netPrice" | "suggestedPrice" | "updatedAt"> & { id?: string },
): Product {
  const breakdown = calculatePrice(input);
  return {
    ...input,
    id: input.id ?? `product-${Date.now()}`,
    netPrice: breakdown.netPrice,
    suggestedPrice: breakdown.suggestedPrice,
    updatedAt: new Date().toISOString(),
  };
}

const initialProducts: Product[] = [
  productFromInput({
    id: "product-brand",
    name: "Identidad visual express",
    unit: "proyecto",
    cost: 310,
    expenses: 55,
    margin: 35,
    taxRate: 0,
    category: "Servicio",
  }),
  productFromInput({
    id: "product-menu",
    name: "Menú digital para negocio",
    unit: "unidad",
    cost: 80,
    expenses: 20,
    margin: 40,
    taxRate: 0,
    category: "Producto",
  }),
];

const initialData: StoreData = {
  products: initialProducts,
  clients: [
    {
      id: "client-violeta",
      name: "Camila Rojas",
      company: "Violeta Studio",
      email: "camila@violetastudio.co",
      phone: "+57 300 210 1840",
      address: "Bogotá, Colombia",
    },
    {
      id: "client-luma",
      name: "Diego Marín",
      company: "Luma Café",
      email: "diego@lumacafe.co",
      phone: "+57 310 444 8821",
      address: "Medellín, Colombia",
    },
  ],
  quotes: [
    {
      id: "quote-047",
      number: "COT-047",
      clientId: "client-violeta",
      clientName: "Violeta Studio",
      title: "Identidad visual express",
      items: [
        {
          productId: "product-brand",
          name: "Identidad visual express",
          quantity: 1,
          unit: "proyecto",
          unitPrice: initialProducts[0].netPrice,
          taxRate: initialProducts[0].taxRate,
        },
      ],
      discount: 5,
      issuedAt: "2026-10-07",
      validUntil: "2026-10-17",
      conditions: "50% para iniciar y 50% contra entrega. Incluye hasta dos rondas de ajustes.",
      status: "Enviada",
    },
  ],
  business: {
    name: "BIEM Estudio",
    owner: "Mariana Gómez",
    logoUrl: "https://files.manuscdn.com/user_upload_by_module/session_file/310519663488441868/xTQuHndVlhKyicwJ.png",
    email: "hola@biemestudio.co",
    phone: "+57 301 553 0202",
    city: "Bogotá, Colombia",
    conditions: "50% para iniciar y 50% contra entrega. Incluye hasta dos rondas de ajustes.",
    validityDays: 10,
  },
};

const BiemContext = createContext<BiemStore | null>(null);

export function BiemProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<StoreData>(initialData);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((saved) => {
        if (saved) {
          const parsed = JSON.parse(saved) as Partial<StoreData>;
          setData({
            ...initialData,
            ...parsed,
            products: parsed.products ?? initialData.products,
            clients: parsed.clients ?? initialData.clients,
            quotes: parsed.quotes ?? initialData.quotes,
            business: { ...initialData.business, ...parsed.business },
          });
        }
      })
      .catch(() => undefined)
      .finally(() => setHydrated(true));
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(data)).catch(() => undefined);
  }, [data, hydrated]);

  const upsertProduct = useCallback(
    (input: Omit<Product, "id" | "netPrice" | "suggestedPrice" | "updatedAt"> & { id?: string }) => {
      const product = productFromInput(input);
      setData((current) => ({
        ...current,
        products: current.products.some((item) => item.id === product.id)
          ? current.products.map((item) => (item.id === product.id ? product : item))
          : [product, ...current.products],
      }));
      return product;
    },
    [],
  );

  const upsertClient = useCallback((input: Omit<Client, "id"> & { id?: string }) => {
    const client: Client = { ...input, id: input.id ?? `client-${Date.now()}` };
    setData((current) => ({
      ...current,
      clients: current.clients.some((item) => item.id === client.id)
        ? current.clients.map((item) => (item.id === client.id ? client : item))
        : [client, ...current.clients],
    }));
    return client;
  }, []);

  const createQuote = useCallback(
    (input: Omit<Quote, "id" | "number" | "issuedAt" | "status"> & Partial<Pick<Quote, "status" | "issuedAt">>) => {
      const quote: Quote = {
        ...input,
        id: `quote-${Date.now()}`,
        number: `COT-${String(data.quotes.length + 48).padStart(3, "0")}`,
        issuedAt: input.issuedAt ?? new Date().toISOString().slice(0, 10),
        status: input.status ?? "Borrador",
      };
      setData((current) => ({ ...current, quotes: [quote, ...current.quotes] }));
      return quote;
    },
    [data.quotes.length],
  );

  const duplicateQuote = useCallback(
    (quote: Quote) =>
      createQuote({
        clientId: quote.clientId,
        clientName: quote.clientName,
        title: quote.title,
        items: quote.items,
        discount: quote.discount,
        validUntil: isoDateFromNow(data.business.validityDays),
        conditions: quote.conditions,
      }),
    [createQuote, data.business.validityDays],
  );

  const setPendingQuoteProduct = useCallback((productId: string | null) => {
    setData((current) => ({ ...current, pendingQuoteProductId: productId ?? undefined }));
  }, []);

  const updateBusiness = useCallback((profile: Partial<BusinessProfile>) => {
    setData((current) => ({ ...current, business: { ...current.business, ...profile } }));
  }, []);

  const value = useMemo<BiemStore>(
    () => ({ ...data, hydrated, upsertProduct, upsertClient, createQuote, duplicateQuote, setPendingQuoteProduct, updateBusiness }),
    [createQuote, data, duplicateQuote, hydrated, setPendingQuoteProduct, updateBusiness, upsertClient, upsertProduct],
  );

  return <BiemContext.Provider value={value}>{children}</BiemContext.Provider>;
}

export function useBiem() {
  const store = useContext(BiemContext);
  if (!store) throw new Error("useBiem debe usarse dentro de BiemProvider");
  return store;
}
