import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  Animated,
} from "react-native";
import { db } from "../../firebase";
import { collection, query, where, onSnapshot } from "firebase/firestore";
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

export default function TournamentList({ navigation, route }) {
  const [tournaments, setTournaments] = useState([]);
  const [loading, setLoading] = useState(true);

  const {
    categoryId,
    categoryName,
    tournaments: passedTournaments,
  } = route.params || {};

  useEffect(() => {
    if (passedTournaments && passedTournaments.length > 0) {
      setTournaments(passedTournaments);
      setLoading(false);
      return;
    }

    if (categoryId) {
      const unsubTournaments = onSnapshot(
        collection(db, "active-tournaments"),
        (snapshot) => {
          const allTournaments = snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
          }));

          const matchingTournaments = allTournaments.filter(
            (tournament) =>
              tournament.categoryId === categoryId &&
              tournament.isActive === true
          );

          setTournaments(matchingTournaments);
          setLoading(false);
        }
      );

      return () => unsubTournaments();
    } else {
      setLoading(false);
    }
  }, [categoryId, passedTournaments]);

  const handleTournamentPress = (tournament) => {
    navigation.navigate("SlotBooking", {
      tournamentId: tournament.id,
    });
  };

  const renderTournament = ({ item }) => {
    const bookedSlotsCount = item.bookedSlots ? item.bookedSlots.length : 0;
    const totalSlots = item.slots || 0;
    const availableSlots = totalSlots - bookedSlotsCount;
    const isJoinable = item.isActive && availableSlots > 0;

    return (
      <TouchableOpacity
        style={[styles.tournamentCard, !isJoinable && styles.inactiveCard]}
        onPress={() => handleTournamentPress(item)}
      >
        <View style={styles.tournamentContent}>
          <View style={styles.titleContainer}>
            <Text style={typography.h1}>{item.name}</Text>
            <View style={styles.statusBadge}>
              {isJoinable ? (
                <>
                  <View style={styles.openIndicator} />
                  <Text style={styles.statusText}>
                    {availableSlots} Slots Available
                  </Text>
                </>
              ) : (
                <>
                  <View style={styles.closedIndicator} />
                  <Text style={styles.statusText}>Tournament Full</Text>
                </>
              )}
            </View>
          </View>

          <View style={styles.infoRow}>
            <View style={styles.infoBox}>
              <Text style={styles.infoLabel}>Entry Fee</Text>
              <Text style={styles.infoValue}>Rs {item.entryFee}</Text>
            </View>
            <View style={styles.infoBox}>
              <Text style={styles.infoLabel}>Prize Pool</Text>
              <Text style={styles.infoValue}>Rs {item.prizePool}</Text>
            </View>
          </View>

          <View style={styles.infoRow}>
            <View style={styles.infoBox}>
              <Text style={styles.infoLabel}>Slots</Text>
              <Text style={styles.infoValue}>
                {bookedSlotsCount}/{totalSlots} Filled
              </Text>
            </View>
            <View style={styles.infoBox}>
              <Text style={styles.infoLabel}>Start Time</Text>
              <Text style={styles.infoValue}>{item.startTime}</Text>
            </View>
          </View>

          <TouchableOpacity
            style={[styles.actionButton, !isJoinable && styles.disabledButton]}
            onPress={() => handleTournamentPress(item)}
            disabled={!isJoinable}
          >
            <Text
              style={[
                typography.buttonText,
                !isJoinable && styles.disabledButtonText,
              ]}
            >
              {isJoinable ? "JOIN TOURNAMENT" : "TOURNAMENT FULL"}
            </Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
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
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={typography.backButtonText}>← Back</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.headerContainer}>
        <Text style={[typography.headerTitle]}> Available Tournaments</Text>
      </View>

      <FlatList
        data={loading ? [] : tournaments}
        renderItem={renderTournament}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContainer}
        ListEmptyComponent={
          loading ? (
            renderSkeletonLoaders()
          ) : (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>
                {categoryName
                  ? `No active tournaments found in ${categoryName}`
                  : "No tournaments available"}
              </Text>
            </View>
          )
        }
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#1a1a1a",
  },

  header: {
    flexDirection: "row",
    alignItems: "center",
    padding: 15,
    paddingTop: 20,
  },
  backButton: {
    padding: 10,
  },

  headerContainer: {
    padding: 20,
    paddingBottom: 10,
  },

  listContainer: {
    padding: 15,
  },
  tournamentCard: {
    backgroundColor: "#2a2a2a",
    borderRadius: 16,
    marginBottom: 20,
    elevation: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    borderWidth: 1,
    borderColor: "#ff4500",
    overflow: "hidden",
  },
  inactiveCard: {
    opacity: 0.7,
    backgroundColor: "#1f1f1f",
    borderColor: "#444",
  },
  tournamentContent: {
    padding: 20,
  },
  titleContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#ff450033",
    paddingBottom: 10,
  },
  tournamentTitle: {
    color: "#ff4500",
    fontSize: 22,
    fontWeight: "bold",
    flex: 1,
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ffffff10",
    padding: 8,
    borderRadius: 12,
  },
  openIndicator: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#00ff88",
    marginRight: 8,
  },
  closedIndicator: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#888",
    marginRight: 8,
  },
  statusText: {
    color: "#00ff88",
    fontSize: 12,
    fontWeight: "600",
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 15,
  },
  infoBox: {
    flex: 1,
    backgroundColor: "#ffffff05",
    padding: 12,
    borderRadius: 8,
    marginHorizontal: 5,
    borderWidth: 1,
    borderColor: "#ff450022",
  },
  infoLabel: {
    color: "#888",
    fontSize: 12,
    marginBottom: 4,
    fontWeight: "600",
  },
  infoValue: {
    color: "#ffd700",
    fontSize: 16,
    fontWeight: "bold",
  },
  actionButton: {
    backgroundColor: "#ff4500",
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 10,
    borderWidth: 1,
    borderColor: "#ff450099",
  },
  disabledButton: {
    backgroundColor: "#444",
    borderColor: "#444",
  },
  actionButtonText: {
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
    borderWidth: 1,
    borderColor: "#ff4500",
    overflow: "hidden",
  },
  skeletonContent: {
    padding: 20,
  },
  skeletonTitle: {
    width: "70%",
    height: 22,
    borderRadius: 4,
    marginBottom: 8,
  },
  skeletonDescription: {
    width: "90%",
    height: 14,
    borderRadius: 4,
    marginBottom: 12,
  },
  skeletonStatus: {
    width: "60%",
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
