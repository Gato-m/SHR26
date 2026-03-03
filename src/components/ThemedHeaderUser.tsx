import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@shopify/restyle";
import React, { useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";
import { supabase } from "../../lib/supabase";
import { Theme } from "../theme/theme";
import { ThemedText } from "./ThemedText";

const FALLBACK_NAME = "Jānis Krūmiņš";

type UserRow = {
  name?: string | null;
  surname?: string | null;
};

export function ThemedHeaderUser() {
  const theme = useTheme<Theme>();
  const [displayName, setDisplayName] = useState(FALLBACK_NAME);

  useEffect(() => {
    let isMounted = true;

    async function loadUserName() {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          if (isMounted) setDisplayName(FALLBACK_NAME);
          return;
        }

        const { data, error } = await supabase
          .from("users")
          .select("name, surname")
          .eq("id", user.id)
          .maybeSingle<UserRow>();

        if (error || !data) {
          if (isMounted) setDisplayName(FALLBACK_NAME);
          return;
        }

        const name = (data.name || "").trim();
        const surname = (data.surname || "").trim();
        const fullName = `${name} ${surname}`.trim();

        if (isMounted) {
          setDisplayName(fullName || FALLBACK_NAME);
        }
      } catch (error) {
        if (isMounted) {
          setDisplayName(FALLBACK_NAME);
        }
      }
    }

    loadUserName();

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <View style={styles.row}>
      <Ionicons
        name="person-circle-outline"
        size={20}
        color={theme.colors.textSecondary}
      />
      <ThemedText style={[styles.name, { color: theme.colors.textSecondary }]}>
        {displayName}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  name: {
    fontSize: 14,
    fontWeight: "500",
  },
});
