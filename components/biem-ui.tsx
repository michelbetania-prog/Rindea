import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import type { ComponentProps, ReactNode } from "react";
import { Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export const biemColors = {
  ink: "#0B1220",
  surface: "#111827",
  surfaceRaised: "#172033",
  surfaceSoft: "#202C42",
  line: "#2A3955",
  text: "#F3F8FF",
  muted: "#93A4BD",
  cyan: "#38BDF8",
  cyanSoft: "#0E7490",
  amber: "#F2B134",
  green: "#61D6A7",
  red: "#FF8A8A",
  white: "#FFFFFF",
};

type IconName = ComponentProps<typeof MaterialCommunityIcons>["name"];

export function BiemScreen({ children }: { children: ReactNode }) {
  return (
    <View style={uiStyles.screen}>
      <SafeAreaView edges={["top", "left", "right"]} style={uiStyles.safeArea}>
        {children}
      </SafeAreaView>
    </View>
  );
}

export function BiemMark({ size = 42 }: { size?: number }) {
  return (
    <View style={[uiStyles.mark, { width: size, height: size, borderRadius: size * 0.3 }]}>
      <View style={[uiStyles.markSheet, { width: size * 0.47, height: size * 0.54 }]}>
        <View style={[uiStyles.markLine, { width: size * 0.28 }]} />
        <View style={[uiStyles.markLine, { width: size * 0.22 }]} />
        <View style={[uiStyles.markLine, { width: size * 0.28 }]} />
      </View>
      <View style={[uiStyles.markBeam, { width: size * 0.72 }]} />
    </View>
  );
}

export function PageHeader({
  eyebrow,
  title,
  action,
}: {
  eyebrow: string;
  title: string;
  action?: ReactNode;
}) {
  return (
    <View style={uiStyles.header}>
      <View style={uiStyles.headerCopy}>
        <Text style={uiStyles.eyebrow}>{eyebrow}</Text>
        <Text style={uiStyles.pageTitle}>{title}</Text>
      </View>
      {action}
    </View>
  );
}

export function Surface({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[uiStyles.surface, style]}>{children}</View>;
}

export function SectionTitle({ title, action }: { title: string; action?: ReactNode }) {
  return (
    <View style={uiStyles.sectionTitle}>
      <Text style={uiStyles.sectionText}>{title}</Text>
      {action}
    </View>
  );
}

export function Tag({ label, tone = "cyan" }: { label: string; tone?: "cyan" | "amber" | "green" | "muted" }) {
  const palette = {
    cyan: { bg: "#113750", text: biemColors.cyan },
    amber: { bg: "#442F11", text: biemColors.amber },
    green: { bg: "#123D34", text: biemColors.green },
    muted: { bg: "#27344C", text: biemColors.muted },
  }[tone];
  return (
    <View style={[uiStyles.tag, { backgroundColor: palette.bg }]}>
      <Text style={[uiStyles.tagText, { color: palette.text }]}>{label}</Text>
    </View>
  );
}

export function IconButton({
  icon,
  label,
  onPress,
  active = false,
}: {
  icon: IconName;
  label: string;
  onPress: () => void;
  active?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => [uiStyles.iconButton, active && uiStyles.iconButtonActive, pressed && uiStyles.pressed]}
    >
      <MaterialCommunityIcons name={icon} size={20} color={active ? biemColors.ink : biemColors.text} />
    </Pressable>
  );
}

export function PrimaryButton({
  label,
  icon,
  onPress,
  tone = "cyan",
  disabled = false,
  compact = false,
}: {
  label: string;
  icon?: IconName;
  onPress: () => void;
  tone?: "cyan" | "quiet" | "amber";
  disabled?: boolean;
  compact?: boolean;
}) {
  const palette = {
    cyan: { background: biemColors.cyan, text: biemColors.ink },
    quiet: { background: biemColors.surfaceSoft, text: biemColors.text },
    amber: { background: biemColors.amber, text: biemColors.ink },
  }[tone];
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        uiStyles.primaryButton,
        compact && uiStyles.compactButton,
        { backgroundColor: palette.background },
        disabled && uiStyles.disabled,
        pressed && !disabled && uiStyles.pressed,
      ]}
    >
      {icon ? <MaterialCommunityIcons name={icon} size={compact ? 17 : 19} color={palette.text} /> : null}
      <Text style={[uiStyles.primaryText, compact && uiStyles.compactButtonText, { color: palette.text }]}>{label}</Text>
    </Pressable>
  );
}

