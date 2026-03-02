import { useTheme } from "@shopify/restyle";
import React from "react";
import Icon from "react-native-vector-icons/Ionicons";
import { Theme } from "../theme";

export type ThemedPhoneIconProps = {
  size?: number;
  style?: object;
  variant?: keyof Theme["colors"];
};

export function ThemedPhoneIcon({
  size = 20,
  style = { marginLeft: 12, marginRight: 12 },
  variant = "accent",
}: ThemedPhoneIconProps) {
  const theme = useTheme<Theme>();
  return (
    <Icon name="call" size={size} color={theme.colors[variant]} style={style} />
  );
}
