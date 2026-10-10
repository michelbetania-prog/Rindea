import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import { router } from "expo-router";
import { useMemo, useState } from "react";
import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { BiemScreen, IconButton, PrimaryButton, SectionTitle, Surface, Tag, ValueRow, biemColors } from "@/components/biem-ui";
import { formatDate, formatMoney, isoDateFromNow } from "@/lib/biem/finance";
import { type Client, type Product, type Quote, type QuoteItem, useBiem } from "@/lib/biem/store";

export default function QuotesScreen() {
  const { business, clients, products, quotes, createQuote, duplicateQuote, pendingQuoteProductId, setPendingQuoteProduct } = useBiem();
  const [clientId, setClientId] = useState(clients[0]?.id ?? "");
  const [productId, setProductId] = useState(products[0]?.id ?? "");
  const [quantity, setQuantity] = useState(1);
  const [discount, setDiscount] = useState(0);
  const [items, setItems] = useState<QuoteItem[]>([]);
  const [latestQuote, setLatestQuote] = useState<Quote | null>(null);
  const [feedback, setFeedback] = useState("");
  const [exporting, setExporting] = useState(false);

  const client = clients.find((item) => item.id === clientId) ?? clients[0];
  const transferredProduct = products.find((item) => item.id === pendingQuoteProductId);
  const product = transferredProduct ?? products.find((item) => item.id === productId) ?? products[0];
  const draftItems = useMemo(() => {
    if (!transferredProduct || items.some((item) => item.productId === transferredProduct.id)) return items;
    return [...items, quoteItemFromProduct(transferredProduct, 1)];
  }, [items, transferredProduct]);
  const totals = useMemo(() => quoteTotals(draftItems, discount), [discount, draftItems]);
  const activeQuote = latestQuote;

  function addSelectedProduct() {
    if (!product) return;
    setItems(() => {
      const existing = draftItems.find((item) => item.productId === product.id);
      if (!existing) return [...draftItems, quoteItemFromProduct(product, quantity)];
      return draftItems.map((item) => item.productId === product.id ? { ...item, quantity: item.quantity + quantity } : item);
    });
    setPendingQuoteProduct(null);
    setFeedback(`Agregaste ${quantity} ${product.unit === "unidad" ? "unidad" : product.unit} de “${product.name}”.`);
  }

  function removeItem(productIdToRemove: string) {
    setItems(() => draftItems.filter((item) => item.productId !== productIdToRemove));
    if (productIdToRemove === pendingQuoteProductId) setPendingQuoteProduct(null);
  }

  function selectProduct(nextProduct: Product) {
    setItems(draftItems);
    setPendingQuoteProduct(null);
    setProductId(nextProduct.id);
  }

  function makeQuote() {
    if (!client || !draftItems.length) return;
    const quote = createQuote({
      clientId: client.id,
      clientName: client.company || client.name,
      title: draftItems.length === 1 ? draftItems[0].name : `${draftItems[0].name} y ${draftItems.length - 1} más`,
      items: draftItems,
      discount,
      validUntil: isoDateFromNow(business.validityDays),
      conditions: business.conditions,
    });
    setItems(draftItems);
    setPendingQuoteProduct(null);
    if (transferredProduct) setProductId(transferredProduct.id);
    setLatestQuote(quote);
    setFeedback(`${quote.number} se guardó en tu historial.`);
  }

  async function exportPdf(share = false, channel?: "WhatsApp" | "correo") {
    if (!activeQuote || !client) return;
    setExporting(true);
    try {
      const html = quoteHtml(activeQuote, client, business);
      if (Platform.OS === "web") {
        const browserWindow = globalThis as unknown as {
          open?: (url?: string, target?: string, features?: string) => {
            document: { write: (markup: string) => void; close: () => void };
            focus: () => void;
            print: () => void;
          } | null;
        };
        const printWindow = browserWindow.open?.("", "_blank", "width=760,height=900");
        if (printWindow) {
          printWindow.document.write(html);
          printWindow.document.close();
          printWindow.focus();
          printWindow.print();
          setFeedback("Se abrió la vista de impresión: desde allí puedes guardar la cotización en PDF.");
        } else {
          setFeedback("Permite las ventanas emergentes para abrir el PDF en la versión web.");
        }
        return;
      }
      const { uri } = await Print.printToFileAsync({ html });
      if (share && (await Sharing.isAvailableAsync())) {
        await Sharing.shareAsync(uri, { mimeType: "application/pdf", dialogTitle: "Compartir cotización BIEM" });
        setFeedback(`PDF listo. Selecciona ${channel ?? "tu canal"} en la hoja de compartición.`);
      } else {
        setFeedback("PDF generado y guardado en el dispositivo.");
      }
    } catch {
      setFeedback("No fue posible generar el PDF. Inténtalo de nuevo.");
    } finally {
      setExporting(false);
    }
  }

  return (
    <BiemScreen>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={quoteStyles.content}>
        <View style={quoteStyles.header}>
          <View>
            <Text style={quoteStyles.eyebrow}>DOCUMENTO COMERCIAL</Text>
            <Text style={quoteStyles.title}>Nueva cotización</Text>
          </View>
          <IconButton icon="history" label="Historial de cotizaciones" onPress={() => setFeedback("El historial completo se muestra al final.")} />
        </View>
        <Text style={quoteStyles.lead}>Elige el precio ya calculado, añade un cliente y prepara la propuesta.</Text>

        <Surface style={quoteStyles.flowCard}>
          <FlowStep number="1" label="Precio" done={draftItems.length > 0} />
          <View style={quoteStyles.flowLine} />
          <FlowStep number="2" label="Cliente" done={Boolean(client)} />
          <View style={quoteStyles.flowLine} />
          <FlowStep number="3" label="Enviar" done={Boolean(activeQuote)} />
        </Surface>

        <Surface style={quoteStyles.formCard}>
          <SectionTitle title="Cliente" action={<Pressable onPress={() => router.push("/negocio")}><Text style={quoteStyles.newLink}>Gestionar</Text></Pressable>} />
          <View style={quoteStyles.choiceStack}>
            {clients.map((item) => (
              <Pressable key={item.id} onPress={() => setClientId(item.id)} style={[quoteStyles.clientOption, clientId === item.id && quoteStyles.clientOptionSelected]}>
                <View style={quoteStyles.clientAvatar}><Text style={quoteStyles.clientAvatarText}>{(item.company || item.name).slice(0, 1)}</Text></View>
                <View style={quoteStyles.clientCopy}>
                  <Text style={quoteStyles.clientCompany}>{item.company}</Text>
                  <Text style={quoteStyles.clientMeta}>{item.name} · {item.email}</Text>
                </View>
                {clientId === item.id ? <MaterialCommunityIcons name="check-circle" size={20} color={biemColors.cyan} /> : <MaterialCommunityIcons name="circle-outline" size={20} color={biemColors.muted} />}
              </Pressable>
            ))}
          </View>
        </Surface>

        <Surface style={quoteStyles.formCard}>
          <SectionTitle title="Añade productos o servicios" action={<Tag label={`${draftItems.length} ÍTEMS`} tone={draftItems.length ? "green" : "muted"} />} />
          <View style={quoteStyles.choiceStack}>
            {products.map((item) => (
              <Pressable key={item.id} onPress={() => selectProduct(item)} style={[quoteStyles.productOption, product?.id === item.id && quoteStyles.productOptionSelected]}>
                <View style={quoteStyles.productCopy}>
                  <Text style={quoteStyles.productName}>{item.name}</Text>
                  <Text style={quoteStyles.productMeta}>{item.category} · {item.unit}</Text>
                </View>
                <View style={quoteStyles.productPriceWrap}>
                  <Text style={quoteStyles.productPrice}>{formatMoney(item.suggestedPrice)}</Text>
                  <Text style={quoteStyles.productPriceCaption}>precio calculado</Text>
                </View>
              </Pressable>
            ))}
          </View>
          {product ? (
            <View style={quoteStyles.controlsRow}>
              <Counter label="Cantidad a añadir" value={quantity} onChange={setQuantity} minimum={1} />
              <Counter label="Descuento" value={discount} onChange={setDiscount} minimum={0} suffix="%" step={5} maximum={30} />
            </View>
          ) : null}
          <PrimaryButton label="Añadir a la cotización" icon="plus-circle-outline" onPress={addSelectedProduct} tone="quiet" disabled={!product} compact />
        </Surface>

        <Surface style={quoteStyles.cartCard}>
          <SectionTitle title="Ítems de la propuesta" />
          {draftItems.length ? (
            <View style={quoteStyles.cartList}>
              {draftItems.map((item) => (
                <View key={item.productId} style={quoteStyles.cartItem}>
                  <View style={quoteStyles.cartCopy}>
                    <Text style={quoteStyles.cartName}>{item.name}</Text>
                    <Text style={quoteStyles.cartMeta}>{item.quantity} × {formatMoney(item.unitPrice)} · {item.taxRate}% imp.</Text>
                  </View>
                  <View style={quoteStyles.cartValueWrap}>
                    <Text style={quoteStyles.cartValue}>{formatMoney(item.unitPrice * item.quantity)}</Text>
                    <Pressable onPress={() => removeItem(item.productId)}><Text style={quoteStyles.removeText}>Quitar</Text></Pressable>
                  </View>
                </View>
              ))}
            </View>
          ) : (
            <View style={quoteStyles.emptyCart}><MaterialCommunityIcons name="cart-outline" size={20} color={biemColors.muted} /><Text style={quoteStyles.emptyCartText}>Aún no hay ítems. Selecciona un producto y añádelo.</Text></View>
          )}
        </Surface>

        <Surface style={quoteStyles.previewCard}>
          <View style={quoteStyles.previewHeader}>
            <View>
              <Text style={quoteStyles.previewKicker}>VISTA PREVIA</Text>
              <Text style={quoteStyles.previewTitle}>{business.name}</Text>
            </View>
            <Tag label={activeQuote ? activeQuote.number : "BORRADOR"} tone="cyan" />
          </View>
          <View style={quoteStyles.docLine} />
          <Text style={quoteStyles.toLabel}>PARA</Text>
          <Text style={quoteStyles.toName}>{client?.company ?? "Selecciona un cliente"}</Text>
          <View style={quoteStyles.documentItems}>
            {draftItems.length ? draftItems.map((item) => (
              <View key={item.productId} style={quoteStyles.documentItem}>
                <View style={quoteStyles.documentItemCopy}>
                  <Text style={quoteStyles.documentItemName}>{item.name}</Text>
                  <Text style={quoteStyles.documentItemMeta}>{item.quantity} × {formatMoney(item.unitPrice)}</Text>
                </View>
                <Text style={quoteStyles.documentItemValue}>{formatMoney(item.unitPrice * item.quantity)}</Text>
              </View>
            )) : <Text style={quoteStyles.previewEmpty}>Añade productos para ver el desglose.</Text>}
          </View>
          <View style={quoteStyles.totalsArea}>
            <ValueRow label="Subtotal" value={formatMoney(totals.subtotal)} />
            <ValueRow label={`Descuento ${discount ? `${discount}%` : ""}`} value={`− ${formatMoney(totals.discountAmount)}`} />
            <ValueRow label="Impuestos" value={formatMoney(totals.tax)} />
            <View style={quoteStyles.totalLine} />
            <ValueRow label="TOTAL" value={formatMoney(totals.total)} accent />
          </View>
          <PrimaryButton label={activeQuote ? "Actualizar vista previa" : "Guardar y ver documento"} icon="file-document-check-outline" onPress={makeQuote} disabled={!client || !draftItems.length} />
          <Text style={quoteStyles.validity}>Vigencia: {business.validityDays} días · condiciones incluidas</Text>
        </Surface>

        {activeQuote ? (
          <Surface style={quoteStyles.actionsCard}>
            <SectionTitle title="Documento listo" action={<Tag label="PDF" tone="green" />} />
            <Text style={quoteStyles.actionsText}>Genera el documento y compártelo directamente desde tu dispositivo.</Text>
            <View style={quoteStyles.actionGrid}>
              <PrimaryButton label={exporting ? "Generando…" : "Generar PDF"} icon="file-pdf-box" onPress={() => exportPdf(false)} tone="quiet" disabled={exporting} />
              <PrimaryButton label="Compartir PDF" icon="share-variant-outline" onPress={() => exportPdf(true)} tone="cyan" disabled={exporting} />
            </View>
            <View style={quoteStyles.channelRow}>
              <Pressable onPress={() => exportPdf(true, "WhatsApp")} style={quoteStyles.channelButton}>
                <MaterialCommunityIcons name="whatsapp" size={18} color={biemColors.green} />
                <Text style={quoteStyles.channelText}>WhatsApp</Text>
              </Pressable>
              <Pressable onPress={() => exportPdf(true, "correo")} style={quoteStyles.channelButton}>
                <MaterialCommunityIcons name="email-outline" size={18} color={biemColors.cyan} />
                <Text style={quoteStyles.channelText}>Correo</Text>
              </Pressable>
            </View>
          </Surface>
        ) : null}

        <SectionTitle title="Historial" action={<Text style={quoteStyles.historyCount}>{quotes.length} propuestas</Text>} />
        <View style={quoteStyles.historyStack}>
          {quotes.map((quote) => (
            <Surface key={quote.id} style={quoteStyles.historyCard}>
              <View style={quoteStyles.historyTop}>
                <View>
                  <Text style={quoteStyles.historyNumber}>{quote.number}</Text>
                  <Text style={quoteStyles.historyClient}>{quote.clientName}</Text>
                </View>
                <Tag label={quote.status.toUpperCase()} tone={quote.status === "Aceptada" ? "green" : quote.status === "Enviada" ? "amber" : "muted"} />
              </View>
              <View style={quoteStyles.historyBottom}>
                <Text style={quoteStyles.historyDate}>Vence {formatDate(quote.validUntil)}</Text>
                <Pressable onPress={() => { setLatestQuote(duplicateQuote(quote)); setFeedback(`Duplicaste ${quote.number}.`); }}><Text style={quoteStyles.duplicate}>Duplicar</Text></Pressable>
              </View>
            </Surface>
          ))}
        </View>
        {feedback ? <Text style={quoteStyles.feedback}>{feedback}</Text> : null}
      </ScrollView>
    </BiemScreen>
  );
}

