import React, { useEffect, useState, useContext } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  TextInput,
  FlatList,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from "react-native";
import firestore from "@react-native-firebase/firestore";
import { AuthContext } from "../AuthProvider";
import { typography } from "../../theme/typography";

export default function SlotBooking({ route, navigation }) {
  const { tournamentId } = route.params;
  const { user } = useContext(AuthContext);
  const [tournament, setTournament] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [inGameName, setInGameName] = useState("");
  const [uid, setUid] = useState("");
  const [userCoins, setUserCoins] = useState(0);
  const [error, setError] = useState("");
  const [userBookedSlot, setUserBookedSlot] = useState(null);
  const [loading, setLoading] = useState(false);
  const [currentUserProfile, setCurrentUserProfile] = useState(null); // New state for current user profile

  useEffect(() => {
    if (!user) {
      console.log("No user logged in, skipping tournament and user data fetch");
      return;
    }

    // Fetch tournament data from active-tournaments collection
    const unsubTournament = firestore()
      .collection("active-tournaments")
      .doc(tournamentId)
      .onSnapshot(
        (snapshot) => {
          if (snapshot.exists) {
            const tournamentData = snapshot.data();
            console.log("Tournament data:", tournamentData);
            setTournament(tournamentData);

            // Check if user already has a booked slot
            const userSlot = tournamentData.bookedSlots?.find(
              (slot) => slot.uid === user.uid
            );
            setUserBookedSlot(userSlot);
            console.log("User booked slot:", userSlot);
          } else {
            console.log("Tournament not found:", tournamentId);
            Alert.alert("Error", "Tournament not found!");
          }
        },
        (error) => {
          console.error("Error fetching tournament:", error.message);
          Alert.alert("Error", "Failed to load tournament: " + error.message);
        }
      );

    // Fetch user coins and in-game details
    const unsubUser = firestore()
      .collection("users")
      .doc(user.uid)
      .onSnapshot(
        (userSnapshot) => {
          if (userSnapshot.exists) {
            const userData = userSnapshot.data();
            setUserCoins(userData.coins || 0);
            setInGameName(userData.inGameName || "");
            setUid(userData.inGameUID || "");
            setCurrentUserProfile(userData); // Store current user profile
            console.log("User data:", userData);
          } else {
            console.log("User document not found for UID:", user.uid);
            Alert.alert(
              "Setup Required",
              "Please complete your profile setup first."
            );
          }
        },
        (error) => {
          console.error("Error fetching user data:", error.message);
          Alert.alert("Error", "Failed to load user data: " + error.message);
        }
      );

    return () => {
      unsubTournament();
      unsubUser();
    };
  }, [user, tournamentId]);

const bookSlot = async () => {
  if (!user || !tournament) {
    setError("User or tournament data unavailable");
    return;
  }

  // Validation
  if (!inGameName.trim()) {
    setError("Please enter your In-Game Name");
    return;
  }

  if (!uid.trim()) {
    setError("Please enter your UID");
    return;
  }

  // Double-check if user already has a booked slot
  if (userBookedSlot) {
    setError("You already have a slot booked in this tournament!");
    return;
  }

  const entryFee = tournament.entryFee || 0;
  if (userCoins < entryFee) {
    setError(
      `Insufficient coins! You need ${entryFee} coins, but you have ${userCoins}.`
    );
    return;
  }

  // Check if selected slot is already taken
  const isSlotTaken = tournament.bookedSlots?.some(
    (slot) => slot.slotNumber === selectedSlot
  );
  if (isSlotTaken) {
    setError("This slot has already been taken. Please select another slot.");
    return;
  }

  try {
    setLoading(true);

    const userRef = firestore().collection("users").doc(user.uid);
    const tournamentRef = firestore()
      .collection("active-tournaments")
      .doc(tournamentId);

    const updatedCoins = userCoins - entryFee;

    // Update user coins and in-game details
    await userRef.update({
      coins: updatedCoins,
      inGameName: inGameName.trim(),
      inGameUID: uid.trim(),
    });

    // Update tournament booked slots
    const updatedSlots = tournament.bookedSlots
      ? [...tournament.bookedSlots]
      : [];
    
    // 🔧 FIX: Use new Date() instead of serverTimestamp() in array
    updatedSlots.push({
      slotNumber: selectedSlot,
      uid: user.uid,
      inGameName: inGameName.trim(),
      inGameUID: uid.trim(),
      status: "confirmed",
      bookedAt: new Date(), // ✅ Changed from firestore.FieldValue.serverTimestamp()
    });

    await tournamentRef.update({
      bookedSlots: updatedSlots,
    });

    setModalVisible(false);
    setSelectedSlot(null);
    Alert.alert(
      "Slot Booked Successfully!",
      `Slot ${selectedSlot} booked successfully! ${entryFee} coins deducted.\n\nYou'll be notified when the room ID and password are released. Check the Updates section regularly for tournament updates.`,
      [{ text: "OK" }]
    );
  } catch (error) {
    console.error("Error booking slot:", error);
    setError("Failed to book slot: " + error.message);
    Alert.alert("Error", "Failed to book slot: " + error.message);
  } finally {
    setLoading(false);
  }
};


  const handleSlotPress = (slotNumber) => {
    if (userBookedSlot) {
      Alert.alert(
        "Already Booked",
        "You already have a slot booked in this tournament!"
      );
      return;
    }

    const isSlotTaken = tournament?.bookedSlots?.some(
      (slot) => slot.slotNumber === slotNumber
    );
    if (isSlotTaken) {
      Alert.alert(
        "Slot Unavailable",
        "This slot has already been taken. Please select another slot."
      );
      return;
    }

    const entryFee = tournament?.entryFee || 0;
    if (userCoins < entryFee) {
      Alert.alert(
        "Insufficient Coins",
        `You need ${entryFee} coins to book a slot, but you have ${userCoins}.`
      );
      return;
    }

    setSelectedSlot(slotNumber);
    setError("");
    setModalVisible(true);
  };

  const renderSlot = ({ item }) => {
    const bookedSlot = tournament?.bookedSlots?.find(
      (s) => s.slotNumber === item
    );
    const isBooked = !!bookedSlot;
    const isUserSlot = userBookedSlot?.slotNumber === item;

    return (
      <TouchableOpacity
        style={[
          styles.slot,
          isBooked && styles.booked,
          isUserSlot && styles.userSlot,
          loading && styles.disabledSlot,
        ]}
        disabled={isBooked || loading}
        onPress={() => handleSlotPress(item)}
      >
        <Text style={styles.slotText}>
          {isUserSlot ? "Your Slot" : isBooked ? "Booked" : `${item}`}
        </Text>
        {isBooked && !isUserSlot && (
          <Text style={styles.slotPlayerText}>{bookedSlot.inGameName}</Text>
        )}
      </TouchableOpacity>
    );
  };

  if (!tournament) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#ff4500" />
        <Text style={styles.loadingText}>Loading Tournament...</Text>
      </View>
    );
  }

  const totalSlots = tournament.slots || 50;
  const bookedSlotsCount = tournament.bookedSlots?.length || 0;
  const availableSlots = totalSlots - bookedSlotsCount;

  // Get updated user details from current profile instead of booked slot
  const displayUserDetails =
    userBookedSlot && currentUserProfile
      ? {
          slotNumber: userBookedSlot.slotNumber,
          inGameName:
            currentUserProfile.inGameName || userBookedSlot.inGameName,
          inGameUID: currentUserProfile.inGameUID || userBookedSlot.inGameUID,
        }
      : userBookedSlot;

  return (
    <View style={styles.container}>
      {loading && (
        <View style={styles.loaderOverlay}>
          <ActivityIndicator size="large" color="#ff4500" />
          <Text style={styles.loaderText}>Booking Slot...</Text>
        </View>
      )}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          disabled={loading}
        >
          <Text
            style={[typography.backButtonText, loading && styles.disabledText]}
          >
            ← Back
          </Text>
        </TouchableOpacity>
      </View>

      <Text style={typography.headerTitle}>
        {tournament?.name || "Tournament"}
      </Text>

      <View style={styles.infoContainer}>
        <Text style={[styles.info, typography.cardText]}>
          Entry Fee: Rs {tournament?.entryFee || 0}
        </Text>
        <Text style={[styles.info, typography.cardText]}>
          Your Coins: {userCoins}
        </Text>
        <Text style={[styles.info, typography.cardText]}>
          Prize Pool: Rs {tournament?.prizePool || 0}
        </Text>
        <Text style={[styles.info, typography.cardText]}>
          Start Time: {tournament?.startTime || "TBA"}
        </Text>
      </View>

      <View style={styles.statsContainer}>
        <Text style={[styles.statsText, typography.cardText]}>
          Available Slots: {availableSlots} / {totalSlots}
        </Text>
      </View>

      {displayUserDetails && (
        <View style={styles.bookedContainer}>
          <Text style={styles.bookedInfo}>
            ✓ You have booked Slot {displayUserDetails.slotNumber}
          </Text>
          <Text style={styles.bookedDetails}>
            In-Game: {displayUserDetails.inGameName || "Not set"} | UID:{" "}
            {displayUserDetails.inGameUID || "Not set"}
          </Text>
        </View>
      )}

      <FlatList
        data={Array.from({ length: totalSlots }, (_, i) => i + 1)}
        renderItem={renderSlot}
        keyExtractor={(item) => item.toString()}
        numColumns={5}
        contentContainerStyle={styles.slotsContainer}
        showsVerticalScrollIndicator={false}
      />

      <Modal visible={modalVisible} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>Book Slot {selectedSlot}</Text>

            <TextInput
              placeholder="In-Game Name"
              value={inGameName}
              onChangeText={setInGameName}
              style={styles.input}
              placeholderTextColor="#888"
              editable={!loading}
            />

            <TextInput
              placeholder="UID"
              value={uid}
              onChangeText={setUid}
              style={styles.input}
              placeholderTextColor="#888"
              keyboardType="numeric"
              editable={!loading}
            />

            <Text style={styles.confirmText}>
              Entry Fee: ₹{tournament?.entryFee || 0}
            </Text>

            {error ? <Text style={styles.error}>{error}</Text> : null}

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.confirmButton, loading && styles.disabledButton]}
                onPress={bookSlot}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.confirmButtonText}>Confirm Booking</Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.cancelButton, loading && styles.disabledButton]}
                onPress={() => {
                  setModalVisible(false);
                  setError("");
                }}
                disabled={loading}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#1a1a1a",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#1a1a1a",
  },
  loadingText: {
    color: "#fff",
    fontSize: 18,
    marginTop: 10,
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
  backButtonText: {
    color: "#ff4500",
    fontSize: 16,
    fontWeight: "bold",
  },
  heading: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#ff4500",
    marginBottom: 15,
    textAlign: "center",
    paddingHorizontal: 15,
  },
  infoContainer: {
    backgroundColor: "#2a2a2a",
    margin: 15,
    padding: 15,
    borderRadius: 10,
  },
  info: {
    color: "#ffaa00",
    fontSize: 16,
    marginBottom: 5,
  },
  statsContainer: {
    backgroundColor: "#2a2a2a",
    marginHorizontal: 15,
    marginBottom: 15,
    padding: 10,
    borderRadius: 10,
    alignItems: "center",
  },
  statsText: {
    color: "#00ff88",
    fontSize: 16,
    fontWeight: "bold",
  },
  bookedContainer: {
    backgroundColor: "#004400",
    margin: 15,
    padding: 15,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: "#00aa00",
  },
  bookedInfo: {
    color: "#00ff00",
    fontSize: 18,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 5,
  },
  bookedDetails: {
    color: "#aaffaa",
    fontSize: 14,
    textAlign: "center",
  },
  updateNotice: {
    color: "#ffff00",
    fontSize: 12,
    textAlign: "center",
    marginTop: 5,
    fontStyle: "italic",
  },
  slotsContainer: {
    padding: 15,
  },
  slot: {
    flex: 1,
    margin: 3,
    padding: 15,
    backgroundColor: "#2a2a2a",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#444",
    minHeight: 50,
  },
  booked: {
    backgroundColor: "#660000",
    borderColor: "#ff0000",
  },
  userSlot: {
    backgroundColor: "#006600",
    borderColor: "#00aa00",
  },
  slotText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "bold",
  },
  slotPlayerText: {
    color: "#ffaaaa",
    fontSize: 10,
    marginTop: 2,
    textAlign: "center",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.8)",
    justifyContent: "center",
    alignItems: "center",
  },
  modal: {
    backgroundColor: "#2a2a2a",
    borderRadius: 15,
    padding: 25,
    width: "90%",
    maxWidth: 400,
  },
  modalTitle: {
    color: "#ff4500",
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 20,
    textAlign: "center",
  },
  input: {
    borderWidth: 1,
    borderColor: "#444",
    color: "#fff",
    padding: 15,
    borderRadius: 8,
    marginBottom: 15,
    backgroundColor: "#1a1a1a",
    fontSize: 16,
  },
  confirmText: {
    color: "#ffaa00",
    fontSize: 16,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 15,
  },
  error: {
    color: "#ff4444",
    marginBottom: 15,
    textAlign: "center",
    fontSize: 14,
  },
  modalButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 10,
  },
  confirmButton: {
    flex: 1,
    backgroundColor: "#ff4500",
    padding: 15,
    borderRadius: 8,
    alignItems: "center",
  },
  confirmButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
  cancelButton: {
    flex: 1,
    backgroundColor: "#666",
    padding: 15,
    borderRadius: 8,
    alignItems: "center",
  },
  cancelButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
  loaderOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#1a1a1a99",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 10,
  },
  loaderText: {
    color: "#ff4500",
    fontSize: 16,
    marginTop: 10,
    fontWeight: "bold",
  },
  disabledSlot: {
    opacity: 0.6,
  },
  disabledButton: {
    opacity: 0.6,
  },
  disabledText: {
    opacity: 0.6,
  },
});
