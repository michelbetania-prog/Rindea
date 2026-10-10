import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { useMemo, useState } from "react";
import { ScrollView, StyleSheet, Text, TextInput, View } from "react-native";

import { BiemScreen, IconButton, PrimaryButton, SectionTitle, Surface, Tag, biemColors } from "@/components/biem-ui";
import { useBiem } from "@/lib/biem/store";

const blank = { name: "", company: "", email: "", phone: "", address: "" };

export default function ClientsScreen() {
  const { clients, quotes, upsertClient } = useBiem();
  const [search, setSearch] = useState("");
  const [draft, setDraft] = useState(blank);
  const [openForm, setOpenForm] = useState(false);
  const [feedback, setFeedback] = useState("");
  const visible = useMemo(() => clients.filter((client) => `${client.name} ${client.company}`.toLowerCase().includes(search.toLowerCase())), [clients, search]);

  function saveClient() {
    if (!draft.name || !draft.company) { setFeedback("Solo necesitas nombre y empresa para empezar."); return; }
    const client = upsertClient(draft);
    setDraft(blank); setOpenForm(false); setFeedback(`${client.company} quedó disponible en tus cotizaciones.`);
  }

  return <BiemScreen><ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={clientStyles.content}>
    <View style={clientStyles.header}><View><Text style={clientStyles.eyebrow}>RELACIONES COMERCIALES</Text><Text style={clientStyles.title}>Clientes</Text></View><IconButton icon="account-plus-outline" label="Añadir cliente" onPress={() => setOpenForm((current) => !current)} /></View>
    <Text style={clientStyles.lead}>Guarda solo a quienes quieras reutilizar. También puedes cotizar sin cliente.</Text>
    <View style={clientStyles.searchWrap}><MaterialCommunityIcons name="magnify" size={19} color={biemColors.muted} /><TextInput value={search} onChangeText={setSearch} placeholder="Buscar cliente o empresa" placeholderTextColor={biemColors.muted} style={clientStyles.search} /></View>
    {openForm ? <Surface style={clientStyles.formCard}><SectionTitle title="Añadir cliente" action={<Tag label="OPCIONAL" tone="muted" />} /><Field label="Nombre de contacto" value={draft.name} onChange={(name) => setDraft((current) => ({ ...current, name }))} /><Field label="Empresa" value={draft.company} onChange={(company) => setDraft((current) => ({ ...current, company }))} /><Field label="Correo" value={draft.email} onChange={(email) => setDraft((current) => ({ ...current, email }))} /><View style={clientStyles.row}><View style={clientStyles.rowItem}><Field label="Teléfono" value={draft.phone} onChange={(phone) => setDraft((current) => ({ ...current, phone }))} /></View><View style={clientStyles.rowItem}><Field label="Ciudad" value={draft.address} onChange={(address) => setDraft((current) => ({ ...current, address }))} /></View></View><PrimaryButton label="Guardar cliente" icon="check" onPress={saveClient} compact /></Surface> : null}
    <SectionTitle title={`${visible.length} clientes`} action={<Text style={clientStyles.helper}>Historial asociado</Text>} />
    <View style={clientStyles.stack}>{visible.map((client) => { const count = quotes.filter((quote) => quote.clientId === client.id).length; return <Surface key={client.id} style={clientStyles.card}><View style={clientStyles.avatar}><Text style={clientStyles.avatarText}>{(client.company || client.name).slice(0, 1)}</Text></View><View style={clientStyles.copy}><Text style={clientStyles.company}>{client.company || "Sin empresa"}</Text><Text style={clientStyles.name}>{client.name}</Text><Text style={clientStyles.contact}>{client.email || "Sin correo"} {client.phone ? `· ${client.phone}` : ""}</Text></View><View style={clientStyles.count}><Text style={clientStyles.countValue}>{count}</Text><Text style={clientStyles.countLabel}>cot.</Text></View></Surface>; })}</View>
    {!visible.length ? <Surface style={clientStyles.empty}><MaterialCommunityIcons name="account-search-outline" size={27} color={biemColors.muted} /><Text style={clientStyles.emptyTitle}>No encontramos ese cliente.</Text></Surface> : null}
    {feedback ? <Text style={clientStyles.feedback}>{feedback}</Text> : null}
  </ScrollView></BiemScreen>;
}

function Field({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) { return <View style={clientStyles.field}><Text style={clientStyles.label}>{label}</Text><TextInput value={value} onChangeText={onChange} style={clientStyles.input} placeholderTextColor={biemColors.muted} /></View>; }

const clientStyles = StyleSheet.create({ content: { padding: 20, paddingBottom: 112, gap: 15 }, header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" }, eyebrow: { color: biemColors.cyan, fontSize: 10, letterSpacing: 1.6, fontWeight: "900" }, title: { color: biemColors.text, fontSize: 28, lineHeight: 33, fontWeight: "900", letterSpacing: -0.8, marginTop: 3 }, lead: { color: biemColors.muted, fontSize: 14, lineHeight: 20, marginTop: -5 }, searchWrap: { minHeight: 46, borderRadius: 13, borderWidth: 1, borderColor: biemColors.line, backgroundColor: biemColors.surface, flexDirection: "row", alignItems: "center", paddingHorizontal: 12, gap: 8 }, search: { color: biemColors.text, flex: 1, fontSize: 13 }, formCard: { gap: 10 }, row: { flexDirection: "row", gap: 10 }, rowItem: { flex: 1 }, field: { gap: 5 }, label: { color: biemColors.muted, fontSize: 10, textTransform: "uppercase", letterSpacing: 0.6, fontWeight: "800" }, input: { minHeight: 44, paddingHorizontal: 11, borderRadius: 12, borderWidth: 1, borderColor: biemColors.line, backgroundColor: biemColors.ink, color: biemColors.text, fontSize: 13 }, helper: { color: biemColors.muted, fontSize: 11 }, stack: { gap: 9 }, card: { padding: 13, flexDirection: "row", alignItems: "center", gap: 11 }, avatar: { width: 43, height: 43, borderRadius: 14, backgroundColor: biemColors.cyanSoft, justifyContent: "center", alignItems: "center" }, avatarText: { color: biemColors.cyan, fontSize: 16, fontWeight: "900" }, copy: { flex: 1, gap: 2 }, company: { color: biemColors.text, fontSize: 14, fontWeight: "900" }, name: { color: biemColors.muted, fontSize: 11 }, contact: { color: biemColors.muted, fontSize: 10 }, count: { alignItems: "center", minWidth: 34 }, countValue: { color: biemColors.cyan, fontSize: 16, fontWeight: "900" }, countLabel: { color: biemColors.muted, fontSize: 9 }, empty: { alignItems: "center", gap: 9, paddingVertical: 26 }, emptyTitle: { color: biemColors.text, fontWeight: "900" }, feedback: { color: biemColors.green, textAlign: "center", fontSize: 12, fontWeight: "800" },
});
