import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { Tabs } from "expo-router";
import { Platform, StyleSheet, useWindowDimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { HapticTab } from "@/components/haptic-tab";
import { biemColors } from "@/components/biem-ui";

export default function TabLayout() {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const desktop = Platform.OS === "web" && width >= 980;
  const bottomPadding = Platform.OS === "web" ? 8 : Math.max(insets.bottom, 8);
  return <Tabs screenOptions={{ headerShown: false, tabBarButton: HapticTab, tabBarActiveTintColor: biemColors.cyan, tabBarInactiveTintColor: biemColors.muted, tabBarStyle: [tabStyles.tabBar, desktop && tabStyles.hidden, { height: 59 + bottomPadding, paddingBottom: bottomPadding }], tabBarLabelStyle: tabStyles.label, tabBarItemStyle: tabStyles.item }}>
    <Tabs.Screen name="index" options={{ title: "Inicio", tabBarIcon: ({ color, focused }) => <MaterialCommunityIcons name={focused ? "view-dashboard" : "view-dashboard-outline"} size={21} color={color} /> }} />
    <Tabs.Screen name="cotizaciones" options={{ title: "Nueva", tabBarIcon: ({ color, focused }) => <MaterialCommunityIcons name={focused ? "file-plus" : "file-plus-outline"} size={21} color={color} /> }} />
    <Tabs.Screen name="historial" options={{ title: "Cotizaciones", tabBarIcon: ({ color, focused }) => <MaterialCommunityIcons name={focused ? "file-document-multiple" : "file-document-multiple-outline"} size={21} color={color} /> }} />
    <Tabs.Screen name="clientes" options={{ title: "Clientes", tabBarIcon: ({ color, focused }) => <MaterialCommunityIcons name={focused ? "account-group" : "account-group-outline"} size={21} color={color} /> }} />
    <Tabs.Screen name="negocio" options={{ title: "Configuración", tabBarIcon: ({ color, focused }) => <MaterialCommunityIcons name={focused ? "cog" : "cog-outline"} size={21} color={color} /> }} />
    <Tabs.Screen name="calculadora" options={{ href: null }} />
    <Tabs.Screen name="reportes" options={{ href: null }} />
  </Tabs>;
}

const tabStyles = StyleSheet.create({
  tabBar: { backgroundColor: biemColors.surface, borderTopColor: biemColors.line, borderTopWidth: 1, paddingTop: 7, elevation: 0 },
  hidden: { display: "none" },
  label: { fontSize: 8, fontWeight: "800", marginTop: 1 },
  item: { paddingTop: 1 },
});
