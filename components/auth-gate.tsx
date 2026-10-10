import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { type ReactNode, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import { BiemMark, biemColors } from "@/components/biem-ui";
import { apiCall } from "@/lib/_core/api";
import { AccountWorkspaceContext } from "@/lib/account-workspace";
import { trpc } from "@/lib/trpc";

export function AuthGate({ children }: { children: ReactNode }) {
  const session = trpc.auth.me.useQuery(undefined, {
    retry: false,
    staleTime: 0,
    refetchOnMount: "always",
    refetchInterval: 60_000,
  });
  const [starting, setStarting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [signup, setSignup] = useState(false);
  const utils = trpc.useUtils();

  if (session.isPending) return <AccessLoading />;
  if (session.data?.user && session.data.workspace && session.data.membership?.status === "active") return <AccountWorkspaceContext.Provider key={session.data.workspace.id} value={session.data.workspace.id}>
    <View style={{ flex: 1 }}>
      <View style={styles.accountBar}><Text style={styles.footer}>Cuenta: {session.data.user.email}</Text>
        <Pressable accessibilityRole="button" disabled={starting} onPress={async () => {
          setStarting(true);
          try { await apiCall("/api/auth/logout", { method: "POST" }); utils.auth.me.setData(undefined, null); await utils.invalidate(); }
          catch { setMessage("No se pudo cerrar la sesión. Inténtalo otra vez."); }
          finally { setStarting(false); }
        }}><Text style={styles.accountAction}>Cerrar sesión</Text></Pressable>
        {message ? <Text style={styles.error}>{message}</Text> : null}
        <Text style={styles.footer}>Tus datos comerciales aún se guardan en este navegador para esta cuenta.</Text>
      </View>
      <View style={{ flex: 1 }}>{children}</View>
    </View>
  </AccountWorkspaceContext.Provider>;
  if (session.data?.user) return <WorkspaceUnavailable onRetry={() => void session.refetch()} />;

  const beginLogin = async () => {
    try {
      setMessage(null);
      setStarting(true);
      const result = await apiCall<{ confirmationRequired?: boolean }>(`/api/auth/${signup ? "signup" : "login"}`, { method: "POST", body: JSON.stringify({ email: email.trim(), password }) });
      setPassword("");
      if (result.confirmationRequired) { setSignup(false); setMessage("Revisa tu correo para confirmar la cuenta. Después inicia sesión aquí."); }
      else await session.refetch();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No se pudo iniciar sesión. Inténtalo otra vez.");
    } finally {
      setStarting(false);
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
      <TextInput accessibilityLabel="Correo electrónico" placeholder="Correo electrónico" placeholderTextColor={biemColors.muted} keyboardType="email-address" autoCapitalize="none" autoCorrect={false} autoComplete="email" value={email} onChangeText={setEmail} editable={!starting} style={styles.input} />
      <TextInput accessibilityLabel="Contraseña" placeholder="Contraseña (mínimo 8 caracteres)" placeholderTextColor={biemColors.muted} secureTextEntry autoCapitalize="none" autoComplete={signup ? "new-password" : "current-password"} value={password} onChangeText={setPassword} editable={!starting} style={styles.input} />
      <Pressable accessibilityRole="button" accessibilityLabel={signup ? "Crear cuenta" : "Iniciar sesión"} disabled={starting || !email.trim() || password.length < 8} onPress={beginLogin} style={({ pressed }) => [styles.button, (starting || !email.trim() || password.length < 8) && styles.buttonDisabled, pressed && !starting && styles.pressed]}>
        {starting ? <ActivityIndicator size="small" color={biemColors.white} /> : <MaterialCommunityIcons name="account-arrow-right-outline" size={20} color={biemColors.white} />}
        <Text style={styles.buttonText}>{starting ? "Comprobando acceso…" : signup ? "Crear cuenta" : "Iniciar sesión"}</Text>
      </Pressable>
      <Pressable accessibilityRole="button" disabled={starting} onPress={() => { setSignup(!signup); setMessage(null); setPassword(""); }} style={{ minHeight: 44, justifyContent: "center" }}><Text style={styles.accountAction}>{signup ? "Ya tengo una cuenta" : "Crear una cuenta nueva"}</Text></Pressable>
      {message ? <Text style={styles.error}>{message}</Text> : null}
      <Text style={styles.footer}>Acceso con correo y contraseña. Confirma tu correo antes de entrar.</Text>
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
  input: { alignSelf: "stretch", minHeight: 48, borderWidth: 1, borderColor: biemColors.line, borderRadius: 12, paddingHorizontal: 12, color: biemColors.text, fontSize: 14 },
  accountBar: { backgroundColor: biemColors.surface, padding: 8, alignItems: "center", gap: 4 },
  accountAction: { color: biemColors.cyan, fontWeight: "800", fontSize: 13 },
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
