import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@shopify/restyle";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Pressable,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import { supabase } from "../../../lib/supabase";
import { ThemedText, ThemedView } from "../../components";
import { ThemedAvatar } from "../../components/ThemedAvatar";
import { useThemeMode } from "../../providers/ThemeProvider";
import { categoriesColor } from "../../theme";
import type { Theme } from "../../theme/theme";

type User = {
  id: string;
  name: string;
  avatar: string | null;
  position: string | null;
  email: string | null;
  phone?: string | null;
};

type AbsenceRecord = {
  id: string;
  user_id: string;
  category_slug?: string | null;
  date?: string | null;
  start_date?: string | null;
  end_date?: string | null;
};

type Category = {
  id: string;
  label: string;
  color: string;
  icon: keyof typeof Ionicons.glyphMap;
};

const CATEGORIES: Category[] = [
  {
    id: "darbnespeja",
    label: "Darbnespēja",
    color: categoriesColor.slimiba,
    icon: "medical",
  },
  {
    id: "komandejums",
    label: "Komandējums",
    color: categoriesColor.komandejums,
    icon: "airplane",
  },
  {
    id: "macibas",
    label: "Mācības",
    color: categoriesColor.maaciibas,
    icon: "school",
  },
  {
    id: "islaiciga",
    label: "Īslaicīga",
    color: categoriesColor.iislaiciigs,
    icon: "time",
  },
  {
    id: "atvalinajums",
    label: "Atvaļinājums",
    color: categoriesColor.atvalinajums,
    icon: "sunny",
  },
  {
    id: "cits",
    label: "Cits",
    color: categoriesColor.cits,
    icon: "ellipsis-horizontal",
  },
];

// Helper to get public URL for Supabase storage (same bucket as in darbinieki)
function getAvatarUrl(path: string) {
  const { data } = supabase.storage.from("avatars").getPublicUrl(path);
  return data?.publicUrl || "";
}

