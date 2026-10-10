import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { router } from "expo-router";
import { ScrollView, StyleSheet, Text, View } from "react-native";

import { BiemMark, BiemScreen, IconButton, MiniMetric, PrimaryButton, SectionTitle, Surface, Tag, biemColors } from "@/components/biem-ui";
import { formatDate, formatMoney } from "@/lib/biem/finance";
import { useBiem, type QuoteStatus } from "@/lib/biem/store";

export default function DashboardScreen() {
  const { business, products, clients, quotes } = useBiem();
  const pending = quotes.filter((quote) => quote.status === "Borrador" || quote.status === "Enviada").length;
  const approved = quotes.filter((quote) => quote.status === "Aprobada").length;
  const completed = quotes.filter((quote) => quote.status === "Completada").length;
  const pipeline = quotes.reduce((sum, quote) => sum + quoteTotal(quote), 0);
  const recent = quotes[0];

  return <BiemScreen><ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={homeStyles.content}>
    <View style={homeStyles.topBar}><View style={homeStyles.brandBlock}><BiemMark size={42} /><View><Text style={homeStyles.brandName}>BIEM <Text style={homeStyles.brandNameSoft}>Cotiza</Text></Text><Text style={homeStyles.brandCaption}>espacio de trabajo</Text></View></View><IconButton icon="bell-outline" label="Notificaciones" onPress={() => undefined} /></View>
    <View style={homeStyles.welcomeRow}><View style={homeStyles.welcomeCopy}><Text style={homeStyles.eyebrow}>RESUMEN DEL NEGOCIO</Text><Text style={homeStyles.greeting}>Hola, {business.owner.split(" ")[0]}.</Text><Text style={homeStyles.subhead}>Cotiza primero. Organiza después.</Text></View><View style={homeStyles.dateStamp}><MaterialCommunityIcons name="calendar-blank-outline" size={15} color={biemColors.cyan} /><Text style={homeStyles.dateText}>HOY</Text></View></View>

    <Surface style={homeStyles.heroCard}><View style={homeStyles.heroCopy}><Text style={homeStyles.heroKicker}>TU SIGUIENTE VENTA</Text><Text style={homeStyles.heroTitle}>Crea una cotización en minutos.</Text><Text style={homeStyles.heroText}>No necesitas tener clientes ni catálogo listos para empezar.</Text></View><PrimaryButton label="Nueva cotización" icon="arrow-right" onPress={() => router.push("/cotizaciones")} /></Surface>

    <SectionTitle title="Actividad comercial" action={<Text style={homeStyles.linkText}>Ver todo</Text>} />
    <View style={homeStyles.metricGrid}><Surface style={homeStyles.metricCard}><MiniMetric icon="file-document-outline" label="Generadas" value={`${quotes.length}`} /></Surface><Surface style={homeStyles.metricCard}><MiniMetric icon="clock-outline" label="Pendientes" value={`${pending}`} accent="amber" /></Surface><Surface style={homeStyles.metricCard}><MiniMetric icon="check-decagram-outline" label="Aprobadas" value={`${approved}`} accent="green" /></Surface><Surface style={homeStyles.metricCard}><MiniMetric icon="briefcase-check-outline" label="Completadas" value={`${completed}`} accent="green" /></Surface></View>

    <Surface style={homeStyles.pipelineCard}><View style={homeStyles.pipelineTop}><View><Text style={homeStyles.cardKicker}>VALOR EN SEGUIMIENTO</Text><Text style={homeStyles.pipelineValue}>{formatMoney(pipeline)}</Text></View><Tag label={`${clients.length} CLIENTES`} tone="cyan" /></View><View style={homeStyles.pipelineBar}><View style={[homeStyles.pipelineFill, { width: `${quotes.length ? Math.min(92, Math.max(16, (approved + completed) / quotes.length * 100)) : 8}%` }]} /></View><View style={homeStyles.pipelineLegend}><Text style={homeStyles.pipelineLegendText}>Propuestas que pueden convertirse en trabajo real.</Text><Text style={homeStyles.pipelineLegendValue}>{products.length} en catálogo</Text></View></Surface>

    <SectionTitle title="En seguimiento" action={<Text style={homeStyles.linkText} onPress={() => router.push("/historial")}>Historial</Text>} />
    {recent ? <Surface style={homeStyles.quoteCard}><View style={homeStyles.quoteIcon}><MaterialCommunityIcons name="file-document-check-outline" size={22} color={biemColors.cyan} /></View><View style={homeStyles.quoteCopy}><Text style={homeStyles.quoteName}>{recent.clientName || "Cliente por definir"}</Text><Text style={homeStyles.quoteMeta}>{recent.number} · vence {formatDate(recent.validUntil)}</Text></View><StatusTag status={recent.status} /></Surface> : <Text style={homeStyles.emptyText}>Todavía no hay cotizaciones. Crea la primera ahora.</Text>}
  </ScrollView></BiemScreen>;
}

