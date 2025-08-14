import React, { useContext } from "react";
import { SafeAreaView, StyleSheet, StatusBar } from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createMaterialTopTabNavigator } from "@react-navigation/material-top-tabs";
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { AuthProvider, AuthContext } from "./src/AuthProvider";
import LoginScreen from "./src/screens/LoginScreen";
import RegisterScreen from "./src/screens/RegisterScreen";
import TournamentList from "./src/screens/TournamentList";
import JoinForm from "./src/screens/JoinForm";

const Stack = createNativeStackNavigator();
const Tab = createMaterialTopTabNavigator();

function AuthTabs() {
  const insets = useSafeAreaInsets();
  
  return (
    <Tab.Navigator
      screenOptions={{
        tabBarStyle: {
          paddingTop: insets.top, // Push tabs below status bar
        },
      }}
    >
      <Tab.Screen name="Login" component={LoginScreen} />
      <Tab.Screen name="Register" component={RegisterScreen} />
    </Tab.Navigator>
  );
}

function AppStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen name="Tournaments" component={TournamentList} />
      <Stack.Screen name="JoinForm" component={JoinForm} />
    </Stack.Navigator>
  );
}

function AppNavigator() {
  const { user, initializing } = useContext(AuthContext);

  if (initializing) {
    return null; // loader/spinner here
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <NavigationContainer>
        {user ? <AppStack /> : <AuthTabs />}
      </NavigationContainer>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1, // Changed from flex: 2 to flex: 1
    backgroundColor: "#fff",
  },
});

export default function App() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <StatusBar barStyle="dark-content" backgroundColor="#fff" />
        <AppNavigator />
      </AuthProvider>
    </SafeAreaProvider>
  );
}