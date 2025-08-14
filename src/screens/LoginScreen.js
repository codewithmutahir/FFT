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
  Image,
} from "react-native";
import { AuthContext } from "../AuthProvider";
import AuthHeader from "../components/AuthHeader";
import { getFriendlyFirebaseError } from "../utils/firebaseErrors";
import { useGoogleAuth } from "../utils/googleAuth";
import { sendPasswordResetEmail } from "firebase/auth";
import { auth } from "../../firebase";

export default function LoginScreen({ navigation }) {
  const { handleGoogleSignIn, request } = useGoogleAuth();
  const { login } = useContext(AuthContext);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showErrors, setShowErrors] = useState(false);
  const [errorText, setErrorText] = useState("");
  const [loading, setLoading] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);

  const validate = () => {
    if (!email.trim() || !password.trim()) {
      setErrorText("Email and password are required.");
      return false;
    }
    const ok = /\S+@\S+\.\S+/.test(email.trim());
    if (!ok) {
      setErrorText("Please enter a valid email address.");
      return false;
    }
    return true;
  };

  const handleLogin = async () => {
    setShowErrors(false);
    setErrorText("");
    if (!validate()) {
      setShowErrors(true);
      return;
    }
    try {
      setLoading(true);
      await login(email.trim(), password);
    } catch (e) {
      setErrorText(getFriendlyFirebaseError(e?.code));
      setShowErrors(true);
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!email.trim()) {
      setErrorText("Please enter your email to reset password.");
      setShowErrors(true);
      return;
    }
    setResetLoading(true);
    try {
      await sendPasswordResetEmail(auth, email.trim());
      alert("Password reset link sent to your email.");
    } catch (error) {
      setErrorText(getFriendlyFirebaseError(error?.code));
      setShowErrors(true);
    } finally {
      setResetLoading(false);
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
        <AuthHeader title="Welcome back!" />

        <View style={styles.card}>
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

          <Text style={[styles.label, { marginTop: 14 }]}>Password</Text>
          <TextInput
            value={password}
            onChangeText={setPassword}
            placeholder="Enter your password"
            secureTextEntry
            style={styles.input}
            placeholderTextColor="#9AA0A6"
          />

          {/* Forgot password link */}
          <TouchableOpacity
            onPress={handleForgotPassword}
            disabled={resetLoading}
            style={{ alignSelf: "flex-end", marginTop: 6 }}
          >
            <Text style={{ color: "#2563EB", fontWeight: "500" }}>
              {resetLoading ? "Sending..." : "Forgot Password?"}
            </Text>
          </TouchableOpacity>

          {showErrors ? (
            <Text style={styles.errorText}>{errorText}</Text>
          ) : null}

          <TouchableOpacity
            style={[styles.primaryBtn, loading && { opacity: 0.8 }]}
            onPress={handleLogin}
            activeOpacity={0.9}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator />
            ) : (
              <Text style={styles.primaryBtnText}>Login</Text>
            )}
          </TouchableOpacity>

          {/* Google Sign-in */}
          <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
            <View style={styles.googleDivider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>OR</Text>
              <View style={styles.dividerLine} />
            </View>

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
          </View>

          <View style={styles.bottomRow}>
            <Text style={styles.muted}>Don’t have an account? </Text>
            <TouchableOpacity onPress={() => navigation.navigate("Register")}>
              <Text style={styles.link}>Create one</Text>
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

  // styles me ye add karo
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
});
