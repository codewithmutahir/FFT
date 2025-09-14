import React, { useState, useEffect, useRef } from "react";
import { View, Text, FlatList, StyleSheet, TouchableOpacity, Animated, ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import firestore from "@react-native-firebase/firestore";
import { typography } from "../../theme/typography";

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

export default function LeaderboardScreen() {
  const [users, setUsers] = useState([]);
  const [period, setPeriod] = useState("total");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    setLoading(true);
    
    try {
      const unsubscribe = firestore()
        .collection('users')
        .orderBy('totalWinnings', 'desc')
        .limit(50) // Adjust limit as needed
        .onSnapshot(
          (snapshot) => {
            if (!snapshot) {
              setError('No data available');
              setLoading(false);
              return;
            }

            const leaderboardData = snapshot.docs
              .map(doc => {
                const data = doc.data();
                return {
                  id: doc.id,
                  username: data.username || 'Anonymous',
                  totalWinnings: data.totalWinnings || 0,
                  matchesPlayed: data.matchesPlayed || 0,
                  wins: data.wins || 0,
                  avatar: data.avatar || null
                };
              })
              .filter(user => user.totalWinnings > 0); // Only show users with winnings

            setUsers(leaderboardData);
            setLoading(false);
            setError(null);
          },
          (error) => {
            console.error('Leaderboard error:', error);
            setError('Failed to load leaderboard');
            setLoading(false);
          }
        );

      return () => unsubscribe();
    } catch (error) {
      console.error('Setup error:', error);
      setError('Failed to initialize leaderboard');
      setLoading(false);
    }
  }, []);

  const getMedalIcon = (rank) => {
    switch (rank) {
      case 1: return "medal-outline";
      case 2: return "medal-outline";
      case 3: return "medal-outline";
      default: return "none";
    }
  };

  const getMedalColor = (rank) => {
    switch (rank) {
      case 1: return "#ffd700";
      case 2: return "#c0c0c0";
      case 3: return "#cd7f32";
      default: return "#ffaa00";
    }
  };

  const renderUser = ({ item }) => (
    <View style={styles.userRow}>
      <Ionicons
        name={getMedalIcon(item.rank)}
        size={30}
        color={getMedalColor(item.rank)}
        style={styles.medalIcon}
      />
      <Text style={styles.rank}>#{item.rank}</Text>
      <Text style={[styles.name, typography.cardText]}>{item.inGameName || item.displayName || "Anonymous"}</Text>
      <Text style={[styles.coins, typography.cardText]}>{item.coins} Coins</Text>
    </View>
  );

  const renderSkeletonUser = ({ item }) => (
    <View style={styles.userRow}>
      <SkeletonLoader style={{ width: 30, height: 30, borderRadius: 15, marginRight: 10 }} />
      <SkeletonLoader style={{ width: 40, height: 18, borderRadius: 4, marginRight: 15 }} />
      <SkeletonLoader style={{ flex: 1, height: 16, borderRadius: 4, marginRight: 15 }} />
      <SkeletonLoader style={{ width: 80, height: 16, borderRadius: 4 }} />
    </View>
  );

  const renderSkeleton = () => (
    <View style={styles.listContainer}>
      {[1, 2, 3, 4, 5].map((i) => (
        <View key={i} style={styles.userRow}>
          <SkeletonLoader style={{ width: 30, height: 30, borderRadius: 15, marginRight: 10 }} />
          <SkeletonLoader style={{ width: 40, height: 18, borderRadius: 4, marginRight: 15 }} />
          <SkeletonLoader style={{ flex: 1, height: 16, borderRadius: 4, marginRight: 15 }} />
          <SkeletonLoader style={{ width: 80, height: 16, borderRadius: 4 }} />
        </View>
      ))}
    </View>
  );

  const handlePeriodChange = (newPeriod) => {
    setPeriod(newPeriod);
    setLoading(true);
  };

  const renderContent = () => {
    if (loading) {
      return (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#FF6B35" />
          <Text style={styles.loadingText}>Loading leaderboard...</Text>
        </View>
      );
    }

    if (error) {
      return (
        <View style={styles.centerContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity 
            style={styles.retryButton}
            onPress={() => {
              setLoading(true);
              setError(null);
              // This will trigger the useEffect again
            }}
          >
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      );
    }

    if (!users.length) {
      return (
        <View style={styles.centerContainer}>
          <Text style={styles.emptyText}>No leaderboard data available yet</Text>
        </View>
      );
    }

    return (
      <FlatList
        data={users}
        renderItem={renderUser}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContainer}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No users found</Text>
          </View>
        }
      />
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.headerContainer}>
        <Text style={[styles.headerTitle, typography.headerTitle]}>Leaderboard</Text>
      </View>
      
      <View style={styles.periodSelector}>
        <TouchableOpacity
          style={[styles.periodButton, period === "total" && styles.activePeriod]}
          onPress={() => handlePeriodChange("total")}
        >
          <Text style={[styles.periodText, period === "total" && styles.activeText]}>Total</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.periodButton, period === "weekly" && styles.activePeriod]}
          onPress={() => handlePeriodChange("weekly")}
        >
          <Text style={[styles.periodText, period === "weekly" && styles.activeText]}>Weekly</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.periodButton, period === "monthly" && styles.activePeriod]}
          onPress={() => handlePeriodChange("monthly")}
        >
          <Text style={[styles.periodText, period === "monthly" && styles.activeText]}>Monthly</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.periodButton, period === "yearly" && styles.activePeriod]}
          onPress={() => handlePeriodChange("yearly")}
        >
          <Text style={[styles.periodText, period === "yearly" && styles.activeText]}>Yearly</Text>
        </TouchableOpacity>
      </View>

      {renderContent()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#1a1a1a",
  },
  headerContainer: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#ff450033",
  },
  headerTitle: {
    color: "#ff4500",
    fontSize: 28,
  },
  periodSelector: {
    flexDirection: "row",
    justifyContent: "space-around",
    padding: 10,
    backgroundColor: "#2a2a2a",
    borderBottomWidth: 1,
    borderBottomColor: "#ff450033",
  },
  periodButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: "#ffffff10",
  },
  activePeriod: {
    backgroundColor: "#ff4500",
  },
  periodText: {
    color: "#888",
    fontSize: 14,
    fontWeight: "600",
  },
  activeText: {
    color: "#fff",
  },
  listContainer: {
    padding: 15,
  },
  userRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 15,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#ff450033",
  },
  medalIcon: {
    marginRight: 10,
  },
  rank: {
    color: "#ff4500",
    fontSize: 18,
    fontWeight: "bold",
    width: 50,
  },
  name: {
    color: "#ffd700",
    fontSize: 16,
    flex: 1,
  },
  coins: {
    color: "#00ff88",
    fontSize: 16,
    fontWeight: "bold",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 50,
  },
  emptyText: {
    color: "#888",
    fontSize: 18,
    textAlign: "center",
    marginTop: 50,
  },
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  loadingText: {
    color: "#fff",
    fontSize: 16,
    marginTop: 10,
  },
  errorText: {
    color: "#ff4500",
    fontSize: 16,
    marginTop: 10,
    textAlign: "center",
  },
  retryButton: {
    marginTop: 10,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 5,
    backgroundColor: "#ff4500",
  },
  retryText: {
    color: "#fff",
    fontSize: 16,
  },
});