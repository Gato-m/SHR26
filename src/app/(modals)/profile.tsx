import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@shopify/restyle";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, View } from "react-native";
import { supabase } from "../../../lib/supabase";
import { ThemedText, ThemedView } from "../../components";
import { ThemedAvatar } from "../../components/ThemedAvatar";
import type { Theme } from "../../theme/theme";

type User = {
  id: string;
  name: string;
  avatar: string | null;
  position: string | null;
  email: string | null;
  phone?: string | null;
};

// Helper to get public URL for Supabase storage (same bucket as in darbinieki)
function getAvatarUrl(path: string) {
  const { data } = supabase.storage.from("avatars").getPublicUrl(path);
  return data?.publicUrl || "";
}

export default function ProfileModal() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const theme = useTheme<Theme>();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchUser() {
      if (!id) {
        setError("Nav norādīts lietotāja ID.");
        setLoading(false);
        return;
      }

      try {
        const { data, error: dbError } = await supabase
          .from("users")
          .select("id, name, avatar, position, email, phone")
          .eq("id", id)
          .single();

        if (dbError) {
          setError(dbError.message);
        } else {
          setUser(data as User);
        }
      } catch (err) {
        setError("Neizdevās ielādēt profilu.");
      } finally {
        setLoading(false);
      }
    }

    fetchUser();
  }, [id]);

  return (
    <>
      <Stack.Screen
        options={{
          title: "Profils",
          headerLeft: () => (
            <Pressable
              onPress={() => router.back()}
              style={{ paddingHorizontal: 12 }}
            >
              <Ionicons
                name="chevron-back"
                size={24}
                color={theme.colors.text}
              />
            </Pressable>
          ),
        }}
      />

      <ThemedView style={{ flex: 1, padding: 24 }}>
        {loading && (
          <View
            style={{ flex: 1, justifyContent: "center", alignItems: "center" }}
          >
            <ActivityIndicator color={theme.colors.primary} />
          </View>
        )}

        {!loading && error && (
          <View>
            <ThemedText style={{ marginBottom: 8 }}>
              Kļūda ielādējot profilu:
            </ThemedText>
            <ThemedText>{error}</ThemedText>
          </View>
        )}

        {!loading && !error && user && (
          <View style={{ alignItems: "center" }}>
            <ThemedAvatar
              avatarUrl={user.avatar ? getAvatarUrl(user.avatar) : undefined}
              size={80}
            />
            <ThemedText
              style={{ fontSize: 20, fontWeight: "bold", marginTop: 16 }}
            >
              {user.name}
            </ThemedText>
            {user.position && (
              <ThemedText style={{ marginTop: 4 }}>{user.position}</ThemedText>
            )}
            {user.email && (
              <ThemedText style={{ marginTop: 8 }}>{user.email}</ThemedText>
            )}
            {user.phone && (
              <ThemedText style={{ marginTop: 8 }}>
                Tālrunis: {user.phone}
              </ThemedText>
            )}
          </View>
        )}
      </ThemedView>
    </>
  );
}
