import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { router } from "expo-router";
import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";

import { BiemMark, BiemScreen, IconButton, PrimaryButton, SectionTitle, Surface, Tag, biemColors } from "@/components/biem-ui";
import { useBiem } from "@/lib/biem/store";

export default function BusinessScreen() {
  const { business, updateBusiness, clients, products, upsertClient } = useBiem();
  const [draft, setDraft] = useState(business);
  const [clientDraft, setClientDraft] = useState<ClientDraft>(emptyClientDraft);
  const [saved, setSaved] = useState(false);
  const [clientSaved, setClientSaved] = useState("");
  const [toolsOpen, setToolsOpen] = useState(false);

  function save() {
    updateBusiness(draft);
    setSaved(true);
  }

  function editClient(client: (typeof clients)[number]) {
    setClientDraft(client);
    setClientSaved(`Editando los datos de ${client.company}.`);
  }

  function saveClient() {
    if (!clientDraft.name || !clientDraft.company || !clientDraft.email) {
      setClientSaved("Completa nombre, empresa y correo para guardar el cliente.");
      return;
    }
    const client = upsertClient(clientDraft);
    setClientDraft(emptyClientDraft);
    setClientSaved(`${client.company} está disponible para tu próxima cotización.`);
  }

  return (
    <BiemScreen>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={businessStyles.content}>
        <View style={businessStyles.header}>
          <View>
            <Text style={businessStyles.eyebrow}>TU ESPACIO COMERCIAL</Text>
            <Text style={businessStyles.title}>Configuración</Text>
          </View>
          <IconButton icon="cog-outline" label="Opciones de negocio" onPress={() => undefined} />
        </View>
        <Text style={businessStyles.lead}>Configura tu negocio; el catálogo y los clientes son opcionales.</Text>

        <Surface style={businessStyles.toolsCard}>
          <Pressable onPress={() => setToolsOpen((current) => !current)} style={businessStyles.toolsToggle}>
            <View style={businessStyles.catalogIcon}><MaterialCommunityIcons name="view-grid-plus-outline" size={21} color={biemColors.cyan} /></View>
            <View style={businessStyles.catalogCopy}><Text style={businessStyles.catalogTitle}>Más herramientas</Text><Text style={businessStyles.catalogText}>Catálogo y reportes comerciales.</Text></View>
            <MaterialCommunityIcons name={toolsOpen ? "chevron-up" : "chevron-down"} size={20} color={biemColors.muted} />
          </Pressable>
          {toolsOpen ? <View style={businessStyles.toolsList}>
            <Pressable onPress={() => router.push("/calculadora")} style={businessStyles.toolItem}><View style={businessStyles.toolItemIcon}><MaterialCommunityIcons name="package-variant-closed" size={17} color={biemColors.cyan} /></View><View style={businessStyles.toolItemCopy}><Text style={businessStyles.toolItemTitle}>Productos y servicios</Text><Text style={businessStyles.toolItemText}>{products.length} elementos guardados para reutilizar.</Text></View><Text style={businessStyles.catalogLink}>Abrir</Text></Pressable>
            <Pressable onPress={() => router.push("/reportes")} style={businessStyles.toolItem}><View style={businessStyles.toolItemIcon}><MaterialCommunityIcons name="chart-box-outline" size={17} color={biemColors.violet} /></View><View style={businessStyles.toolItemCopy}><Text style={businessStyles.toolItemTitle}>Reportes</Text><Text style={businessStyles.toolItemText}>Actividad y oportunidades reales.</Text></View><Text style={businessStyles.catalogLink}>Abrir</Text></Pressable>
          </View> : null}
        </Surface>

        <Surface style={businessStyles.identityCard}>
          <View style={businessStyles.identityTop}>
            <BiemMark size={58} />
            <View style={businessStyles.identityCopy}>
              <Text style={businessStyles.identityName}>{draft.name}</Text>
              <Text style={businessStyles.identityMeta}>Logo y datos comerciales activos</Text>
            </View>
            <Tag label="VISIBLE" tone="green" />
          </View>
          <View style={businessStyles.brandStrip}>
            <View style={businessStyles.brandSwatch} />
            <Text style={businessStyles.brandStripText}>Sello BIEM · Control Claro</Text>
          </View>
        </Surface>

        <Surface style={businessStyles.formCard}>
          <SectionTitle title="Datos del negocio" />
          <Field label="Nombre comercial" value={draft.name} onChangeText={(name) => setDraft((current) => ({ ...current, name }))} />
          <View style={businessStyles.pair}>
            <View style={businessStyles.pairItem}><Field label="Responsable" value={draft.owner} onChangeText={(owner) => setDraft((current) => ({ ...current, owner }))} /></View>
            <View style={businessStyles.pairItem}><Field label="Ciudad" value={draft.city} onChangeText={(city) => setDraft((current) => ({ ...current, city }))} /></View>
          </View>
          <Field label="URL del logo para el documento" value={draft.logoUrl} keyboardType="default" onChangeText={(logoUrl) => setDraft((current) => ({ ...current, logoUrl }))} />
          <Field label="Correo para cotizaciones" value={draft.email} keyboardType="email-address" onChangeText={(email) => setDraft((current) => ({ ...current, email }))} />
          <Field label="Teléfono" value={draft.phone} keyboardType="phone-pad" onChangeText={(phone) => setDraft((current) => ({ ...current, phone }))} />
        </Surface>

        <Surface style={businessStyles.formCard}>
          <SectionTitle title="Condiciones comerciales" />
          <Text style={businessStyles.fieldLabel}>Texto al final del documento</Text>
          <TextInput multiline value={draft.conditions} onChangeText={(conditions) => setDraft((current) => ({ ...current, conditions }))} style={[businessStyles.textInput, businessStyles.conditionsInput]} textAlignVertical="top" />
          <View style={businessStyles.validityRow}>
            <View>
              <Text style={businessStyles.fieldLabel}>VIGENCIA POR DEFECTO</Text>
              <Text style={businessStyles.validityCaption}>Se aplica a cada nueva propuesta.</Text>
            </View>
            <View style={businessStyles.validityControl}>
              <Pressable onPress={() => setDraft((current) => ({ ...current, validityDays: Math.max(1, current.validityDays - 1) }))} style={businessStyles.validityAction}><MaterialCommunityIcons name="minus" size={16} color={biemColors.text} /></Pressable>
              <View style={businessStyles.validityChip}><Text style={businessStyles.validityValue}>{draft.validityDays} días</Text></View>
              <Pressable onPress={() => setDraft((current) => ({ ...current, validityDays: Math.min(90, current.validityDays + 1) }))} style={businessStyles.validityAction}><MaterialCommunityIcons name="plus" size={16} color={biemColors.text} /></Pressable>
            </View>
          </View>
        </Surface>

        <Surface style={businessStyles.formCard}>
          <SectionTitle title="Clientes" action={<Tag label={`${clients.length} ACTIVOS`} tone="green" />} />
          <View style={businessStyles.clientStack}>
            {clients.map((client) => (
              <Pressable key={client.id} onPress={() => editClient(client)} style={businessStyles.clientItem}>
                <View style={businessStyles.clientInitial}><Text style={businessStyles.clientInitialText}>{client.company.slice(0, 1)}</Text></View>
                <View style={businessStyles.clientCopy}><Text style={businessStyles.clientCompany}>{client.company}</Text><Text style={businessStyles.clientMeta}>{client.name} · {client.email}</Text></View>
                <Text style={businessStyles.clientEdit}>EDITAR</Text>
              </Pressable>
            ))}
          </View>
          <View style={businessStyles.clientDivider} />
          <Text style={businessStyles.clientFormHeading}>{clientDraft.id ? "Editar cliente" : "Añadir cliente"}</Text>
          <View style={businessStyles.pair}>
            <View style={businessStyles.pairItem}><Field label="Contacto" value={clientDraft.name} onChangeText={(name) => setClientDraft((current) => ({ ...current, name }))} /></View>
            <View style={businessStyles.pairItem}><Field label="Empresa" value={clientDraft.company} onChangeText={(company) => setClientDraft((current) => ({ ...current, company }))} /></View>
          </View>
          <Field label="Correo del cliente" value={clientDraft.email} keyboardType="email-address" onChangeText={(email) => setClientDraft((current) => ({ ...current, email }))} />
          <View style={businessStyles.pair}>
            <View style={businessStyles.pairItem}><Field label="Teléfono" value={clientDraft.phone} keyboardType="phone-pad" onChangeText={(phone) => setClientDraft((current) => ({ ...current, phone }))} /></View>
            <View style={businessStyles.pairItem}><Field label="Ciudad / dirección" value={clientDraft.address} onChangeText={(address) => setClientDraft((current) => ({ ...current, address }))} /></View>
          </View>
          <PrimaryButton label={clientDraft.id ? "Guardar cliente" : "Añadir cliente"} icon="account-plus-outline" onPress={saveClient} tone="quiet" compact />
          {clientSaved ? <Text style={businessStyles.clientSaved}>{clientSaved}</Text> : null}
        </Surface>

        <Surface style={businessStyles.statusCard}>
          <View style={businessStyles.statusIcon}><MaterialCommunityIcons name="database-check-outline" size={20} color={biemColors.green} /></View>
          <View style={businessStyles.statusCopy}>
            <Text style={businessStyles.statusTitle}>Información lista para cotizar</Text>
            <Text style={businessStyles.statusText}>{products.length} precios calculados y {clients.length} clientes disponibles.</Text>
          </View>
        </Surface>

        <PrimaryButton label="Guardar personalización" icon="content-save-outline" onPress={save} />
        {saved ? <Text style={businessStyles.saved}>Cambios guardados. Tu próxima cotización usará estos datos.</Text> : null}
      </ScrollView>
    </BiemScreen>
  );
}

