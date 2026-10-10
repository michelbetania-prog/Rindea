import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { Tabs } from "expo-router";
import { Platform, StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { HapticTab } from "@/components/haptic-tab";
import { biemColors } from "@/components/biem-ui";

export default function TabLayout() {
  const insets = useSafeAreaInsets();
  const bottomPadding = Platform.OS === "web" ? 10 : Math.max(insets.bottom, 8);
  const tabBarHeight = 61 + bottomPadding;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarButton: HapticTab,
        tabBarActiveTintColor: biemColors.cyan,
        tabBarInactiveTintColor: "#71809A",
        tabBarStyle: [tabStyles.tabBar, { height: tabBarHeight, paddingBottom: bottomPadding }],
        tabBarLabelStyle: tabStyles.label,
        tabBarItemStyle: tabStyles.item,
      }}
    >
      <Tabs.Screen name="index" options={{ title: "Inicio", tabBarIcon: ({ color, focused }) => <MaterialCommunityIcons name={focused ? "view-dashboard" : "view-dashboard-outline"} size={22} color={color} /> }} />
      <Tabs.Screen name="calculadora" options={{ title: "Precios", tabBarIcon: ({ color, focused }) => <MaterialCommunityIcons name={focused ? "calculator-variant" : "calculator-variant-outline"} size={22} color={color} /> }} />
      <Tabs.Screen name="cotizaciones" options={{ title: "Cotiza", tabBarIcon: ({ color, focused }) => <MaterialCommunityIcons name={focused ? "file-document-edit" : "file-document-edit-outline"} size={22} color={color} /> }} />
      <Tabs.Screen name="negocio" options={{ title: "Negocio", tabBarIcon: ({ color, focused }) => <MaterialCommunityIcons name={focused ? "storefront" : "storefront-outline"} size={22} color={color} /> }} />
    </Tabs>
  );
}

const tabStyles = StyleSheet.create({
  tabBar: { backgroundColor: "#101827", borderTopColor: "#273853", borderTopWidth: 1, paddingTop: 8, elevation: 0 },
  label: { fontSize: 10, fontWeight: "800", marginTop: 1 },
  item: { paddingTop: 1 },
});
