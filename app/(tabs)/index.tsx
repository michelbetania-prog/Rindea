import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { router } from "expo-router";
import { ScrollView, StyleSheet, Text, View } from "react-native";

import { BiemMark, BiemScreen, IconButton, MiniMetric, PrimaryButton, SectionTitle, Surface, Tag, biemColors } from "@/components/biem-ui";
import { formatCompactMoney, formatDate, formatMoney } from "@/lib/biem/finance";
import { useBiem } from "@/lib/biem/store";

export default function DashboardScreen() {
  const { business, products, quotes } = useBiem();
  const featured = products[0];
  const recent = quotes[0];
  const potential = products.reduce((sum, item) => sum + item.suggestedPrice, 0);

  return (
    <BiemScreen>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={homeStyles.content}>
        <View style={homeStyles.topBar}>
          <View style={homeStyles.brandBlock}>
            <BiemMark size={42} />
            <View>
              <Text style={homeStyles.brandName}>BIEM <Text style={homeStyles.brandNameSoft}>Cotiza</Text></Text>
              <Text style={homeStyles.brandCaption}>control comercial</Text>
            </View>
          </View>
          <IconButton icon="bell-outline" label="Notificaciones" onPress={() => undefined} />
        </View>

        <View style={homeStyles.welcomeRow}>
          <View style={homeStyles.welcomeCopy}>
            <Text style={homeStyles.eyebrow}>TABLERO DE HOY</Text>
            <Text style={homeStyles.greeting}>Hola, {business.owner.split(" ")[0]}.</Text>
            <Text style={homeStyles.subhead}>Tu precio protege el margen.</Text>
          </View>
          <View style={homeStyles.dateStamp}>
            <MaterialCommunityIcons name="calendar-blank-outline" size={15} color={biemColors.cyan} />
            <Text style={homeStyles.dateText}>10 OCT</Text>
          </View>
        </View>

        {featured ? (
          <Surface style={homeStyles.priceCard}>
            <View style={homeStyles.cardTopLine}>
              <View>
                <Text style={homeStyles.cardKicker}>PRECIO MÁS RECIENTE</Text>
                <Text style={homeStyles.productTitle} numberOfLines={1}>{featured.name}</Text>
              </View>
              <Tag label="LISTO PARA VENDER" tone="green" />
            </View>
            <View style={homeStyles.priceLine}>
              <Text style={homeStyles.price}>{formatMoney(featured.suggestedPrice)}</Text>
              <Text style={homeStyles.unit}> / {featured.unit}</Text>
            </View>
            <View style={homeStyles.metricsRow}>
              <MiniMetric icon="chart-line" label="Margen" value={`${featured.margin}%`} accent="green" />
              <View style={homeStyles.metricDivider} />
              <MiniMetric icon="receipt-text-outline" label="Costo" value={formatCompactMoney(featured.cost + featured.expenses)} accent="cyan" />
            </View>
            <View style={homeStyles.actionRow}>
              <PrimaryButton label="Usar en cotización" icon="file-document-edit-outline" onPress={() => router.push("/cotizaciones")} />
            </View>
          </Surface>
        ) : null}

        <View style={homeStyles.shortcutRow}>
          <View style={homeStyles.shortcutItem}>
            <PressShortcut icon="calculator-variant-outline" label="Calcular precio" tone="cyan" onPress={() => router.push("/calculadora")} />
          </View>
          <View style={homeStyles.shortcutItem}>
            <PressShortcut icon="file-plus-outline" label="Nueva cotización" tone="amber" onPress={() => router.push("/cotizaciones")} />
          </View>
        </View>

        <SectionTitle title="Pulso del negocio" />
        <Surface style={homeStyles.pulseCard}>
          <View style={homeStyles.pulseRow}>
            <MiniMetric icon="file-send-outline" label="Propuestas activas" value={`${quotes.length}`} />
            <MiniMetric icon="wallet-outline" label="Valor potencial" value={formatCompactMoney(potential)} accent="amber" />
          </View>
          <View style={homeStyles.pulseLine} />
          <View style={homeStyles.pulseNote}>
            <View style={homeStyles.signalDot} />
            <Text style={homeStyles.pulseText}>Cada cálculo puede convertirse en una propuesta sin volver a escribir el precio.</Text>
          </View>
        </Surface>

        <SectionTitle title="En seguimiento" action={<Text style={homeStyles.linkText}>Ver historial</Text>} />
        {recent ? (
          <Surface style={homeStyles.quoteCard}>
            <View style={homeStyles.quoteIcon}>
              <MaterialCommunityIcons name="file-document-check-outline" size={22} color={biemColors.cyan} />
            </View>
            <View style={homeStyles.quoteCopy}>
              <Text style={homeStyles.quoteName}>{recent.clientName}</Text>
              <Text style={homeStyles.quoteMeta}>{recent.number} · vence {formatDate(recent.validUntil)}</Text>
            </View>
            <Tag label={recent.status.toUpperCase()} tone="amber" />
          </Surface>
        ) : (
          <Text style={homeStyles.emptyText}>Aún no tienes cotizaciones. Crea la primera desde tu precio sugerido.</Text>
        )}
      </ScrollView>
    </BiemScreen>
  );
}

