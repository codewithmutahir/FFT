import React, { useContext, useEffect, useState } from "react";
import {
  SafeAreaView,
  StyleSheet,
  StatusBar,
  View,
  Text,
  TouchableOpacity,
  Image,
} from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { enableScreens } from 'react-native-screens';
import {
  SafeAreaProvider,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { AuthProvider, AuthContext } from "./src/AuthProvider.js";
import LoginScreen from "./src/screens/LoginScreen.js";
import RegisterScreen from "./src/screens/RegisterScreen.js";
import TournamentList from "./src/screens/TournamentList.js";
import SlotBooking from "./src/screens/SlotBooking.js";
import WalletScreen from "./src/screens/WalletScreen.js";
import UpdatesScreen from "./src/screens/UpdatesScreen.js";
import AppNavigation from "./src/AppNavigation.js";
import { db } from "./firebase.js";
import { doc, onSnapshot, collection, query, where } from "firebase/firestore";
import Ionicons from "react-native-vector-icons/Ionicons.js";
import * as Notifications from "expo-notifications";
import { useFonts } from "expo-font";

const Stack = createNativeStackNavigator();

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

function CustomHeader({ navigation, user, route }) {
  const insets = useSafeAreaInsets();
  const [coins, setCoins] = useState(0);
  const [hasUnreadUpdates, setHasUnreadUpdates] = useState(false);

  useEffect(() => {
    if (user) {
      const unsubUser = onSnapshot(
        doc(db, "users", user.uid),
        (userSnapshot) => {
          const userData = userSnapshot.data();
          setCoins(userData?.coins || 0);

          const lastReadUpdates = userData?.lastReadUpdates?.toDate();

          const q = query(collection(db, "active-tournaments"));
          const unsubUpdates = onSnapshot(q, (snapshot) => {
            const unread = snapshot.docs.some((doc) => {
              const data = doc.data();
              const hasBookedSlot = data.bookedSlots?.some(
                (slot) => slot.uid === user.uid
              );
              const hasNewUpdate =
                (data.roomId && data.roomId !== "Not released yet") ||
                (data.pass && data.pass !== "Not released yet");

              const updateTime =
                (data.updatedAt && data.updatedAt.toDate
                  ? data.updatedAt.toDate()
                  : data.updatedAt
                  ? new Date(data.updatedAt)
                  : null) ||
                (data.createdAt && data.createdAt.toDate
                  ? data.createdAt.toDate()
                  : data.createdAt
                  ? new Date(data.createdAt)
                  : null) ||
                new Date();
              const isUnread =
                !lastReadUpdates ||
                (updateTime && updateTime > lastReadUpdates);

              return hasBookedSlot && hasNewUpdate && isUnread;
            });
            setHasUnreadUpdates(unread);
          });

          return () => unsubUpdates();
        }
      );

      return () => unsubUser();
    }
  }, [user]);

  return (
    <View style={[styles.header, { paddingTop: insets.top }]}>
      <View style={styles.headerLeft}>
        <Text style={styles.headerTitle}>Gaming App</Text>
      </View>
      <View style={styles.headerRight}>
        <TouchableOpacity
          onPress={() => navigation.navigate("Wallet")}
          style={styles.coinsContainer}
          activeOpacity={0.7}
        >
          <Image
            source={{
              uri: "https://cdn-icons-png.flaticon.com/512/1490/1490832.png",
            }}
            style={styles.coinIcon}
          />
          <Text style={styles.coinsText}>{coins} Coins</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => navigation.navigate("Updates")}
          style={styles.updatesContainer}
          activeOpacity={0.7}
        >
          <View style={styles.iconWrapper}>
            <Ionicons name="notifications" size={24} color="#fff" />
            {hasUnreadUpdates && <View style={styles.badge} />}
          </View>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function AuthStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false, // Hide header for non-logged-in users
      }}
    >
      <Stack.Screen 
        name="Login" 
        component={LoginScreen} 
        options={{ animationEnabled: false }}
      />
      <Stack.Screen 
        name="Register" 
        component={RegisterScreen}
        options={{ animationEnabled: false }}
      />
    </Stack.Navigator>
  );
}