function Field({ label, value, onChangeText, keyboardType = "default" }: { label: string; value: string; onChangeText: (value: string) => void; keyboardType?: "default" | "email-address" | "phone-pad" }) {
  return (
    <View style={businessStyles.fieldWrap}>
      <Text style={businessStyles.fieldLabel}>{label}</Text>
      <TextInput value={value} onChangeText={onChangeText} keyboardType={keyboardType} style={businessStyles.textInput} />
    </View>
  );
}

type ClientDraft = {
  id?: string;
  name: string;
  company: string;
  email: string;
  phone: string;
  address: string;
};

const emptyClientDraft: ClientDraft = { name: "", company: "", email: "", phone: "", address: "" };

const businessStyles = StyleSheet.create({
  content: { padding: 20, paddingBottom: 116, gap: 14 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  eyebrow: { color: biemColors.cyan, fontSize: 10, letterSpacing: 1.6, fontWeight: "900" },
  title: { color: biemColors.text, fontSize: 27, lineHeight: 33, fontWeight: "900", letterSpacing: -0.8, marginTop: 3 },
  lead: { color: biemColors.muted, fontSize: 14, lineHeight: 20, marginTop: -5 },
  identityCard: { gap: 15, borderColor: "#B9E3F5", backgroundColor: biemColors.cyanSoft },
  identityTop: { flexDirection: "row", alignItems: "center", gap: 12 },
  identityCopy: { flex: 1, gap: 3 },
  identityName: { color: biemColors.text, fontSize: 17, fontWeight: "900" },
  identityMeta: { color: biemColors.muted, fontSize: 11 },
  brandStrip: { flexDirection: "row", gap: 8, alignItems: "center", borderTopWidth: 1, borderTopColor: "#B9E3F5", paddingTop: 13 },
  brandSwatch: { width: 27, height: 8, borderRadius: 4, backgroundColor: biemColors.cyan },
  brandStripText: { color: biemColors.muted, fontSize: 11, fontWeight: "700" },
  formCard: { gap: 11 },
  fieldWrap: { gap: 6 },
  fieldLabel: { color: biemColors.muted, fontSize: 10, textTransform: "uppercase", letterSpacing: 0.7, fontWeight: "800" },
  toolsCard: { padding: 0, overflow: "hidden" },
  toolsToggle: { minHeight: 64, padding: 13, flexDirection: "row", alignItems: "center", gap: 10 },
  toolsList: { borderTopWidth: 1, borderTopColor: biemColors.line, padding: 10, gap: 8 },
  toolItem: { minHeight: 54, paddingHorizontal: 3, flexDirection: "row", alignItems: "center", gap: 9 },
  toolItemIcon: { width: 34, height: 34, borderRadius: 11, backgroundColor: biemColors.surfaceSoft, alignItems: "center", justifyContent: "center" },
  toolItemCopy: { flex: 1, gap: 2 },
  toolItemTitle: { color: biemColors.text, fontSize: 12, fontWeight: "900" },
  toolItemText: { color: biemColors.muted, fontSize: 10 },
  catalogIcon: { width: 38, height: 38, borderRadius: 12, backgroundColor: biemColors.cyanSoft, alignItems: "center", justifyContent: "center" },
  catalogCopy: { flex: 1, gap: 2 },
  catalogTitle: { color: biemColors.text, fontSize: 13, fontWeight: "900" },
  catalogText: { color: biemColors.muted, fontSize: 11 },
  catalogLink: { color: biemColors.cyan, fontSize: 12, fontWeight: "900" },
  textInput: { minHeight: 47, paddingHorizontal: 12, borderRadius: 13, borderWidth: 1, borderColor: biemColors.line, backgroundColor: biemColors.ink, color: biemColors.text, fontSize: 13, fontWeight: "700" },
  conditionsInput: { height: 92, paddingTop: 11, lineHeight: 18 },
  pair: { flexDirection: "row", gap: 10 },
  pairItem: { flex: 1 },
  validityRow: { backgroundColor: biemColors.ink, borderColor: biemColors.line, borderWidth: 1, borderRadius: 14, padding: 11, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  validityCaption: { color: biemColors.muted, fontSize: 10, marginTop: 3 },
  validityControl: { flexDirection: "row", alignItems: "center", gap: 5 },
  validityAction: { width: 28, height: 28, alignItems: "center", justifyContent: "center", borderRadius: 9, backgroundColor: biemColors.surfaceSoft },
  validityChip: { backgroundColor: biemColors.cyanSoft, borderRadius: 11, paddingHorizontal: 10, paddingVertical: 8 },
  validityValue: { color: biemColors.cyan, fontSize: 12, fontWeight: "900" },
  clientStack: { gap: 7 },
  clientItem: { minHeight: 49, padding: 9, borderColor: biemColors.line, borderWidth: 1, borderRadius: 13, backgroundColor: biemColors.ink, flexDirection: "row", gap: 9, alignItems: "center" },
  clientInitial: { width: 30, height: 30, borderRadius: 10, alignItems: "center", justifyContent: "center", backgroundColor: biemColors.cyanSoft },
  clientInitialText: { color: biemColors.cyan, fontSize: 12, fontWeight: "900" },
  clientCopy: { flex: 1, gap: 2 },
  clientCompany: { color: biemColors.text, fontSize: 12, fontWeight: "900" },
  clientMeta: { color: biemColors.muted, fontSize: 10 },
  clientEdit: { color: biemColors.cyan, fontSize: 10, letterSpacing: 0.4, fontWeight: "900" },
  clientDivider: { height: 1, backgroundColor: biemColors.line, marginVertical: 2 },
  clientFormHeading: { color: biemColors.text, fontSize: 13, fontWeight: "900", marginTop: 1 },
  clientSaved: { color: biemColors.green, textAlign: "center", fontSize: 11, fontWeight: "800", marginTop: -3 },
  statusCard: { flexDirection: "row", gap: 11, padding: 13, alignItems: "center" },
  statusIcon: { width: 39, height: 39, borderRadius: 13, justifyContent: "center", alignItems: "center", backgroundColor: "#E1F5EE" },
  statusCopy: { flex: 1, gap: 2 },
  statusTitle: { color: biemColors.text, fontSize: 13, fontWeight: "900" },
  statusText: { color: biemColors.muted, fontSize: 11, lineHeight: 15 },
  saved: { color: biemColors.green, fontWeight: "800", textAlign: "center", fontSize: 12, marginTop: -4 },
});
