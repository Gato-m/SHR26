import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@shopify/restyle";
import React, { useEffect, useRef } from "react";
import { Animated, Pressable } from "react-native";
import { useThemeMode } from "../providers/ThemeProvider";
import { Theme } from "../theme";

export function ThemeToggleButton() {
  const theme = useTheme<Theme>();
  const { mode, toggle } = useThemeMode();

  const progress = useRef(new Animated.Value(mode === "dark" ? 1 : 0)).current;

  useEffect(() => {
    Animated.timing(progress, {
      toValue: mode === "dark" ? 1 : 0,
      duration: 260,
      useNativeDriver: true,
    }).start();
  }, [mode, progress]);

  const sunStyle = {
    opacity: progress.interpolate({
      inputRange: [0, 1],
      outputRange: [1, 0],
    }),
    transform: [
      {
        scale: progress.interpolate({
          inputRange: [0, 1],
          outputRange: [1, 0.72],
        }),
      },
      {
        rotate: progress.interpolate({
          inputRange: [0, 1],
          outputRange: ["0deg", "90deg"],
        }),
      },
    ],
  };

  const moonStyle = {
    opacity: progress,
    transform: [
      {
        scale: progress.interpolate({
          inputRange: [0, 1],
          outputRange: [0.72, 1],
        }),
      },
      {
        rotate: progress.interpolate({
          inputRange: [0, 1],
          outputRange: ["-90deg", "0deg"],
        }),
      },
    ],
  };

  return (
    <Pressable
      onPress={toggle}
      hitSlop={8}
      accessibilityRole="button"
      accessibilityLabel="Toggle theme"
      accessibilityHint="Switch between light and dark theme"
      style={{
        width: 36,
        height: 36,
        borderRadius: 18,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: theme.colors.gray100,
        borderWidth: 1,
        borderColor: theme.colors.gray200,
      }}
    >
      <Animated.View style={[{ position: "absolute" }, sunStyle]}>
        <Ionicons name="sunny" size={18} color={theme.colors.accent} />
      </Animated.View>

      <Animated.View style={moonStyle}>
        <Ionicons name="moon" size={18} color={theme.colors.text} />
      </Animated.View>
    </Pressable>
  );
}
