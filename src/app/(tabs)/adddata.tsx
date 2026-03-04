import { Ionicons } from "@expo/vector-icons";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  PanResponder,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { supabase } from "../../../lib/supabase";
import {
  ThemedCardSection,
  ThemedInput,
  ThemedSpacer,
  ThemedText,
  ThemedView,
} from "../../components";
import { categoriesColor } from "../../theme";

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

export default function AddDataScreen() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingUsers, setLoadingUsers] = useState(true);

  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [reachableDateKeys, setReachableDateKeys] = useState<string[]>([]);
  const [selections, setSelections] = useState<DateSelection[]>([]);
  const [showInfoPanel, setShowInfoPanel] = useState(true);
  const [isInfoPanelMounted, setIsInfoPanelMounted] = useState(true);
  const [isRangeSelecting, setIsRangeSelecting] = useState(false);
  const [rangeStartDate, setRangeStartDate] = useState<Date | null>(null);
  const [rangeHoverDate, setRangeHoverDate] = useState<Date | null>(null);
  const [activeDateKey, setActiveDateKey] = useState("");
  const [commentsByDateKey, setCommentsByDateKey] = useState<{
    [dateKey: string]: string;
  }>({});
  const [showCommentInput, setShowCommentInput] = useState(false);
  const [isCommentInputMounted, setIsCommentInputMounted] = useState(false);
  const [currentCommentText, setCurrentCommentText] = useState("");

  const infoPanelOpacity = useRef(new Animated.Value(1)).current;
  const infoPanelHeight = useRef(new Animated.Value(1)).current;
  const commentInputOpacity = useRef(new Animated.Value(0)).current;
  const commentInputHeight = useRef(new Animated.Value(0)).current;
  const pageScrollRef = useRef<ScrollView | null>(null);
  const calendarGridRef = useRef<View | null>(null);
  const calendarGridLayout = useRef({ x: 0, y: 0, width: 0, height: 0 });
  const calendarGridSize = useRef({ width: 0, height: 0 });
  const dragMovedRef = useRef(false);
  const suppressNextPressRef = useRef(false);
  const rangeActiveRef = useRef(false);
  const rangeCategoryIdRef = useRef("");
  const rangeStartDateRef = useRef<Date | null>(null);
  const rangeHoverDateRef = useRef<Date | null>(null);
  const lastSelectedDateTapRef = useRef<{
    dateKey: string;
    timestamp: number;
  } | null>(null);
  const pendingSelectedDateTapRef = useRef<ReturnType<
    typeof setTimeout
  > | null>(null);

  useEffect(() => {
    if (showInfoPanel) {
      // Reset to start values before mounting
      infoPanelOpacity.setValue(0);
      infoPanelHeight.setValue(0);
      setIsInfoPanelMounted(true);

      // Small delay to ensure component is mounted before animating
      const timer = setTimeout(() => {
        Animated.parallel([
          Animated.timing(infoPanelOpacity, {
            toValue: 1,
            duration: 300,
            useNativeDriver: false,
          }),
          Animated.timing(infoPanelHeight, {
            toValue: 1,
            duration: 300,
            useNativeDriver: false,
          }),
        ]).start();
      }, 10);

      return () => clearTimeout(timer);
    } else {
      Animated.parallel([
        Animated.timing(infoPanelOpacity, {
          toValue: 0,
          duration: 250,
          useNativeDriver: false,
        }),
        Animated.timing(infoPanelHeight, {
          toValue: 0,
          duration: 250,
          useNativeDriver: false,
        }),
      ]).start(() => {
        setIsInfoPanelMounted(false);
      });
    }
  }, [showInfoPanel, infoPanelOpacity, infoPanelHeight]);

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

  const currentDate = new Date();
  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth();

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

  function getDaysInMonth(year: number, month: number) {
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startDayOfWeek = (firstDay.getDay() + 6) % 7;

    const days: (Date | null)[] = [];

    // Add empty cells for days before month starts
    for (let i = 0; i < startDayOfWeek; i++) {
      days.push(null);
    }

    // Add all days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(new Date(year, month, day));
    }

    return days;
  }

  function formatDateForDB(date: Date | null): string {
    if (!date) return "";
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  function hexToRgba(hex: string, alpha: number) {
    const cleaned = hex.replace("#", "");
    const value =
      cleaned.length === 3
        ? cleaned
            .split("")
            .map((char) => char + char)
            .join("")
        : cleaned;
    const r = parseInt(value.slice(0, 2), 16);
    const g = parseInt(value.slice(2, 4), 16);
    const b = parseInt(value.slice(4, 6), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
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

  function getSelectionForDate(date: Date): DateSelection | null {
    const dateKey = formatDateForDB(date);
    for (let i = selections.length - 1; i >= 0; i -= 1) {
      const selection = selections[i];
      if (!selection.dates.includes(dateKey)) {
        continue;
      }

      return selection;
    }

    return null;
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

  function updateCalendarGridLayout() {
    if (!calendarGridRef.current) {
      return;
    }

    calendarGridRef.current.measureInWindow((x, y, width, height) => {
      calendarGridLayout.current = { x, y, width, height };
    });
  }

  function getDateFromPoint(
    pageX: number,
    pageY: number,
    days: (Date | null)[],
  ) {
    const { x, y, width, height } = calendarGridLayout.current;
    const localX = pageX - x;
    const localY = pageY - y;

    if (localX < 0 || localY < 0 || localX > width || localY > height) {
      return null;
    }

    const cellSize = width / 7;
    const column = Math.floor(localX / cellSize);
    const row = Math.floor(localY / cellSize);
    const index = row * 7 + column;

    if (index < 0 || index >= days.length) {
      return null;
    }

    return days[index];
  }

  function clearAllSelections() {
    setSelectedUserId("");
    setSelectedCategory("");
    setReachableDateKeys([]);
    setSelections([]);
    setActiveDateKey("");
    setIsRangeSelecting(false);
    setCommentsByDateKey({});
    setShowCommentInput(false);
    setCurrentCommentText("");
    pageScrollRef.current?.setNativeProps({ scrollEnabled: true });
  }

  function setRangeSelectionScrollLock(isLocked: boolean) {
    setIsRangeSelecting(isLocked);
    pageScrollRef.current?.setNativeProps({ scrollEnabled: !isLocked });
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

    const dateKey = formatDateForDB(day);
    const now = Date.now();
    const lastTap = lastSelectedDateTapRef.current;
    const isDoubleTap =
      lastTap && lastTap.dateKey === dateKey && now - lastTap.timestamp <= 320;

    if (isDoubleTap) {
      lastSelectedDateTapRef.current = null;
      setActiveDateKey(dateKey);
      setSelectedCategory(selectionMatch.categoryId);
      return;
    }

    lastSelectedDateTapRef.current = { dateKey, timestamp: now };
    pendingSelectedDateTapRef.current = setTimeout(() => {
      pendingSelectedDateTapRef.current = null;
      lastSelectedDateTapRef.current = null;
    }, 320);
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

  const calendarDays = getDaysInMonth(currentYear, currentMonth);
  const activeSelection = selectedCategory
    ? getSelectionForCategory(selectedCategory)
    : undefined;
  const monthInLatvian = new Date(currentYear, currentMonth)
    .toLocaleDateString("lv-LV", { month: "long" })
    .toLocaleLowerCase("lv-LV");
  const monthName = `${currentYear}. gada ${monthInLatvian}`;
  const calendarDateKeys = new Set(
    calendarDays
      .filter((day): day is Date => day !== null)
      .map((day) => formatDateForDB(day)),
  );
  const previewColor = selectedCategory
    ? hexToRgba(getCategoryColor(selectedCategory), 0.3)
    : null;
  const selectedDateKeys = useMemo(
    () => new Set(selections.flatMap((selection) => selection.dates)),
    [selections],
  );
  const isActiveDateReachable = activeDateKey
    ? isDateReachable(activeDateKey)
    : false;

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

    suppressNextPressRef.current = true;
    dragMovedRef.current = false;
    rangeActiveRef.current = true;
    setRangeSelectionScrollLock(true);
    setRangeStartDate(date);
    rangeStartDateRef.current = date;

    const nextDate = new Date(date);
    nextDate.setDate(date.getDate() + 1);
    const nextKey = formatDateForDB(nextDate);
    const hoverDate = calendarDateKeys.has(nextKey) ? nextDate : null;
    setRangeHoverDate(hoverDate);
    rangeHoverDateRef.current = hoverDate;

    updateCalendarGridLayout();
  };

  const finishRangeSelection = () => {
    if (!rangeActiveRef.current) {
      suppressNextPressRef.current = false;
      return;
    }

    rangeActiveRef.current = false;

    const start = rangeStartDateRef.current;
    const end = rangeHoverDateRef.current;
    const shouldApply = dragMovedRef.current && start && end;

    setRangeSelectionScrollLock(false);
    setRangeStartDate(null);
    setRangeHoverDate(null);
    rangeStartDateRef.current = null;
    rangeHoverDateRef.current = null;
    const rangeCategoryId = rangeCategoryIdRef.current || selectedCategory;
    rangeCategoryIdRef.current = "";
    suppressNextPressRef.current = false;
    dragMovedRef.current = false;

    if (shouldApply) {
      applyRangeSelection(start, end, rangeCategoryId);
    }
  };

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => rangeActiveRef.current,
        onStartShouldSetPanResponderCapture: () => rangeActiveRef.current,
        onMoveShouldSetPanResponder: () => rangeActiveRef.current,
        onMoveShouldSetPanResponderCapture: () => rangeActiveRef.current,
        onPanResponderGrant: () => {
          if (rangeActiveRef.current) {
            updateCalendarGridLayout();
          }
        },
        onPanResponderMove: (_, gestureState) => {
          if (!rangeActiveRef.current || !rangeStartDateRef.current) {
            return;
          }

          if (!dragMovedRef.current) {
            const moved =
              Math.abs(gestureState.dx) > 2 || Math.abs(gestureState.dy) > 2;
            if (moved) {
              dragMovedRef.current = true;
            }
          }

          const hoverDate = getDateFromPoint(
            gestureState.moveX,
            gestureState.moveY,
            calendarDays,
          );

          if (!hoverDate || isSameDate(hoverDate, rangeStartDateRef.current)) {
            return;
          }

          if (
            !rangeHoverDateRef.current ||
            !isSameDate(hoverDate, rangeHoverDateRef.current)
          ) {
            setRangeHoverDate(hoverDate);
            rangeHoverDateRef.current = hoverDate;
            dragMovedRef.current = true;
          }
        },
        onPanResponderRelease: finishRangeSelection,
        onPanResponderTerminate: finishRangeSelection,
      }),
    [calendarDays, finishRangeSelection],
  );

  if (loadingUsers) {
    return (
      <ThemedView style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color="#007bff" />
        <ThemedText style={styles.loadingText}>Loading users...</ThemedText>
      </ThemedView>
    );
  }

  return (
    <ScrollView
      ref={pageScrollRef}
      style={styles.container}
      scrollEnabled={!isRangeSelecting}
    >
      <ThemedView>
        {/* User Selection */}

        <ThemedCardSection>
          <ThemedText variant="subtitle">Personāls</ThemedText>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.userScroll}
          >
            {users.map((user) => (
              <TouchableOpacity
                key={user.id}
                style={[
                  styles.userChip,
                  selectedUserId === user.id && styles.userChipSelected,
                ]}
                onPress={() => setSelectedUserId(user.id)}
              >
                <Text
                  style={[
                    styles.userChipText,
                    selectedUserId === user.id && styles.userChipTextSelected,
                  ]}
                >
                  {user.name}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </ThemedCardSection>
      </ThemedView>

      {isInfoPanelMounted && (
        <Animated.View
          style={{
            opacity: infoPanelOpacity,
            maxHeight: infoPanelHeight.interpolate({
              inputRange: [0, 1],
              outputRange: [0, 320],
            }),
            overflow: "visible",
          }}
        >
          <View style={styles.formSectionContentInfo}>
            <View style={styles.infoPanelContainer}>
              <View style={styles.infoPanelContent}>
                <View style={styles.infoPanelHeader}>
                  <View style={styles.infoBadge}>
                    <Text style={styles.infoBadgeText}>i</Text>
                  </View>
                </View>
                <View>
                  <Text style={styles.infoPanelDescription}>
                    Izvēlies kategoriju, tad kalendāra datumus, kuros būsi
                    prombūtnē, tad nākamo kategoriju un datumus.
                  </Text>
                  <Text style={styles.infoPanelDescription}>
                    Ja vēlies atzīmēt garāku periodu, spied uz pirmā datuma un,
                    neatlaižot pirkstu, izvēlies pēdējo datumu.
                  </Text>
                  <Text style={styles.infoPanelDescription}>
                    Ja vēlies, vari pievienot īsu komentāru un norādīt, vai būsi
                    sazvanāms. Aktivizē izvēlēto datumus divreiz klikšķinot uz
                    tā. Atzīmē vai būsi sazvanāms, spied pogu "Īss komentārs" un
                    ieraksti savu komentāru. Kad esi izdarījis savas izvēles,
                    spied pogu "Apstiprināt visas izvēles".
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.infoToggleButton}
                  onPress={() => setShowInfoPanel(false)}
                  accessibilityLabel="Hide info"
                >
                  <Ionicons name="close" size={16} color="#333" />
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Animated.View>
      )}

      {/* Form Section: Category, Options, Dates, Calendar, and Buttons */}
      <ThemedCardSection>
        <View style={styles.formSectionContent}>
          <View style={styles.headerRow}>
            <ThemedText>Izvēlies prombūtnes kategoriju *</ThemedText>
            <ThemedSpacer height={8} />
            {!showInfoPanel && (
              <TouchableOpacity
                style={styles.infoButton}
                onPress={() => setShowInfoPanel(true)}
                accessibilityLabel="Show info"
              >
                <Text style={styles.infoToggleText}>i</Text>
              </TouchableOpacity>
            )}
          </View>
          <View style={styles.categoryGrid}>
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
                      isCategorySelected && styles.categoryChipTextSelected,
                    ]}
                  >
                    {category.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <Text style={[styles.label, styles.labelSecondary]}>
            Vari pievienot:
          </Text>
          <View style={styles.optionsRow}>
            <TouchableOpacity
              style={[
                styles.optionChip,
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
                  isActiveDateReachable && styles.optionChipTextSelected,
                ]}
              >
                Būšu sazvanāms
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.optionChip,
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
                  (showCommentInput ||
                    (activeDateKey && commentsByDateKey[activeDateKey])) &&
                    styles.optionChipTextSelected,
                ]}
              >
                Īss komentārs
              </Text>
            </TouchableOpacity>
          </View>

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
              <View style={styles.commentInputContainer}>
                <ThemedInput
                  style={styles.commentInputField}
                  value={currentCommentText}
                  onChangeText={setCurrentCommentText}
                  placeholder="Īss komentārs"
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                />
                <View style={styles.commentInputButtonRow}>
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
                </View>
              </View>
            </Animated.View>
          )}

          <View style={styles.calendarContainer}>
            <Text style={styles.monthLabel}>{monthName}</Text>

            {/* Weekday headers */}
            <View style={styles.weekdayHeader}>
              {["P", "O", "T", "C", "P", "S", "Sv"].map((day, index) => (
                <View key={index} style={styles.weekdayCell}>
                  <Text style={styles.weekdayText}>{day}</Text>
                </View>
              ))}
            </View>

            {/* Calendar grid */}
            <View
              ref={calendarGridRef}
              style={styles.calendarGrid}
              onLayout={(event) => {
                const { width, height } = event.nativeEvent.layout;
                calendarGridSize.current = { width, height };
                updateCalendarGridLayout();
              }}
              {...panResponder.panHandlers}
            >
              {calendarDays.map((day, index) => {
                const selectionMatch = day ? getSelectionForDate(day) : null;
                const selectionColor = selectionMatch
                  ? getCategoryColor(selectionMatch.categoryId)
                  : undefined;
                const dayKey = day ? formatDateForDB(day) : "";
                const hasComment = Boolean(dayKey && commentsByDateKey[dayKey]);
                const isActiveDay = Boolean(dayKey && dayKey === activeDateKey);
                const backgroundColor = selectionMatch
                  ? selectionColor
                  : undefined;
                const textColor = selectionMatch ? "#fff" : undefined;
                const showReachableBadge = Boolean(
                  selectionMatch &&
                    dayKey &&
                    isDateReachable(dayKey) &&
                    selectionColor,
                );
                const isWeekend = day
                  ? day.getDay() === 0 || day.getDay() === 6
                  : false;
                const isPreviewStart =
                  day &&
                  previewColor &&
                  isRangeSelecting &&
                  rangeStartDate &&
                  isSameDate(day, rangeStartDate);
                const previewStartColor =
                  isPreviewStart && selectedCategory
                    ? getCategoryColor(selectedCategory)
                    : null;
                const isPreviewRange =
                  day &&
                  previewColor &&
                  isRangeSelecting &&
                  rangeStartDate &&
                  rangeHoverDate &&
                  !isSameDate(day, rangeStartDate) &&
                  ((day >= rangeStartDate && day <= rangeHoverDate) ||
                    (day >= rangeHoverDate && day <= rangeStartDate));

                return (
                  <TouchableOpacity
                    key={index}
                    style={[styles.dayCell, !day && styles.dayCellEmpty]}
                    onPress={() => {
                      if (!day) {
                        return;
                      }
                      if (suppressNextPressRef.current) {
                        if (rangeActiveRef.current && !dragMovedRef.current) {
                          finishRangeSelection();
                        }
                        return;
                      }
                      handleCalendarDayPress(day, selectionMatch);
                    }}
                    onLongPress={() => {
                      if (!day) {
                        return;
                      }
                      startRangeSelection(day, selectionMatch);
                    }}
                    onPressOut={() => {
                      if (rangeActiveRef.current && !dragMovedRef.current) {
                        setTimeout(() => {
                          if (rangeActiveRef.current && !dragMovedRef.current) {
                            finishRangeSelection();
                          }
                        }, 300);
                      }
                    }}
                    delayLongPress={300}
                    disabled={!day}
                  >
                    {day && (
                      <View
                        style={[
                          styles.dayCellSurface,
                          selectionMatch && styles.dayCellSelected,
                          backgroundColor && { backgroundColor },
                          isPreviewStart &&
                            previewStartColor && {
                              backgroundColor: previewStartColor,
                            },
                          isPreviewRange && { backgroundColor: previewColor },
                        ]}
                        pointerEvents="none"
                      >
                        {isActiveDay && selectionColor && (
                          <View
                            style={[
                              styles.activeDayOutline,
                              { borderColor: selectionColor },
                            ]}
                            pointerEvents="none"
                          />
                        )}

                        <View
                          style={styles.dayTextContainer}
                          pointerEvents="none"
                        >
                          <View
                            style={styles.dayTextContainer}
                            pointerEvents="none"
                          >
                            <Text
                              style={[
                                styles.dayText,
                                selectionMatch && styles.dayTextSelected,
                                isWeekend &&
                                  !selectionMatch &&
                                  styles.dayTextWeekend,
                                textColor && { color: textColor },
                              ]}
                              pointerEvents="none"
                            >
                              {day.getDate()}
                            </Text>

                            {showReachableBadge && selectionColor && (
                              <View
                                style={styles.reachableBadgeAnchor}
                                pointerEvents="none"
                              >
                                <View
                                  style={[
                                    styles.reachableBadge,
                                    { borderColor: selectionColor },
                                  ]}
                                >
                                  <Ionicons
                                    name="call"
                                    size={8}
                                    color={selectionColor}
                                  />
                                </View>
                              </View>
                            )}

                            {hasComment && (
                              <View
                                style={styles.commentBadgeAnchor}
                                pointerEvents="none"
                              >
                                <View
                                  style={[
                                    styles.commentBadge,
                                    {
                                      borderColor: selectionColor || "#ed1616",
                                    },
                                  ]}
                                >
                                  <Text
                                    style={[
                                      styles.commentBadgeText,
                                      { color: selectionColor || "#ed1616" },
                                    ]}
                                  >
                                    T
                                  </Text>
                                </View>
                              </View>
                            )}
                          </View>
                        </View>
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          <View style={styles.buttonRow}>
            <TouchableOpacity
              style={styles.clearButton}
              onPress={clearAllSelections}
            >
              <Ionicons name="close-circle-outline" size={24} color="#dc3545" />
              <Text style={styles.clearButtonText}>Dzēst visas izvēles</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.submitButton,
                loading && styles.submitButtonDisabled,
              ]}
              onPress={handleSubmit}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Ionicons name="checkmark-circle" size={24} color="#fff" />
                  <Text style={styles.submitButtonText}>
                    Apstiprināt visas izvēles
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </ThemedCardSection>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
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
    marginBottom: 12,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  infoButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#007bff",
    backgroundColor: "#007bff",
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
  formSectionContentInfo: {
    borderColor: "red",
    marginBottom: 0,
    backgroundColor: "#f8f9fa",
    paddingTop: 0,
    borderRadius: 12,
    borderWidth: 1,
    marginHorizontal: 12,
    marginTop: 15,
  },
  infoPanelContainer: {
    position: "relative",
    minHeight: 140,
  },
  infoPanelContent: {
    paddingTop: 16,
    paddingBottom: 8,
    paddingHorizontal: 12,
    paddingRight: 40,
  },
  infoPanelHeader: {
    marginBottom: 6,
  },
  infoBadge: {
    width: 40,
    height: 40,
    borderRadius: 50,
    backgroundColor: "#007bff",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
    marginTop: 0,
  },
  infoBadgeText: {
    fontSize: 30,
    fontWeight: "700",
    color: "#fff",
  },
  infoPanelDescription: {
    fontSize: 13,
    color: "#717171",
    marginBottom: 12,
  },
  infoToggleButton: {
    position: "absolute",
    top: 24,
    right: 24,
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#e0e0e0",
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 2,
    elevation: 2,
  },
  infoToggleText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#ffffff",
  },
  userScroll: {
    flexDirection: "row",
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
    // borderWidth: 1,
    // borderColor: '#007bff',
    marginBottom: 12,
    marginTop: 12,
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
  },
  weekdayCell: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 8,
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
    width: "14.28%",
    aspectRatio: 1,
    padding: 2,
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
    fontWeight: "500",
    includeFontPadding: false,
  },
  dayTextWeekend: {
    color: "#dc3545",
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
    backgroundColor: "#fff",
    padding: 12,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderWidth: 2,
    borderColor: "#dc3545",
  },
  clearButtonText: {
    color: "#dc3545",
    fontSize: 16,
    fontWeight: "600",
  },
  submitButton: {
    flexDirection: "row",
    backgroundColor: "#007bff",
    padding: 12,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  submitButtonDisabled: {
    backgroundColor: "#ccc",
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
    borderColor: "#dc3545",
  },
  commentButtonSubmit: {
    backgroundColor: "#3b82f6",
  },
  commentButtonTextCancel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#dc3545",
  },
  commentButtonTextSubmit: {
    fontSize: 14,
    fontWeight: "600",
    color: "#fff",
  },
});
