import React, { useState, useContext, memo } from "react";
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
  Dimensions,
} from "react-native";
import { AuthContext } from "../AuthProvider";
import { sendPasswordResetEmail } from "firebase/auth";
import { auth } from "../../firebase";
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { getFriendlyFirebaseError } from "../utils/firebaseErrors";

const { width, height } = Dimensions.get('window');

const InputField = memo(({ iconName, value, onChangeText, placeholder, secureTextEntry, showPasswordToggle, onTogglePassword }) => {
  return (
    <View style={styles.inputContainer}>
      <Text style={styles.label}>{placeholder === "you@example.com" ? "Email" : "Password"}</Text>
      <View style={styles.inputWrapper}>
        <Ionicons 
          name={iconName} 
          size={20} 
          color="#9AA0A6" 
          style={styles.inputIcon}
        />
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          autoCapitalize={placeholder === "you@example.com" ? "none" : undefined}
          keyboardType={placeholder === "you@example.com" ? "email-address" : undefined}
          secureTextEntry={secureTextEntry}
          style={[styles.input, showPasswordToggle && { flex: 1 }]}
          placeholderTextColor="#9AA0A6"
          editable={true}
          pointerEvents="auto"
        />
        {showPasswordToggle && (
          <TouchableOpacity 
            onPress={onTogglePassword}
            style={styles.eyeIcon}
          >
            <Ionicons 
              name={secureTextEntry ? "eye-off-outline" : "eye-outline"} 
              size={20} 
              color="#9AA0A6"
            />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
});

export default function LoginScreen({ navigation }) {
  const { login } = useContext(AuthContext);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showErrors, setShowErrors] = useState(false);
  const [errorText, setErrorText] = useState("");
  const [loading, setLoading] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);

  const validate = () => {
    if (!email.trim() || !password.trim()) {
      setErrorText("Gamer ID and Passcode are required.");
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
      setErrorText("Please enter your Gamer ID to reset Passcode.");
      setShowErrors(true);
      return;
    }
    setResetLoading(true);
    try {
      await sendPasswordResetEmail(auth, email.trim());
      alert("Passcode reset link sent to your email.");
    } catch (error) {
      setErrorText(getFriendlyFirebaseError(error?.code));
      setShowErrors(true);
    } finally {
      setResetLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Background Gradient */}
      <LinearGradient
        colors={['#1A1A1A', '#2D2D2D', '#3C3C3C']}
        start={{x: 0, y: 0}}
        end={{x: 1, y: 1}}
        style={styles.backgroundGradient}
      />
      
      {/* Gaming Overlay (Pixel Grid) */}
      <View style={styles.overlay} />
      
      <KeyboardAvoidingView
        behavior={Platform.select({ ios: "padding", android: "height" })}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContainer}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.contentContainer}>
            {/* Welcome Section */}
            <View style={styles.welcomeSection}>
              <Text style={styles.welcomeTitle}>ProArena</Text>
              <Text style={styles.welcomeSubtitle}>Log in to start your adventure</Text>
            </View>

            {/* Main Card */}
            <View style={styles.card}>
              {/* Email Input */}
              <InputField
                iconName="game-controller-outline"
                value={email}
                onChangeText={setEmail}
                placeholder="you@example.com"
              />

              {/* Password Input */}
              <InputField
                iconName="shield-outline"
                value={password}
                onChangeText={setPassword}
                placeholder="Enter your Password"
                secureTextEntry={!showPassword}
                showPasswordToggle
                onTogglePassword={() => setShowPassword(!showPassword)}
              />

              {/* Forgot Password */}
              <TouchableOpacity
                onPress={handleForgotPassword}
                disabled={resetLoading}
                style={styles.forgotPasswordContainer}
              >
                <Text style={styles.forgotPasswordText}>
                  {resetLoading ? "Sending..." : "Forgot Passcode?"}
                </Text>
              </TouchableOpacity>

              {/* Error Message */}
              {showErrors && (
                <View style={styles.errorContainer}>
                  <Ionicons name="alert-circle-outline" size={16} color="#FF6B35" />
                  <Text style={styles.errorText}>{errorText}</Text>
                </View>
              )}

              {/* Login Button */}
              <TouchableOpacity
                style={[styles.loginButton, loading && styles.loginButtonDisabled]}
                onPress={handleLogin}
                activeOpacity={0.8}
                disabled={loading}
              >
                <LinearGradient
                  colors={loading ? ['#4A4A4A', '#6B6B6B'] : ['#FF6B35', '#F7931E']}
                  start={{x: 0, y: 0}}
                  end={{x: 1, y: 0}}
                  style={styles.loginButtonGradient}
                >
                  {loading ? (
                    <ActivityIndicator color="#FFFFFF" size="small" />
                  ) : (
                    <>
                      <Text style={styles.loginButtonText}>Login Now</Text>
                      <Ionicons name="arrow-forward" size={20} color="#FFFFFF" />
                    </>
                  )}
                </LinearGradient>
              </TouchableOpacity>

              {/* Register Link */}
              <View style={styles.registerContainer}>
                <Text style={styles.registerText}>New to the game? </Text>
                <TouchableOpacity onPress={() => navigation.navigate("Register")}>
                  <Text style={styles.registerLink}>Join ProArena</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1A1A1A',
  },
  backgroundGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 107, 53, 0.05)', // Subtle orange tint for gaming vibe
    opacity: 0.3,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center', // This centers the content vertically
    paddingHorizontal: 24,
    paddingVertical: 40,
    minHeight: height - 100, // Ensures minimum height for centering
  },
  contentContainer: {
    width: '100%',
    maxWidth: 400, // Limits width on larger screens
    alignSelf: 'center', // Centers horizontally
  },
  welcomeSection: {
    marginBottom: 40,
    alignItems: 'center',
  },
  welcomeTitle: {
    fontSize: 36,
    fontWeight: '900',
    color: '#FFFFFF',
    marginBottom: 8,
    textAlign: 'center',
    textShadowColor: '#FF6B35',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  welcomeSubtitle: {
    fontSize: 16,
    color: '#B0B0B0',
    textAlign: 'center',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 10,
    borderWidth: 1,
    borderColor: '#FF6B35',
  },
  inputContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 8,
    marginLeft: 4,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F7FAFC',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    paddingHorizontal: 16,
    paddingVertical: 12,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#1F2937',
    paddingVertical: 0,
  },
  inputIcon: {
    marginRight: 12,
  },
  eyeIcon: {
    padding: 4,
  },
  forgotPasswordContainer: {
    alignSelf: 'flex-end',
    marginTop: -8,
    marginBottom: 24,
  },
  forgotPasswordText: {
    color: '#FF6B35',
    fontSize: 14,
    fontWeight: '600',
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 107, 53, 0.1)',
    padding: 12,
    borderRadius: 12,
    marginBottom: 20,
    borderLeftWidth: 4,
    borderLeftColor: '#FF6B35',
  },
  errorText: {
    marginLeft: 8,
    color: '#FF6B35',
    fontSize: 14,
    fontWeight: '500',
  },
  loginButton: {
    borderRadius: 12,
    marginBottom: 24,
    overflow: 'hidden',
    shadowColor: '#FF6B35',
    shadowOpacity: 0.3,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  loginButtonDisabled: {
    opacity: 0.7,
  },
  loginButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
  },
  loginButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
    marginRight: 8,
  },
  registerContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  registerText: {
    color: '#6B7280',
    fontSize: 15,
  },
  registerLink: {
    color: '#FF6B35',
    fontSize: 15,
    fontWeight: '700',
  },
});