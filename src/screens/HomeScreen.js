import React, { useContext, useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Animated,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { AuthContext } from "../AuthProvider";
import { db } from "../../firebase";
import {
  doc,
  onSnapshot,
  collection,
  query,
  where,
  getDocs,
} from "firebase/firestore";
import TournamentCategories from "./TournamentCategories";

// Simple Skeleton Component
const SkeletonLoader = ({ style }) => {
  const opacity = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const animate = () => {
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 0.7,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.3,
          duration: 800,
          useNativeDriver: true,
        }),
      ]).start(() => animate());
    };
    animate();
  }, [opacity]);

  return (
    <Animated.View
      style={[
        {
          backgroundColor: '#3a3a3a',
          opacity,
        },
        style,
      ]}
    />
  );
};

export default function HomeScreen({ navigation }) {
  const { user } = useContext(AuthContext);
  const [joinedTournaments, setJoinedTournaments] = useState(0);
  const [wonTournaments, setWonTournaments] = useState(0);
  const [loading, setLoading] = useState(true);
  const [animatedValue] = useState(new Animated.Value(0));
  const [userName, setUserName] = useState("");
  const [isNewUser, setIsNewUser] = useState(false);
  const [inGameName, setInGameName] = useState("");

  useEffect(() => {
    if (user) {
      fetchTournamentStats();

      // Check if user is new or returning
      const unsubUser = onSnapshot(
        doc(db, "users", user.uid),
        (userSnapshot) => {
          if (userSnapshot.exists()) {
            const userData = userSnapshot.data();
            setUserName(userData.inGameName || user.email);
            setInGameName(userData.inGameName || "");
            setIsNewUser(false); // User exists, so not new
          } else {
            // If no user doc, they just registered
            setUserName(user.displayName || user.email);
            setIsNewUser(true); // New user
          }
        }
      );

      // Animation for cards entrance
      Animated.timing(animatedValue, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }).start();

      return () => unsubUser();
    }
  }, [user]);

  const fetchTournamentStats = async () => {
    try {
      setLoading(true);

      // Fetch joined tournaments count
      const tournamentsQuery = collection(db, "active-tournaments");
      const tournamentsSnapshot = await getDocs(tournamentsQuery);

      let joinedCount = 0;

      tournamentsSnapshot.forEach((doc) => {
        const tournamentData = doc.data();
        const hasBookedSlot = tournamentData.bookedSlots?.some(
          (slot) => slot.uid === user.uid
        );
        if (hasBookedSlot) {
          joinedCount++;
        }
      });

      setJoinedTournaments(joinedCount);

      // Fetch user's won tournaments count from user document
      const unsubUser = onSnapshot(
        doc(db, "users", user.uid),
        (userSnapshot) => {
          if (userSnapshot.exists()) {
            const userData = userSnapshot.data();
            setWonTournaments(userData.wonTournaments || 0);
          }
          setLoading(false);
        }
      );

      return () => unsubUser();
    } catch (error) {
      console.error("Error fetching tournament stats:", error);
      setLoading(false);
    }
  };

  const cardTranslateY = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [50, 0],
  });

  const cardOpacity = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1],
  });

  const renderSkeletonCard = (index) => (
    <View key={index} style={[styles.cardWrapper, styles.skeletonCard]}>
      <View style={styles.skeletonCardContent}>
        {/* Header skeleton */}
        <View style={styles.skeletonHeader}>
          <SkeletonLoader style={styles.skeletonIcon} />
          <View style={styles.skeletonTitleContainer}>
            <SkeletonLoader style={styles.skeletonTitle} />
            <SkeletonLoader style={styles.skeletonSubtitle} />
          </View>
        </View>

        {/* Stats skeleton */}
        <View style={styles.skeletonStatsSection}>
          <SkeletonLoader style={styles.skeletonMainStat} />
          <SkeletonLoader style={styles.skeletonStatLabel} />
        </View>

        {/* Footer skeleton */}
        <View style={styles.skeletonFooter}>
          <SkeletonLoader style={styles.skeletonProgressBar} />
          <SkeletonLoader style={styles.skeletonFooterText} />
        </View>
      </View>
    </View>
  );

  const renderSkeletonQuickActions = () => (
    <View style={styles.quickActionsContainer}>
      <SkeletonLoader style={styles.skeletonSectionTitle} />
      <View style={styles.quickActionsGrid}>
        {[1, 2].map((i) => (
          <View key={i} style={styles.skeletonQuickAction}>
            <SkeletonLoader style={styles.skeletonQuickActionIcon} />
            <SkeletonLoader style={styles.skeletonQuickActionText} />
          </View>
        ))}
      </View>
    </View>
  );

  if (loading) {
    return (
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        {/* Header skeleton */}
        <View style={styles.headerSection}>
          <SkeletonLoader style={styles.skeletonWelcomeText} />
          <SkeletonLoader style={styles.skeletonSubText} />
        </View>

        {/* Cards skeleton */}
        <View style={styles.cardsContainer}>
          {renderSkeletonCard(1)}
          {renderSkeletonCard(2)}
        </View>

        {/* Quick actions skeleton */}
        {renderSkeletonQuickActions()}
      </ScrollView>
    );
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.headerSection}>
        <Text style={styles.welcomeText}>
          {isNewUser ? `Welcome, ${userName}!` : `Welcome back, ${userName}! `}
        </Text>
        <Text style={styles.subText}>Here's your tournament overview</Text>
      </View>
    
      <View style={styles.cardsContainer}>
        {/* Joined Tournaments Card */}
        <Animated.View
          style={[
            styles.cardWrapper,
            {
              transform: [{ translateY: cardTranslateY }],
              opacity: cardOpacity,
            },
          ]}
        >
          <TouchableOpacity
            style={styles.card}
            onPress={() => navigation.navigate("TournamentCategories")}
            activeOpacity={0.9}
          >
            <LinearGradient
              colors={["rgba(255, 69, 0, 0.15)", "rgba(255, 140, 0, 0.08)"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.cardGradient}
            >
              <View style={styles.cardContent}>
                <View style={styles.cardHeader}>
                  <View style={styles.iconContainer}>
                    <LinearGradient
                      colors={["#ff4500", "#ff8c00"]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={styles.iconGradient}
                    >
                      <Ionicons name="game-controller" size={32} color="#fff" />
                    </LinearGradient>
                  </View>
                  <View style={styles.cardTitleContainer}>
                    <Text style={styles.cardTitle}>Joined Tournaments</Text>
                    <Text style={styles.cardSubtitle}>
                      Active participations
                    </Text>
                  </View>
                </View>

                <View style={styles.statsSection}>
                  <Text style={styles.mainStat}>{joinedTournaments}</Text>
                  <Text style={styles.statLabel}>Tournaments</Text>
                </View>

                <View style={styles.cardFooter}>
                  <View style={styles.progressBar}>
                    <View style={styles.progressFill} />
                  </View>
                  <Text style={styles.footerText}>Tap to view tournaments</Text>
                </View>
              </View>

              {/* Glassmorphism border */}
              <View style={styles.glassBorder} />

              {/* Floating particles effect */}
              <View style={[styles.particle, styles.particle1]} />
              <View style={[styles.particle, styles.particle2]} />
              <View style={[styles.particle, styles.particle3]} />
            </LinearGradient>
          </TouchableOpacity>
        </Animated.View>

        {/* Won Tournaments Card */}
        <Animated.View
          style={[
            styles.cardWrapper,
            {
              transform: [{ translateY: cardTranslateY }],
              opacity: cardOpacity,
            },
          ]}
        >
          <TouchableOpacity
            style={styles.card}
            onPress={() => navigation.navigate("Leaderboard")}
            activeOpacity={0.9}
          >
            <LinearGradient
              colors={["rgba(0, 255, 136, 0.15)", "rgba(0, 200, 108, 0.08)"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.cardGradient}
            >
              <View style={styles.cardContent}>
                <View style={styles.cardHeader}>
                  <View style={styles.iconContainer}>
                    <LinearGradient
                      colors={["#00ff88", "#00c86c"]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={styles.iconGradient}
                    >
                      <Ionicons name="trophy" size={32} color="#fff" />
                    </LinearGradient>
                  </View>
                  <View style={styles.cardTitleContainer}>
                    <Text style={styles.cardTitle}>Won Tournaments</Text>
                    <Text style={styles.cardSubtitle}>Victory count</Text>
                  </View>
                </View>

                <View style={styles.statsSection}>
                  <Text style={styles.mainStat}>{wonTournaments}</Text>
                  <Text style={styles.statLabel}>Victories</Text>
                </View>

                <View style={styles.cardFooter}>
                  <View style={styles.progressBar}>
                    <View
                      style={[styles.progressFill, styles.winProgressFill]}
                    />
                  </View>
                  <Text style={styles.footerText}>Tap to view leaderboard</Text>
                </View>
              </View>

              {/* Glassmorphism border */}
              <View style={styles.glassBorder} />

              {/* Floating particles effect */}
              <View
                style={[styles.particle, styles.particle1, styles.winParticle]}
              />
              <View
                style={[styles.particle, styles.particle2, styles.winParticle]}
              />
              <View
                style={[styles.particle, styles.particle3, styles.winParticle]}
              />
            </LinearGradient>
          </TouchableOpacity>
        </Animated.View>
      </View>

      {/* Quick Actions Section */}
      <View style={styles.quickActionsContainer}>
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.quickActionsGrid}>
          <TouchableOpacity
            style={styles.quickActionButton}
            onPress={() => navigation.navigate("TournamentCategories")}
          >
            <LinearGradient
              colors={["rgba(255, 170, 0, 0.2)", "rgba(255, 170, 0, 0.1)"]}
              style={styles.quickActionGradient}
            >
              <Ionicons name="add-circle" size={24} color="#ffaa00" />
              <Text style={styles.quickActionText}>Join Tournament</Text>
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.quickActionButton}
            onPress={() => navigation.navigate("Wallet")}
          >
            <LinearGradient
              colors={["rgba(0, 255, 255, 0.2)", "rgba(0, 255, 255, 0.1)"]}
              style={styles.quickActionGradient}
            >
              <Ionicons name="wallet" size={24} color="#00ffff" />
              <Text style={styles.quickActionText}>Add Coins</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#1a1a1a",
  },
  headerSection: {
    padding: 25,
    paddingBottom: 15,
  },
  welcomeText: {
    color: "#fff",
    fontSize: 28,
    fontWeight: "bold",
    marginBottom: 5,
  },
  subText: {
    color: "#aaa",
    fontSize: 16,
  },
  cardsContainer: {
    paddingHorizontal: 20,
  },
  cardWrapper: {
    marginBottom: 20,
  },
  card: {
    height: 180,
    borderRadius: 20,
    overflow: "hidden",
    elevation: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  cardGradient: {
    flex: 1,
    position: "relative",
  },
  cardContent: {
    flex: 1,
    padding: 20,
    zIndex: 2,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 15,
  },
  iconContainer: {
    marginRight: 15,
  },
  iconGradient: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: "center",
    alignItems: "center",
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  cardTitleContainer: {
    flex: 1,
  },
  cardTitle: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 2,
  },
  cardSubtitle: {
    color: "#ccc",
    fontSize: 14,
  },
  statsSection: {
    alignItems: "center",
    marginBottom: 15,
  },
  mainStat: {
    color: "#fff",
    fontSize: 36,
    fontWeight: "bold",
    textShadowColor: "rgba(0, 0, 0, 0.3)",
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
  statLabel: {
    color: "#ccc",
    fontSize: 12,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  cardFooter: {
    alignItems: "center",
  },
  progressBar: {
    width: "100%",
    height: 4,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    borderRadius: 2,
    marginBottom: 8,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    width: "70%",
    backgroundColor: "#ff4500",
    borderRadius: 2,
  },
  winProgressFill: {
    backgroundColor: "#00ff88",
  },
  footerText: {
    color: "#aaa",
    fontSize: 12,
  },
  glassBorder: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.2)",
    zIndex: 1,
  },
  particle: {
    position: "absolute",
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "rgba(255, 255, 255, 0.3)",
  },
  particle1: {
    top: 20,
    right: 30,
  },
  particle2: {
    bottom: 40,
    left: 40,
    width: 4,
    height: 4,
    borderRadius: 2,
  },
  particle3: {
    top: 60,
    right: 80,
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  winParticle: {
    backgroundColor: "rgba(0, 255, 136, 0.4)",
  },
  quickActionsContainer: {
    padding: 20,
    paddingTop: 10,
  },
  sectionTitle: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 15,
  },
  quickActionsGrid: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  quickActionButton: {
    flex: 1,
    marginHorizontal: 5,
    borderRadius: 12,
    overflow: "hidden",
  },
  quickActionGradient: {
    padding: 20,
    alignItems: "center",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
  },
  quickActionText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
    marginTop: 8,
  },

  // Skeleton Styles
  skeletonCard: {
    height: 180,
    backgroundColor: "#2a2a2a",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
  },
  skeletonCardContent: {
    flex: 1,
    padding: 20,
  },
  skeletonHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 15,
  },
  skeletonIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginRight: 15,
  },
  skeletonTitleContainer: {
    flex: 1,
  },
  skeletonTitle: {
    width: "70%",
    height: 20,
    borderRadius: 4,
    marginBottom: 5,
  },
  skeletonSubtitle: {
    width: "50%",
    height: 14,
    borderRadius: 4,
  },
  skeletonStatsSection: {
    alignItems: "center",
    marginBottom: 15,
  },
  skeletonMainStat: {
    width: 60,
    height: 36,
    borderRadius: 6,
    marginBottom: 5,
  },
  skeletonStatLabel: {
    width: 80,
    height: 12,
    borderRadius: 4,
  },
  skeletonFooter: {
    alignItems: "center",
  },
  skeletonProgressBar: {
    width: "100%",
    height: 4,
    borderRadius: 2,
    marginBottom: 8,
  },
  skeletonFooterText: {
    width: "60%",
    height: 12,
    borderRadius: 4,
  },
  skeletonWelcomeText: {
    width: "80%",
    height: 28,
    borderRadius: 6,
    marginBottom: 5,
  },
  skeletonSubText: {
    width: "60%",
    height: 16,
    borderRadius: 4,
  },
  skeletonSectionTitle: {
    width: "40%",
    height: 20,
    borderRadius: 4,
    marginBottom: 15,
  },
  skeletonQuickAction: {
    flex: 1,
    marginHorizontal: 5,
    padding: 20,
    alignItems: "center",
    backgroundColor: "#2a2a2a",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
  },
  skeletonQuickActionIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    marginBottom: 8,
  },
  skeletonQuickActionText: {
    width: "80%",
    height: 14,
    borderRadius: 4,
  },
});