export function ValueRow({
  label,
  value,
  accent = false,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <View style={uiStyles.valueRow}>
      <Text style={uiStyles.valueLabel}>{label}</Text>
      <Text style={[uiStyles.valueText, accent && uiStyles.valueTextAccent]}>{value}</Text>
    </View>
  );
}

export function MiniMetric({
  icon,
  label,
  value,
  accent = "cyan",
}: {
  icon: IconName;
  label: string;
  value: string;
  accent?: "cyan" | "amber" | "green";
}) {
  const color = accent === "amber" ? biemColors.amber : accent === "green" ? biemColors.green : biemColors.cyan;
  return (
    <View style={uiStyles.metric}>
      <View style={[uiStyles.metricIcon, { backgroundColor: `${color}22` }]}>
        <MaterialCommunityIcons name={icon} size={17} color={color} />
      </View>
      <View style={uiStyles.metricCopy}>
        <Text style={uiStyles.metricLabel}>{label}</Text>
        <Text style={uiStyles.metricValue}>{value}</Text>
      </View>
    </View>
  );
}

export const uiStyles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: biemColors.ink },
  safeArea: { flex: 1 },
  header: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 14, flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  headerCopy: { gap: 4 },
  eyebrow: { fontSize: 10, letterSpacing: 1.6, textTransform: "uppercase", color: biemColors.cyan, fontWeight: "800" },
  pageTitle: { fontSize: 27, lineHeight: 31, color: biemColors.text, fontWeight: "800", letterSpacing: -0.6 },
  surface: { backgroundColor: biemColors.surfaceRaised, borderColor: biemColors.line, borderWidth: 1, borderRadius: 22, padding: 16 },
  sectionTitle: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 10 },
  sectionText: { color: biemColors.text, fontSize: 15, fontWeight: "800", letterSpacing: -0.1 },
  tag: { paddingHorizontal: 9, paddingVertical: 5, borderRadius: 999 },
  tagText: { fontSize: 10, fontWeight: "800", letterSpacing: 0.3 },
  iconButton: { width: 40, height: 40, borderRadius: 14, justifyContent: "center", alignItems: "center", backgroundColor: biemColors.surfaceSoft, borderWidth: 1, borderColor: biemColors.line },
  iconButtonActive: { backgroundColor: biemColors.cyan, borderColor: biemColors.cyan },
  primaryButton: { minHeight: 49, paddingHorizontal: 16, borderRadius: 15, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 },
  compactButton: { minHeight: 38, paddingHorizontal: 12, borderRadius: 12 },
  primaryText: { fontSize: 14, fontWeight: "900", letterSpacing: -0.1 },
  compactButtonText: { fontSize: 12 },
  valueRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 7 },
  valueLabel: { color: biemColors.muted, fontSize: 13 },
  valueText: { color: biemColors.text, fontSize: 13, fontWeight: "800" },
  valueTextAccent: { color: biemColors.cyan, fontSize: 15 },
  metric: { flexDirection: "row", alignItems: "center", gap: 10, flex: 1 },
  metricIcon: { width: 34, height: 34, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  metricCopy: { gap: 2, flexShrink: 1 },
  metricLabel: { fontSize: 10, color: biemColors.muted, textTransform: "uppercase", letterSpacing: 0.55, fontWeight: "700" },
  metricValue: { fontSize: 15, color: biemColors.text, fontWeight: "900", letterSpacing: -0.2 },
  mark: { backgroundColor: biemColors.surfaceSoft, borderWidth: 1, borderColor: biemColors.cyan, alignItems: "center", justifyContent: "center", overflow: "hidden" },
  markSheet: { backgroundColor: biemColors.cyan, borderRadius: 4, paddingTop: 7, paddingLeft: 7, gap: 3, transform: [{ rotate: "-8deg" }] },
  markLine: { height: 2, backgroundColor: biemColors.ink, borderRadius: 2 },
  markBeam: { position: "absolute", height: 3, backgroundColor: biemColors.amber, bottom: 8, transform: [{ rotate: "-8deg" }] },
  pressed: { opacity: 0.78, transform: [{ scale: 0.985 }] },
  disabled: { opacity: 0.45 },
});