function StatusTag({ status }: { status: QuoteStatus }) {
  const tone = status === "Aprobada" || status === "Completada" ? "green" : status === "Rechazada" || status === "Cancelada" ? "red" : status === "Enviada" ? "amber" : "muted";
  return <Tag label={status.toUpperCase()} tone={tone} />;
}

function quoteTotal(quote: ReturnType<typeof useBiem>["quotes"][number]) {
  const subtotal = quote.items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
  const discounted = subtotal * (1 - quote.discount / 100);
  const tax = quote.items.reduce((sum, item) => sum + (item.unitPrice * item.quantity * (1 - quote.discount / 100) * item.taxRate) / 100, 0);
  return discounted + tax;
}

const homeStyles = StyleSheet.create({
  content: { padding: 20, paddingBottom: 112, gap: 17 }, topBar: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" }, brandBlock: { flexDirection: "row", alignItems: "center", gap: 10 }, brandName: { fontSize: 19, color: biemColors.text, fontWeight: "900", letterSpacing: -0.7 }, brandNameSoft: { color: biemColors.cyan }, brandCaption: { color: biemColors.muted, fontSize: 10, textTransform: "uppercase", letterSpacing: 1.1, fontWeight: "800", marginTop: 2 }, welcomeRow: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", marginTop: 6 }, welcomeCopy: { gap: 3, flex: 1 }, eyebrow: { fontSize: 10, fontWeight: "900", letterSpacing: 1.55, color: biemColors.cyan }, greeting: { color: biemColors.text, fontSize: 29, lineHeight: 34, fontWeight: "900", letterSpacing: -0.9 }, subhead: { color: biemColors.muted, fontSize: 14 }, dateStamp: { backgroundColor: biemColors.cyanSoft, borderColor: "#B9E3F5", borderWidth: 1, paddingHorizontal: 10, height: 34, borderRadius: 12, alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 5, marginTop: 12 }, dateText: { color: biemColors.cyan, fontWeight: "900", fontSize: 10, letterSpacing: 0.4 }, heroCard: { backgroundColor: biemColors.cyan, borderColor: biemColors.cyan, gap: 16 }, heroCopy: { gap: 5 }, heroKicker: { color: "#DDF5FF", fontSize: 10, fontWeight: "900", letterSpacing: 1.1 }, heroTitle: { color: biemColors.white, fontSize: 24, lineHeight: 28, fontWeight: "900", letterSpacing: -0.7, maxWidth: 290 }, heroText: { color: "#E8F8FF", fontSize: 13, lineHeight: 18, maxWidth: 300 }, metricGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 }, metricCard: { width: "48.4%", padding: 12, minHeight: 68 }, pipelineCard: { gap: 14 }, pipelineTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" }, cardKicker: { fontSize: 10, color: biemColors.muted, fontWeight: "900", letterSpacing: 1.1 }, pipelineValue: { color: biemColors.text, fontSize: 29, fontWeight: "900", marginTop: 4 }, pipelineBar: { height: 8, borderRadius: 4, backgroundColor: biemColors.surfaceSoft, overflow: "hidden" }, pipelineFill: { height: 8, borderRadius: 4, backgroundColor: biemColors.cyan }, pipelineLegend: { flexDirection: "row", justifyContent: "space-between", gap: 10 }, pipelineLegendText: { color: biemColors.muted, fontSize: 11, flex: 1, lineHeight: 15 }, pipelineLegendValue: { color: biemColors.cyan, fontSize: 11, fontWeight: "900" }, linkText: { color: biemColors.cyan, fontWeight: "800", fontSize: 12 }, quoteCard: { padding: 13, flexDirection: "row", alignItems: "center", gap: 11 }, quoteIcon: { width: 42, height: 42, borderRadius: 14, justifyContent: "center", alignItems: "center", backgroundColor: biemColors.cyanSoft }, quoteCopy: { flex: 1, gap: 3 }, quoteName: { color: biemColors.text, fontSize: 14, fontWeight: "900" }, quoteMeta: { color: biemColors.muted, fontSize: 11 }, emptyText: { color: biemColors.muted, fontSize: 13, lineHeight: 19 },
});
