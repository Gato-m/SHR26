import { useThemeMode } from "@/providers/ThemeProvider";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { FlatList, Text, TouchableOpacity, View } from "react-native";
import {
  ThemedButton,
  ThemedHeader,
  ThemedSpacer,
  ThemedText,
  ThemedView,
} from "../../components";

import { useTheme } from "@shopify/restyle";
import { Theme } from "../../theme";

import { useEffect, useState } from "react";
import { supabase } from "../../../lib/supabase";

export default function HomeScreen() {
  const router = useRouter();
  const { toggle, mode } = useThemeMode();
  const theme = useTheme<Theme>();

  const [users, setUsers] = useState([]);

  useEffect(() => {
    async function getUsers() {
      try {
        const { data, error } = await supabase.from("users").select("id, name");
        if (error) {
          console.error("Error fetching users:", error.message);
        } else {
          setUsers(data || []);
        }
      } catch (err) {
        console.error("Unexpected error fetching users:", err);
      }
    }
    getUsers();
  }, []);

  const colorKeys = Object.keys(theme.colors) as (keyof Theme["colors"])[];

  return (
    <ThemedView
      style={{
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
      }}
    >
      <View style={{ position: "absolute", top: 24, right: 24 }}>
        <TouchableOpacity
          onPress={() => router.push("/(modals)/about")}
          accessibilityLabel="About"
        >
          <Ionicons
            name="information-circle-outline"
            size={28}
            color="#007AFF"
          />
        </TouchableOpacity>
      </View>
      <ThemedHeader variant="header">
        Welcome to Expo Router 6 Boilerplate
      </ThemedHeader>

      <FlatList
        data={users}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => <Text>{item.name}</Text>}
      />

      <ThemedText style={{ marginTop: 16, fontSize: 16 }}>
        This is your starter entry point. Edit this screen to begin your app!
      </ThemedText>
      <ThemedText style={{ marginTop: 8, color: "#888" }}>
        Use the tabs below to navigate.
      </ThemedText>

      <ThemedSpacer size="xl" />

      <ThemedButton
        label={
          mode === "light" ? "Switch to Dark Mode" : "Switch to Light Mode"
        }
        variant="primary"
        onPress={toggle}
      />
    </ThemedView>
  );
}
