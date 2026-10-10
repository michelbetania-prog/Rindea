import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { router } from "expo-router";
import { useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";

import { BiemScreen, IconButton, PrimaryButton, SectionTitle, Surface, Tag, ValueRow, biemColors } from "@/components/biem-ui";
import { asNumber, calculatePrice, formatMoney } from "@/lib/biem/finance";
import { useBiem } from "@/lib/biem/store";

type Draft = {
  id?: string;
  name: string;
  unit: string;
  cost: number;
  expenses: number;
  margin: number;
  taxRate: number;
  category: "Producto" | "Servicio";
};

const initialDraft: Draft = {
  name: "Sesión de asesoría",
  unit: "sesión",
  cost: 72,
  expenses: 18,
  margin: 40,
  taxRate: 0,
  category: "Servicio",
};

export default function CalculatorScreen() {
  const { upsertProduct, products, setPendingQuoteProduct } = useBiem();
  const [draft, setDraft] = useState<Draft>(initialDraft);
  const [notice, setNotice] = useState("");
  const breakdown = useMemo(() => calculatePrice(draft), [draft]);

  function setNumber(key: "cost" | "expenses", value: string) {
    setDraft((current) => ({ ...current, [key]: asNumber(value) }));
  }

  function saveProduct(moveToQuote = false) {
    const product = upsertProduct(draft);
    setNotice(moveToQuote ? `“${product.name}” ya está listo para cotizar.` : "Producto guardado en tu catálogo.");
    if (moveToQuote) {
      setPendingQuoteProduct(product.id);
      router.push("/cotizaciones");
    }
  }

  function loadProduct(product: (typeof products)[number]) {
    setDraft({
      id: product.id,
      name: product.name,
      unit: product.unit,
      cost: product.cost,
      expenses: product.expenses,
      margin: product.margin,
      taxRate: product.taxRate,
      category: product.category,
    });
    setNotice(`Editando “${product.name}”. Ajusta los datos y guarda los cambios.`);
  }

  return (
    <BiemScreen>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={calcStyles.content}>
        <View style={calcStyles.header}>
          <View>
            <Text style={calcStyles.eyebrow}>CÁLCULO RENTABLE</Text>
            <Text style={calcStyles.title}>Calcula tu precio</Text>
          </View>
          <IconButton icon="bookmark-outline" label="Guardar cálculo" onPress={() => saveProduct(false)} />
        </View>
        <Text style={calcStyles.lead}>Convierte costos cotidianos en un precio que protege tu margen.</Text>

        <Surface style={calcStyles.catalogCard}>
          <SectionTitle title="Catálogo reutilizable" action={<Tag label={`${products.length} GUARDADOS`} tone="muted" />} />
          <View style={calcStyles.catalogList}>
            {products.slice(0, 2).map((product) => (
              <Pressable key={product.id} onPress={() => loadProduct(product)} style={[calcStyles.catalogItem, draft.id === product.id && calcStyles.catalogItemActive]}>
                <View style={calcStyles.catalogCopy}>
                  <Text style={calcStyles.catalogName} numberOfLines={1}>{product.name}</Text>
                  <Text style={calcStyles.catalogMeta}>{product.category} · {product.unit}</Text>
                </View>
                <Text style={calcStyles.catalogAction}>{draft.id === product.id ? "EDITANDO" : "EDITAR"}</Text>
              </Pressable>
            ))}
          </View>
        </Surface>

        <Surface style={calcStyles.formCard}>
          <SectionTitle title="1 · Qué vendes" />
          <Text style={calcStyles.inputLabel}>Nombre del producto o servicio</Text>
          <TextInput
            value={draft.name}
            onChangeText={(name) => setDraft((current) => ({ ...current, name }))}
            placeholder="Ej. Paquete de fotografía"
            placeholderTextColor={biemColors.muted}
            style={calcStyles.textInput}
          />
          <View style={calcStyles.segmentedRow}>
            {(["Servicio", "Producto"] as const).map((type) => (
              <Pressable
                key={type}
                onPress={() => setDraft((current) => ({ ...current, category: type }))}
                style={[calcStyles.segment, draft.category === type && calcStyles.segmentActive]}
              >
                <Text style={[calcStyles.segmentText, draft.category === type && calcStyles.segmentTextActive]}>{type}</Text>
              </Pressable>
            ))}
          </View>
          <Text style={[calcStyles.inputLabel, calcStyles.spacedLabel]}>Unidad de venta</Text>
          <TextInput
            value={draft.unit}
            onChangeText={(unit) => setDraft((current) => ({ ...current, unit }))}
            placeholder="unidad, hora, paquete"
            placeholderTextColor={biemColors.muted}
            style={calcStyles.textInput}
          />
        </Surface>

        <Surface style={calcStyles.formCard}>
          <SectionTitle title="2 · Cuánto te cuesta" />
          <View style={calcStyles.moneyGrid}>
            <NumberField label="Costo directo" value={draft.cost} onChange={(value) => setNumber("cost", value)} hint="materiales / tiempo" />
            <NumberField label="Gastos asociados" value={draft.expenses} onChange={(value) => setNumber("expenses", value)} hint="envío / herramientas" />
          </View>
          <View style={calcStyles.costHint}>
            <MaterialCommunityIcons name="information-outline" size={16} color={biemColors.cyan} />
            <Text style={calcStyles.costHintText}>Costo total: <Text style={calcStyles.costHintStrong}>{formatMoney(breakdown.totalCost)}</Text> por {draft.unit || "unidad"}.</Text>
          </View>
        </Surface>

        <Surface style={calcStyles.formCard}>
          <SectionTitle title="3 · Define tu margen" />
          <View style={calcStyles.marginDisplay}>
            <Text style={calcStyles.marginValue}>{draft.margin}%</Text>
            <Text style={calcStyles.marginLabel}>margen objetivo</Text>
          </View>
          <View style={calcStyles.optionRow}>
            {[25, 35, 40, 50].map((margin) => (
              <Pressable key={margin} onPress={() => setDraft((current) => ({ ...current, margin }))} style={[calcStyles.optionChip, draft.margin === margin && calcStyles.optionChipActive]}>
                <Text style={[calcStyles.optionText, draft.margin === margin && calcStyles.optionTextActive]}>{margin}%</Text>
              </Pressable>
            ))}
          </View>
          <Text style={[calcStyles.inputLabel, calcStyles.spacedLabel]}>Impuesto incluido</Text>
          <View style={calcStyles.optionRow}>
            {[0, 5, 19].map((taxRate) => (
              <Pressable key={taxRate} onPress={() => setDraft((current) => ({ ...current, taxRate }))} style={[calcStyles.taxChip, draft.taxRate === taxRate && calcStyles.taxChipActive]}>
                <Text style={[calcStyles.optionText, draft.taxRate === taxRate && calcStyles.optionTextActive]}>{taxRate === 0 ? "Sin impuesto" : `${taxRate}%`}</Text>
              </Pressable>
            ))}
          </View>
        </Surface>

        <View style={calcStyles.resultShell}>
          <View style={calcStyles.resultRail} />
          <Surface style={calcStyles.resultCard}>
            <View style={calcStyles.resultTop}>
              <View>
                <Text style={calcStyles.resultKicker}>PRECIO SUGERIDO</Text>
                <Text style={calcStyles.resultValue}>{formatMoney(breakdown.suggestedPrice)}</Text>
                <Text style={calcStyles.resultUnit}>por {draft.unit || "unidad"}</Text>
              </View>
              <Tag label="RENTABLE" tone="green" />
            </View>
            <View style={calcStyles.breakdown}>
              <ValueRow label="Costo total" value={formatMoney(breakdown.totalCost)} />
              <ValueRow label="Utilidad estimada" value={formatMoney(breakdown.profit)} />
              <ValueRow label="Impuestos" value={formatMoney(breakdown.taxAmount)} />
              <View style={calcStyles.totalLine} />
              <ValueRow label="Precio final" value={formatMoney(breakdown.suggestedPrice)} accent />
            </View>
            <PrimaryButton label="Usar precio en cotización" icon="file-document-edit-outline" onPress={() => saveProduct(true)} />
            <Text style={calcStyles.directLink}>Se guardará en tu catálogo y se transferirá a una nueva cotización.</Text>
          </Surface>
        </View>
        {notice ? <Text style={calcStyles.notice}>{notice}</Text> : null}
      </ScrollView>
    </BiemScreen>
  );
}

function NumberField({ label, value, onChange, hint }: { label: string; value: number; onChange: (value: string) => void; hint: string }) {
  return (
    <View style={calcStyles.fieldWrap}>
      <Text style={calcStyles.inputLabel}>{label}</Text>
      <View style={calcStyles.moneyInputWrap}>
        <Text style={calcStyles.currencyPrefix}>$</Text>
        <TextInput value={String(value)} keyboardType="decimal-pad" onChangeText={onChange} style={calcStyles.moneyInput} selectTextOnFocus />
      </View>
      <Text style={calcStyles.fieldHint}>{hint}</Text>
    </View>
  );
}

const calcStyles = StyleSheet.create({
  content: { padding: 20, paddingBottom: 116, gap: 14 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  eyebrow: { color: biemColors.cyan, fontSize: 10, letterSpacing: 1.6, fontWeight: "900" },
  title: { color: biemColors.text, fontSize: 28, lineHeight: 33, fontWeight: "900", letterSpacing: -0.8, marginTop: 3 },
  lead: { color: biemColors.muted, fontSize: 14, lineHeight: 20, marginTop: -5, maxWidth: 320 },
  catalogCard: { gap: 7, paddingVertical: 14 },
  catalogList: { gap: 6 },
  catalogItem: { paddingVertical: 8, paddingHorizontal: 10, borderRadius: 12, backgroundColor: biemColors.ink, borderColor: biemColors.line, borderWidth: 1, flexDirection: "row", alignItems: "center", gap: 8 },
  catalogItemActive: { borderColor: biemColors.cyan, backgroundColor: "#0E2638" },
  catalogCopy: { flex: 1, gap: 2 },
  catalogName: { color: biemColors.text, fontSize: 12, fontWeight: "800" },
  catalogMeta: { color: biemColors.muted, fontSize: 10 },
  catalogAction: { color: biemColors.cyan, fontSize: 10, fontWeight: "900", letterSpacing: 0.5 },
  formCard: { gap: 10 },
  inputLabel: { color: biemColors.muted, fontSize: 11, textTransform: "uppercase", letterSpacing: 0.7, fontWeight: "800" },
  spacedLabel: { marginTop: 4 },
  textInput: { minHeight: 48, paddingHorizontal: 13, borderWidth: 1, borderColor: biemColors.line, borderRadius: 14, backgroundColor: biemColors.ink, color: biemColors.text, fontSize: 14, fontWeight: "700" },
  segmentedRow: { flexDirection: "row", gap: 8 },
  segment: { flex: 1, minHeight: 39, borderRadius: 12, justifyContent: "center", alignItems: "center", backgroundColor: biemColors.ink, borderWidth: 1, borderColor: biemColors.line },
  segmentActive: { backgroundColor: "#0F425B", borderColor: biemColors.cyan },
  segmentText: { color: biemColors.muted, fontSize: 12, fontWeight: "800" },
  segmentTextActive: { color: biemColors.cyan },
  moneyGrid: { flexDirection: "row", gap: 12 },
  fieldWrap: { flex: 1, gap: 6 },
  moneyInputWrap: { minHeight: 50, borderRadius: 14, backgroundColor: biemColors.ink, borderWidth: 1, borderColor: biemColors.line, flexDirection: "row", alignItems: "center", paddingLeft: 12 },
  currencyPrefix: { color: biemColors.cyan, fontSize: 16, fontWeight: "900", marginRight: 4 },
  moneyInput: { color: biemColors.text, fontSize: 17, fontWeight: "900", flex: 1, paddingVertical: 8 },
  fieldHint: { color: biemColors.muted, fontSize: 10, lineHeight: 13 },
  costHint: { backgroundColor: "#102B3B", borderRadius: 12, padding: 10, flexDirection: "row", gap: 7, alignItems: "center" },
  costHintText: { color: biemColors.muted, fontSize: 12, flex: 1 },
  costHintStrong: { color: biemColors.text, fontWeight: "900" },
  marginDisplay: { alignItems: "baseline", flexDirection: "row", gap: 7 },
  marginValue: { color: biemColors.cyan, fontSize: 35, fontWeight: "900", letterSpacing: -1.3 },
  marginLabel: { color: biemColors.muted, fontSize: 13 },
  optionRow: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
  optionChip: { minWidth: 56, paddingVertical: 10, paddingHorizontal: 12, borderRadius: 12, backgroundColor: biemColors.ink, borderWidth: 1, borderColor: biemColors.line, alignItems: "center" },
  optionChipActive: { borderColor: biemColors.cyan, backgroundColor: "#0F425B" },
  taxChip: { paddingVertical: 10, paddingHorizontal: 12, borderRadius: 12, backgroundColor: biemColors.ink, borderWidth: 1, borderColor: biemColors.line },
  taxChipActive: { borderColor: biemColors.cyan, backgroundColor: "#0F425B" },
  optionText: { color: biemColors.muted, fontSize: 12, fontWeight: "900" },
  optionTextActive: { color: biemColors.cyan },
  resultShell: { position: "relative" },
  resultRail: { position: "absolute", width: 3, backgroundColor: biemColors.cyan, top: 22, bottom: 22, left: 0, zIndex: 2, borderRadius: 9 },
  resultCard: { gap: 16, padding: 18, borderColor: "#27627B", borderWidth: 1, backgroundColor: "#102334" },
  resultTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  resultKicker: { color: biemColors.muted, fontSize: 10, fontWeight: "900", letterSpacing: 1.1 },
  resultValue: { color: biemColors.cyan, fontSize: 36, fontWeight: "900", letterSpacing: -1.5, marginTop: 3 },
  resultUnit: { color: biemColors.muted, fontSize: 12, marginTop: -2 },
  breakdown: { paddingVertical: 8, borderTopWidth: 1, borderBottomWidth: 1, borderColor: "#285069" },
  totalLine: { height: 1, backgroundColor: "#285069", marginVertical: 3 },
  directLink: { color: biemColors.muted, fontSize: 11, textAlign: "center", lineHeight: 16, marginTop: -7 },
  notice: { color: biemColors.green, textAlign: "center", fontSize: 12, fontWeight: "800", marginTop: 2 },
});
