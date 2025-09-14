import React, { useContext, useState, useEffect, useRef, useMemo, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Animated,
  Dimensions,
  RefreshControl,
  Platform,
  Alert,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { AuthContext } from "../AuthProvider";
import firestore from "@react-native-firebase/firestore";
import CustomTour from "../components/CustomTour";
import { typography } from "../../theme/typography";

const { width } = Dimensions.get("window");

// Navigation route constants
const ROUTES = {
  TOURNAMENT_CATEGORIES: 'TournamentCategories',
  WALLET: 'Wallet',
  LEADERBOARD: 'Leaderboard',
  UPDATES: 'Updates',
};

// Animation constants
const ANIMATION = {
  DURATION: Platform.OS === 'ios' ? 400 : 300,
  SHIMMER_DURATION: 1200,
  TOUR_DELAY: 800,
};

// Optimized Shimmer Component
const Shimmer = React.memo(({ style }) => {
  const animatedValue = useRef(new Animated.Value(-1)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.timing(animatedValue, {
        toValue: 1,
        duration: ANIMATION.SHIMMER_DURATION,
        useNativeDriver: true,
      })
    );
    animation.start();
    return () => animation.stop();
  }, []);

  const translateX = animatedValue.interpolate({
    inputRange: [-1, 1],
    outputRange: [-width, width],
  });

  return (
    <View style={[style, { overflow: "hidden", backgroundColor: "#2a2a2a", borderRadius: 8 }]}>
      <Animated.View
        style={{
          flex: 1,
          transform: [{ translateX }],
        }}
      >
        <LinearGradient
          colors={["transparent", "rgba(255,255,255,0.1)", "transparent"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={{ flex: 1, width: width }}
        />
      </Animated.View>
    </View>
  );
});

// Professional Skeleton Card
const SkeletonCard = React.memo(() => (
  <View style={styles.skeletonCardContainer}>
    <View style={styles.skeletonCardContent}>
      <View style={styles.skeletonCardHeader}>
        <View style={styles.skeletonIcon} />
        <View style={styles.skeletonHeaderText}>
          <Shimmer style={styles.skeletonTitle} />
          <Shimmer style={styles.skeletonSubtitle} />
        </View>
      </View>
      <View style={styles.skeletonStatsSection}>
        <Shimmer style={styles.skeletonMainStat} />
        <Shimmer style={styles.skeletonStatLabel} />
      </View>
    </View>
  </View>
));

// Professional Quick Actions Skeleton
const SkeletonQuickActions = React.memo(() => (
  <View style={styles.quickActionsGrid}>
    {[1, 2].map((i) => (
      <View key={i} style={styles.skeletonQuickActionContainer}>
        <View style={styles.skeletonQuickActionContent}>
          <View style={styles.skeletonQuickActionIcon} />
          <Shimmer style={styles.skeletonQuickActionText} />
        </View>
      </View>
    ))}
  </View>
));

// Error State Component
const ErrorState = React.memo(({ onRetry, message = "Failed to load data" }) => (
  <View style={styles.errorContainer}>
    <Ionicons name="warning" size={64} color="#ff4500" />
    <Text style={styles.errorTitle}>Oops!</Text>
    <Text style={styles.errorText}>{message}</Text>
    <TouchableOpacity 
      style={styles.retryButton} 
      onPress={onRetry}
      accessible={true}
      accessibilityLabel="Retry loading data"
      accessibilityRole="button"
    >
      <Text style={styles.retryText}>Try Again</Text>
    </TouchableOpacity>
  </View>
));

export default function HomeScreen({ navigation }) {
  const { user } = useContext(AuthContext);
  const [joinedTournaments, setJoinedTournaments] = useState(0);
  const [wonTournaments, setWonTournaments] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [userName, setUserName] = useState("");
  const [isNewUser, setIsNewUser] = useState(false);
  const [showTour, setShowTour] = useState(false);

  // Single animated value that persists
  const animatedValue = useRef(new Animated.Value(0)).current;

  // Memoize animated interpolations and styles to prevent recalculation
  const { cardTranslateY, cardOpacity } = useMemo(() => ({
    cardTranslateY: animatedValue.interpolate({
      inputRange: [0, 1],
      outputRange: [50, 0],
    }),
    cardOpacity: animatedValue.interpolate({
      inputRange: [0, 1],
      outputRange: [0, 1],
    }),
  }), [animatedValue]);

  const animatedCardStyle = useMemo(() => ({
    transform: [{ translateY: cardTranslateY }],
    opacity: cardOpacity,
    marginBottom: 20,
  }), [cardTranslateY, cardOpacity]);

  const animatedCardStyleNoMargin = useMemo(() => ({
    transform: [{ translateY: cardTranslateY }],
    opacity: cardOpacity,
  }), [cardTranslateY, cardOpacity]);

  // Start entrance animation
  const startAnimation = useCallback(() => {
    Animated.timing(animatedValue, {
      toValue: 1,
      duration: ANIMATION.DURATION,
      useNativeDriver: true,
    }).start();
  }, [animatedValue]);

  // Retry function for error states
  const handleRetry = useCallback(() => {
    setError(null);
    setLoading(true);
    // The useEffect will automatically refetch when loading changes
  }, []);

  // Refresh function for pull-to-refresh
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    setError(null);
    // The real-time listeners will update the data
    // Add a small delay to show refresh animation
    setTimeout(() => {
      setRefreshing(false);
    }, 1000);
  }, []);

  // Main data fetching effect with real-time listeners
  useEffect(() => {
    if (!user?.uid) return;

    let isMounted = true;
    const unsubscribers = [];

    try {
      // User document listener
      const unsubUser = firestore()
        .collection("users")
        .doc(user.uid)
        .onSnapshot(
          (userSnapshot) => {
            if (!isMounted) return;

            try {
              if (userSnapshot.exists) {
                const userData = userSnapshot.data() || {};
                setUserName(userData.inGameName || user?.displayName || user?.email || "Player");
                setIsNewUser(!userData.hasSeenTour);
                setWonTournaments(userData.wonTournaments || 0);
              } else {
                setUserName(user?.displayName || user?.email || "Player");
                setIsNewUser(true);
                setWonTournaments(0);
              }
            } catch (err) {
              console.error("Error processing user document:", err);
              if (isMounted) {
                setError("Failed to load user data");
              }
            }
          },
          (error) => {
            console.error("Error listening to user document:", error);
            if (isMounted) {
              setError("Failed to connect to user data");
            }
          }
        );

      unsubscribers.push(unsubUser);

      // Real-time tournament stats listener
      const unsubTournaments = firestore()
        .collection("active-tournaments")
        .onSnapshot(
          (snapshot) => {
            if (!isMounted) return;

            try {
              if (!snapshot) {
                console.log('Tournament snapshot is null');
                setJoinedTournaments(0);
                return;
              }

              if (!snapshot.docs || snapshot.docs.length === 0) {
                console.log('No tournament documents found');
                setJoinedTournaments(0);
                if (loading) {
                  setLoading(false);
                  startAnimation();
                }
                return;
              }

              let joinedCount = 0;
              console.log(`Processing ${snapshot.docs.length} tournaments for stats`);

              snapshot.docs.forEach((doc) => {
                try {
                  const tournamentData = doc.data();

                  if (!tournamentData) {
                    console.log('Tournament data is null for doc:', doc.id);
                    return;
                  }

                  const bookedSlots = tournamentData.bookedSlots;
                  if (bookedSlots && Array.isArray(bookedSlots)) {
                    const isJoined = bookedSlots.some(slot => slot?.uid === user.uid);
                    if (isJoined) {
                      joinedCount++;
                      console.log('Found joined tournament:', doc.id);
                    }
                  }
                } catch (docError) {
                  console.log('Error processing tournament doc:', doc.id, docError);
                }
              });

              console.log('Tournament stats complete. Joined:', joinedCount);
              setJoinedTournaments(joinedCount);
              
              // Set loading false and start animation only after data is loaded
              if (loading) {
                setLoading(false);
                startAnimation();
              }
            } catch (snapshotError) {
              console.error("Error processing tournaments snapshot:", snapshotError);
              if (isMounted) {
                setError("Failed to load tournament data");
                if (loading) {
                  setLoading(false);
                }
              }
            }
          },
          (error) => {
            console.error("Error fetching tournament stats:", error);
            if (isMounted) {
              setError("Failed to connect to tournament data");
              setJoinedTournaments(0);
              if (loading) {
                setLoading(false);
              }
            }
          }
        );

      unsubscribers.push(unsubTournaments);

    } catch (initError) {
      console.error("Error initializing data listeners:", initError);
      if (isMounted) {
        setError("Failed to initialize data connection");
        setLoading(false);
      }
    }

    return () => {
      isMounted = false;
      unsubscribers.forEach(unsub => {
        try {
          unsub?.();
        } catch (cleanupError) {
          console.error("Error cleaning up listener:", cleanupError);
        }
      });
    };
  }, [user, loading, startAnimation]);

  // Tour logic - separate effect to avoid conflicts
  useEffect(() => {
    if (!loading && !error && isNewUser) {
      const timer = setTimeout(() => {
        setShowTour(true);
      }, ANIMATION.TOUR_DELAY);
      return () => clearTimeout(timer);
    }
  }, [loading, error, isNewUser]);

  const handleTourComplete = async () => {
    setShowTour(false);
    if (user?.uid) {
      try {
        await firestore()
          .collection("users")
          .doc(user.uid)
          .update({ hasSeenTour: true });
      } catch (error) {
        console.error("Error updating tour status:", error);
        Alert.alert("Info", "Tour completed successfully!");
      }
    }
  };

  // Navigation handlers with accessibility
  const navigateToTournaments = useCallback(() => {
    navigation.navigate(ROUTES.TOURNAMENT_CATEGORIES);
  }, [navigation]);

  const navigateToWallet = useCallback(() => {
    navigation.navigate(ROUTES.WALLET);
  }, [navigation]);

  const navigateToLeaderboard = useCallback(() => {
    navigation.navigate(ROUTES.LEADERBOARD);
  }, [navigation]);

  // Error screen
  if (error && !loading) {
    return (
      <ScrollView 
        style={styles.container}
        contentContainerStyle={styles.centerContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#ff4500"
            colors={["#ff4500"]}
          />
        }
      >
        <ErrorState onRetry={handleRetry} message={error} />
      </ScrollView>
    );
  }

  // Loading screen with proper skeleton
  if (loading) {
    return (
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.headerSection}>
          <Shimmer style={styles.skeletonWelcomeText} />
          <Shimmer style={styles.skeletonSubText} />
        </View>

        <View style={styles.cardsContainer}>
          <SkeletonCard />
          <SkeletonCard />
        </View>

        <View style={styles.quickActionsContainer}>
          <Shimmer style={styles.skeletonSectionTitle} />
          <SkeletonQuickActions />
        </View>
      </ScrollView>
    );
  }

  return (
    <>
      <ScrollView 
        style={styles.container} 
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#ff4500"
            colors={["#ff4500"]}
          />
        }
      >
        <View style={styles.headerSection}>
          <Text style={styles.welcomeText}>
            {isNewUser ? `Welcome, ${userName}!` : `Welcome back, ${userName}!`}
          </Text>
          <Text style={styles.subText}>Here's your tournament overview</Text>
        </View>

        <View style={styles.cardsContainer}>
          {/* Joined Tournaments Card */}
          <Animated.View style={animatedCardStyle}>
            <TouchableOpacity
              style={styles.card}
              onPress={navigateToTournaments}
              activeOpacity={0.9}
              accessible={true}
              accessibilityLabel={`Joined tournaments: ${joinedTournaments}`}
              accessibilityHint="Tap to view all tournaments"
              accessibilityRole="button"
            >
              <LinearGradient
                colors={["rgba(255,69,0,0.15)", "rgba(255,140,0,0.08)"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={{ flex: 1 }}
              >
                <View style={styles.cardContent}>
                  <View style={styles.cardHeader}>
                    <LinearGradient
                      colors={["#ff4500", "#ff8c00"]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={styles.iconGradient}
                    >
                      <Ionicons name="game-controller" size={32} color="#fff" />
                    </LinearGradient>
                    <View style={{ marginLeft: 15 }}>
                      <Text style={styles.cardTitle}>Joined Tournaments</Text>
                      <Text style={[styles.cardSubtitle, typography.cardText]}>Active participations</Text>
                    </View>
                  </View>
                  <View style={styles.statsSection}>
                    <Text style={styles.mainStat}>{joinedTournaments}</Text>
                    <Text style={[styles.statLabel, typography.cardText]}>Tournaments</Text>
                  </View>
                </View>
              </LinearGradient>
            </TouchableOpacity>
          </Animated.View>

          {/* Won Tournaments Card */}
          <Animated.View style={animatedCardStyleNoMargin}>
            <TouchableOpacity
              style={styles.card}
              onPress={navigateToLeaderboard}
              activeOpacity={0.9}
              accessible={true}
              accessibilityLabel={`Won tournaments: ${wonTournaments}`}
              accessibilityHint="Tap to view leaderboard"
              accessibilityRole="button"
            >
              <LinearGradient
                colors={["rgba(0,255,136,0.15)", "rgba(0,200,108,0.08)"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={{ flex: 1 }}
              >
                <View style={styles.cardContent}>
                  <View style={styles.cardHeader}>
                    <LinearGradient
                      colors={["#00ff88", "#00c86c"]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={styles.iconGradient}
                    >
                      <Ionicons name="trophy" size={32} color="#fff" />
                    </LinearGradient>
                    <View style={{ marginLeft: 15 }}>
                      <Text style={styles.cardTitle}>Won Tournaments</Text>
                      <Text style={[styles.cardSubtitle, typography.cardText]}>Victory count</Text>
                    </View>
                  </View>
                  <View style={styles.statsSection}>
                    <Text style={styles.mainStat}>{wonTournaments}</Text>
                    <Text style={styles.statLabel}>Victories</Text>
                  </View>
                </View>
              </LinearGradient>
            </TouchableOpacity>
          </Animated.View>
        </View>

        {/* Quick Actions */}
        <View style={styles.quickActionsContainer}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.quickActionsGrid}>
            <TouchableOpacity
              style={styles.quickActionButton}
              onPress={navigateToTournaments}
              accessible={true}
              accessibilityLabel="Join tournament"
              accessibilityHint="Tap to browse and join tournaments"
              accessibilityRole="button"
            >
              <LinearGradient
                colors={["rgba(255,170,0,0.2)", "rgba(255,170,0,0.1)"]}
                style={styles.quickActionGradient}
              >
                <Ionicons name="add-circle" size={24} color="#ffaa00" />
                <Text style={[styles.quickActionText, typography.cardText]}>Join Tournament</Text>
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.quickActionButton}
              onPress={navigateToWallet}
              accessible={true}
              accessibilityLabel="Add coins"
              accessibilityHint="Tap to manage wallet and add coins"
              accessibilityRole="button"
            >
              <LinearGradient
                colors={["rgba(0,255,255,0.2)", "rgba(0,255,255,0.1)"]}
                style={styles.quickActionGradient}
              >
                <Ionicons name="wallet" size={24} color="#00ffff" />
                <Text style={[styles.quickActionText, typography.cardText]}>Add Coins</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      <CustomTour visible={showTour} onClose={handleTourComplete} />
    </>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: "#1a1a1a" 
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
  },
  headerSection: { 
    padding: 25, 
    paddingBottom: 15 
  },
  welcomeText: { 
    color: "#fff", 
    fontSize: 28, 
    fontWeight: "bold", 
    marginBottom: 5 
  },
  subText: { 
    color: "#aaa", 
    fontSize: 16 
  },
  cardsContainer: { 
    paddingHorizontal: 20 
  },
  card: { 
    height: 180, 
    borderRadius: 20, 
    overflow: "hidden", 
    elevation: 8, 
    shadowColor: "#000", 
    shadowOffset: { width: 0, height: 4 }, 
    shadowOpacity: 0.3, 
    shadowRadius: 8 
  },
  cardContent: { 
    flex: 1, 
    padding: 20, 
    zIndex: 2 
  },
  cardHeader: { 
    flexDirection: "row", 
    alignItems: "center", 
    marginBottom: 15 
  },
  iconGradient: { 
    width: 60, 
    height: 60, 
    borderRadius: 30, 
    justifyContent: "center", 
    alignItems: "center" 
  },
  cardTitle: { 
    color: "#fff", 
    fontSize: 20, 
    fontWeight: "bold", 
    marginBottom: 2 
  },
  cardSubtitle: { 
    color: "#ccc", 
    fontSize: 14 
  },
  statsSection: { 
    alignItems: "center", 
    marginBottom: 15 
  },
  mainStat: { 
    color: "#fff", 
    fontSize: 36, 
    fontWeight: "bold" 
  },
  statLabel: { 
    color: "#ccc", 
    fontSize: 12, 
    textTransform: "uppercase", 
    letterSpacing: 1 
  },
  quickActionsContainer: { 
    padding: 20, 
    paddingTop: 10 
  },
  sectionTitle: { 
    color: "#fff", 
    fontSize: 20, 
    fontWeight: "bold", 
    marginBottom: 15 
  },
  quickActionsGrid: { 
    flexDirection: "row", 
    justifyContent: "space-between" 
  },
  quickActionButton: { 
    flex: 1, 
    marginHorizontal: 5, 
    borderRadius: 12, 
    overflow: "hidden" 
  },
  quickActionGradient: { 
    padding: 20, 
    alignItems: "center", 
    borderRadius: 12, 
    borderWidth: 1, 
    borderColor: "rgba(255,255,255,0.1)" 
  },
  quickActionText: { 
    color: "#fff", 
    fontSize: 14, 
    fontWeight: "600", 
    marginTop: 8 
  },

  // Error State Styles
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 40,
  },
  errorTitle: {
    color: "#fff",
    fontSize: 24,
    fontWeight: "bold",
    marginTop: 16,
    marginBottom: 8,
  },
  errorText: {
    color: "#aaa",
    fontSize: 16,
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 24,
  },
  retryButton: {
    backgroundColor: "#ff4500",
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    elevation: 2,
  },
  retryText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },

  // Professional Skeleton Styles
  skeletonCardContainer: {
    height: 180,
    borderRadius: 20,
    backgroundColor: "#2a2a2a",
    marginBottom: 20,
    overflow: "hidden"
  },
  skeletonCardContent: {
    padding: 20,
    flex: 1
  },
  skeletonCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 15
  },
  skeletonIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#3a3a3a"
  },
  skeletonHeaderText: {
    marginLeft: 15,
    flex: 1
  },
  skeletonTitle: {
    height: 20,
    width: "70%",
    borderRadius: 4,
    marginBottom: 5
  },
  skeletonSubtitle: {
    height: 14,
    width: "50%",
    borderRadius: 4
  },
  skeletonStatsSection: {
    alignItems: "center",
    marginTop: 10
  },
  skeletonMainStat: {
    height: 36,
    width: 80,
    borderRadius: 6,
    marginBottom: 5
  },
  skeletonStatLabel: {
    height: 12,
    width: 60,
    borderRadius: 3
  },
  skeletonWelcomeText: {
    height: 28,
    width: "75%",
    borderRadius: 6,
    marginBottom: 8
  },
  skeletonSubText: {
    height: 16,
    width: "55%",
    borderRadius: 4
  },
  skeletonSectionTitle: {
    height: 20,
    width: "35%",
    borderRadius: 4,
    marginBottom: 15
  },
  skeletonQuickActionContainer: {
    flex: 1,
    marginHorizontal: 5,
    height: 80,
    borderRadius: 12,
    backgroundColor: "#2a2a2a",
    overflow: "hidden"
  },
  skeletonQuickActionContent: {
    padding: 20,
    alignItems: "center",
    justifyContent: "center",
    flex: 1
  },
  skeletonQuickActionIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#3a3a3a",
    marginBottom: 8
  },
  skeletonQuickActionText: {
    height: 14,
    width: "70%",
    borderRadius: 3
  }
});