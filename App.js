import React, { useContext, useEffect, useState, useRef } from "react";
import {
  SafeAreaView,
  StyleSheet,
  StatusBar,
  View,
  Text,
  TouchableOpacity,
  Image,
  Linking,
  Alert,
  ActivityIndicator,
  LogBox,
  Animated,
  Dimensions,
} from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { enableScreens } from "react-native-screens";
import {
  SafeAreaProvider,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { AuthProvider, AuthContext } from "./src/AuthProvider";
import LoginScreen from "./src/screens/LoginScreen.js";
import RegisterScreen from "./src/screens/RegisterScreen.js";
import TournamentList from "./src/screens/TournamentList.js";
import SlotBooking from "./src/screens/SlotBooking.js";
import WalletScreen from "./src/screens/WalletScreen.js";
import UpdatesScreen from "./src/screens/UpdatesScreen.js";
import MoreScreen from "./src/screens/MoreScreen.js";
import AppNavigation from "./src/AppNavigation.js";
import firestore from "@react-native-firebase/firestore";
import Ionicons from "react-native-vector-icons/Ionicons.js";
import * as Notifications from "expo-notifications";
import { useFonts } from "expo-font";
import useNetwork from "./src/components/useNetwork.js";
import { typography } from "./theme/typography.js";
import NetInfo from '@react-native-community/netinfo';

const { width } = Dimensions.get('window');

LogBox.ignoreLogs([
  'Setting a timer',
  'AsyncStorage has been extracted',
  'Non-serializable values were found in the navigation state',
]);

const Stack = createNativeStackNavigator();

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

const ErrorFallback = ({ error, resetError }) => (
  <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20, backgroundColor: '#1a1a1a' }}>
    <Text style={{ color: '#fff', fontSize: 18, marginBottom: 10 }}>Something went wrong!</Text>
    <Text style={{ color: '#aaa', fontSize: 14, textAlign: 'center', marginBottom: 20 }}>
      {error.toString()}
    </Text>
    <TouchableOpacity
      style={{
        backgroundColor: '#ff4500',
        padding: 12,
        borderRadius: 8
      }}
      onPress={resetError}
    >
      <Text style={{ color: '#fff', fontWeight: 'bold' }}>Try Again</Text>
    </TouchableOpacity>
  </View>
);

