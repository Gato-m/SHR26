import { useTheme } from "@shopify/restyle";
import { Tabs } from "expo-router";
import TabBarIcon from "../../components/TabBarIcon";
import { Theme } from "../../theme";

export default function TabsLayout() {
  const theme = useTheme<Theme>();

  return (
    <Tabs
      screenOptions={{
        tabBarStyle: {
          backgroundColor: theme.colors.background,
          borderTopColor: theme.colors.gray200,
          paddingTop: 5,
        },
        tabBarActiveTintColor: theme.colors.accent || theme.colors.text,
        tabBarInactiveTintColor: theme.colors.text,
        headerStyle: {
          backgroundColor: theme.colors.background,
        },
        headerTitleStyle: {
          color: theme.colors.text,
        },
        headerTintColor: theme.colors.text,
      }}
    >
      <Tabs.Screen
        name="absences"
        options={{
          title: "Prombūtnes",
          tabBarIcon: ({ color }) => (
            <TabBarIcon
              name="calendar-times-o"
              color={color}
              library="fontawesome"
            />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Pievienot datus",
          tabBarIcon: ({ color }) => (
            <TabBarIcon name="calendar-outline" color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="darbinieki"
        options={{
          title: "Darbinieki",
          tabBarIcon: ({ color }) => (
            <TabBarIcon name="person-outline" color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