function FlowStep({ number, label, done }: { number: string; label: string; done: boolean }) {
  return <View style={quoteStyles.flowItem}><View style={[quoteStyles.flowDot, done && quoteStyles.flowDotDone]}><Text style={quoteStyles.flowDotText}>{done ? "✓" : number}</Text></View><Text style={quoteStyles.flowText}>{label}</Text></View>;
}

function Counter({ label, value, onChange, suffix = "", minimum, maximum = 99, step = 1 }: { label: string; value: number; onChange: (value: number) => void; suffix?: string; minimum: number; maximum?: number; step?: number }) {
  return <View style={quoteStyles.counterWrap}><Text style={quoteStyles.counterLabel}>{label}</Text><View style={quoteStyles.counterBox}><Pressable onPress={() => onChange(Math.max(minimum, value - step))} style={quoteStyles.counterAction}><MaterialCommunityIcons name="minus" size={16} color={biemColors.text} /></Pressable><Text style={quoteStyles.counterValue}>{value}{suffix}</Text><Pressable onPress={() => onChange(Math.min(maximum, value + step))} style={quoteStyles.counterAction}><MaterialCommunityIcons name="plus" size={16} color={biemColors.text} /></Pressable></View></View>;
}

function quoteItemFromProduct(product: Product, quantity: number): QuoteItem {
  return { productId: product.id, name: product.name, quantity, unit: product.unit, unitPrice: product.netPrice, taxRate: product.taxRate };
}