export default function ProfileModal() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const theme = useTheme<Theme>();
  const { mode } = useThemeMode();
  const [user, setUser] = useState<User | null>(null);
  const [absences, setAbsences] = useState<AbsenceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedMonth, setSelectedMonth] = useState(
    new Date(new Date().getFullYear(), new Date().getMonth(), 1),
  );
  const barFillProgress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    async function fetchUser() {
      const userId = Array.isArray(id) ? id[0] : id;

      if (!userId) {
        setError("Nav norādīts lietotāja ID.");
        setLoading(false);
        return;
      }

      try {
        const { data, error: dbError } = await supabase
          .from("users")
          .select("id, name, avatar, position, email, phone")
          .eq("id", userId)
          .single();

        const { data: absencesData, error: absencesError } = await supabase
          .from("absences")
          .select("id, user_id, category_slug, date, start_date, end_date")
          .eq("user_id", userId);

        if (dbError) {
          setError(dbError.message);
        } else if (absencesError) {
          setError(absencesError.message);
        } else {
          setUser(data as User);
          setAbsences((absencesData || []) as AbsenceRecord[]);
        }
      } catch (err) {
        setError("Neizdevās ielādēt profilu.");
      } finally {
        setLoading(false);
      }
    }

    fetchUser();
  }, [id]);

  function formatDateForDB(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  function parseDateKey(dateKey: string): Date {
    const [year, month, day] = dateKey.split("-").map(Number);
    return new Date(year, month - 1, day);
  }

  function normalizeCategory(absence: AbsenceRecord): string {
    return absence.category_slug || "";
  }

  const monthLabel = useMemo(() => {
    const monthName = selectedMonth
      .toLocaleDateString("lv-LV", { month: "long" })
      .toLocaleLowerCase("lv-LV");
    return `${selectedMonth.getFullYear()}. gada ${monthName}`;
  }, [selectedMonth]);

  const categoryStats = useMemo(() => {
    const monthStart = new Date(
      selectedMonth.getFullYear(),
      selectedMonth.getMonth(),
      1,
    );
    const monthEnd = new Date(
      selectedMonth.getFullYear(),
      selectedMonth.getMonth() + 1,
      0,
    );
    const monthStartKey = formatDateForDB(monthStart);
    const monthEndKey = formatDateForDB(monthEnd);
    const daysInMonth = monthEnd.getDate();

    const datesByCategory = Object.fromEntries(
      CATEGORIES.map((category) => [category.id, new Set<string>()]),
    ) as Record<string, Set<string>>;

    for (const absence of absences) {
      const categoryId = normalizeCategory(absence);
      if (!datesByCategory[categoryId]) {
        continue;
      }

      if (absence.date) {
        if (absence.date >= monthStartKey && absence.date <= monthEndKey) {
          datesByCategory[categoryId].add(absence.date);
        }
        continue;
      }

      if (absence.start_date && absence.end_date) {
        const rangeStart =
          absence.start_date > monthStartKey
            ? absence.start_date
            : monthStartKey;
        const rangeEnd =
          absence.end_date < monthEndKey ? absence.end_date : monthEndKey;

        if (rangeStart > rangeEnd) {
          continue;
        }

        const cursor = parseDateKey(rangeStart);
        const endDate = parseDateKey(rangeEnd);

        while (cursor <= endDate) {
          datesByCategory[categoryId].add(formatDateForDB(cursor));
          cursor.setDate(cursor.getDate() + 1);
        }
      }
    }

    return CATEGORIES.map((category) => {
      const days = datesByCategory[category.id].size;
      const percentage = daysInMonth > 0 ? (days / daysInMonth) * 100 : 0;

      return {
        ...category,
        days,
        percentage,
      };
    });
  }, [absences, selectedMonth]);

  useEffect(() => {
    if (loading || error || !user) {
      return;
    }

    barFillProgress.setValue(0);
    Animated.spring(barFillProgress, {
      toValue: 1,
      tension: 170,
      friction: 7,
      useNativeDriver: false,
    }).start();
  }, [loading, error, user, selectedMonth, absences, barFillProgress]);

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

      <ThemedView style={styles.container}>
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
            <ThemedText style={{}}>{error}</ThemedText>
          </View>
        )}

        {!loading && !error && user && (
          <ScrollView contentContainerStyle={styles.scrollContent}>
            <View style={styles.profileHeader}>
              <ThemedAvatar
                avatarUrl={user.avatar ? getAvatarUrl(user.avatar) : undefined}
                size={80}
              />
              <ThemedText style={styles.userName}>{user.name}</ThemedText>
              {user.position && (
                <ThemedText
                  style={[
                    styles.userMeta,
                    { color: theme.colors.textSecondary },
                  ]}
                >
                  {user.position}
                </ThemedText>
              )}
              {user.email && (
                <ThemedText
                  style={[
                    styles.userMeta,
                    { color: theme.colors.textSecondary },
                  ]}
                >
                  {user.email}
                </ThemedText>
              )}
              {user.phone && (
                <ThemedText
                  style={[
                    styles.userMeta,
                    { color: theme.colors.textSecondary },
                  ]}
                >
                  Tālrunis: {user.phone}
                </ThemedText>
              )}
            </View>

            <View style={styles.statsSection}>
              <ThemedText
                style={[
                  styles.statsTitle,
                  { color: theme.colors.textSecondary },
                ]}
              >
                Prombūtnes statistika
              </ThemedText>

              <View style={styles.monthRow}>
                <TouchableOpacity
                  style={styles.monthArrow}
                  onPress={() =>
                    setSelectedMonth(
                      (prev) =>
                        new Date(prev.getFullYear(), prev.getMonth() - 1, 1),
                    )
                  }
                >
                  <Ionicons
                    name="chevron-back"
                    size={24}
                    color={theme.colors.accent}
                  />
                </TouchableOpacity>

                <ThemedText
                  style={[
                    styles.monthText,
                    { color: theme.colors.textSecondary },
                  ]}
                >
                  {monthLabel}
                </ThemedText>

                <TouchableOpacity
                  style={styles.monthArrow}
                  onPress={() =>
                    setSelectedMonth(
                      (prev) =>
                        new Date(prev.getFullYear(), prev.getMonth() + 1, 1),
                    )
                  }
                >
                  <Ionicons
                    name="chevron-forward"
                    size={24}
                    color={theme.colors.accent}
                  />
                </TouchableOpacity>
              </View>

              {categoryStats.map((category) => (
                <View key={category.id} style={styles.categoryStatBlock}>
                  <View style={styles.categoryHeader}>
                    <Ionicons
                      name={category.icon}
                      size={18}
                      color={category.color}
                    />
                    <ThemedText style={styles.categoryTitle}>
                      {category.label}
                    </ThemedText>
                    <View
                      style={[
                        styles.categoryBadge,
                        { backgroundColor: category.color },
                      ]}
                    >
                      <ThemedText style={styles.categoryBadgeText}>
                        {category.days}
                      </ThemedText>
                    </View>
                  </View>

                  <View
                    style={[
                      styles.barTrack,
                      {
                        backgroundColor:
                          mode === "dark"
                            ? theme.colors.primary
                            : theme.colors.primaryDark,
                        borderColor:
                          mode === "dark"
                            ? theme.colors.primary
                            : theme.colors.gray200,
                      },
                    ]}
                  >
                    <Animated.View
                      style={[
                        styles.barFill,
                        {
                          backgroundColor: category.color,
                          width: barFillProgress.interpolate({
                            inputRange: [0, 1],
                            outputRange: ["0%", `${category.percentage}%`],
                          }),
                        },
                      ]}
                    />
                  </View>
                </View>
              ))}
            </View>
          </ScrollView>
        )}
      </ThemedView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  scrollContent: {
    paddingBottom: 28,
  },
  profileHeader: {
    alignItems: "center",
    marginBottom: 24,
  },
  userName: {
    fontSize: 20,
    fontWeight: "700",
    marginTop: 16,
  },
  userMeta: {
    marginTop: 2,
    fontSize: 15,
  },
  statsSection: {
    marginTop: 4,
  },
  statsTitle: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 0,
    textAlign: "center",
  },
  monthRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
    marginTop: 0,
  },
  monthArrow: {
    padding: 6,
  },
  monthText: {
    fontSize: 16,
    fontWeight: "600",
  },
  categoryStatBlock: {
    marginBottom: 12,
  },
  categoryHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 6,
    paddingLeft: 6,
  },
  categoryTitle: {
    marginLeft: 2,
    flex: 1,
    fontSize: 15,
    fontWeight: "600",
    textAlign: "left",
  },
  categoryBadge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 11,
    marginLeft: "auto",
    marginRight: 6,
  },
  categoryBadgeText: {
    fontSize: 12,
    color: "#fff",
    fontWeight: "600",
  },
  barTrack: {
    height: 20,
    borderRadius: 999,
    borderWidth: 1,
    overflow: "hidden",
  },
  barFill: {
    height: "100%",
    borderRadius: 999,
  },
});
