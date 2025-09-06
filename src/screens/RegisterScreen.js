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
  Alert,
} from "react-native";
import { AuthContext } from "../AuthProvider";
import { getFriendlyFirebaseError } from "../utils/firebaseErrors";
import { useGoogleAuth } from "../utils/googleAuth";
import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

const { width, height } = Dimensions.get('window');

// Password strength checker component
const PasswordStrengthIndicator = memo(({ password }) => {
  const getPasswordStrength = (pwd) => {
    if (!pwd) return { score: 0, label: '', color: '#E5E7EB', requirements: [] };
    
    let score = 0;
    const requirements = [];
    
    // Length check
    if (pwd.length >= 8) {
      score += 1;
      requirements.push({ met: true, text: 'At least 8 characters' });
    } else {
      requirements.push({ met: false, text: 'At least 8 characters' });
    }
    
    // Uppercase check
    if (/[A-Z]/.test(pwd)) {
      score += 1;
      requirements.push({ met: true, text: 'One uppercase letter' });
    } else {
      requirements.push({ met: false, text: 'One uppercase letter' });
    }
    
    // Lowercase check
    if (/[a-z]/.test(pwd)) {
      score += 1;
      requirements.push({ met: true, text: 'One lowercase letter' });
    } else {
      requirements.push({ met: false, text: 'One lowercase letter' });
    }
    
    // Number check
    if (/[0-9]/.test(pwd)) {
      score += 1;
      requirements.push({ met: true, text: 'One number' });
    } else {
      requirements.push({ met: false, text: 'One number' });
    }
    
    // Special character check
    if (/[!@#$%^&*(),.?":{}|<>]/.test(pwd)) {
      score += 1;
      requirements.push({ met: true, text: 'One special character (!@#$...)' });
    } else {
      requirements.push({ met: false, text: 'One special character (!@#$...)' });
    }
    
    let label = '';
    let color = '#E5E7EB';
    
    if (score <= 1) {
      label = 'Very Weak';
      color = '#EF4444';
    } else if (score === 2) {
      label = 'Weak';
      color = '#F97316';
    } else if (score === 3) {
      label = 'Fair';
      color = '#EAB308';
    } else if (score === 4) {
      label = 'Good';
      color = '#22C55E';
    } else if (score === 5) {
      label = 'Strong';
      color = '#16A34A';
    }
    
    return { score, label, color, requirements };
  };
  
  const strength = getPasswordStrength(password);
  const widthPercentage = (strength.score / 5) * 100;
  
  if (!password) return null;
  
  return (
    <View style={styles.passwordStrengthContainer}>
      <View style={styles.strengthBarContainer}>
        <View style={[styles.strengthBar, { backgroundColor: '#E5E7EB' }]}>
          <View 
            style={[
              styles.strengthBarFill, 
              { 
                width: `${widthPercentage}%`, 
                backgroundColor: strength.color 
              }
            ]} 
          />
        </View>
        <Text style={[styles.strengthLabel, { color: strength.color }]}>
          {strength.label}
        </Text>
      </View>
      
      <View style={styles.requirementsContainer}>
        {strength.requirements.map((req, index) => (
          <View key={index} style={styles.requirementItem}>
            <Ionicons 
              name={req.met ? "checkmark-circle" : "close-circle"} 
              size={16} 
              color={req.met ? '#22C55E' : '#EF4444'} 
            />
            <Text style={[
              styles.requirementText, 
              { color: req.met ? '#22C55E' : '#6B7280' }
            ]}>
              {req.text}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
});

const InputField = memo(({ label, value, onChangeText, placeholder, iconName, secureTextEntry, showPasswordToggle, onTogglePassword, keyboardType = "default", showStrength = false, ...props }) => {
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
      {showStrength && <PasswordStrengthIndicator password={value} />}
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

  const validatePassword = (pwd) => {
    if (pwd.length < 8) return false;
    if (!/[A-Z]/.test(pwd)) return false;
    if (!/[a-z]/.test(pwd)) return false;
    if (!/[0-9]/.test(pwd)) return false;
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(pwd)) return false;
    return true;
  };

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
    if (!validatePassword(password)) {
      setErrorText("Password must be at least 8 characters with uppercase, lowercase, number, and special character.");
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

      // Create user account using react-native-firebase
      const userCredential = await auth().createUserWithEmailAndPassword(
        email.trim(),
        password
      );

      // Check if user was created successfully
      if (!userCredential || !userCredential.user) {
        throw new Error("Failed to create user account");
      }

      const user = userCredential.user;

      // Prepare user data with welcome bonus
      const userData = {
        uid: user.uid,
        email: email.trim(),
        inGameName: inGameName.trim(),
        inGameUID: inGameUID.trim(),
        phoneNumber: phoneNumber.trim(),
        createdAt: firestore.FieldValue.serverTimestamp(),
        updatedAt: firestore.FieldValue.serverTimestamp(),
        coins: 50, // Welcome bonus coins
        wonTournaments: 0,
        welcomeBonusReceived: true,
      };

      // Store user data in Firestore
      await firestore().collection("users").doc(user.uid).set(userData);

      // Update AuthContext so app has the full profile
      register(userData);

      // Show welcome message
      Alert.alert(
        "🎉 Welcome to ProArena!",
        "Registration successful! Start playing tournaments and earning coins.",
        [{ text: "Let's Play!", style: "default" }]
      );

      console.log("User registered with welcome bonus!");

      // Clear form data
      setEmail("");
      setPassword("");
      setConfirmPassword("");
      setInGameName("");
      setInGameUID("");
      setPhoneNumber("");

    } catch (error) {
      console.error("Registration error:", error);

      // Handle different types of errors
      let friendlyError = "Registration failed. Please try again.";

      if (error.code) {
        friendlyError = getFriendlyFirebaseError(error.code);
      } else if (error.message) {
        friendlyError = error.message;
      }

      setErrorText(friendlyError);
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
            <Text style={styles.welcomeTitle}>Join the ProArena!</Text>
            <Text style={styles.welcomeSubtitle}>Create your gamer profile & get 50 coins bonus! 🎉</Text>
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

            {/* Password Input with Strength Indicator */}
            <InputField
              label="Create Strong Password"
              value={password}
              onChangeText={setPassword}
              placeholder="Use strong password for security"
              iconName="shield-outline"
              secureTextEntry={!showPassword}
              showPasswordToggle
              onTogglePassword={() => setShowPassword(!showPassword)}
              showStrength={true}
            />

            {/* Confirm Password Input */}
            <InputField
              label="Confirm Password"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              placeholder="Re-enter your password"
              iconName="shield-checkmark-outline"
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

            {/* Welcome Bonus Info */}
            <View style={styles.bonusContainer}>
              <Ionicons name="gift-outline" size={20} color="#22C55E" />
              <Text style={styles.bonusText}>Get 50 coins welcome bonus on registration!</Text>
            </View>

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
                    <Text style={styles.registerButtonText}>Register</Text>
                    <Ionicons name="gift" size={20} color="#FFFFFF" />
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
  // Password Strength Styles
  passwordStrengthContainer: {
    marginTop: 12,
  },
  strengthBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  strengthBar: {
    height: 6,
    backgroundColor: '#E5E7EB',
    borderRadius: 3,
    flex: 1,
    marginRight: 12,
    overflow: 'hidden',
  },
  strengthBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  strengthLabel: {
    fontSize: 12,
    fontWeight: '600',
    minWidth: 60,
  },
  requirementsContainer: {
    paddingLeft: 8,
  },
  requirementItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  requirementText: {
    fontSize: 12,
    marginLeft: 8,
  },
  bonusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(34, 197, 94, 0.1)',
    padding: 12,
    borderRadius: 12,
    marginBottom: 20,
    borderLeftWidth: 4,
    borderLeftColor: '#22C55E',
  },
  bonusText: {
    marginLeft: 8,
    color: '#22C55E',
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