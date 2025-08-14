import React, { useState, useContext } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Image
} from "react-native";
import { AuthContext } from "../AuthProvider";
import AuthHeader from "../components/AuthHeader";
import { getFriendlyFirebaseError } from "../utils/firebaseErrors";
import { useGoogleAuth } from "../utils/googleAuth";
import { db } from "../../firebase"; 
import { doc, setDoc } from "firebase/firestore";

export default function RegisterScreen({ navigation }) {
  const { register } = useContext(AuthContext);
  const { handleGoogleSignIn, request } = useGoogleAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [inGameName, setInGameName] = useState("");
  const [inGameUID, setInGameUID] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");

  const [showErrors, setShowErrors] = useState(false);
  const [errorText, setErrorText] = useState("");
  const [loading, setLoading] = useState(false);

  const validate = () => {
    if (
      !email.trim() ||
      !password.trim() ||
      !confirmPassword.trim() ||
      !inGameName.trim() ||
      !inGameUID.trim() ||
      !phoneNumber.trim()
    ) {
      setErrorText("All fields are required.");
      return false;
    }
    if (!/\S+@\S+\.\S+/.test(email.trim())) {
      setErrorText("Please enter a valid email address.");
      return false;
    }
    if (password.length < 6) {
      setErrorText("Password must be at least 6 characters.");
      return false;
    }
    if (password !== confirmPassword) {
      setErrorText("Passwords do not match.");
      return false;
    }
    if (!/^\d+$/.test(inGameUID.trim())) {
      setErrorText("In-Game UID must be numeric.");
      return false;
    }
    if (!/^[0-9]{10,15}$/.test(phoneNumber.trim())) {
      setErrorText("Please enter a valid phone number.");
      return false;
    }
    return true;
  };

  const handleRegister = async () => {
    setShowErrors(false);
    setErrorText("");

    if (!validate()) {
      setShowErrors(true);
      return;
    }

    try {
      setLoading(true);

      // Register user with Firebase Authentication
      const userCredential = await register(email.trim(), password);
      const user = userCredential.user;

      // Store additional user data in Firestore
      await setDoc(doc(db, "users", user.uid), {
        email: email.trim(),
        inGameName: inGameName.trim(),
        inGameUID: inGameUID.trim(),
        phoneNumber: phoneNumber.trim(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });

      console.log("User registered and data stored successfully!");

    } catch (e) {
      console.error("Registration error:", e);
      setErrorText(getFriendlyFirebaseError(e?.code));
      setShowErrors(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.select({ ios: "padding", android: undefined })}
      style={{ flex: 1 }}
    >
      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
      >
        <AuthHeader title="Create your account" />

        <View style={styles.card}>
          {/* Email */}
          <Text style={styles.label}>Email</Text>
          <TextInput
            value={email}
            onChangeText={setEmail}
            placeholder="you@example.com"
            autoCapitalize="none"
            keyboardType="email-address"
            style={styles.input}
            placeholderTextColor="#9AA0A6"
          />

          {/* Password */}
          <Text style={[styles.label, { marginTop: 14 }]}>Password</Text>
          <TextInput
            value={password}
            onChangeText={setPassword}
            placeholder="Enter your password"
            secureTextEntry
            style={styles.input}
            placeholderTextColor="#9AA0A6"
          />

          {/* Confirm Password */}
          <Text style={[styles.label, { marginTop: 14 }]}>Confirm Password</Text>
          <TextInput
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            placeholder="Re-enter your password"
            secureTextEntry
            style={styles.input}
            placeholderTextColor="#9AA0A6"
          />

          {/* In-Game Name */}
          <Text style={[styles.label, { marginTop: 14 }]}>In-Game Name</Text>
          <TextInput
            value={inGameName}
            onChangeText={setInGameName}
            placeholder="Enter your in-game name"
            style={styles.input}
            placeholderTextColor="#9AA0A6"
          />

          {/* In-Game UID */}
          <Text style={[styles.label, { marginTop: 14 }]}>In-Game UID</Text>
          <TextInput
            value={inGameUID}
            onChangeText={setInGameUID}
            placeholder="Enter your in-game UID"
            keyboardType="numeric"
            style={styles.input}
            placeholderTextColor="#9AA0A6"
          />

          {/* Phone Number */}
          <Text style={[styles.label, { marginTop: 14 }]}>Phone Number</Text>
          <TextInput
            value={phoneNumber}
            onChangeText={setPhoneNumber}
            placeholder="Enter your phone number"
            keyboardType="phone-pad"
            style={styles.input}
            placeholderTextColor="#9AA0A6"
          />

          {/* Error */}
          {showErrors ? (
            <Text style={styles.errorText}>{errorText}</Text>
          ) : null}

          {/* Register Button */}
          <TouchableOpacity
            style={[styles.primaryBtn, loading && { opacity: 0.8 }]}
            onPress={handleRegister}
            activeOpacity={0.9}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.primaryBtnText}>Register</Text>
            )}
          </TouchableOpacity>

          {/* Divider */}
          <View style={styles.googleDivider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>OR</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* Google Sign-in Button */}
          <TouchableOpacity
            style={styles.googleBtn}
            disabled={!request}
            onPress={handleGoogleSignIn}
            activeOpacity={0.8}
          >
            <View style={styles.googleContent}>
              <View style={styles.googleIconWrapper}>
                <Image
                  source={require("../../assets/google.png")}
                  style={{ width: 18, height: 18 }}
                />
              </View>
              <Text style={styles.googleText}>Continue with Google</Text>
            </View>
          </TouchableOpacity>

          {/* Login Link */}
          <View style={styles.bottomRow}>
            <Text style={styles.muted}>Already have an account? </Text>
            <TouchableOpacity onPress={() => navigation.navigate("Login")}>
              <Text style={styles.link}>Login</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    paddingTop: 28,
    flexGrow: 1,
    backgroundColor: "#FFFFFF",
  },
  card: {
    backgroundColor: "#F7F8FA",
    borderRadius: 16,
    padding: 16,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1F2937",
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: "#111827",
  },
  errorText: {
    marginTop: 10,
    color: "#D14343",
    fontSize: 13,
    fontWeight: "500",
  },
  primaryBtn: {
    marginTop: 16,
    backgroundColor: "#111827",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryBtnText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
  googleDivider: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 20,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: "#E5E7EB",
  },
  dividerText: {
    marginHorizontal: 10,
    color: "#6B7280",
    fontSize: 14,
  },
  googleBtn: {
    backgroundColor: "#FFFFFF",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    paddingVertical: 10,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  googleContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  googleIconWrapper: {
    backgroundColor: "#FFFFFF",
    padding: 4,
    borderRadius: 4,
    marginRight: 10,
  },
  googleText: {
    fontSize: 16,
    fontWeight: "500",
    color: "#1F2937",
  },
  bottomRow: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 14,
  },
  muted: {
    color: "#6B7280",
  },
  link: {
    color: "#111827",
    fontWeight: "700",
  },
});