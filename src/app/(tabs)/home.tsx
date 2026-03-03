import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Linking,
  Platform,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import { supabase } from "../../../lib/supabase";
import {
  ThemedCard,
  ThemedCardSection,
  ThemedText,
  ThemedView,
} from "../../components";
import { ThemedAvatar } from "../../components/ThemedAvatar";

type User = {
  id: string;
  name: string;
  email: string;
  phone: string;
  avatar: string;
  position: string;
};

type Absence = {
  id: string;
  user_id: string;
  category: string;
  category_slug?: string;
  date?: string;
  start_date?: string;
  end_date?: string;
  comments?: string | null;
  notes?: string | null;
  reachable?: boolean;
  is_reachable?: boolean;
  comment_text?: string;
  user?: User;
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
    color: "#ef4444",
    icon: "medical",
  },
  {
    id: "komandejums",
    label: "Komandējums",
    color: "#3b82f6",
    icon: "airplane",
  },
  { id: "macibas", label: "Mācības", color: "#8b5cf6", icon: "school" },
  { id: "islaiciga", label: "Īslaicīga", color: "#f59e0b", icon: "time" },
  {
    id: "atvalinajums",
    label: "Atvaļinājums",
    color: "#10b981",
    icon: "sunny",
  },
  { id: "cits", label: "Cits", color: "#6b7280", icon: "ellipsis-horizontal" },
];

const WEEKDAY_SHORT = ["Sv", "P", "O", "T", "C", "P", "S"];