function quoteTotals(items: QuoteItem[], discount: number) {
  const subtotal = items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
  const discountAmount = subtotal * (discount / 100);
  const taxableTotal = subtotal - discountAmount;
  const tax = items.reduce((sum, item) => sum + (item.unitPrice * item.quantity * (1 - discount / 100) * item.taxRate) / 100, 0);
  return { subtotal, discountAmount, tax, total: taxableTotal + tax };
}

function quoteHtml(quote: Quote, client: Client, business: ReturnType<typeof useBiem>["business"]) {
  const totals = quoteTotals(quote.items, quote.discount);
  const rows = quote.items.map((item) => `<tr><td>${item.name}<br/><small>${item.quantity} × ${formatMoney(item.unitPrice)}</small></td><td style="text-align:right">${formatMoney(item.unitPrice * item.quantity)}</td></tr>`).join("");
  const logo = business.logoUrl ? `<img src="${business.logoUrl}" alt="Logo" style="width:52px;height:52px;object-fit:contain;vertical-align:middle;margin-right:12px"/>` : "";
  return `<!DOCTYPE html><html><head><meta charset="utf-8"/><style>body{font-family:Arial,sans-serif;color:#13233b;padding:42px}h1{font-size:28px;margin:0;color:#0b3a58;display:inline-block;vertical-align:middle}.top{display:flex;justify-content:space-between;border-bottom:2px solid #38bdf8;padding-bottom:22px}.muted{color:#63748c}.badge{background:#e0f5ff;color:#075985;border-radius:14px;padding:7px 11px;font-weight:700}table{width:100%;border-collapse:collapse;margin:30px 0}td{padding:14px 0;border-bottom:1px solid #dce4ed}small{color:#63748c}.total{margin-left:auto;width:250px}.row{display:flex;justify-content:space-between;padding:7px 0}.grand{font-size:20px;font-weight:800;border-top:2px solid #38bdf8;padding-top:12px;margin-top:6px}.footer{margin-top:44px;padding-top:20px;border-top:1px solid #dce4ed;font-size:12px;color:#63748c;line-height:1.5}</style></head><body><div class="top"><div>${logo}<h1>${business.name}</h1><p class="muted">${business.email}<br/>${business.phone} · ${business.city}</p></div><div style="text-align:right"><span class="badge">${quote.number}</span><p class="muted">Emitida: ${formatDate(quote.issuedAt)}<br/>Vigente hasta: ${formatDate(quote.validUntil)}</p></div></div><h2>Propuesta para ${client.company}</h2><p class="muted">${client.name}<br/>${client.email}</p><table><thead><tr><th style="text-align:left">Concepto</th><th style="text-align:right">Importe</th></tr></thead><tbody>${rows}</tbody></table><div class="total"><div class="row"><span>Subtotal</span><span>${formatMoney(totals.subtotal)}</span></div><div class="row"><span>Descuento</span><span>− ${formatMoney(totals.discountAmount)}</span></div><div class="row"><span>Impuestos</span><span>${formatMoney(totals.tax)}</span></div><div class="row grand"><span>Total</span><span>${formatMoney(totals.total)}</span></div></div><div class="footer"><strong>Condiciones comerciales</strong><br/>${quote.conditions}<br/><br/>Gracias por considerar esta propuesta.</div></body></html>`;
}