function PressShortcut({
  icon,
  label,
  tone,
  onPress,
}: {
  icon: React.ComponentProps<typeof MaterialCommunityIcons>["name"];
  label: string;
  tone: "cyan" | "amber";
  onPress: () => void;
}) {
  const color = tone === "amber" ? biemColors.amber : biemColors.cyan;
  return (
    <View style={[homeStyles.shortcut, { borderColor: `${color}55` }]}>
      <View style={[homeStyles.shortcutIcon, { backgroundColor: `${color}20` }]}>
        <MaterialCommunityIcons name={icon} size={23} color={color} />
      </View>
      <Text style={homeStyles.shortcutText}>{label}</Text>
      <View style={homeStyles.shortcutAction}>
        <PrimaryButton label="Abrir" icon="arrow-right" compact tone="quiet" onPress={onPress} />
      </View>
    </View>
  );
}

const homeStyles = StyleSheet.create({
  content: { padding: 20, paddingBottom: 116, gap: 18 },
  topBar: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  brandBlock: { flexDirection: "row", alignItems: "center", gap: 10 },
  brandName: { fontSize: 19, color: biemColors.text, fontWeight: "900", letterSpacing: -0.7 },
  brandNameSoft: { color: biemColors.cyan },
  brandCaption: { color: biemColors.muted, fontSize: 10, textTransform: "uppercase", letterSpacing: 1.1, fontWeight: "800", marginTop: 2 },
  welcomeRow: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", marginTop: 8 },
  welcomeCopy: { gap: 3, flex: 1 },
  eyebrow: { fontSize: 10, fontWeight: "900", letterSpacing: 1.55, color: biemColors.cyan },
  greeting: { color: biemColors.text, fontSize: 29, lineHeight: 34, fontWeight: "900", letterSpacing: -0.9 },
  subhead: { color: biemColors.muted, fontSize: 14 },
  dateStamp: { backgroundColor: biemColors.surfaceRaised, borderColor: biemColors.line, borderWidth: 1, paddingHorizontal: 10, height: 34, borderRadius: 12, alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 5, marginTop: 12 },
  dateText: { color: biemColors.text, fontWeight: "900", fontSize: 10, letterSpacing: 0.4 },
  priceCard: { padding: 17, gap: 15, borderTopColor: biemColors.cyan, borderTopWidth: 2 },
  cardTopLine: { flexDirection: "row", justifyContent: "space-between", gap: 10, alignItems: "flex-start" },
  cardKicker: { fontSize: 10, color: biemColors.muted, fontWeight: "900", letterSpacing: 1.1 },
  productTitle: { color: biemColors.text, marginTop: 4, fontSize: 15, fontWeight: "800", maxWidth: 190 },
  priceLine: { flexDirection: "row", alignItems: "baseline" },
  price: { color: biemColors.cyan, fontSize: 39, fontWeight: "900", letterSpacing: -1.6 },
  unit: { color: biemColors.muted, fontSize: 13 },
  metricsRow: { flexDirection: "row", gap: 15, paddingTop: 2 },
  metricDivider: { width: 1, backgroundColor: biemColors.line },
  actionRow: { marginTop: 2 },
  shortcutRow: { flexDirection: "row", gap: 12 },
  shortcutItem: { flex: 1 },
  shortcut: { backgroundColor: biemColors.surface, borderWidth: 1, borderRadius: 18, padding: 13, minHeight: 160, justifyContent: "space-between", gap: 10 },
  shortcutIcon: { width: 42, height: 42, borderRadius: 14, justifyContent: "center", alignItems: "center" },
  shortcutText: { color: biemColors.text, fontSize: 14, fontWeight: "900", lineHeight: 18, maxWidth: 108 },
  shortcutAction: { alignSelf: "flex-start" },
  pulseCard: { gap: 16 },
  pulseRow: { flexDirection: "row", gap: 12 },
  pulseLine: { height: 1, backgroundColor: biemColors.line },
  pulseNote: { flexDirection: "row", gap: 8, alignItems: "flex-start" },
  signalDot: { width: 7, height: 7, borderRadius: 4, marginTop: 5, backgroundColor: biemColors.cyan },
  pulseText: { flex: 1, color: biemColors.muted, lineHeight: 18, fontSize: 12 },
  linkText: { color: biemColors.cyan, fontWeight: "800", fontSize: 12 },
  quoteCard: { padding: 13, flexDirection: "row", alignItems: "center", gap: 11 },
  quoteIcon: { width: 42, height: 42, borderRadius: 14, justifyContent: "center", alignItems: "center", backgroundColor: "#103144" },
  quoteCopy: { flex: 1, gap: 3 },
  quoteName: { color: biemColors.text, fontSize: 14, fontWeight: "900" },
  quoteMeta: { color: biemColors.muted, fontSize: 11 },
  emptyText: { color: biemColors.muted, fontSize: 13, lineHeight: 19 },
});
