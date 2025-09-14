import React, { useState, useEffect, useContext } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { AuthContext } from "../AuthProvider";
import { typography } from "../../theme/typography";
import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';

export default function ProfileScreen() {
  const { user } = useContext(AuthContext);
  const [profile, setProfile] = useState({
    inGameName: "",
    inGameUID: "",
    coins: 0,
    email: "",
  });
  const [originalProfile, setOriginalProfile] = useState({
    inGameName: "",
    inGameUID: "",
  });
  const [newPassword, setNewPassword] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [showPasswordChange, setShowPasswordChange] = useState(false);
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) {
      const fetchProfile = async () => {
        try {
          setLoading(true);
          const userDoc = await firestore().collection('users').doc(user.uid).get();
          if (userDoc.exists) {
            const data = userDoc.data();
            const profileData = {
              inGameName: data.inGameName || "",
              inGameUID: data.inGameUID || "",
              coins: data.coins || 0,
              email: user.email || "",
            };
            setProfile(profileData);
            setOriginalProfile({
              inGameName: data.inGameName || "",
              inGameUID: data.inGameUID || "",
            });
          }
        } catch (error) {
          console.error("Error fetching profile:", error.message);
          Alert.alert("Error", "Failed to load profile: " + error.message);
        } finally {
          setLoading(false);
        }
      };
      fetchProfile();
    }
  }, [user]);

  const updateTournamentSlots = async (newInGameName, newInGameUID) => {
    try {
      const tournamentsSnapshot = await firestore().collection('active-tournaments').get();
      
      const batch = firestore().batch();
      let updatedTournaments = 0;

      tournamentsSnapshot.forEach((doc) => {
        const tournamentData = doc.data();
        if (tournamentData.bookedSlots && Array.isArray(tournamentData.bookedSlots)) {
          const userSlotIndex = tournamentData.bookedSlots.findIndex(slot => slot.uid === user.uid);
          
          if (userSlotIndex !== -1) {
            const updatedSlots = [...tournamentData.bookedSlots];
            updatedSlots[userSlotIndex] = {
              ...updatedSlots[userSlotIndex],
              inGameName: newInGameName,
              inGameUID: newInGameUID,
              updatedAt: new Date().toISOString()
            };
            
            const tournamentRef = firestore().collection('active-tournaments').doc(doc.id);
            batch.update(tournamentRef, { bookedSlots: updatedSlots });
            updatedTournaments++;
          }
        }
      });

      if (updatedTournaments > 0) {
        await batch.commit();
        console.log(`Updated ${updatedTournaments} tournament(s) with new profile info`);
      }
    } catch (error) {
      console.error("Error updating tournament slots:", error);
      Alert.alert("Warning", "Profile updated but there was an issue updating tournament registrations. Your new details will be used in future tournaments.");
    }
  };

  const handleUpdateProfile = async () => {
    try {
      setLoading(true);
      
      const trimmedInGameName = profile.inGameName.trim();
      const trimmedInGameUID = profile.inGameUID.trim();
      
      const updates = {
        inGameName: trimmedInGameName,
        inGameUID: trimmedInGameUID,
      };
      
      await firestore().collection('users').doc(user.uid).update(updates);
      
      const profileChanged = originalProfile.inGameName !== trimmedInGameName || 
                           originalProfile.inGameUID !== trimmedInGameUID;
      
      if (profileChanged) {
        await updateTournamentSlots(trimmedInGameName, trimmedInGameUID);
        
        setOriginalProfile({
          inGameName: trimmedInGameName,
          inGameUID: trimmedInGameUID,
        });
      }
      
      setEditing(false);
      Alert.alert(
        "Success", 
        profileChanged 
          ? "Profile updated successfully! Your new details will be used in all tournaments."
          : "Profile updated successfully!"
      );
    } catch (error) {
      console.error("Profile update error:", error.message);
      Alert.alert("Error", "Failed to update profile: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword) {
      Alert.alert("Error", "Please enter both current and new passwords");
      return;
    }
    if (newPassword.length < 6) {
      Alert.alert("Error", "New password must be at least 6 characters long");
      return;
    }

    try {
      setLoading(true);
      
      // Reauthenticate user
      const credential = auth.EmailAuthProvider.credential(user.email, currentPassword);
      await auth().currentUser.reauthenticateWithCredential(credential);
      
      // Update password
      await auth().currentUser.updatePassword(newPassword);
      
      setNewPassword("");
      setCurrentPassword("");
      setShowPasswordChange(false);
      setEditing(false);
      Alert.alert("Success", "Password updated successfully!");
    } catch (error) {
      console.error("Password update error:", error.message);
      let errorMessage = "Failed to update password: " + error.message;
      if (error.code === 'auth/wrong-password') {
        errorMessage = "Current password is incorrect.";
      } else if (error.code === 'auth/weak-password') {
        errorMessage = "New password is too weak. Please choose a stronger password.";
      }
      Alert.alert("Error", errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      setLoading(true);
      await auth().signOut();
      Alert.alert("Success", "You have been logged out successfully.");
    } catch (error) {
      console.error("Logout error:", error.message);
      Alert.alert("Error", "Failed to log out: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCancelEdit = () => {
    setProfile(prev => ({
      ...prev,
      inGameName: originalProfile.inGameName,
      inGameUID: originalProfile.inGameUID,
    }));
    setEditing(false);
    setShowPasswordChange(false);
    setCurrentPassword("");
    setNewPassword("");
  };

  const loadUserData = async () => {
    try {
      if (!user?.uid) {
        console.log('No user ID found');
        return;
      }

      const userDoc = await firestore()
        .collection('users')
        .doc(user.uid)
        .get();

      if (!userDoc.exists) {
        console.log('No user document found');
        return;
      }

      const userData = userDoc.data();
      if (!userData) {
        console.log('User document is empty');
        return;
      }

      setUserData(userData);
    } catch (error) {
      console.error('Error loading user data:', error);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.headerContainer}>
        <Text style={[styles.headerTitle, typography.headerTitle]}>Profile</Text>
      </View>
      {loading && (
        <View style={styles.loaderOverlay}>
          <ActivityIndicator size="large" color="#ff4500" />
          <Text style={styles.loaderText}>Processing...</Text>
        </View>
      )}
      <View style={[styles.profileCard, loading && styles.disabledCard]}>
        <View style={styles.infoRow}>
          <Ionicons name="person-circle" size={24} color="#ff4500" style={styles.icon} />
          <Text style={[styles.label, typography.cardText]}>Email:</Text>
          <Text style={[styles.value, typography.cardText]}>{profile.email}</Text>
        </View>
        <View style={styles.infoRow}>
          <Ionicons name="wallet" size={24} color="#00ff88" style={styles.icon} />
          <Text style={[styles.label, typography.cardText]}>Coins:</Text>
          <Text style={[styles.value, typography.cardText]}>{profile.coins}</Text>
        </View>
        <View style={styles.infoRow}>
          <Ionicons name="game-controller" size={24} color="#ffd700" style={styles.icon} />
          <Text style={[styles.label, typography.cardText]}>In-Game Name:</Text>
          {editing ? (
            <TextInput
              style={styles.input}
              value={profile.inGameName}
              onChangeText={(text) => setProfile({ ...profile, inGameName: text })}
              placeholder="Enter in-game name"
              placeholderTextColor="#888"
              editable={!loading}
            />
          ) : (
            <Text style={[styles.value, typography.cardText]}>{profile.inGameName || "Not set"}</Text>
          )}
        </View>
        <View style={styles.infoRow}>
          <Ionicons name="id-card" size={24} color="#ffaa00" style={styles.icon} />
          <Text style={[styles.label, typography.cardText]}>In-Game UID:</Text>
          {editing ? (
            <TextInput
              style={styles.input}
              value={profile.inGameUID}
              onChangeText={(text) => setProfile({ ...profile, inGameUID: text })}
              placeholder="Enter in-game UID"
              placeholderTextColor="#888"
              editable={!loading}
            />
          ) : (
            <Text style={styles.value}>{profile.inGameUID || "Not set"}</Text>
          )}
        </View>
        {editing && showPasswordChange && (
          <>
            <View style={styles.infoRow}>
              <Ionicons name="lock-closed" size={24} color="#ff4500" style={styles.icon} />
              <Text style={styles.label}>Current Password:</Text>
              <TextInput
                style={styles.input}
                value={currentPassword}
                onChangeText={setCurrentPassword}
                secureTextEntry
                placeholder="Enter current password"
                placeholderTextColor="#888"
                editable={!loading}
              />
            </View>
            <View style={styles.infoRow}>
              <Ionicons name="lock-open" size={24} color="#ff4500" style={styles.icon} />
              <Text style={styles.label}>New Password:</Text>
              <TextInput
                style={styles.input}
                value={newPassword}
                onChangeText={setNewPassword}
                secureTextEntry
                placeholder="Enter new password"
                placeholderTextColor="#888"
                editable={!loading}
              />
            </View>
          </>
        )}
        <TouchableOpacity
          style={[styles.actionButton, loading && styles.disabledButton]}
          onPress={editing ? handleUpdateProfile : () => setEditing(true)}
          disabled={loading}
        >
          {loading && editing && !showPasswordChange ? (
            <ActivityIndicator size="small" color="#fff" style={styles.buttonIcon} />
          ) : (
            <Ionicons name={editing ? "save" : "pencil"} size={20} color="#fff" style={styles.buttonIcon} />
          )}
          <Text style={styles.actionButtonText}>{editing ? "Save Profile" : "Edit Profile"}</Text>
        </TouchableOpacity>
        {!editing && (
          <TouchableOpacity
            style={[styles.actionButton, styles.passwordButton, loading && styles.disabledButton]}
            onPress={() => {
              setEditing(true);
              setShowPasswordChange(true);
            }}
            disabled={loading}
          >
            <Ionicons name="lock-closed" size={20} color="#fff" style={styles.buttonIcon} />
            <Text style={styles.actionButtonText}>Change Password</Text>
          </TouchableOpacity>
        )}
        {editing && (
          <TouchableOpacity
            style={[styles.actionButton, styles.cancelButton, loading && styles.disabledButton]}
            onPress={handleCancelEdit}
            disabled={loading}
          >
            <Ionicons name="close" size={20} color="#fff" style={styles.buttonIcon} />
            <Text style={styles.actionButtonText}>Cancel</Text>
          </TouchableOpacity>
        )}
        {editing && showPasswordChange && (
          <TouchableOpacity
            style={[styles.actionButton, styles.savePasswordButton, loading && styles.disabledButton]}
            onPress={handleChangePassword}
            disabled={loading}
          >
            {loading && showPasswordChange ? (
              <ActivityIndicator size="small" color="#fff" style={styles.buttonIcon} />
            ) : (
              <Ionicons name="save" size={20} color="#fff" style={styles.buttonIcon} />
            )}
            <Text style={styles.actionButtonText}>Save Password</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity
          style={[styles.actionButton, styles.logoutButton, loading && styles.disabledButton]}
          onPress={handleLogout}
          disabled={loading}
        >
          <Ionicons name="log-out" size={20} color="#fff" style={styles.buttonIcon} />
          <Text style={styles.actionButtonText}>Log Out</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#1a1a1a",
    padding: 15,
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
  profileCard: {
    backgroundColor: "#2a2a2a",
    borderRadius: 16,
    padding: 20,
    marginTop: 20,
    elevation: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    borderWidth: 1,
    borderColor: "#ff450022",
  },
  disabledCard: {
    opacity: 0.6,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 15,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#ff450033",
  },
  icon: {
    marginRight: 10,
  },
  label: {
    color: "#888",
    fontSize: 16,
    fontWeight: "600",
    width: 120,
  },
  value: {
    color: "#ffd700",
    fontSize: 16,
    flex: 1,
  },
  input: {
    flex: 1,
    backgroundColor: "#1f1f1f",
    color: "#fff",
    padding: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#ff450022",
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ff4500",
    padding: 12,
    borderRadius: 8,
    marginTop: 10,
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#ff450099",
  },
  passwordButton: {
    backgroundColor: "#ffaa00",
    borderColor: "#ffaa0099",
  },
  savePasswordButton: {
    backgroundColor: "#00ff88",
    borderColor: "#00ff8844",
  },
  cancelButton: {
    backgroundColor: "#444",
    borderColor: "#444",
  },
  logoutButton: {
    backgroundColor: "#d32f2f",
    borderColor: "#d32f2f99",
  },
  actionButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
    marginLeft: 8,
  },
  buttonIcon: {
    marginRight: 5,
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
  disabledButton: {
    opacity: 0.6,
  },
});