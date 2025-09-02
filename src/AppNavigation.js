import React, { useEffect, useState } from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";
import { NativeModules, Platform, View, Text } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import TournamentCategories from "./screens/TournamentCategories";
import LeaderboardScreen from "./screens/LeaderboardScreen";
import ProfileScreen from "./screens/ProfileScreen";
import HomeScreen from "./screens/HomeScreen";
import UpdatesScreen from "./screens/UpdatesScreen";
import WalletScreen from "./screens/WalletScreen";
import MoreScreen from "./screens/MoreScreen"; // New screen

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

// Stack for Home and its related sub-screens
function HomeStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="HomeMain" component={HomeScreen} />
      <Stack.Screen
        name="TournamentCategories"
        component={TournamentCategories}
      />
    </Stack.Navigator>
  );
}

// Stack for More section and its sub-screens
function MoreStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="MoreMain" component={MoreScreen} />
      <Stack.Screen name="Wallet" component={WalletScreen} />
      <Stack.Screen name="Updates" component={UpdatesScreen} />
      {/* Add more screens here as needed */}
    </Stack.Navigator>
  );
}

export default function AppNavigation() {
  const insets = useSafeAreaInsets();
  const [hasNavBar, setHasNavBar] = useState(false);

  useEffect(() => {
    if (Platform.OS === "android") {
      const { NavigationBar } = NativeModules;
      if (NavigationBar) {
        NavigationBar.getNavigationBarHidden((hidden) => {
          setHasNavBar(!hidden);
        });
      } else {
        setHasNavBar(true);
      }
    }
  }, []);

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;
          if (route.name === "Home") {
            iconName = focused ? "home" : "home-outline";
          } else if (route.name === "Leaderboard") {
            iconName = focused ? "trophy" : "trophy-outline";
          } else if (route.name === "Profile") {
            iconName = focused ? "person" : "person-outline";
          } else if (route.name === "More") {
            iconName = focused ? "menu" : "menu-outline";
          }
          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: "#ff4500",
        tabBarInactiveTintColor: "#888",
        tabBarStyle: {
          backgroundColor: "#2a2a2a",
          borderTopWidth: 1,
          borderTopColor: "#ff450022",
          height: 60 + (hasNavBar ? 20 : 0),
          paddingBottom: insets.bottom || (hasNavBar ? 20 : 10),
          paddingTop: 5,
          elevation: 8,
          shadowColor: "#000",
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.1,
          shadowRadius: 4,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: "bold",
        },
        headerShown: false,
      })}
    >
      <Tab.Screen name="Home" component={HomeStack} />
      <Tab.Screen name="Leaderboard" component={LeaderboardScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
      <Tab.Screen name="More" component={MoreStack} />
    </Tab.Navigator>
  );
}