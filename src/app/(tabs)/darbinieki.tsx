import { useTheme } from "@shopify/restyle";
import React from "react";
import { TextInput } from "react-native";
import Icon from "react-native-vector-icons/Ionicons";
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
import { ScrollView, View } from "react-native";
import { supabase } from "../../../lib/supabase";
import { ThemedAvatar } from "../../components/ThemedAvatar";
import { ThemedPhoneIcon } from "../../components/ThemedPhoneIcon";
// Helper to get public URL for Supabase storage
function getAvatarUrl(path: string) {
  const { data } = supabase.storage.from("avatars").getPublicUrl(path);
  return data?.publicUrl || "";
}

export default function DemoScreen() {
  const [search, setSearch] = useState("");
  // Latvian alphabet order
  const latvianAlphabet = [
    "A",
    "Ā",
    "B",
    "C",
    "Č",
    "D",
    "E",
    "Ē",
    "F",
    "G",
    "Ģ",
    "H",
    "I",
    "Ī",
    "J",
    "K",
    "Ķ",
    "L",
    "Ļ",
    "M",
    "N",
    "Ņ",
    "O",
    "P",
    "R",
    "S",
    "Š",
    "T",
    "U",
    "Ū",
    "V",
    "Z",
    "Ž",
  ];

  // Helper to get surname (second word in name)
  function getSurname(name: string) {
    const parts = name.trim().split(" ");
    return parts.length > 1 ? parts[1] : parts[0];
  }

  // Group users by surname initial
  function groupUsersBySurname(users: any[]) {
    const arr = Array.isArray(users) ? users : [];
    const groups: { [key: string]: any[] } = {};
    arr.forEach((user) => {
      const surname = getSurname(user.name);
      if (search && !surname.toLowerCase().startsWith(search.toLowerCase()))
        return;
      const initial = surname[0]?.toUpperCase() || "";
      if (!groups[initial]) groups[initial] = [];
      groups[initial].push(user);
    });
    // Sort groups by Latvian alphabet
    return latvianAlphabet
      .filter((letter) => groups[letter])
      .map((letter) => ({ letter, users: groups[letter] }));
  }

  const [users, setUsers] = useState<
    {
      id: number;
      name: string;
      avatar: string;
      position: string;
      email: string;
    }[]
  >([]);
  const groupedUsers = groupUsersBySurname(users ?? []);
  const { mode, toggle } = useThemeMode();
  const theme = useTheme<Theme>();
  const colorKeys = Object.keys(theme.colors) as (keyof Theme["colors"])[];

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
    <ThemedView style={{ flex: 1, padding: 20 }}>
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
      {/* SEARCH INPUT */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          marginTop: 16,
          marginBottom: 8,
          borderRadius: 8,
          borderWidth: 1,
          borderColor: theme.colors.gray400,
        }}
      >
        <Icon
          name="search"
          size={20}
          color={theme.colors.textSecondary}
          style={{ position: "absolute", left: 8, zIndex: 1 }}
        />
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="Meklēt pēc uzvārda"
          placeholderTextColor={theme.colors.gray400}
          style={{
            flex: 1,
            paddingLeft: 32,
            paddingVertical: 8,
            borderRadius: 8,
            fontSize: 16,
            color: theme.colors.text,
            backgroundColor: theme.colors.background,
          }}
        />
      </View>
      <ScrollView>
        {groupedUsers.map((group) => (
          <React.Fragment key={group.letter}>
            <ThemedText
              type="subtitle"
              style={{
                marginTop: 8,
                marginBottom: 8,
                fontWeight: "bold",
                fontSize: 16,
                marginLeft: 26,
              }}
            >
              {group.letter}
            </ThemedText>
            {group.users.map((item) => (
              <ThemedCard
                key={item.id}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  marginBottom: 8,
                  padding: 12,
                }}
              >
                {/* Avatar on the left */}
                <ThemedAvatar
                  avatarUrl={
                    item.avatar ? getAvatarUrl(item.avatar) : undefined
                  }
                  size={48}
                  name={item.name}
                />
                <View style={{ flex: 1 }}>
                  <ThemedText
                    type="body"
                    style={{ fontWeight: "bold", fontSize: 16 }}
                  >
                    {item.name}
                  </ThemedText>
                  <ThemedText
                    type="body"
                    style={{ color: theme.colors.textSecondary, fontSize: 13 }}
                  >
                    {item.position}
                  </ThemedText>
                  <ThemedText
                    type="body"
                    style={{ color: theme.colors.textSecondary, fontSize: 13 }}
                  >
                    {item.email}
                  </ThemedText>
                </View>
                <ThemedPhoneIcon />
              </ThemedCard>
            ))}
          </React.Fragment>
        ))}
      </ScrollView>
    </ThemedView>
  );
}
// Custom avatar image component to handle fallback and errors