function AppStack() {
  const { user } = useContext(AuthContext);
  return (
    <Stack.Navigator
      screenOptions={({ navigation, route }) => ({
        header: () => (
          <CustomHeader navigation={navigation} user={user} route={route} />
        ),
      })}
    >
      <Stack.Screen
        name="HomeTabs"
        component={AppNavigation}
        options={{ title: "Home" }}
      />
      <Stack.Screen
        name="TournamentList"
        component={TournamentList}
        options={{ title: "Tournaments" }}
      />
      <Stack.Screen
        name="SlotBooking"
        component={SlotBooking}
        options={{ title: "Book Slot" }}
      />
      <Stack.Screen
        name="Wallet"
        component={WalletScreen}
        options={{ title: "Wallet" }}
      />
      <Stack.Screen
        name="Updates"
        component={UpdatesScreen}
        options={{ title: "Updates" }}
      />
    </Stack.Navigator>
  );
}

function AppNavigator() {
  const { user, initializing } = useContext(AuthContext);

  if (initializing) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <Text style={styles.loadingText}>Loading...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <NavigationContainer>
        {user ? <AppStack /> : <AuthStack />}
      </NavigationContainer>
    </SafeAreaView>
  );
}

// Enable screens for better navigation performance
enableScreens();

export default function App() {
  const [fontsLoaded] = useFonts({
    "Ubuntu-Bold": require("./assets/fonts/UbuntuBold.ttf"),
    "Ubuntu-Medium": require("./assets/fonts/UbuntuMedium.ttf"),
    "WorkSans-Bold": require("./assets/fonts/WorkSans-Bold.ttf"),
    "WorkSans-Medium": require("./assets/fonts/WorkSans-Medium.ttf"),
    "WorkSans-Regular": require("./assets/fonts/WorkSans-Regular.ttf"),
    "Poppins-Bold": require("./assets/fonts/Poppins-Bold.ttf"),
    "Poppins-SemiBold": require("./assets/fonts/Poppins-SemiBold.ttf"),
    "Poppins-Medium": require("./assets/fonts/Poppins-Medium.ttf"),
    "Poppins-Regular": require("./assets/fonts/Poppins-Regular.ttf"),
  });

  useEffect(() => {
    (async () => {
      const { status } = await Notifications.requestPermissionsAsync();
      if (status !== "granted") {
        alert("Push notification permissions denied!");
      }
    })();
  }, []);

  if (!fontsLoaded) {
    return null;
  }

  return (
    <SafeAreaProvider>
      <AuthProvider>
        <StatusBar barStyle="light-content" backgroundColor="#2a2a2a" />
        <AppNavigator />
      </AuthProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#1a1a1a",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 15,
    paddingBottom: 10,
    backgroundColor: "#2a2a2a",
    borderBottomWidth: 1,
    borderBottomColor: "#ff450033",
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
  },
  headerTitle: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "bold",
    marginLeft: 10,
  },
  backContainer: {
    flexDirection: "row",
    alignItems: "center",
    padding: 10,
  },
  backText: {
    color: "#fff",
    fontSize: 16,
    marginLeft: 5,
  },
  coinsContainer: {
    flexDirection: "row",
    alignItems: "center",
    padding: 10,
    backgroundColor: "#333",
    borderRadius: 8,
  },
  coinIcon: {
    width: 24,
    height: 24,
    marginRight: 5,
  },
  coinsText: {
    color: "#ff4500",
    fontSize: 16,
    fontWeight: "bold",
  },
  updatesContainer: {
    marginLeft: 10,
    padding: 10,
  },
  iconWrapper: {
    position: "relative",
  },
  badge: {
    position: "absolute",
    top: -2,
    right: -2,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#ff0000",
  },
  loadingText: {
    color: "#fff",
    fontSize: 18,
    textAlign: "center",
    marginTop: 20,
  },
});
