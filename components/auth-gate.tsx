import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { type ReactNode, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";

import { BiemMark, biemColors } from "@/components/biem-ui";
import { startOAuthLogin } from "@/constants/oauth";
import { trpc } from "@/lib/trpc";

export function AuthGate({ children }: { children: ReactNode }) {
  const session = trpc.auth.me.useQuery(undefined, {
    retry: false,
    staleTime: 0,
    refetchOnMount: "always",
  });
  const [starting, setStarting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  if (session.isPending) return <AccessLoading />;
  if (session.data?.user && session.data.workspace && session.data.membership?.status === "active") return <>{children}</>;
  if (session.data?.user) return <WorkspaceUnavailable onRetry={() => void session.refetch()} />;

  const beginLogin = async () => {
    try {
      setMessage(null);
      setStarting(true);
      await startOAuthLogin();
    } catch {
      setStarting(false);
      setMessage("No se pudo iniciar sesión. Verifica tu conexión e inténtalo otra vez.");
    }
  };

  return <View style={styles.page}>
    <View style={styles.orbOne} />
    <View style={styles.orbTwo} />
    <View style={styles.card}>
      <View style={styles.brandLine}><BiemMark size={44} /><View><Text style={styles.brand}>BIEM <Text style={styles.brandSoft}>Cotiza</Text></Text><Text style={styles.caption}>ESPACIO COMERCIAL SEGURO</Text></View></View>
      <View style={styles.divider} />
      <View style={styles.lockIcon}><MaterialCommunityIcons name="shield-lock-outline" size={25} color={biemColors.cyan} /></View>
      <Text style={styles.title}>Tu negocio, tus datos.</Text>
      <Text style={styles.copy}>Inicia sesión para acceder a tus cotizaciones, clientes y catálogo de forma privada.</Text>
      <Pressable accessibilityRole="button" accessibilityLabel="Continuar con Manus" disabled={starting} onPress={beginLogin} style={({ pressed }) => [styles.button, starting && styles.buttonDisabled, pressed && !starting && styles.pressed]}>
        {starting ? <ActivityIndicator size="small" color={biemColors.white} /> : <MaterialCommunityIcons name="account-arrow-right-outline" size={20} color={biemColors.white} />}
        <Text style={styles.buttonText}>{starting ? "Abriendo acceso…" : "Continuar con Manus"}</Text>
      </Pressable>
      {message ? <Text style={styles.error}>{message}</Text> : null}
      <Text style={styles.footer}>No compartimos tus cotizaciones con otros negocios.</Text>
    </View>
  </View>;
}

function AccessLoading() {
  return <View style={styles.page}><View style={styles.loading}><BiemMark size={40} /><ActivityIndicator color={biemColors.cyan} /><Text style={styles.loadingText}>Verificando tu acceso seguro…</Text></View></View>;
}

function WorkspaceUnavailable({ onRetry }: { onRetry: () => void }) {
  return <View style={styles.page}><View style={styles.card}>
    <View style={styles.lockIcon}><MaterialCommunityIcons name="cloud-alert-outline" size={25} color={biemColors.cyan} /></View>
    <Text style={styles.title}>Estamos preparando tu espacio.</Text>
    <Text style={styles.copy}>Tu sesión es válida, pero no pudimos abrir tu espacio de trabajo todavía. No se han modificado tus datos.</Text>
    <Pressable accessibilityRole="button" accessibilityLabel="Reintentar abrir el espacio" onPress={onRetry} style={({ pressed }) => [styles.button, pressed && styles.pressed]}>
      <MaterialCommunityIcons name="refresh" size={20} color={biemColors.white} /><Text style={styles.buttonText}>Reintentar</Text>
    </Pressable>
  </View></View>;
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: biemColors.ink, alignItems: "center", justifyContent: "center", padding: 22, overflow: "hidden" },
  orbOne: { position: "absolute", width: 310, height: 310, borderRadius: 160, backgroundColor: biemColors.cyanSoft, top: -130, right: -110 },
  orbTwo: { position: "absolute", width: 220, height: 220, borderRadius: 110, backgroundColor: biemColors.violetSoft, bottom: -115, left: -100 },
  card: { width: "100%", maxWidth: 390, backgroundColor: biemColors.surface, borderRadius: 20, borderWidth: 1, borderColor: biemColors.line, padding: 24, alignItems: "center", gap: 13, boxShadow: "0 18px 48px rgba(23,43,73,0.10)" as never },
  brandLine: { flexDirection: "row", alignItems: "center", alignSelf: "stretch", gap: 10 },
  brand: { color: biemColors.text, fontSize: 19, fontWeight: "900", letterSpacing: -0.7 },
  brandSoft: { color: biemColors.cyan },
  caption: { color: biemColors.muted, fontSize: 9, fontWeight: "900", letterSpacing: 1, marginTop: 2 },
  divider: { height: 1, backgroundColor: biemColors.line, alignSelf: "stretch", marginVertical: 5 },
  lockIcon: { width: 56, height: 56, borderRadius: 18, backgroundColor: biemColors.cyanSoft, alignItems: "center", justifyContent: "center", marginTop: 3 },
  title: { color: biemColors.text, fontSize: 22, fontWeight: "900", letterSpacing: -0.6, textAlign: "center", marginTop: 2 },
  copy: { color: biemColors.muted, fontSize: 13, lineHeight: 19, textAlign: "center", maxWidth: 280 },
  button: { minHeight: 48, borderRadius: 13, backgroundColor: biemColors.cyan, alignSelf: "stretch", justifyContent: "center", alignItems: "center", flexDirection: "row", gap: 8, marginTop: 5 },
  buttonDisabled: { opacity: 0.7 },
  buttonText: { color: biemColors.white, fontSize: 14, fontWeight: "900" },
  footer: { color: biemColors.muted, fontSize: 10, lineHeight: 15, textAlign: "center", marginTop: 2 },
  error: { color: biemColors.red, fontSize: 11, textAlign: "center", lineHeight: 16 },
  loading: { backgroundColor: biemColors.surface, borderRadius: 18, borderWidth: 1, borderColor: biemColors.line, padding: 24, alignItems: "center", gap: 14, minWidth: 250 },
  loadingText: { color: biemColors.muted, fontSize: 12, fontWeight: "800" },
  pressed: { opacity: 0.82, transform: [{ scale: 0.985 }] },
});
