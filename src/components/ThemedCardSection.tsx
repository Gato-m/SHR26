import { useTheme } from "@shopify/restyle";
import React from "react";
import { Pressable, PressableProps, ViewProps } from "react-native";
import { Theme } from "../theme";

type ThemedCardSectionProps = ViewProps &
  PressableProps & {
    children?: React.ReactNode;
  };

export function ThemedCardSection({
  style,
  children,
  ...rest
}: ThemedCardSectionProps) {
  const theme = useTheme<Theme>();
  return (
    <Pressable
      style={({ pressed }) => [
        {
          backgroundColor: theme.colors.primary,
          padding: theme.spacing.m,
          borderRadius: theme.borderRadii.m,
          opacity: pressed ? 0.85 : 1,
        },
        style,
      ]}
      android_ripple={{ color: theme.colors.gray200 }}
      {...rest}
    >
      {children}
    </Pressable>
  );
}
