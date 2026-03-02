import { useTheme } from "@shopify/restyle";
import { Stack } from "expo-router";
import { ThemeProvider } from "../providers/ThemeProvider";
import { Theme } from "../theme";

function ThemedStack() {
  const theme = useTheme<Theme>();

  return (
    <Stack
      screenOptions={{
        headerStyle: {
          backgroundColor: theme.colors.background,
        },
        headerTitleStyle: {
          color: theme.colors.text,
        },
        headerTintColor: theme.colors.text,
      }}
    >
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />

      <Stack.Screen
        name="(modals)"
        options={{
          headerShown: false,
          presentation: "transparentModal",
        }}
      />
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <ThemeProvider>
      <ThemedStack />
    </ThemeProvider>
  );
}
