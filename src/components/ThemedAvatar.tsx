import { useTheme } from "@shopify/restyle";
import React from "react";
import { Image } from "react-native";
import Icon from "react-native-vector-icons/Ionicons";
import { Theme } from "../theme";

type Props = {
  avatarUrl?: string;
  iconName?: string;
  size?: number;
  variant?: keyof Theme["colors"];
  color?: keyof Theme["colors"];
};

export function ThemedAvatar({
  avatarUrl,
  iconName = "person-circle-outline",
  size = 48,
  variant = "text",
  color = "gray400",
}: Props) {
  const theme = useTheme<Theme>();
  const [error, setError] = React.useState(false);

  if (avatarUrl && !error) {
    return (
      <Image
        source={{ uri: avatarUrl }}
        style={{
          width: size,
          height: size,
          borderRadius: size / 2,
          marginRight: 12,
          backgroundColor: theme.colors.background,
        }}
        resizeMode="cover"
        onError={() => setError(true)}
      />
    );
  }
  return (
    <Icon
      name={iconName}
      size={size}
      color={theme.colors[color]}
      style={{ marginRight: 12 }}
    />
  );
}
