import { useTheme } from "@shopify/restyle";
import React from "react";
import {
  ThemedButton,
  ThemedCard,
  ThemedHeader,
  ThemedSpacer,
  ThemedText,
  ThemedView,
} from "../../components";
import { useThemeMode } from "../../providers/ThemeProvider";
import { Theme } from "../../theme/theme";

import { useEffect, useState } from "react";
import { FlatList, Image, View } from "react-native";
import { supabase } from "../../../lib/supabase";
// Helper to get public URL for Supabase storage
function getAvatarUrl(path: string) {
  const { data } = supabase.storage.from("avatars").getPublicUrl(path);
  return data?.publicUrl || "";
}

export default function DemoScreen() {
  const { mode, toggle } = useThemeMode();
  const theme = useTheme<Theme>();

  const colorKeys = Object.keys(theme.colors) as (keyof Theme["colors"])[];

  const [users, setUsers] = useState<
    {
      id: number;
      name: string;
      avatar: string;
      position: string;
      email: string;
    }[]
  >([]);

  useEffect(() => {
    async function getUsers() {
      try {
        const { data, error } = await supabase
          .from("users")
          .select("id, name, avatar, position, email");
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

  return (
    <ThemedView style={{ padding: 20 }}>
      {/* HEADER */}
      <ThemedHeader>Darbinieki</ThemedHeader>

      <ThemedButton
        label={
          mode === "light" ? "Switch to Dark Mode" : "Switch to Light Mode"
        }
        variant="primary"
        onPress={toggle}
      />

      {/* TEXT */}

      <ThemedSpacer size="m" />

      <FlatList
        data={users}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => (
          <ThemedCard
            style={{
              flexDirection: "row",
              alignItems: "center",
              marginBottom: 8,
              padding: 12,
            }}
          >
            {/* Avatar on the left */}
            <AvatarImage avatar={item.avatar} name={item.name} />
            <View style={{ flex: 1 }}>
              <ThemedText
                type="body"
                style={{ fontWeight: "bold", fontSize: 16 }}
              >
                {item.name}
              </ThemedText>
              <ThemedText type="body" style={{ color: "#888", fontSize: 14 }}>
                {item.position}
              </ThemedText>
              <ThemedText type="body" style={{ color: "#888", fontSize: 14 }}>
                {item.email}
              </ThemedText>
            </View>
          </ThemedCard>
        )}
      />
    </ThemedView>
  );
}
// Custom avatar image component to handle fallback and errors
function AvatarImage({ avatar, name }: { avatar: string; name: string }) {
  const [error, setError] = React.useState(false);
  const avatarUrl =
    avatar && avatar !== ""
      ? getAvatarUrl(avatar)
      : `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}`;
  return (
    <Image
      source={{
        uri: error
          ? `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}`
          : avatarUrl,
      }}
      style={{
        width: 48,
        height: 48,
        borderRadius: 24,
        marginRight: 12,
        backgroundColor: "#eee",
      }}
      resizeMode="cover"
      onError={() => setError(true)}
    />
  );
}
