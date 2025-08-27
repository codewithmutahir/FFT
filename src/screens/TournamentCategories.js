import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  Animated,
} from "react-native";
import { db } from "../../firebase";
import { collection, onSnapshot } from "firebase/firestore";
import { typography } from "../../theme/typography";
// Skeleton Loader Component
const SkeletonLoader = () => {
  const animatedValue = new Animated.Value(0);

  useEffect(() => {
    Animated.loop(
      Animated.timing(animatedValue, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      })
    ).start();
  }, []);

  const backgroundColor = animatedValue.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: ["#e0e0e0", "#f5f5f5", "#e0e0e0"],
  });

  return (
    <View style={styles.skeletonCard}>
      <Animated.View style={[styles.skeletonImage, { backgroundColor }]} />
      <View style={styles.skeletonContent}>
        <Animated.View style={[styles.skeletonTitle, { backgroundColor }]} />
        <Animated.View
          style={[styles.skeletonDescription, { backgroundColor }]}
        />
        <Animated.View style={[styles.skeletonStatus, { backgroundColor }]} />
      </View>
    </View>
  );
};

export default function TournamentCategories({ navigation }) {
  const [categories, setCategories] = useState([]);
  const [activeTournaments, setActiveTournaments] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fetch tournament categories
    const unsubCategories = onSnapshot(
      collection(db, "tournament-categories"),
      (snapshot) => {
        const categoryList = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setCategories(categoryList);
      }
    );

    // Fetch active tournaments and group by category
    const unsubTournaments = onSnapshot(
      collection(db, "active-tournaments"),
      (snapshot) => {
        const tournaments = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));

        // Group tournaments by categoryId
        const grouped = tournaments.reduce((acc, tournament) => {
          if (tournament.isActive) {
            const categoryId = tournament.categoryId;
            if (!acc[categoryId]) acc[categoryId] = [];
            acc[categoryId].push(tournament);
          }
          return acc;
        }, {});

        setActiveTournaments(grouped);
        setLoading(false);
      }
    );

    return () => {
      unsubCategories();
      unsubTournaments();
    };
  }, []);

  const handleCategoryPress = (item) => {
    const activeTournamentsCount = activeTournaments[item.id]?.length || 0;
    const hasActiveTournaments = activeTournamentsCount > 0;

    if (hasActiveTournaments) {
      navigation.navigate("TournamentList", {
        categoryId: item.id,
        categoryName: item.name,
        tournaments: activeTournaments[item.id],
      });
    }
  };

  const renderCategory = ({ item }) => {
    const activeTournamentsCount = activeTournaments[item.id]?.length || 0;
    const hasActiveTournaments = activeTournamentsCount > 0;

    return (
      <View
        style={[
          styles.categoryCard,
          !hasActiveTournaments && styles.inactiveCard,
        ]}
      >
        <Image source={{ uri: item.imageUrl }} style={styles.categoryImage} />
        <View style={styles.categoryContent}>
          <Text style={[typography.h1]}>{item.name}</Text>
          <Text style={styles.categoryDescription}>{item.description}</Text>

          <View style={styles.statusContainer}>
            {hasActiveTournaments ? (
              <>
                <View style={styles.activeIndicator} />
                <Text style={styles.activeText}>
                  {activeTournamentsCount} Active Tournament
                  {activeTournamentsCount > 1 ? "s" : ""}
                </Text>
              </>
            ) : (
              <>
                <View style={styles.inactiveIndicator} />
                <Text style={styles.inactiveText}>No Active Tournaments</Text>
              </>
            )}
          </View>

          <TouchableOpacity
            style={[
              styles.exploreButton,
              !hasActiveTournaments && styles.disabledButton, typography.buttonText
            ]}
            onPress={() => handleCategoryPress(item)}
            disabled={!hasActiveTournaments}
          >
            <Text
              style={[
                !hasActiveTournaments && styles.disabledButtonText, typography.buttonText
              ]}
            >
              {hasActiveTournaments
                ? "EXPLORE TOURNAMENTS"
                : "CURRENTLY UNAVAILABLE"}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderSkeletonLoaders = () => (
    <View>
      {[...Array(3)].map((_, index) => (
        <SkeletonLoader key={index} />
      ))}
    </View>
  );

  return (
    <FlatList
      data={loading ? [] : categories}
      renderItem={renderCategory}
      keyExtractor={(item) => item.id}
      contentContainerStyle={styles.container}
      ListEmptyComponent={
        loading ? (
          renderSkeletonLoaders()
        ) : (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>
              No tournament categories available
            </Text>
          </View>
        )
      }
      showsVerticalScrollIndicator={false}
    />
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 15,
    backgroundColor: "#1a1a1a",
  },
  categoryCard: {
    backgroundColor: "#2a2a2a",
    borderRadius: 16,
    marginBottom: 20,
    elevation: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    overflow: "hidden",
  },
  inactiveCard: {
    opacity: 0.7,
    backgroundColor: "#1f1f1f",
  },
  categoryImage: {
    width: "100%",
    height: 180,
    resizeMode: "cover",
  },
  categoryContent: {
    padding: 20,
  },

  categoryDescription: {
    color: "#cccccc",
    fontSize: 16,
    lineHeight: 22,
    marginBottom: 15,
  },
  statusContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 15,
  },
  activeIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#00ff88",
    marginRight: 8,
  },
  inactiveIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#888",
    marginRight: 8,
  },
  activeText: {
    color: "#00ff88",
    fontSize: 14,
    fontWeight: "600",
  },
  inactiveText: {
    color: "#888",
    fontSize: 14,
    fontWeight: "600",
  },
  exploreButton: {
    backgroundColor: "#ff4500",
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 10,
    alignItems: "center",
  },
  disabledButton: {
    backgroundColor: "#444",
  },
  exploreButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
    letterSpacing: 0.5,
  },
  disabledButtonText: {
    color: "#888",
  },
  // Skeleton styles
  skeletonCard: {
    backgroundColor: "#2a2a2a",
    borderRadius: 16,
    marginBottom: 20,
    overflow: "hidden",
  },
  skeletonImage: {
    width: "100%",
    height: 180,
  },
  skeletonContent: {
    padding: 20,
  },
  skeletonTitle: {
    width: "70%",
    height: 24,
    borderRadius: 4,
    marginBottom: 8,
  },
  skeletonDescription: {
    width: "90%",
    height: 16,
    borderRadius: 4,
    marginBottom: 15,
  },
  skeletonStatus: {
    width: "50%",
    height: 40,
    borderRadius: 10,
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
  },
});
