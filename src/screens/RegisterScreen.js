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
  Image,
} from "react-native";
import { AuthContext } from "../AuthProvider";
import { getFriendlyFirebaseError } from "../utils/firebaseErrors";
import { useGoogleAuth } from "../utils/googleAuth";
import { db } from "../../firebase";
import { doc, setDoc } from "firebase/firestore";
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

const { width, height } = Dimensions.get('window');

const InputField = memo(({ label, value, onChangeText, placeholder, iconName, secureTextEntry, showPasswordToggle, onTogglePassword, keyboardType = "default", ...props }) => {
  return (
    <View style={styles.inputContainer}>
      <Text style={styles.label}>{label}</Text>
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
          keyboardType={keyboardType}
          secureTextEntry={secureTextEntry}
          style={[styles.input, showPasswordToggle && { flex: 1 }]}
          placeholderTextColor="#9AA0A6"
          editable={true}
          pointerEvents="auto"
          {...props}
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

export default function RegisterScreen({ navigation }) {
  const { register } = useContext(AuthContext);
  const { handleGoogleSignIn, request } = useGoogleAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [inGameName, setInGameName] = useState("");
  const [inGameUID, setInGameUID] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
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
      setErrorText("Please enter a valid Gamer ID (email).");
      return false;
    }
    if (password.length < 6) {
      setErrorText("Passcode must be at least 6 characters.");
      return false;
    }
    if (password !== confirmPassword) {
      setErrorText("Passcodes do not match.");
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
      const userCredential = await register(email.trim(), password);
      const user = userCredential.user;
      await setDoc(doc(db, "users", user.uid), {
        email: email.trim(),
        inGameName: inGameName.trim(),
        inGameUID: inGameUID.trim(),
        phoneNumber: phoneNumber.trim(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        coins: 0,
        wonTournaments: 0,
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
    <View style={styles.container}>
      {/* Background Gradient */}
      <LinearGradient
        colors={['#1A1A1A', '#2D2D2D', '#3C3C3C']}
        start={{x: 0, y: 0}}
        end={{x: 1, y: 1}}
        style={styles.backgroundGradient}
      />
      
      {/* Gaming Overlay */}
      <View style={styles.overlay} />
      
      <KeyboardAvoidingView
        behavior={Platform.select({ ios: "padding", android: undefined })}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContainer}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Welcome Section */}
          <View style={styles.welcomeSection}>
            <Text style={styles.welcomeTitle}>Join the Game!</Text>
            <Text style={styles.welcomeSubtitle}>Create your gamer profile</Text>
          </View>

          {/* Main Card */}
          <View style={styles.card}>
            {/* Email Input */}
            <InputField
              label="Gamer ID (Email)"
              value={email}
              onChangeText={setEmail}
              placeholder="you@example.com"
              iconName="game-controller-outline"
              keyboardType="email-address"
              autoCapitalize="none"
            />

            {/* Password Input */}
            <InputField
              label="Passcode"
              value={password}
              onChangeText={setPassword}
              placeholder="Create a strong passcode"
              iconName="shield-outline"
              secureTextEntry={!showPassword}
              showPasswordToggle
              onTogglePassword={() => setShowPassword(!showPassword)}
            />

            {/* Confirm Password Input */}
            <InputField
              label="Confirm Passcode"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              placeholder="Re-enter your passcode"
              iconName="shield-outline"
              secureTextEntry={!showConfirmPassword}
              showPasswordToggle
              onTogglePassword={() => setShowConfirmPassword(!showConfirmPassword)}
            />

            {/* In-Game Name Input */}
            <InputField
              label="In-Game Name"
              value={inGameName}
              onChangeText={setInGameName}
              placeholder="Your gaming alias"
              iconName="person-outline"
            />

            {/* In-Game UID Input */}
            <InputField
              label="In-Game UID"
              value={inGameUID}
              onChangeText={setInGameUID}
              placeholder="Your unique game ID"
              iconName="finger-print-outline"
              keyboardType="numeric"
            />

            {/* Phone Number Input */}
            <InputField
              label="Phone Number"
              value={phoneNumber}
              onChangeText={setPhoneNumber}
              placeholder="Your phone number"
              iconName="call-outline"
              keyboardType="phone-pad"
            />

            {/* Error Message */}
            {showErrors && (
              <View style={styles.errorContainer}>
                <Ionicons name="alert-circle-outline" size={16} color="#FF6B35" />
                <Text style={styles.errorText}>{errorText}</Text>
              </View>
            )}

            {/* Register Button */}
            <TouchableOpacity
              style={[styles.registerButton, loading && styles.registerButtonDisabled]}
              onPress={handleRegister}
              activeOpacity={0.8}
              disabled={loading}
            >
              <LinearGradient
                colors={loading ? ['#4A4A4A', '#6B6B6B'] : ['#FF6B35', '#F7931E']}
                start={{x: 0, y: 0}}
                end={{x: 1, y: 0}}
                style={styles.registerButtonGradient}
              >
                {loading ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <>
                    <Text style={styles.registerButtonText}>Register Now</Text>
                    <Ionicons name="play" size={20} color="#FFFFFF" />
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>

            {/* Login Link */}
            <View style={styles.loginContainer}>
              <Text style={styles.loginText}>Already in the game? </Text>
              <TouchableOpacity onPress={() => navigation.navigate("Login")}>
                <Text style={styles.loginLink}>Sign In</Text>
              </TouchableOpacity>
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
    backgroundColor: 'rgba(255, 107, 53, 0.05)',
    opacity: 0.3,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContainer: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 40,
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
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#1F2937',
    paddingVertical: 0,
  },
  eyeIcon: {
    padding: 4,
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
  registerButton: {
    borderRadius: 12,
    marginBottom: 24,
    marginTop: 8,
    overflow: 'hidden',
    shadowColor: '#FF6B35',
    shadowOpacity: 0.3,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  registerButtonDisabled: {
    opacity: 0.7,
  },
  registerButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
  },
  registerButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
    marginRight: 8,
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#E5E7EB',
  },
  dividerText: {
    marginHorizontal: 16,
    color: '#6B7280',
    fontSize: 14,
    fontWeight: '500',
  },
  googleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    paddingVertical: 14,
    paddingHorizontal: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
  googleIcon: {
    width: 24,
    height: 24,
    marginRight: 12,
  },
  googleButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
  },
  loginContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loginText: {
    color: '#6B7280',
    fontSize: 15,
  },
  loginLink: {
    color: '#FF6B35',
    fontSize: 15,
    fontWeight: '700',
  },
});