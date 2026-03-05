import { FontAwesome6, Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { useTheme } from "@shopify/restyle";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Calendar, DateData, LocaleConfig } from "react-native-calendars";
import { supabase } from "../../../lib/supabase";
import {
  ThemedCardSection,
  ThemedHeaderUser,
  ThemedInput,
  ThemedSpacer,
  ThemedText,
  ThemedView,
} from "../../components";
import { categoriesColor, Theme } from "../../theme";

type User = {
  id: string;
  name: string;
};

type Category = {
  id: string;
  label: string;
  color: string;
  icon: keyof typeof Ionicons.glyphMap;
};

type DateSelection = {
  categoryId: string;
  dates: string[];
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

let hasOpenedAddDataTab = false;
let isInfoPanelDismissedInSession = true;

LocaleConfig.locales.lv = {
  monthNames: [
    "janvāris",
    "februāris",
    "marts",
    "aprīlis",
    "maijs",
    "jūnijs",
    "jūlijs",
    "augusts",
    "septembris",
    "oktobris",
    "novembris",
    "decembris",
  ],
  monthNamesShort: [
    "jan",
    "feb",
    "mar",
    "apr",
    "mai",
    "jūn",
    "jūl",
    "aug",
    "sep",
    "okt",
    "nov",
    "dec",
  ],
  dayNames: [
    "svētdiena",
    "pirmdiena",
    "otrdiena",
    "trešdiena",
    "ceturtdiena",
    "piektdiena",
    "sestdiena",
  ],
  dayNamesShort: ["Sv", "P", "O", "T", "C", "Pk", "S"],
  today: "Šodien",
};
LocaleConfig.defaultLocale = "lv";

export default function AddDataScreen() {
  const theme = useTheme<Theme>();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingUsers, setLoadingUsers] = useState(true);

  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [reachableDateKeys, setReachableDateKeys] = useState<string[]>([]);
  const [selections, setSelections] = useState<DateSelection[]>([]);
  const [showInfoPanel, setShowInfoPanel] = useState(
    !isInfoPanelDismissedInSession,
  );
  const [isInfoPanelMounted, setIsInfoPanelMounted] = useState(
    !isInfoPanelDismissedInSession,
  );
  const [isRangeSelecting, setIsRangeSelecting] = useState(false);
  const [rangeStartDate, setRangeStartDate] = useState<Date | null>(null);
  const [activeDateKey, setActiveDateKey] = useState("");
  const [commentsByDateKey, setCommentsByDateKey] = useState<{
    [dateKey: string]: string;
  }>({});
  const [showCommentInput, setShowCommentInput] = useState(false);
  const [isCommentInputMounted, setIsCommentInputMounted] = useState(false);
  const [isRangeHintMounted, setIsRangeHintMounted] = useState(false);
  const [currentCommentText, setCurrentCommentText] = useState("");

  const commentInputOpacity = useRef(new Animated.Value(0)).current;
  const commentInputHeight = useRef(new Animated.Value(0)).current;
  const rangeHintProgress = useRef(new Animated.Value(0)).current;
  const infoPanelProgress = useRef(
    new Animated.Value(!isInfoPanelDismissedInSession ? 1 : 0),
  ).current;
  const rangeCategoryIdRef = useRef("");
  const lastSelectedDateTapRef = useRef<{
    dateKey: string;
    timestamp: number;
  } | null>(null);
  const pendingSelectedDateTapRef = useRef<ReturnType<
    typeof setTimeout
  > | null>(null);

  useEffect(() => {
    if (showCommentInput) {
      // Reset to start values before mounting
      commentInputOpacity.setValue(0);
      commentInputHeight.setValue(0);
      setIsCommentInputMounted(true);

      // Small delay to ensure component is mounted before animating
      const timer = setTimeout(() => {
        Animated.parallel([
          Animated.timing(commentInputOpacity, {
            toValue: 1,
            duration: 300,
            useNativeDriver: false,
          }),
          Animated.timing(commentInputHeight, {
            toValue: 1,
            duration: 300,
            useNativeDriver: false,
          }),
        ]).start();
      }, 10);

      return () => clearTimeout(timer);
    } else {
      Animated.parallel([
        Animated.timing(commentInputOpacity, {
          toValue: 0,
          duration: 250,
          useNativeDriver: false,
        }),
        Animated.timing(commentInputHeight, {
          toValue: 0,
          duration: 250,
          useNativeDriver: false,
        }),
      ]).start(() => {
        setIsCommentInputMounted(false);
      });
    }
  }, [showCommentInput, commentInputOpacity, commentInputHeight]);

  const shouldShowRangeHint = isRangeSelecting && Boolean(rangeStartDate);

  useEffect(() => {
    if (shouldShowRangeHint) {
      setIsRangeHintMounted(true);
      Animated.timing(rangeHintProgress, {
        toValue: 1,
        duration: 220,
        useNativeDriver: false,
      }).start();
      return;
    }

    Animated.timing(rangeHintProgress, {
      toValue: 0,
      duration: 200,
      useNativeDriver: false,
    }).start(({ finished }) => {
      if (finished) {
        setIsRangeHintMounted(false);
      }
    });
  }, [shouldShowRangeHint, rangeHintProgress]);

  const currentDate = new Date();

  useFocusEffect(
    useCallback(() => {
      if (!hasOpenedAddDataTab) {
        hasOpenedAddDataTab = true;

        if (!isInfoPanelDismissedInSession) {
          setShowInfoPanel(true);
          setIsInfoPanelMounted(true);
          infoPanelProgress.setValue(1);
        }
      }

      return undefined;
    }, []),
  );

  useEffect(() => {
    fetchUsers();
  }, []);

  useEffect(() => {
    return () => {
      if (pendingSelectedDateTapRef.current) {
        clearTimeout(pendingSelectedDateTapRef.current);
      }
    };
  }, []);

  function getSurname(fullName: string): string {
    const parts = fullName.trim().split(/\s+/);
    return parts[parts.length - 1] || fullName;
  }

  async function fetchUsers() {
    try {
      setLoadingUsers(true);
      const { data, error } = await supabase.from("users").select("id, name");

      if (error) throw error;

      // Sort by surname in Latvian alphabet order
      const sortedUsers = (data || []).sort((a: User, b: User) => {
        const surnameA = getSurname(a.name);
        const surnameB = getSurname(b.name);
        return surnameA.localeCompare(surnameB, "lv-LV");
      });

      setUsers(sortedUsers);
    } catch (error) {
      console.error("Error fetching users:", error);
      Alert.alert("Error", "Failed to load users");
    } finally {
      setLoadingUsers(false);
    }
  }

  function formatDateForDB(date: Date | null): string {
    if (!date) return "";
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  function parseDateKey(dateKey: string): Date {
    const [year, month, day] = dateKey.split("-").map(Number);
    return new Date(year, month - 1, day);
  }

  function isWeekendDateKey(dateKey: string): boolean {
    const day = parseDateKey(dateKey).getDay();
    return day === 0 || day === 6;
  }

  function isSameDate(a: Date, b: Date): boolean {
    return (
      a.getFullYear() === b.getFullYear() &&
      a.getMonth() === b.getMonth() &&
      a.getDate() === b.getDate()
    );
  }

  function getCategoryColor(categoryId: string): string {
    const category = CATEGORIES.find((item) => item.id === categoryId);
    return category?.color ?? categoriesColor.cits;
  }

  function getSelectionForCategory(
    categoryId: string,
  ): DateSelection | undefined {
    return selections.find((selection) => selection.categoryId === categoryId);
  }

  function handleCategorySelect(categoryId: string) {
    if (selectedCategory === categoryId) {
      if (!getSelectionForCategory(categoryId)) {
        setSelectedCategory("");
      }
      return;
    }

    setSelectedCategory(categoryId);
  }

  function handleDateSelect(date: Date) {
    if (!selectedCategory) {
      Alert.alert("Info", "Izvēlies prombūtnes kategoriju");
      return;
    }

    setSelections((prev) => {
      const dateKey = formatDateForDB(date);
      const existing = prev.find(
        (selection) => selection.categoryId === selectedCategory,
      );
      const isAlreadySelected = existing?.dates.includes(dateKey) ?? false;
      let nextSelections = prev;

      if (isAlreadySelected) {
        nextSelections = prev
          .map((selection) =>
            selection.categoryId === selectedCategory
              ? {
                  ...selection,
                  dates: selection.dates.filter((item) => item !== dateKey),
                }
              : selection,
          )
          .filter((selection) => selection.dates.length > 0);
      } else {
        nextSelections = prev
          .map((selection) =>
            selection.categoryId === selectedCategory
              ? selection
              : {
                  ...selection,
                  dates: selection.dates.filter((item) => item !== dateKey),
                },
          )
          .filter((selection) => selection.dates.length > 0);

        const updated = nextSelections.find(
          (selection) => selection.categoryId === selectedCategory,
        );

        if (updated) {
          nextSelections = nextSelections.map((selection) =>
            selection.categoryId === selectedCategory
              ? { ...selection, dates: [...selection.dates, dateKey] }
              : selection,
          );
        } else {
          nextSelections = [
            ...nextSelections,
            { categoryId: selectedCategory, dates: [dateKey] },
          ];
        }
      }

      if (
        nextSelections.length === 0 ||
        !nextSelections.some(
          (selection) => selection.categoryId === selectedCategory,
        )
      ) {
        setSelectedCategory("");
      }

      return nextSelections;
    });
  }

  function ensureDateSelected(date: Date, categoryId = selectedCategory) {
    if (!categoryId) {
      Alert.alert("Info", "Izvēlies prombūtnes kategoriju");
      return;
    }

    setSelections((prev) => {
      const dateKey = formatDateForDB(date);
      const nextSelections = prev
        .map((selection) =>
          selection.categoryId === categoryId
            ? selection
            : {
                ...selection,
                dates: selection.dates.filter((item) => item !== dateKey),
              },
        )
        .filter((selection) => selection.dates.length > 0);

      const existing = nextSelections.find(
        (selection) => selection.categoryId === categoryId,
      );

      if (existing) {
        if (existing.dates.includes(dateKey)) {
          return nextSelections;
        }

        return nextSelections.map((selection) =>
          selection.categoryId === categoryId
            ? { ...selection, dates: [...selection.dates, dateKey] }
            : selection,
        );
      }

      return [...nextSelections, { categoryId, dates: [dateKey] }];
    });
  }

  function getDateRangeKeys(start: Date, end: Date) {
    const startDate = new Date(start);
    const endDate = new Date(end);
    const [from, to] =
      startDate <= endDate ? [startDate, endDate] : [endDate, startDate];
    const keys: string[] = [];
    const cursor = new Date(from);
    while (cursor <= to) {
      keys.push(formatDateForDB(cursor));
      cursor.setDate(cursor.getDate() + 1);
    }
    return keys;
  }

  function applyRangeSelection(
    start: Date,
    end: Date,
    categoryId = selectedCategory,
  ) {
    if (!categoryId) {
      Alert.alert("Info", "Izvēlies prombūtnes kategoriju");
      return;
    }

    const rangeKeys = getDateRangeKeys(start, end);

    setSelections((prev) => {
      const filtered = prev
        .map((selection) =>
          selection.categoryId === categoryId
            ? selection
            : {
                ...selection,
                dates: selection.dates.filter(
                  (item) => !rangeKeys.includes(item),
                ),
              },
        )
        .filter((selection) => selection.dates.length > 0);

      const existing = filtered.find(
        (selection) => selection.categoryId === categoryId,
      );

      if (existing) {
        const merged = Array.from(new Set([...existing.dates, ...rangeKeys]));
        return filtered.map((selection) =>
          selection.categoryId === categoryId
            ? { ...selection, dates: merged }
            : selection,
        );
      }

      return [...filtered, { categoryId, dates: rangeKeys }];
    });
  }

  function clearAllSelections() {
    setSelectedUserId("");
    setSelectedCategory("");
    setReachableDateKeys([]);
    setSelections([]);
    setActiveDateKey("");
    setIsRangeSelecting(false);
    setRangeStartDate(null);
    rangeCategoryIdRef.current = "";
    setCommentsByDateKey({});
    setShowCommentInput(false);
    setCurrentCommentText("");
  }

  function isDateReachable(dateKey: string) {
    return reachableDateKeys.includes(dateKey);
  }

  function toggleReachableForActiveDate() {
    if (!activeDateKey) {
      Alert.alert(
        "Info",
        "Divreiz pieskaries jau izvēlētam datumam, lai to aktivizētu",
      );
      return;
    }

    const isCurrentlyReachable = reachableDateKeys.includes(activeDateKey);

    if (isCurrentlyReachable) {
      // Remove reachable status if already marked
      setReachableDateKeys((prev) =>
        prev.filter((key) => key !== activeDateKey),
      );
      setActiveDateKey("");
    } else {
      // Add reachable status if not marked
      setReachableDateKeys((prev) => [...prev, activeDateKey]);
    }
  }

  function openCommentInputForActiveDate() {
    if (!activeDateKey) {
      Alert.alert(
        "Info",
        "Divreiz pieskaries jau izvēlētam datumam, lai to aktivizētu",
      );
      return;
    }

    // If comment already exists, delete it
    if (commentsByDateKey[activeDateKey]) {
      setCommentsByDateKey((prev) => {
        const updated = { ...prev };
        delete updated[activeDateKey];
        return updated;
      });
      // Remove active border when deleting
      setActiveDateKey("");
      return;
    }

    // Otherwise open input to add comment
    setCurrentCommentText("");
    setShowCommentInput(true);
  }

  function closeCommentInput() {
    setShowCommentInput(false);
    setCurrentCommentText("");
  }

  function handleInfoPanelClose() {
    if (!isInfoPanelMounted) {
      return;
    }

    isInfoPanelDismissedInSession = true;
    setShowInfoPanel(false);

    Animated.timing(infoPanelProgress, {
      toValue: 0,
      duration: 260,
      useNativeDriver: false,
    }).start(({ finished }) => {
      if (finished) {
        setIsInfoPanelMounted(false);
      }
    });
  }

  function handleInfoPanelOpen() {
    isInfoPanelDismissedInSession = false;
    setShowInfoPanel(true);
    setIsInfoPanelMounted(true);
    infoPanelProgress.setValue(0);

    Animated.timing(infoPanelProgress, {
      toValue: 1,
      duration: 300,
      useNativeDriver: false,
    }).start();
  }

  function submitComment() {
    if (!activeDateKey) {
      return;
    }

    const trimmedText = currentCommentText.trim();

    setCommentsByDateKey((prev) => {
      const updated = { ...prev };
      if (trimmedText) {
        updated[activeDateKey] = trimmedText;
      } else {
        // Delete if empty
        delete updated[activeDateKey];
      }
      return updated;
    });

    setActiveDateKey("");
    setShowCommentInput(false);
    setCurrentCommentText("");
  }

  function handleCalendarDayPress(
    day: Date,
    selectionMatch: DateSelection | null,
  ) {
    if (isRangeSelecting && rangeStartDate) {
      const rangeCategoryId =
        rangeCategoryIdRef.current ||
        selectedCategory ||
        selectionMatch?.categoryId;

      if (!rangeCategoryId) {
        setIsRangeSelecting(false);
        setRangeStartDate(null);
        rangeCategoryIdRef.current = "";
        Alert.alert("Info", "Izvēlies prombūtnes kategoriju");
        return;
      }

      applyRangeSelection(rangeStartDate, day, rangeCategoryId);
      setSelectedCategory(rangeCategoryId);
      setIsRangeSelecting(false);
      setRangeStartDate(null);
      rangeCategoryIdRef.current = "";
      return;
    }

    if (pendingSelectedDateTapRef.current) {
      clearTimeout(pendingSelectedDateTapRef.current);
      pendingSelectedDateTapRef.current = null;
    }

    if (!selectionMatch) {
      setActiveDateKey("");
      lastSelectedDateTapRef.current = null;
      handleDateSelect(day);
      return;
    }

    if (selectedCategory && selectionMatch.categoryId !== selectedCategory) {
      setActiveDateKey("");
      lastSelectedDateTapRef.current = null;
      handleDateSelect(day);
      return;
    }

    setSelectedCategory(selectionMatch.categoryId);
    setActiveDateKey("");
    lastSelectedDateTapRef.current = null;
    handleDateSelect(day);
  }

  async function handleSubmit() {
    // Validation
    if (!selectedUserId) {
      Alert.alert("Validation Error", "Please select a user");
      return;
    }
    if (selections.length === 0) {
      Alert.alert("Validation Error", "Please select dates");
      return;
    }

    try {
      setLoading(true);

      const payloads = selections.flatMap((selection) =>
        selection.dates.map((dateKey) => {
          const payload = {
            user_id: selectedUserId,
            category_slug: selection.categoryId,
            date: dateKey,
            reachable: isDateReachable(dateKey),
            comments: commentsByDateKey[dateKey] || null,
          };
          console.log("Payload for date", dateKey, ":", payload);
          return payload;
        }),
      );

      console.log("All payloads:", payloads);

      let insertError: any = null;

      const { error: primaryInsertError } = await supabase
        .from("absences")
        .insert(payloads);

      if (primaryInsertError) throw primaryInsertError;

      Alert.alert("Darīts!", "Prombūtne pievienota", [
        {
          text: "OK",
          onPress: () => {
            // Reset form
            setSelectedUserId("");
            setSelectedCategory("");
            setReachableDateKeys([]);
            setSelections([]);
            setActiveDateKey("");
            setCommentsByDateKey({});
          },
        },
      ]);
    } catch (error: any) {
      console.error("Error adding absence:", error);
      Alert.alert("Error", error.message || "Failed to add absence record");
    } finally {
      setLoading(false);
    }
  }

  const currentDateKey = formatDateForDB(currentDate);
  const selectedDateKeys = useMemo(
    () => new Set(selections.flatMap((selection) => selection.dates)),
    [selections],
  );
  const selectionByDateKey = useMemo(() => {
    const map = new Map<string, DateSelection>();

    for (const selection of selections) {
      for (const dateKey of selection.dates) {
        map.set(dateKey, selection);
      }
    }

    return map;
  }, [selections]);
  const isActiveDateReachable = activeDateKey
    ? isDateReachable(activeDateKey)
    : false;
  const markedDates = useMemo(() => {
    const marks: Record<string, any> = {};

    for (const selection of selections) {
      const selectionColor = getCategoryColor(selection.categoryId);

      for (const dateKey of selection.dates) {
        marks[dateKey] = {
          selected: true,
          selectedColor: selectionColor,
          selectedTextColor: "#fff",
        };
      }
    }

    if (activeDateKey && marks[activeDateKey]) {
      marks[activeDateKey] = {
        ...marks[activeDateKey],
        marked: true,
        dotColor: "#ffffff",
      };
    }

    if (isRangeSelecting && rangeStartDate) {
      const rangeStartKey = formatDateForDB(rangeStartDate);
      const rangeStartColor = selectedCategory
        ? getCategoryColor(selectedCategory)
        : theme.colors.accent;

      marks[rangeStartKey] = {
        ...(marks[rangeStartKey] || {}),
        selected: true,
        selectedColor: rangeStartColor,
        selectedTextColor: "#fff",
      };
    }

    return marks;
  }, [
    selections,
    activeDateKey,
    isRangeSelecting,
    rangeStartDate,
    selectedCategory,
    theme.colors.accent,
  ]);

  useEffect(() => {
    setReachableDateKeys((prev) => {
      const filtered = prev.filter((key) => selectedDateKeys.has(key));
      return filtered.length === prev.length ? prev : filtered;
    });

    if (activeDateKey && !selectedDateKeys.has(activeDateKey)) {
      setActiveDateKey("");
    }
  }, [selectedDateKeys, activeDateKey]);

  const startRangeSelection = (
    date: Date,
    selectionMatch: DateSelection | null,
  ) => {
    if (pendingSelectedDateTapRef.current) {
      clearTimeout(pendingSelectedDateTapRef.current);
      pendingSelectedDateTapRef.current = null;
    }
    lastSelectedDateTapRef.current = null;

    const categoryForRange = selectedCategory || selectionMatch?.categoryId;

    if (!categoryForRange) {
      Alert.alert("Info", "Izvēlies prombūtnes kategoriju");
      return;
    }

    if (selectedCategory !== categoryForRange) {
      setSelectedCategory(categoryForRange);
    }

    rangeCategoryIdRef.current = categoryForRange;
    ensureDateSelected(date, categoryForRange);
    setRangeStartDate(date);
    setIsRangeSelecting(true);
    setActiveDateKey("");
  };

  if (loadingUsers) {
    return (
      <ThemedView style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color="#007bff" />
        <ThemedText style={styles.loadingText}>Loading users...</ThemedText>
      </ThemedView>
    );
  }

  return (
    <ThemedView>
      <ScrollView style={styles.container} scrollEnabled>
        <ThemedView style={styles.contentRoot}>
          {/* User Selection */}
          <View style={styles.headerUserContainer}>
            <View style={styles.headerUserRow}>
              <ThemedHeaderUser />
            </View>
            <ThemedSpacer size="m" />
          </View>

          <ThemedCardSection>
            <ThemedText style={[styles.label, { color: theme.colors.text }]}>
              Darbinieki
            </ThemedText>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.userScroll}
            >
              {users.map((user) => (
                <TouchableOpacity
                  key={user.id}
                  style={[
                    styles.categoryChip,
                    styles.userChipSpacing,
                    {
                      backgroundColor: theme.colors.primary,
                      borderColor: theme.colors.gray400,
                    },
                    selectedUserId === user.id && {
                      backgroundColor: theme.colors.accent,
                      borderColor: theme.colors.accent,
                    },
                  ]}
                  onPress={() => setSelectedUserId(user.id)}
                >
                  <Text
                    style={[
                      styles.categoryChipText,
                      { color: theme.colors.text },
                      selectedUserId === user.id &&
                        styles.categoryChipTextSelected,
                    ]}
                  >
                    {user.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </ThemedCardSection>
        </ThemedView>

        <ThemedSpacer size="m" />

        {isInfoPanelMounted && (
          <Animated.View
            style={[
              styles.infoPanelAnimatedWrapper,
              {
                opacity: infoPanelProgress.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, 1],
                }),
                maxHeight: infoPanelProgress.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, 320],
                }),
                marginBottom: infoPanelProgress.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, 12],
                }),
                transform: [
                  {
                    translateY: infoPanelProgress.interpolate({
                      inputRange: [0, 1],
                      outputRange: [-18, 0],
                    }),
                  },
                ],
              },
            ]}
          >
            <ThemedCardSection style={styles.infoCardSection}>
              <View style={styles.infoPanelTopRow}>
                <View style={styles.infoBadge}>
                  <FontAwesome6
                    name="circle-info"
                    size={35}
                    color={theme.colors.accent}
                  />
                </View>
                <TouchableOpacity
                  style={styles.infoToggleButton}
                  onPress={handleInfoPanelClose}
                  accessibilityLabel="Hide info"
                >
                  <Ionicons
                    name="close"
                    size={20}
                    color={theme.colors.gray800}
                  />
                </TouchableOpacity>
              </View>

              <Text
                style={[
                  styles.infoPanelDescription,
                  { color: theme.colors.text },
                ]}
              >
                Izvēlies kategoriju, tad kalendāra datumus, kuros būsi
                prombūtnē, tad nākamo kategoriju un datumus.
              </Text>
              <Text
                style={[
                  styles.infoPanelDescription,
                  { color: theme.colors.text },
                ]}
              >
                Ja vēlies atzīmēt garāku periodu, turi nospiestu pirmo datumu un
                tad pieskaries beigu datumam.
              </Text>
              <Text
                style={[
                  styles.infoPanelDescription,
                  { color: theme.colors.text },
                ]}
              >
                Ja vēlies, vari pievienot īsu komentāru un norādīt, vai būsi
                sazvanāms. Aktivizē izvēlēto datumus divreiz klikšķinot uz tā.
                Atzīmē vai būsi sazvanāms, spied pogu "Īss komentārs" un
                ieraksti savu komentāru. Kad esi izdarījis savas izvēles, spied
                pogu "Apstiprināt visas izvēles".
              </Text>
            </ThemedCardSection>
          </Animated.View>
        )}

        {/* Form Section: Category, Options, Dates, Calendar, and Buttons */}
        <ThemedCardSection>
          <View style={styles.categoryTitleContainer}>
            <View style={styles.categoryTitleRow}>
              <ThemedText style={[styles.label, { color: theme.colors.text }]}>
                Izvēlies prombūtnes kategoriju *
              </ThemedText>
              {!showInfoPanel && !isInfoPanelMounted && (
                <TouchableOpacity
                  style={styles.infoButton}
                  onPress={handleInfoPanelOpen}
                  accessibilityLabel="Show info"
                >
                  <FontAwesome6
                    name="circle-info"
                    size={28}
                    color={theme.colors.accent}
                  />
                </TouchableOpacity>
              )}
            </View>
          </View>
          <ThemedView
            style={[
              styles.categoryGrid,
              !showInfoPanel &&
                !isInfoPanelMounted &&
                styles.categoryGridInfoClosed,
            ]}
          >
            {CATEGORIES.map((category) => {
              const isCategoryActive = selectedCategory === category.id;
              const hasCategorySelection = selections.some(
                (selection) => selection.categoryId === category.id,
              );
              const isCategorySelected =
                isCategoryActive || hasCategorySelection;

              return (
                <TouchableOpacity
                  key={category.id}
                  style={[
                    styles.categoryChip,
                    { backgroundColor: theme.colors.primary },
                    { borderColor: category.color },
                    isCategorySelected && {
                      backgroundColor: category.color,
                      borderColor: category.color,
                    },
                  ]}
                  onPress={() => handleCategorySelect(category.id)}
                >
                  <Ionicons
                    name={category.icon}
                    size={18}
                    color={isCategorySelected ? "#fff" : category.color}
                  />
                  <Text
                    style={[
                      styles.categoryChipText,
                      { color: theme.colors.text },
                      isCategorySelected && styles.categoryChipTextSelected,
                    ]}
                  >
                    {category.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ThemedView>

          <ThemedText
            style={[
              styles.label,
              styles.labelSecondary,
              { color: theme.colors.text },
            ]}
          >
            Vari pievienot:
          </ThemedText>
          <ThemedView style={styles.optionsRow}>
            <TouchableOpacity
              style={[
                styles.optionChip,
                { backgroundColor: theme.colors.primary },
                { borderColor: "#10b981" },
                isActiveDateReachable && styles.optionChipSelected,
              ]}
              onPress={toggleReachableForActiveDate}
            >
              <Ionicons
                name={
                  isActiveDateReachable
                    ? "checkmark-circle"
                    : "checkmark-circle-outline"
                }
                size={18}
                color={isActiveDateReachable ? "#fff" : "#10b981"}
              />
              <Text
                style={[
                  styles.optionChipText,
                  { color: theme.colors.text },
                  isActiveDateReachable && styles.optionChipTextSelected,
                ]}
              >
                Būšu sazvanāms
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.optionChip,
                { backgroundColor: theme.colors.primary },
                { borderColor: "#3b82f6" },
                (showCommentInput ||
                  (activeDateKey && commentsByDateKey[activeDateKey])) &&
                  styles.optionChipSelected,
              ]}
              onPress={openCommentInputForActiveDate}
            >
              <Ionicons
                name={
                  showCommentInput ||
                  (activeDateKey && commentsByDateKey[activeDateKey])
                    ? "chatbubble"
                    : "chatbubble-outline"
                }
                size={18}
                color={
                  showCommentInput ||
                  (activeDateKey && commentsByDateKey[activeDateKey])
                    ? "#fff"
                    : "#3b82f6"
                }
              />
              <Text
                style={[
                  styles.optionChipText,
                  { color: theme.colors.text },
                  (showCommentInput ||
                    (activeDateKey && commentsByDateKey[activeDateKey])) &&
                    styles.optionChipTextSelected,
                ]}
              >
                Īss komentārs
              </Text>
            </TouchableOpacity>
          </ThemedView>

          {isCommentInputMounted && (
            <Animated.View
              style={{
                opacity: commentInputOpacity,
                maxHeight: commentInputHeight.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, 280],
                }),
                overflow: "visible",
              }}
            >
              <ThemedView style={styles.commentInputContainer}>
                <ThemedInput
                  style={styles.commentInputField}
                  value={currentCommentText}
                  onChangeText={setCurrentCommentText}
                  placeholder="Īss komentārs"
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                />
                <ThemedView style={styles.commentInputButtonRow}>
                  <TouchableOpacity
                    style={[styles.commentButton, styles.commentButtonCancel]}
                    onPress={closeCommentInput}
                  >
                    <Text style={styles.commentButtonTextCancel}>Atcelt</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.commentButton, styles.commentButtonSubmit]}
                    onPress={submitComment}
                  >
                    <Text style={styles.commentButtonTextSubmit}>
                      Pievienot
                    </Text>
                  </TouchableOpacity>
                </ThemedView>
              </ThemedView>
            </Animated.View>
          )}

          <ThemedView style={styles.calendarContainer}>
            {isRangeHintMounted && (
              <Animated.View
                style={[
                  styles.rangeHintAnimatedWrapper,
                  {
                    opacity: rangeHintProgress,
                  },
                ]}
              >
                <Text style={styles.rangeHintText}>
                  Atlasi periodu: pieskaries beigu datumam.
                </Text>
              </Animated.View>
            )}

            <Animated.View
              style={[
                styles.calendarAnimatedWrapper,
                {
                  transform: [
                    {
                      translateY: rangeHintProgress.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0, 8],
                      }),
                    },
                  ],
                },
              ]}
            >
              <Calendar
                current={currentDateKey}
                firstDay={1}
                hideExtraDays
                enableSwipeMonths
                onDayPress={(date: DateData) => {
                  const selectedForDay =
                    selectionByDateKey.get(date.dateString) ?? null;
                  handleCalendarDayPress(
                    parseDateKey(date.dateString),
                    selectedForDay,
                  );
                }}
                onDayLongPress={(date: DateData) => {
                  const selectedForDay =
                    selectionByDateKey.get(date.dateString) ?? null;
                  startRangeSelection(
                    parseDateKey(date.dateString),
                    selectedForDay,
                  );
                }}
                markedDates={markedDates}
                dayComponent={({ date, marking }) => {
                  if (!date) {
                    return null;
                  }

                  const dateKey = date.dateString;
                  const selectedForDay =
                    selectionByDateKey.get(dateKey) ?? null;
                  const isSelected = Boolean(marking?.selected);
                  const isWeekend = isWeekendDateKey(dateKey);
                  const isToday = dateKey === currentDateKey;

                  const dayTextColor = isSelected
                    ? "#fff"
                    : isWeekend
                      ? categoriesColor.slimiba
                      : isToday
                        ? theme.colors.text
                        : theme.colors.text;

                  return (
                    <TouchableOpacity
                      style={[
                        styles.calendarDayPressable,
                        isSelected && {
                          backgroundColor:
                            (marking as { selectedColor?: string })
                              ?.selectedColor ?? theme.colors.accent,
                        },
                      ]}
                      onPress={() => {
                        handleCalendarDayPress(
                          parseDateKey(dateKey),
                          selectedForDay,
                        );
                      }}
                      onLongPress={() => {
                        startRangeSelection(
                          parseDateKey(dateKey),
                          selectedForDay,
                        );
                      }}
                    >
                      <Text
                        style={[
                          styles.dayText,
                          isSelected && styles.dayTextSelected,
                          { color: dayTextColor },
                        ]}
                      >
                        {date.day}
                      </Text>
                    </TouchableOpacity>
                  );
                }}
                theme={{
                  backgroundColor: "transparent",
                  calendarBackground: "transparent",
                  textSectionTitleColor: theme.colors.textSecondary,
                  monthTextColor: theme.colors.text,
                  dayTextColor: theme.colors.text,
                  todayTextColor: theme.colors.accent,
                  textMonthFontWeight: "600",
                  textMonthFontSize: 16,
                  textDayFontWeight: "600",
                  textDayHeaderFontWeight: "600",
                  textDayHeaderFontSize: 12,
                  selectedDayTextColor: "#fff",
                }}
              />
            </Animated.View>
          </ThemedView>
        </ThemedCardSection>

        <View style={styles.buttonRow}>
          <TouchableOpacity
            style={[
              styles.clearButton,
              {
                backgroundColor: categoriesColor.slimiba,
                borderColor: categoriesColor.slimiba,
              },
            ]}
            onPress={clearAllSelections}
          >
            <Ionicons
              name="close-circle-outline"
              size={24}
              color={theme.colors.white}
            />
            <Text
              style={[styles.clearButtonText, { color: theme.colors.white }]}
            >
              Dzēst visas izvēles
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.submitButton,
              {
                backgroundColor: categoriesColor.maaciibas,
                borderColor: categoriesColor.maaciibas,
              },
              loading && {
                backgroundColor: theme.colors.gray400,
                borderColor: theme.colors.gray400,
              },
            ]}
            onPress={handleSubmit}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator size="small" color={theme.colors.white} />
            ) : (
              <>
                <Ionicons
                  name="checkmark-circle"
                  size={24}
                  color={theme.colors.white}
                />
                <Text style={styles.submitButtonText}>
                  Apstiprināt visas izvēles
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        <ThemedView style={styles.bottomSpacer} />
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  screenRoot: {
    flex: 1,
    padding: 0,
  },
  container: {
    flex: 1,
  },
  contentRoot: {
    flex: 0,
    padding: 0,
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
    flexDirection: "row",
    alignItems: "center",
    padding: 20,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
    gap: 12,
  },
  headerUserContainer: {
    paddingHorizontal: 16,
    paddingTop: 18,
  },
  headerUserRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#333",
  },
  section: {
    padding: 16,
    backgroundColor: "#fff",
    marginTop: 12,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: "#e0e0e0",
  },
  label: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginBottom: 15,
    textAlign: "left",
    alignSelf: "flex-start",
    marginLeft: 0,
    paddingLeft: 0,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  infoButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    marginTop: -4,
    alignItems: "center",
    justifyContent: "center",
  },
  labelSecondary: {
    marginTop: 20,
  },
  buttonRow: {
    flexDirection: "column",
    gap: 12,
    marginTop: 16,
  },
  userSectionStyle: {
    marginTop: 12,
    marginHorizontal: 12,
  },
  userSelectionContent: {
    padding: 16,
  },
  formSectionStyle: {
    marginTop: 12,
    marginHorizontal: 12,
  },
  formSectionContent: {
    padding: 16,
  },
  userSectionStylePersonal: {
    marginVertical: 12,
    marginHorizontal: 12,
    alignItems: "stretch",
    justifyContent: "flex-start",
  },
  infoCardSection: {
    borderColor: categoriesColor.slimiba,
    borderWidth: 1,
    backgroundColor: "transparent",
    padding: 16,
  },
  infoPanelAnimatedWrapper: {
    overflow: "hidden",
  },
  infoPanelTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  infoBadge: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  infoPanelDescription: {
    fontSize: 13,
    marginBottom: 12,
  },
  infoToggleButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#e0e0e0",
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
  },
  userScroll: {
    flexDirection: "row",
  },
  userChipSpacing: {
    marginRight: 8,
  },
  userChip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: "#f0f0f0",
    marginRight: 8,
    borderWidth: 1,
    borderColor: "#007bff",
  },
  userChipSelected: {
    backgroundColor: "#007bff",
    borderColor: "#007bff",
  },
  userChipText: {
    fontSize: 14,
    color: "#333",
    fontWeight: "500",
  },
  userChipTextSelected: {
    color: "#fff",
  },
  categoryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    padding: 0,
    flex: 0,
    backgroundColor: "transparent",
  },
  categoryGridInfoClosed: {
    marginTop: 2,
  },
  categoryTitleContainer: {
    backgroundColor: "transparent",
    padding: 0,
    paddingTop: 5,
    flex: 0,
  },
  categoryTitleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 8,
    backgroundColor: "transparent",
  },
  categoryChip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: "#f0f0f0",
    borderWidth: 1,
    gap: 6,
  },
  categoryChipText: {
    fontSize: 14,
    color: "#333",
    fontWeight: "500",
  },
  categoryChipTextSelected: {
    color: "#fff",
  },
  optionsRow: {
    flexDirection: "row",
    gap: 12,
    flexWrap: "wrap",
    padding: 0,
    flex: 0,
    backgroundColor: "transparent",
  },
  optionChip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: "#f0f0f0",
    borderWidth: 1,
    gap: 8,
  },
  optionChipSelected: {
    backgroundColor: "#007bff",
    borderColor: "#007bff",
  },
  optionChipText: {
    fontSize: 14,
    color: "#333",
    fontWeight: "500",
  },
  optionChipTextSelected: {
    color: "#fff",
  },
  dateHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
    marginTop: 12,
  },
  dateInfoRow: {
    flexDirection: "row",
    gap: 16,
    marginBottom: 16,
  },
  dateInfo: {
    flex: 1,
    padding: 12,
    backgroundColor: "#f8f9fa",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#e0e0e0",
  },
  dateInfoLabel: {
    fontSize: 12,
    color: "#666",
    marginBottom: 4,
  },
  dateInfoValue: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
  },
  dateButtonsRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 16,
  },
  dateButton: {
    flex: 1,
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: "#f0f0f0",
    borderWidth: 1,
    borderColor: "#e0e0e0",
    alignItems: "center",
    justifyContent: "space-between",
  },
  dateButtonSelected: {
    backgroundColor: "#007bff",
    borderColor: "#007bff",
  },
  dateButtonContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  dateButtonTextSection: {
    flex: 1,
    justifyContent: "center",
  },
  dateButtonLabel: {
    fontSize: 14,
    color: "#333",
    fontWeight: "500",
  },
  dateButtonLabelSelected: {
    color: "#fff",
  },
  dateButtonValue: {
    fontSize: 12,
    fontWeight: "400",
    color: "#999",
    marginTop: 4,
  },
  dateButtonValueSelected: {
    color: "#fff",
  },
  calendarContainer: {
    borderRadius: 8,
    padding: 12,
    backgroundColor: "transparent",
    // borderWidth: 1,
    // borderColor: '#007bff',
    marginBottom: 12,
    marginTop: 12,
  },
  rangeHintText: {
    fontSize: 14,
    color: categoriesColor.slimiba,
    marginBottom: 8,
    textAlign: "center",
  },
  rangeHintAnimatedWrapper: {
    overflow: "visible",
    paddingTop: 4,
  },
  calendarAnimatedWrapper: {
    backgroundColor: "transparent",
  },
  monthLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    textAlign: "center",
    marginBottom: 12,
  },
  weekdayHeader: {
    flexDirection: "row",
    marginBottom: 8,
    padding: 0,
    flex: 0,
  },
  weekdayCell: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: 0,
  },
  weekdayText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#666",
  },
  calendarGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  dayCell: {
    width: "100%",
    height: "100%",
    minHeight: 36,
    padding: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  dayCellEmpty: {
    backgroundColor: "transparent",
  },
  dayCellSelected: {
    borderRadius: 50,
  },
  dayCellSurface: {
    width: "100%",
    height: "100%",
    borderRadius: 50,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  activeDayOutline: {
    position: "absolute",
    top: -2,
    left: -2,
    right: -2,
    bottom: -2,
    borderRadius: 999,
    borderWidth: 2,
    borderStyle: "dotted",
    borderColor: "#4b4b4c",
  },
  dayTextContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    width: "100%",
    position: "relative",
  },
  dayText: {
    fontSize: 14,
    color: "#333",
    fontWeight: "600",
    includeFontPadding: false,
  },
  calendarDayPressable: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  dayTextWeekend: {
    color: categoriesColor.slimiba,
  },
  dayTextSelected: {
    color: "#fff",
    fontWeight: "700",
  },
  dayNumberWrapper: {
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: 0,
  },
  reachableBadgeAnchor: {
    position: "absolute",
    top: 0,
    right: 0,
  },
  reachableBadge: {
    top: 0,
    right: -2,
    width: 16,
    height: 16,
    borderRadius: 999,
    borderWidth: 2,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
  },
  commentBadgeAnchor: {
    position: "absolute",
    bottom: 0,
    left: 0,
  },
  commentBadge: {
    bottom: -2,
    left: -2,
    width: 16,
    height: 16,
    borderRadius: 999,
    borderWidth: 2,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
  },
  commentBadgeText: {
    fontSize: 11,
    fontWeight: "700",
  },
  input: {
    borderWidth: 1,
    borderColor: "#e0e0e0",
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: "#fff",
  },
  textArea: {
    height: 100,
    paddingTop: 12,
  },
  clearButton: {
    flexDirection: "row",
    padding: 12,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderWidth: 2,
  },
  clearButtonText: {
    fontSize: 16,
    fontWeight: "600",
  },
  submitButton: {
    flexDirection: "row",
    padding: 12,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderWidth: 1,
  },
  submitButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  commentInputContainer: {
    borderRadius: 12,
    padding: 16,
    marginTop: 12,
    borderWidth: 1,
    borderColor: "#bbbbbb",
  },
  commentInputField: {
    padding: 6,
    fontSize: 16,
    marginBottom: 12,
    height: 100,
  },
  commentInputButtonRow: {
    flexDirection: "row",
    gap: 12,
  },
  commentButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  commentButtonCancel: {
    backgroundColor: "#fff",
    borderWidth: 2,
    borderColor: categoriesColor.slimiba,
  },
  commentButtonSubmit: {
    backgroundColor: "#3b82f6",
  },
  commentButtonTextCancel: {
    fontSize: 14,
    fontWeight: "600",
    color: categoriesColor.slimiba,
  },
  commentButtonTextSubmit: {
    fontSize: 14,
    fontWeight: "600",
    color: "#fff",
  },
  bottomSpacer: {
    height: 40,
    padding: 0,
    flex: 0,
  },
});
