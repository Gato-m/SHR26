import { FontAwesome, Ionicons } from "@expo/vector-icons";

type TabBarIconProps = {
  name: string;
  color: string;
  size?: number;
  library?: "ionicons" | "fontawesome";
};

export default function TabBarIcon({
  name,
  color,
  size = 24,
  library = "ionicons",
}: TabBarIconProps) {
  if (library === "fontawesome") {
    return <FontAwesome name={name as any} size={size} color={color} />;
  }

  return <Ionicons name={name as any} size={size} color={color} />;
}
