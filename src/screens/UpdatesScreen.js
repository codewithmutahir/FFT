import React, { useEffect, useState, useContext, useRef } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  Animated,
} from "react-native";
import firestore from "@react-native-firebase/firestore";
import { AuthContext } from "../AuthProvider";
import { useFocusEffect } from "@react-navigation/native";
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

export default function UpdatesScreen({ navigation }) {
  const { user } = useContext(AuthContext);
  const [updates, setUpdates] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      console.log("No user logged in, skipping updates fetch");
      return;
    }

    const unsubscribe = firestore()
      .collection('active-tournaments')
      .onSnapshot(
        querySnapshot => {
          const userUpdates = querySnapshot.docs
            .filter(doc => {
              const data = doc.data();
              return data.bookedSlots?.some(slot => slot.uid === user.uid);
            })
            .filter(doc => {
              const data = doc.data();
              // Only show tournaments that have actual updates (roomId or pass)
              if (!data.roomId && !data.pass) {
                return false;
              }

              // Check if update is within 1 hour (3600000 milliseconds)
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
                return false; // Hide if we can't parse the timestamp
              }

              // Only show updates from the last 1 hour
              return updateTime > oneHourAgo;
            })
            .map(doc => {
              const data = doc.data();
              let formattedTimestamp = 'Unknown time';
              try {
                if (typeof data.updatedAt === 'string') {
                  const cleanDateString = data.updatedAt.replace(' UTC+5', '');
                  const parsedDate = new Date(cleanDateString);
                  if (!isNaN(parsedDate)) {
                    formattedTimestamp = parsedDate.toLocaleString('en-US', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                      second: '2-digit',
                      hour12: true,
                    });
                  }
                } else if (data.updatedAt && data.updatedAt.toDate) {
                  formattedTimestamp = data.updatedAt
                    .toDate()
                    .toLocaleString('en-US', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                      second: '2-digit',
                      hour12: true,
                    });
                }
              } catch (error) {
                console.error('Error parsing timestamp for tournament', doc.id, error);
              }

              return {
                id: doc.id,
                name: data.name,
                roomId: data.roomId || 'Not available',
                pass: data.pass || 'Not available',
                timestamp: formattedTimestamp,
              };
            });
          setUpdates(userUpdates);
          setLoading(false);
        },
        error => {
          console.error('Error fetching updates:', error);
          setLoading(false);
        }
      );

    return () => unsubscribe();
  }, [user]);

  // ✅ NEW - Mark updates as read when screen is focused
  useFocusEffect(
    React.useCallback(() => {
      if (user && !loading) {
        // Small delay to ensure updates are loaded first
        const timer = setTimeout(() => {
          markAllUpdatesAsRead();
        }, 500);
        return () => clearTimeout(timer);
      }
    }, [user, loading])
  );

  // ✅ UPDATED - Mark ALL current updates as read
  const markAllUpdatesAsRead = async () => {
    if (!user?.uid) return;

    try {
      console.log("🔔 Marking all updates as read for user:", user.uid);
      
      // Create a single timestamp for when user viewed the updates
      const readTimestamp = firestore.Timestamp.now();
      
      // Update user's profile with last read time
      await firestore()
        .collection('users')
        .doc(user.uid)
        .set({
          lastUpdatesRead: readTimestamp
        }, { merge: true });

      console.log("✅ Updates marked as read successfully");

    } catch (error) {
      console.error("❌ Error marking updates as read:", error);
    }
  };

  const renderUpdate = ({ item }) => (
    <View style={styles.updateCard}>
      <View style={styles.cardHeader}>
        <Text style={[styles.updateTitle, typography.h1]}>{item.name}</Text>
        <View style={styles.statusBadge}>
          <Text style={styles.statusText}>NEW</Text>
        </View>
      </View>
      <View style={styles.cardContent}>
        <View style={styles.infoRow}>
          <Text style={[styles.infoLabel, typography.cardText]}>Room ID:</Text>
          <Text style={[styles.infoValue, typography.cardText]}>{item.roomId}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={[styles.infoLabel, typography.cardText]}>Pass:</Text>
          <Text style={[styles.infoValue, typography.cardText]}>{item.pass}</Text>
        </View>
      </View>
      <View style={styles.cardFooter}>
        <Text style={[styles.timestamp, { fontFamily: "WorkSans-Regular" }]}>
          Updated: {item.timestamp}
        </Text>
      </View>
    </View>
  );

  const renderSkeleton = () => (
    <View style={styles.listContainer}>
      {[1, 2, 3].map((i) => (
        <View key={i} style={styles.updateCard}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 10 }}>
            <SkeletonLoader style={{ width: 150, height: 20, borderRadius: 4 }} />
            <SkeletonLoader style={{ width: 50, height: 20, borderRadius: 4 }} />
          </View>
          <SkeletonLoader style={{ width: "80%", height: 15, borderRadius: 4, marginBottom: 8 }} />
          <SkeletonLoader style={{ width: "60%", height: 15, borderRadius: 4, marginBottom: 8 }} />
          <SkeletonLoader style={{ width: "40%", height: 12, borderRadius: 4, alignSelf: "flex-end" }} />
        </View>
      ))}
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.headerContainer}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={typography.backButtonText}>← Back</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.headerTitleContainer}>
        <Text style={[styles.headerTitle, typography.h1]}>Updates</Text>
      </View>

      {loading ? (
        renderSkeleton()
      ) : (
        <FlatList
          data={updates}
          renderItem={renderUpdate}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContainer}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No updates available yet.</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#1a1a1a",
    padding: 10,
  },
  headerContainer: {
    flexDirection: "row",
    alignItems: "center",
    padding: 15,
  },
  headerTitleContainer: {
    padding: 20,
    paddingBottom: 10,
  },
  backButton: {
    padding: 10,
  },
  backButtonText: {
    color: "#ff4500",
    fontSize: 16,
    fontWeight: "bold",
  },
  headerTitle: {
    color: "#ff4500",
    fontSize: 24,
    textAlign: "center",
    textTransform: "uppercase",
  },
  listContainer: {
    padding: 10,
  },
  updateCard: {
    backgroundColor: "#2a2a2a",
    borderRadius: 12,
    marginBottom: 15,
    padding: 15,
    borderWidth: 1,
    borderColor: "#ff450022",
    elevation: 6,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#ff450033",
    paddingBottom: 8,
  },
  updateTitle: {
    color: "#ff4500",
    fontSize: 20,
    flex: 1,
  },
  statusBadge: {
    backgroundColor: "#ff450033",
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#ff0000ff",
  },
  statusText: {
    color: "#ff0000ff",
    fontSize: 12,
    fontWeight: "600",
    textTransform: "uppercase",
  },
  cardContent: {
    marginBottom: 10,
  },
  infoRow: {
    flexDirection: "row",
    marginBottom: 8,
  },
  infoLabel: {
    color: "#888",
    fontSize: 14,
    fontWeight: "600",
    width: 80,
  },
  infoValue: {
    color: "#08CB00",
    fontSize: 16,
    fontWeight: "500",
    flex: 1,
  },
  cardFooter: {
    alignItems: "flex-end",
  },
  timestamp: {
    color: "#888",
    fontSize: 12,
    fontWeight: "600",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 50,
  },
  emptyText: {
    color: "#ffaa00",
    fontSize: 18,
    textAlign: "center",
    marginBottom: 10,
  },
  emptySubtext: {
    color: "#888",
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
  },
});