export default function AbsencesScreen() {
  const [absences, setAbsences] = useState<Absence[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [weekOffset, setWeekOffset] = useState(0);

  const currentDate = new Date();
  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth();

  useFocusEffect(
    useCallback(() => {
      // Reset to current date when screen comes into focus
      setSelectedDate(new Date());
      // Fetch fresh absences data
      fetchAbsences();
    }, []),
  );

  async function fetchAbsences() {
    try {
      setLoading(true);
      const { data: absencesData, error: absencesError } = await supabase
        .from("absences")
        .select("*")
        .order("date", { ascending: true });

      if (absencesError) throw absencesError;

      console.log("Fetched absences:", absencesData);

      const uniqueUserIds = [
        ...new Set((absencesData || []).map((absence) => absence.user_id)),
      ].filter(Boolean);

      let usersById: Record<string, User> = {};

      if (uniqueUserIds.length > 0) {
        const { data: usersData, error: usersError } = await supabase
          .from("users")
          .select("id, name, email, phone, avatar, position")
          .in("id", uniqueUserIds);

        if (usersError) {
          console.error("Error fetching users:", usersError);
        } else {
          usersById = Object.fromEntries(
            (usersData || []).map((user) => [user.id, user]),
          );
        }
      }

      const absencesWithUsers: Absence[] = (absencesData || []).map(
        (absence: any) => {
          const mappedAbsence = {
            ...absence,
            category:
              absence.category ||
              absence.category_slug ||
              absence["category-slug"] ||
              "",
            is_reachable: absence.is_reachable ?? absence.reachable ?? false,
            comment_text: absence.comments ?? absence.notes ?? "",
            user: usersById[absence.user_id] || {
              id: absence.user_id,
              name: "Unknown User",
              email: "",
              phone: "",
              avatar: "",
              position: "",
            },
          };
          console.log("Mapped absence:", mappedAbsence);
          return mappedAbsence;
        },
      );

      console.log("Absences with users:", absencesWithUsers);
      setAbsences(absencesWithUsers);
    } catch (error) {
      console.error("Error fetching absences:", error);
    } finally {
      setLoading(false);
    }
  }

  function getCurrentWeekDays(weekOffset: number = 0): Date[] {
    const today = new Date();
    const currentDay = today.getDay();
    const startOfCurrentWeek = new Date(today);
    const daysFromMonday = (currentDay + 6) % 7;
    startOfCurrentWeek.setDate(today.getDate() - daysFromMonday);

    // Apply week offset
    const startOfTargetWeek = new Date(startOfCurrentWeek);
    startOfTargetWeek.setDate(startOfCurrentWeek.getDate() + weekOffset * 7);

    const days: Date[] = [];
    for (let i = 0; i < 7; i++) {
      const day = new Date(startOfTargetWeek);
      day.setDate(startOfTargetWeek.getDate() + i);
      days.push(day);
    }

    return days;
  }

  function hasAbsencesOnDate(date: Date): boolean {
    const dateStr = formatDateForDB(date);
    return absences.some((abs) => {
      // Check single date column
      if (abs.date === dateStr) return true;
      // Check date range (start_date to end_date)
      if (
        abs.start_date &&
        abs.end_date &&
        dateStr >= abs.start_date &&
        dateStr <= abs.end_date
      )
        return true;
      return false;
    });
  }

  function getAbsencesForSelectedDate(): Absence[] {
    const dateStr = formatDateForDB(selectedDate);
    return absences.filter((abs) => {
      // Check single date column
      if (abs.date === dateStr) return true;
      // Check date range (start_date to end_date)
      if (
        abs.start_date &&
        abs.end_date &&
        dateStr >= abs.start_date &&
        dateStr <= abs.end_date
      )
        return true;
      return false;
    });
  }

  function getAbsencesByCategory(category: string): Absence[] {
    return getAbsencesForSelectedDate().filter(
      (abs) => abs.category === category,
    );
  }

  function formatDateForDB(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  function getAvatarUrl(avatarPath?: string): string {
    if (!avatarPath) return "";

    let cleanPath = avatarPath;
    if (avatarPath.startsWith("avatars/")) {
      cleanPath = avatarPath.substring(8);
    }

    const { data } = supabase.storage.from("avatars").getPublicUrl(cleanPath);

    return data.publicUrl;
  }

  function handlePhoneCall(phoneNumber?: string) {
    if (!phoneNumber) return;

    if (Platform.OS === "web") {
      alert("Phone calling is not supported on web");
      return;
    }

    const cleanNumber = phoneNumber.replace(/[^0-9+]/g, "");
    const phoneUrl = `tel:${cleanNumber}`;

    Linking.openURL(phoneUrl).catch((err) => {
      console.error("Error making phone call:", err);
    });
  }

  function isSameDate(date1: Date, date2: Date): boolean {
    return (
      date1.getDate() === date2.getDate() &&
      date1.getMonth() === date2.getMonth() &&
      date1.getFullYear() === date2.getFullYear()
    );
  }

  const weekDays = getCurrentWeekDays(weekOffset);
  const monthInLatvian = new Date(currentYear, currentMonth)
    .toLocaleDateString("lv-LV", { month: "long" })
    .toLocaleLowerCase("lv-LV");
  const monthName = `${currentYear}. gada ${monthInLatvian}`;

  if (loading) {
    return (
      <ThemedView style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color="#007bff" />
        <ThemedText style={styles.loadingText}>Ielādē prombūtni...</ThemedText>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <ThemedText style={styles.title}>Prombūtne</ThemedText>
        <ThemedText style={styles.subtitle}>{monthName}</ThemedText>
      </View>

      {/* Week Navigation */}
      <View style={styles.weekNavigation}>
        <TouchableOpacity
          style={styles.arrowButton}
          onPress={() => setWeekOffset(weekOffset - 1)}
        >
          <Ionicons name="chevron-back" size={24} color="#007bff" />
        </TouchableOpacity>

        {/* Horizontal Date Scroll - Sticky */}
        <View style={styles.dateScroll}>
          <View style={styles.weekContainer}>
            {weekDays.map((day, index) => {
              const isSelected = isSameDate(day, selectedDate);
              const hasAbsences = hasAbsencesOnDate(day);
              const dayOfWeek = WEEKDAY_SHORT[day.getDay()];

              return (
                <View key={index} style={styles.dateCardWrapper}>
                  <TouchableOpacity
                    style={[
                      styles.dateCard,
                      isSelected && styles.dateCardSelected,
                    ]}
                    onPress={() => setSelectedDate(day)}
                  >
                    <ThemedText
                      style={[
                        styles.dayOfWeek,
                        isSelected && styles.dayOfWeekSelected,
                      ]}
                    >
                      {dayOfWeek}
                    </ThemedText>
                    <ThemedText
                      style={[
                        styles.dateNumber,
                        isSelected && styles.dateNumberSelected,
                      ]}
                    >
                      {day.getDate()}
                    </ThemedText>
                  </TouchableOpacity>
                  {(hasAbsences || isSelected) && (
                    <View style={styles.indicatorContainer}>
                      {hasAbsences && !isSelected && (
                        <View style={styles.absenceDot} />
                      )}
                      {isSelected && <View style={styles.selectedDot} />}
                    </View>
                  )}
                </View>
              );
            })}
          </View>
        </View>

        <TouchableOpacity
          style={styles.arrowButton}
          onPress={() => setWeekOffset(weekOffset + 1)}
        >
          <Ionicons name="chevron-forward" size={24} color="#007bff" />
        </TouchableOpacity>
      </View>

      {/* Scrollable Content */}
      <ScrollView style={styles.contentScroll}>
        {/* Absences by Category */}
        {CATEGORIES.map((category) => {
          const categoryAbsences = getAbsencesByCategory(category.id);

          if (categoryAbsences.length === 0) return null;

          return (
            <View key={category.id} style={styles.categorySection}>
              <View style={styles.categoryHeader}>
                <Ionicons
                  name={category.icon}
                  size={19}
                  color={category.color}
                />
                <ThemedText
                  style={[styles.categoryTitle, { color: category.color }]}
                >
                  {category.label}
                </ThemedText>
                <View
                  style={[
                    styles.categoryBadge,
                    { backgroundColor: category.color },
                  ]}
                >
                  <ThemedText style={styles.categoryBadgeText}>
                    {categoryAbsences.length}
                  </ThemedText>
                </View>
              </View>

              <ThemedCardSection>
                {categoryAbsences.map((absence, index) => {
                  const user = absence.user!;

                  const avatarUrl = getAvatarUrl(user.avatar);
                  const isLastInSection = index === categoryAbsences.length - 1;

                  return (
                    <ThemedCard
                      key={absence.id}
                      style={[
                        styles.userCard,
                        !isLastInSection && styles.userCardGap,
                      ]}
                    >
                      <View style={styles.userMainRow}>
                        <ThemedAvatar
                          avatarUrl={avatarUrl || undefined}
                          size={48}
                        />
                        <View style={styles.userTextWrap}>
                          <ThemedText style={styles.userName}>
                            {user.name}
                          </ThemedText>
                          <ThemedText style={styles.userSubtitle}>
                            {user.position}
                          </ThemedText>
                          {!!absence.comment_text && (
                            <ThemedText style={styles.userDescription}>
                              {absence.comment_text}
                            </ThemedText>
                          )}
                        </View>
                        {absence.is_reachable && (
                          <TouchableOpacity
                            style={styles.phoneButton}
                            onPress={() => handlePhoneCall(user.phone)}
                          >
                            <Ionicons name="call" size={20} color="#007bff" />
                          </TouchableOpacity>
                        )}
                      </View>
                    </ThemedCard>
                  );
                })}
              </ThemedCardSection>
            </View>
          );
        })}

        {/* Debug: Show uncategorized absences */}
        {getAbsencesForSelectedDate().filter(
          (abs) =>
            !abs.category || !CATEGORIES.find((c) => c.id === abs.category),
        ).length > 0 && (
          <View style={styles.categorySection}>
            <View style={styles.categoryHeader}>
              <ThemedText style={[styles.categoryTitle, { color: "#999" }]}>
                ⚠️ Uncategorized (
                {
                  getAbsencesForSelectedDate().filter(
                    (abs) =>
                      !abs.category ||
                      !CATEGORIES.find((c) => c.id === abs.category),
                  ).length
                }
                )
              </ThemedText>
            </View>
            <ThemedCardSection>
              {getAbsencesForSelectedDate()
                .filter(
                  (abs) =>
                    !abs.category ||
                    !CATEGORIES.find((c) => c.id === abs.category),
                )
                .map((absence, index) => {
                  const user = absence.user!;
                  const avatarUrl = getAvatarUrl(user.avatar);
                  const uncategorizedAbsences =
                    getAbsencesForSelectedDate().filter(
                      (abs) =>
                        !abs.category ||
                        !CATEGORIES.find((c) => c.id === abs.category),
                    );
                  return (
                    <ThemedCard
                      key={absence.id}
                      style={[
                        styles.userCard,
                        index !== uncategorizedAbsences.length - 1 &&
                          styles.userCardGap,
                      ]}
                    >
                      <View style={styles.userMainRow}>
                        <ThemedAvatar
                          avatarUrl={avatarUrl || undefined}
                          size={48}
                        />
                        <View style={styles.userTextWrap}>
                          <ThemedText style={styles.userName}>
                            {user.name}
                          </ThemedText>
                          <ThemedText style={styles.userSubtitle}>
                            {user.position}
                          </ThemedText>
                          <ThemedText style={styles.userDescription}>
                            {`Category: ${absence.category || "EMPTY"} | ${absence.comment_text || "No comment"}`}
                          </ThemedText>
                        </View>
                      </View>
                    </ThemedCard>
                  );
                })}
            </ThemedCardSection>
          </View>
        )}

        {/* Empty State */}
        {getAbsencesForSelectedDate().length === 0 && (
          <View style={styles.emptyState}>
            <Ionicons name="calendar-outline" size={64} color="#ccc" />
            <ThemedText style={styles.emptyStateText}>
              Šodien nav pieteiktas prombūtnes
            </ThemedText>
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centered: {
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: "#666",
  },
  header: {
    padding: 20,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: "#666",
  },
  weekNavigation: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",

    paddingVertical: 10,
    paddingHorizontal: 8,
  },
  arrowButton: {
    padding: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  dateScroll: {
    backgroundColor: "#fff",
    paddingVertical: 12,
    flex: 1,
  },
  contentScroll: {
    flex: 1,
  },
  weekContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 2,
    gap: 6,
  },
  dateCard: {
    paddingVertical: 4,
    paddingHorizontal: 2,
    borderRadius: 50,
    borderWidth: 2,
    borderColor: "#e0e0e0",
    alignItems: "center",
    backgroundColor: "#fff",
    justifyContent: "center",
    minWidth: 40,
    minHeight: 50,
  },
  dateCardSelected: {
    backgroundColor: "#007bff",
    borderColor: "#007bff",
  },
  dateCardWrapper: {
    flex: 1,
    marginHorizontal: 0,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  dayOfWeek: {
    fontSize: 11,
    color: "#666",
    fontWeight: "500",
    marginBottom: 1,
  },
  dayOfWeekSelected: {
    color: "#fff",
  },
  dateNumber: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 1,
  },
  dateNumberSelected: {
    color: "#fff",
  },
  indicatorContainer: {
    position: "absolute",
    bottom: -12,
    alignSelf: "center",
    flexDirection: "row",
    gap: 3,
    justifyContent: "center",
    alignItems: "center",
    height: 8,
  },
  absenceDot: {
    width: 5,
    height: 5,
    borderRadius: 2,
    backgroundColor: "#007bff",
  },
  selectedDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: "#007bff",
  },
  categorySection: {
    // marginTop: 6,
    backgroundColor: "#fff",
    padding: 16,
    // borderTopWidth: 1,
    // borderBottomWidth: 1,
    // borderColor: '#e0e0e0',
  },
  categoryHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
    gap: 8,
    paddingLeft: 10,
  },
  categoryTitle: {
    fontSize: 17,
    fontWeight: "600",
  },
  categoryBadge: {
    backgroundColor: "#f0f0f0",
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: 13,
    marginLeft: 4,
  },
  categoryBadgeText: {
    fontSize: 13,
    color: "#fff",
    fontWeight: "600",
  },
  phoneButton: {
    padding: 8,
    marginLeft: 8,
    backgroundColor: "#e3f2fd",
    borderRadius: 20,
  },
  userCard: {
    paddingVertical: 12,
    paddingHorizontal: 12,
  },
  userCardGap: {
    marginBottom: 8,
  },
  userMainRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  userTextWrap: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: "700",
  },
  userSubtitle: {
    fontSize: 13,
    color: "#666",
  },
  userDescription: {
    fontSize: 13,
    color: "#777",
    marginTop: 2,
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
  },
  emptyStateText: {
    fontSize: 16,
    color: "#999",
    marginTop: 16,
  },
});