function CustomHeader({ navigation }) {
  const insets = useSafeAreaInsets();
  const { user, coins } = useContext(AuthContext);
  const [hasUnreadUpdates, setHasUnreadUpdates] = useState(false);
  const [showNotificationBanner, setShowNotificationBanner] = useState(false);

  // Animation refs
  const bannerSlideAnim = useRef(new Animated.Value(-100)).current;
  const bellShakeAnim = useRef(new Animated.Value(0)).current;
  const bannerOpacity = useRef(new Animated.Value(0)).current;

  // Track previous state to detect new updates
  const prevUpdatesRef = useRef(false);

  useEffect(() => {
    if (!user?.uid) return;

    const unsubUpdates = firestore()
      .collection("active-tournaments")
      .onSnapshot(
        (snapshot) => {
          try {
            if (!snapshot || !snapshot.docs) {
              console.log('❌ Invalid snapshot or docs');
              setHasUnreadUpdates(false);
              return;
            }

            const validDocs = snapshot.docs.filter(doc => doc && doc.exists);

            if (validDocs.length === 0) {
              console.log('✅ No valid tournament documents found');
              setHasUnreadUpdates(false);
              return;
            }

            console.log(`🔍 Checking ${validDocs.length} tournaments for updates`);

            const unread = validDocs.some((doc) => {
              try {
                const data = doc.data();
                
                if (!data) {
                  console.log('⚠️ Empty document data:', doc.id);
                  return false;
                }

                // Check if user has booked slot
                const hasBookedSlot = Array.isArray(data.bookedSlots) && 
                  data.bookedSlots.some(slot => slot?.uid === user.uid);

                if (!hasBookedSlot) {
                  return false;
                }

                // Check if there are actual updates
                if (!data.roomId && !data.pass) {
                  return false;
                }

                // Add time filter (1 hour)
                const oneHourAgo = Date.now() - (60 * 60 * 1000);
                let updateTime = 0;

                try {
                  if (typeof data.updatedAt === 'string') {
                    const cleanDateString = data.updatedAt.replace(' UTC+5', '');
                    const parsedDate = new Date(cleanDateString);
                    if (!isNaN(parsedDate)) {
                      updateTime = parsedDate.getTime();
                    }
                  } else if (data.updatedAt && data.updatedAt.toDate) {
                    updateTime = data.updatedAt.toDate().getTime();
                  }
                } catch (error) {
                  console.error('Error parsing timestamp for tournament', doc.id, error);
                  return false;
                }

                // Only show updates from the last 1 hour
                if (updateTime <= oneHourAgo) {
                  return false;
                }

                // Check if it's unread
                const lastReadUpdates = data.lastReadUpdates?.toDate?.();
                const isUnread = !lastReadUpdates || 
                  (updateTime && updateTime > lastReadUpdates.getTime());

                return isUnread;

              } catch (docError) {
                console.error('❌ Error processing doc:', doc.id, docError);
                return false;
              }
            });

            console.log('✅ Updates check complete. Has unread:', unread);
            
            // 🎯 Detect NEW updates (when state changes from false to true)
            if (!prevUpdatesRef.current && unread) {
              console.log('🔔 NEW UPDATE DETECTED! Showing notification banner');
              showUpdateNotification();
            }
            
            prevUpdatesRef.current = unread;
            setHasUnreadUpdates(unread);

          } catch (snapshotError) {
            console.error('❌ Error processing snapshot:', snapshotError);
            setHasUnreadUpdates(false);
          }
        },
        (error) => {
          console.error('❌ Firestore listener error:', error);
          setHasUnreadUpdates(false);
        }
      );

    return () => {
      console.log('🧹 Cleaning up updates listener');
      if (unsubUpdates) {
        unsubUpdates();
      }
    };
  }, [user]);

  const showUpdateNotification = () => {
    setShowNotificationBanner(true);

    // 🔔 Bell shake animation
    Animated.sequence([
      Animated.timing(bellShakeAnim, {
        toValue: 10,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(bellShakeAnim, {
        toValue: -10,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(bellShakeAnim, {
        toValue: 10,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(bellShakeAnim, {
        toValue: 0,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();

    // 📢 Banner slide down animation
    Animated.parallel([
      Animated.timing(bannerSlideAnim, {
        toValue: 0,
        duration: 500,
        useNativeDriver: true,
      }),
      Animated.timing(bannerOpacity, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
    ]).start();

    // Auto hide after 4 seconds
    setTimeout(() => {
      hideUpdateNotification();
    }, 4000);
  };

  const hideUpdateNotification = () => {
    Animated.parallel([
      Animated.timing(bannerSlideAnim, {
        toValue: -100,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(bannerOpacity, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setShowNotificationBanner(false);
    });
  };

  return (
    <View style={{ position: 'relative' }}>
      {/* 📢 Animated Notification Banner */}
      {showNotificationBanner && (
        <Animated.View
          style={{
            position: 'absolute',
            top: insets.top + 60,
            left: 10,
            right: 10,
            zIndex: 1000,
            transform: [{ translateY: bannerSlideAnim }],
            opacity: bannerOpacity,
          }}
        >
          <TouchableOpacity
            onPress={() => {
              hideUpdateNotification();
              navigation.navigate("Updates");
            }}
            style={{
              backgroundColor: '#ff4500',
              borderRadius: 12,
              padding: 15,
              flexDirection: 'row',
              alignItems: 'center',
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.3,
              shadowRadius: 8,
              elevation: 8,
            }}
            activeOpacity={0.8}
          >
            <View
              style={{
                backgroundColor: '#fff',
                borderRadius: 20,
                padding: 8,
                marginRight: 12,
              }}
            >
              <Ionicons name="notifications" size={20} color="#ff4500" />
            </View>
            <View style={{ flex: 1 }}>
              <Text
                style={{
                  color: '#fff',
                  fontSize: 16,
                  fontWeight: 'bold',
                  marginBottom: 2,
                }}
              >
                New Updates Available! 🎮
              </Text>
              <Text
                style={{
                  color: '#ffffffcc',
                  fontSize: 14,
                }}
              >
                Check out your tournament updates
              </Text>
            </View>
            <TouchableOpacity
              onPress={hideUpdateNotification}
              style={{ padding: 5 }}
            >
              <Ionicons name="close" size={20} color="#fff" />
            </TouchableOpacity>
          </TouchableOpacity>
        </Animated.View>
      )}

      {/* 📱 Main Header */}
      <View style={[styles.header, { paddingTop: insets.top }]}>
        {/* Left side */}
        <View style={styles.headerLeft}>
          <Image
            source={require("./assets/pro-arena-icon.png")}
            style={styles.AppLogo}
          />
        </View>

        {/* Right side */}
        <View style={styles.headerRight}>
          {/* Coins Button */}
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
            <Text style={[styles.coinsText, typography.cardText]}>
              {coins} Coins
            </Text>
          </TouchableOpacity>

          {/* 🔔 Notifications with Shake Animation */}
          <TouchableOpacity
            onPress={() => navigation.navigate("Updates")}
            style={styles.updatesContainer}
            activeOpacity={0.7}
          >
            <Animated.View
              style={[
                styles.iconWrapper,
                {
                  transform: [{ translateX: bellShakeAnim }],
                },
              ]}
            >
              <Ionicons name="notifications" size={24} color="#fff" />
              {hasUnreadUpdates && <View style={styles.badge} />}
            </Animated.View>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

// ✅ Floating WhatsApp Button Component
function FloatingWhatsAppButton() {
  const handleWhatsAppPress = () => {
    const whatsappChannelLink = "https://whatsapp.com/channel/0029VbBWnSyEFeXi4djQt21y";
    
    Linking.canOpenURL(whatsappChannelLink)
      .then(supported => {
        if (supported) {
          Linking.openURL(whatsappChannelLink);
        } else {
          Alert.alert("Error", "WhatsApp is not installed on your device");
        }
      })
      .catch(err => {
        console.log('WhatsApp link error:', err);
        Alert.alert("Error", "Unable to open WhatsApp");
      });
  };

  return (
    <TouchableOpacity
      style={styles.whatsappFloat}
      onPress={handleWhatsAppPress}
      activeOpacity={0.8}
    >
      <Ionicons name="logo-whatsapp" size={28} color="#fff" />
    </TouchableOpacity>
  );
}

function AuthStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
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
    <View style={{ flex: 1 }}>
      <Stack.Navigator
        screenOptions={({ navigation, route }) => ({
          header: () => (
            <CustomHeader navigation={navigation} user={user} route={route} />
          ),
        })}
      >
        <Stack.Screen name="HomeTabs" component={AppNavigation} />
        <Stack.Screen name="TournamentList" component={TournamentList} />
        <Stack.Screen name="SlotBooking" component={SlotBooking} />
        <Stack.Screen name="Wallet" component={WalletScreen} />
        <Stack.Screen name="Updates" component={UpdatesScreen} />
        <Stack.Screen name="More" component={MoreScreen} />
      </Stack.Navigator>
      
      {/* ✅ Floating WhatsApp Button */}
      <FloatingWhatsAppButton />
    </View>
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

enableScreens();

function App() {
  const isConnected = useNetwork();

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

  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    async function prepare() {
      try {
        const netInfo = await NetInfo.fetch();
        if (!netInfo.isConnected) {
          console.log('No internet connection');
          return;
        }

        await new Promise(resolve => setTimeout(resolve, 1000));
        
        setIsReady(true);
      } catch (error) {
        console.error('Preparation failed:', error);
      }
    }

    prepare();
  }, []);

  if (!fontsLoaded || !isReady) return null;

  return (
    <SafeAreaProvider>
      <AuthProvider>
        <StatusBar barStyle="light-content" backgroundColor="#2a2a2a" />

        {/* 🔹 Offline Banner */}
        {!isConnected && (
          <View style={styles.offlineBanner}>
            <Ionicons name="wifi-off" size={16} color="#fff" style={styles.offlineIcon} />
            <Text style={styles.offlineText}>No Internet Connection</Text>
          </View>
        )}

        <AppNavigator />
      </AuthProvider>
    </SafeAreaProvider>
  );
}

export default App;

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
    paddingTop: 30,
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
  AppLogo: {
    width: 50,
    height: 50,
    marginTop: 15,
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
  // 🔹 Offline Banner Styles
  offlineBanner: {
    backgroundColor: '#ff4444',
    paddingVertical: 8,
    paddingHorizontal: 15,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
  offlineIcon: {
    marginRight: 8,
  },
  offlineText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  // ✅ Floating WhatsApp Button Styles
  whatsappFloat: {
    position: 'absolute',
    bottom: 90,
    right: 20,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#25D366', 
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#000', 
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 4.65,
    zIndex: 1000, 
  },
});