const quoteStyles = StyleSheet.create({
  content: { padding: 20, paddingBottom: 116, gap: 14 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  eyebrow: { color: biemColors.cyan, fontSize: 10, letterSpacing: 1.6, fontWeight: "900" },
  title: { color: biemColors.text, fontSize: 28, lineHeight: 33, fontWeight: "900", letterSpacing: -0.8, marginTop: 3 },
  lead: { color: biemColors.muted, fontSize: 14, lineHeight: 20, marginTop: -5 },
  flowCard: { paddingVertical: 14, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  flowItem: { alignItems: "center", gap: 5, minWidth: 54 },
  flowDot: { height: 28, width: 28, borderRadius: 14, backgroundColor: biemColors.surfaceSoft, borderColor: biemColors.line, borderWidth: 1, justifyContent: "center", alignItems: "center" },
  flowDotDone: { borderColor: biemColors.cyan, backgroundColor: "#0F425B" },
  flowDotText: { color: biemColors.text, fontSize: 11, fontWeight: "900" },
  flowText: { color: biemColors.muted, fontSize: 10, fontWeight: "800" },
  flowLine: { flex: 1, height: 1, backgroundColor: biemColors.line, marginHorizontal: -2, marginBottom: 19 },
  formCard: { gap: 9 },
  choiceStack: { gap: 8 },
  newLink: { color: biemColors.cyan, fontWeight: "900", fontSize: 12 },
  clientOption: { borderRadius: 15, borderWidth: 1, borderColor: biemColors.line, padding: 11, backgroundColor: biemColors.ink, flexDirection: "row", alignItems: "center", gap: 10 },
  clientOptionSelected: { borderColor: biemColors.cyan, backgroundColor: "#0E2638" },
  clientAvatar: { width: 34, height: 34, borderRadius: 12, alignItems: "center", justifyContent: "center", backgroundColor: "#173E57" },
  clientAvatarText: { color: biemColors.cyan, fontWeight: "900" },
  clientCopy: { flex: 1, gap: 2 },
  clientCompany: { color: biemColors.text, fontSize: 13, fontWeight: "900" },
  clientMeta: { color: biemColors.muted, fontSize: 10 },
  productOption: { borderRadius: 15, borderWidth: 1, borderColor: biemColors.line, padding: 12, backgroundColor: biemColors.ink, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10 },
  productOptionSelected: { borderColor: biemColors.cyan, backgroundColor: "#0E2638" },
  productCopy: { flex: 1, gap: 2 },
  productName: { color: biemColors.text, fontSize: 13, fontWeight: "900" },
  productMeta: { color: biemColors.muted, fontSize: 10 },
  productPriceWrap: { alignItems: "flex-end", gap: 1 },
  productPrice: { color: biemColors.cyan, fontSize: 13, fontWeight: "900" },
  productPriceCaption: { color: biemColors.muted, fontSize: 9 },
  controlsRow: { flexDirection: "row", gap: 12, marginTop: 3 },
  counterWrap: { flex: 1, gap: 6 },
  counterLabel: { color: biemColors.muted, fontSize: 10, textTransform: "uppercase", letterSpacing: 0.6, fontWeight: "800" },
  counterBox: { minHeight: 42, flexDirection: "row", alignItems: "center", justifyContent: "space-between", backgroundColor: biemColors.ink, borderWidth: 1, borderColor: biemColors.line, borderRadius: 13, paddingHorizontal: 3 },
  counterAction: { width: 33, height: 33, alignItems: "center", justifyContent: "center" },
  counterValue: { color: biemColors.text, fontSize: 13, fontWeight: "900" },
  cartCard: { gap: 8, paddingVertical: 14 },
  cartList: { gap: 7 },
  cartItem: { paddingHorizontal: 10, paddingVertical: 10, borderRadius: 13, backgroundColor: biemColors.ink, borderColor: biemColors.line, borderWidth: 1, flexDirection: "row", gap: 10 },
  cartCopy: { flex: 1, gap: 2 },
  cartName: { color: biemColors.text, fontSize: 12, fontWeight: "900" },
  cartMeta: { color: biemColors.muted, fontSize: 10 },
  cartValueWrap: { alignItems: "flex-end", gap: 4 },
  cartValue: { color: biemColors.cyan, fontSize: 12, fontWeight: "900" },
  removeText: { color: biemColors.red, fontSize: 10, fontWeight: "900" },
  emptyCart: { minHeight: 47, flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 4 },
  emptyCartText: { color: biemColors.muted, fontSize: 11, flex: 1, lineHeight: 16 },
  previewCard: { gap: 11, backgroundColor: "#F5F8FC", borderColor: "#D2DAE7" },
  previewHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  previewKicker: { color: "#4C647E", fontSize: 9, letterSpacing: 1.1, fontWeight: "900" },
  previewTitle: { color: "#10263F", fontSize: 17, fontWeight: "900", marginTop: 2 },
  docLine: { height: 2, backgroundColor: biemColors.cyan },
  toLabel: { color: "#4C647E", fontSize: 9, fontWeight: "900", letterSpacing: 1 },
  toName: { color: "#10263F", fontWeight: "900", fontSize: 16, marginTop: -6 },
  documentItems: { borderTopWidth: 1, borderColor: "#D2DAE7", marginTop: 4 },
  documentItem: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 11, borderBottomWidth: 1, borderColor: "#D2DAE7" },
  documentItemCopy: { flex: 1, gap: 2 },
  documentItemName: { color: "#10263F", fontSize: 12, fontWeight: "800" },
  documentItemMeta: { color: "#61748D", fontSize: 10 },
  documentItemValue: { color: "#10263F", fontSize: 13, fontWeight: "900" },
  previewEmpty: { color: "#61748D", fontSize: 11, paddingVertical: 12 },
  totalsArea: { paddingVertical: 2 },
  totalLine: { height: 1, backgroundColor: "#D2DAE7", marginVertical: 2 },
  validity: { color: "#61748D", textAlign: "center", fontSize: 10, marginTop: -4 },
  actionsCard: { gap: 12 },
  actionsText: { color: biemColors.muted, fontSize: 12, lineHeight: 18, marginTop: -7 },
  actionGrid: { gap: 8 },
  channelRow: { flexDirection: "row", gap: 8 },
  channelButton: { flex: 1, minHeight: 43, borderColor: biemColors.line, borderWidth: 1, borderRadius: 13, flexDirection: "row", gap: 7, alignItems: "center", justifyContent: "center", backgroundColor: biemColors.ink },
  channelText: { color: biemColors.text, fontSize: 12, fontWeight: "800" },
  historyCount: { color: biemColors.muted, fontSize: 11, fontWeight: "700" },
  historyStack: { gap: 8 },
  historyCard: { padding: 13, gap: 11 },
  historyTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  historyNumber: { color: biemColors.cyan, fontSize: 11, fontWeight: "900", letterSpacing: 0.4 },
  historyClient: { color: biemColors.text, fontSize: 14, fontWeight: "900", marginTop: 3 },
  historyBottom: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingTop: 10, borderTopWidth: 1, borderColor: biemColors.line },
  historyDate: { color: biemColors.muted, fontSize: 11 },
  duplicate: { color: biemColors.cyan, fontSize: 12, fontWeight: "900" },
  feedback: { color: biemColors.green, textAlign: "center", fontSize: 12, fontWeight: "800", marginTop: 2 },
});
