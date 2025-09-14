import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Linking,
  Alert,
  Modal,
  TextInput,
  Dimensions,
  Animated,
  ActivityIndicator,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { typography } from "../../theme/typography";
import firestore from "@react-native-firebase/firestore";
import NetInfo from "@react-native-community/netinfo";
import appJson from "../../app.json";

const { width } = Dimensions.get("window");

export default function MoreScreen({ navigation }) {
  const [expandedItem, setExpandedItem] = useState(null);
  const [feedbackModalVisible, setFeedbackModalVisible] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [feedbackType, setFeedbackType] = useState("general");
  const [rating, setRating] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState("idle");
  const [modalAnimation] = useState(new Animated.Value(0));
  const [menuItems, setMenuItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Check network connectivity
  const checkNetworkConnectivity = async () => {
    try {
      const netInfo = await NetInfo.fetch();
      return netInfo.isConnected && netInfo.isInternetReachable;
    } catch (error) {
      console.error("Network check failed:", error);
      return false;
    }
  };

  // Define callback functions
  const toggleExpand = useCallback((id) => {
    setExpandedItem((prev) => (prev === id ? null : id));
  }, []);

  const openLink = useCallback((url, title) => {
    Alert.alert(title, "This will open in your browser", [
      { text: "Cancel", style: "cancel" },
      { text: "Open", onPress: () => Linking.openURL(url) },
    ]);
  }, []);

  const openFeedbackModal = useCallback(() => {
    console.log("Opening feedback modal"); // Debug log
    setFeedbackModalVisible(true);
    setSubmitStatus("idle");
    Animated.spring(modalAnimation, {
      toValue: 1,
      useNativeDriver: true,
      tension: 100,
      friction: 8,
    }).start();
  }, [modalAnimation]);

  const closeFeedbackModal = useCallback(() => {
    Animated.timing(modalAnimation, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start(() => {
      setFeedbackModalVisible(false);
      setFeedback("");
      setRating(0);
      setFeedbackType("general");
      setSubmitStatus("idle");
    });
  }, [modalAnimation]);

  // Handle menu item press - simplified approach
  const handleMenuItemPress = useCallback((item) => {
    console.log("Menu item pressed:", item.title, "Type:", item.type, "Target:", item.navigationTarget);
    
    switch (item.type) {
      case "navigate":
        if (item.navigationTarget) {
          navigation.navigate(item.navigationTarget);
        }
        break;

      case "action":
        switch (item.navigationTarget) {
          case "feedback":
            console.log("Feedback action triggered");
            openFeedbackModal();
            break;
          case "share":
            Alert.alert(
              "Share App",
              "Tell your friends about our amazing gaming app!",
              [
                { text: "Cancel", style: "cancel" },
                {
                  text: "Share",
                  onPress: () => Linking.openURL("https://yourwebsite.com/download"),
                },
              ]
            );
            break;
          case "contact":
            openLink("mailto:support@yourwebsite.com", "Contact Support");
            break;
          default:
            Alert.alert(
              item.title,
              item.subtitle || "This action is not yet implemented",
              [{ text: "OK", style: "default" }]
            );
            break;
        }
        break;

      case "toggle":
        toggleExpand(item.id);
        break;

      case "link":
        if (item.navigationTarget) {
          openLink(item.navigationTarget, item.title);
        }
        break;

      default:
        Alert.alert("Coming Soon", "This feature will be available soon!");
        break;
    }
  }, [navigation, openFeedbackModal, toggleExpand, openLink]);

  const getDefaultMenuItems = useCallback(() => [
    {
      id: "wallet",
      title: "Wallet",
      subtitle: "Deposit & Withdraw funds",
      icon: "wallet-outline",
      color: "#08CB00",
      type: "navigate",
      navigationTarget: "Wallet",
    },
    {
      id: "updates",
      title: "Updates & News",
      subtitle: "Latest app updates and announcements",
      icon: "newspaper-outline",
      color: "#33A1E0",
      type: "navigate",
      navigationTarget: "Updates",
    },
    {
      id: "feedback",
      title: "Send Feedback",
      subtitle: "Share your thoughts with us",
      icon: "mail-outline",
      color: "#FF6B35",
      type: "action",
      navigationTarget: "feedback",
    },
    {
      id: "privacy",
      title: "Privacy Policy",
      subtitle: "How we handle your data",
      icon: "shield-checkmark-outline",
      color: "#9C27B0",
      type: "toggle",
      content: "We respect your privacy. Your data is securely stored and never shared with third parties without consent.",
    },
    {
      id: "terms",
      title: "Terms & Conditions",
      subtitle: "Rules and guidelines",
      icon: "document-text-outline",
      color: "#FF9800",
      type: "toggle",
      content: "By using this app, you agree to follow the rules, respect other users, and not misuse the service.",
    },
    {
      id: "support",
      title: "Help & Support",
      subtitle: "Get help or contact us",
      icon: "help-circle-outline",
      color: "#4CAF50",
      type: "link",
      navigationTarget: "mailto:mutharsoomro13@gmail.com",
    },
    {
      id: "share",
      title: "Share App",
      subtitle: "Invite your friends",
      icon: "share-social-outline",
      color: "#ff4500",
      type: "action",
      navigationTarget: "share",
    },
  ], []);

  // Load menu items from Firebase
  useEffect(() => {
    let mounted = true;
    setLoading(true);

    const loadMenuItems = async () => {
      try {
        // First try to get data
        const docRef = await firestore()
          .collection("moreScreenItems")
          .doc("config")
          .get();

        if (!mounted) return;

        if (docRef.exists) {
          const data = docRef.data();
          if (data?.items) {
            const visibleItems = data.items
              .filter((item) => item.isVisible)
              .sort((a, b) => a.order - b.order);
            setMenuItems(visibleItems);
          } else {
            setMenuItems(getDefaultMenuItems());
          }
        } else {
          setMenuItems(getDefaultMenuItems());
        }
        setError(null);
      } catch (error) {
        console.error("Failed to load menu items:", error);
        setError("Failed to connect to server");
        setMenuItems(getDefaultMenuItems());
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    loadMenuItems();

    return () => {
      mounted = false;
    };
  }, [getDefaultMenuItems]);

  // Enhanced feedback submission
  const submitFeedback = useCallback(async (retryCount = 0) => {
    if (!feedback.trim() || rating === 0) {
      Alert.alert("Error", "Please fill all fields before submitting.");
      return;
    }

    const isConnected = await checkNetworkConnectivity();
    if (!isConnected) {
      Alert.alert(
        "No Internet Connection",
        "Please check your internet connection and try again.",
        [{ text: "OK", style: "default" }]
      );
      return;
    }

    setIsSubmitting(true);
    setSubmitStatus("submitting");

    try {
      const feedbackData = {
        type: feedbackType,
        rating: rating,
        message: feedback.trim(),
        timestamp: firestore.FieldValue.serverTimestamp(),
        platform: Platform.OS,
        appVersion: appJson.expo.version,
        deviceInfo: {
          platform: Platform.OS,
          version: Platform.Version,
        },
      };

      await firestore().collection("feedback").add(feedbackData);

      setSubmitStatus("success");
      setIsSubmitting(false);
      closeFeedbackModal();
      Alert.alert(
        "Thank You! 🎉",
        "Your feedback has been submitted successfully!",
        [{ text: "OK", style: "default" }]
      );
    } catch (error) {
      console.error("Feedback submission error:", error);
      setIsSubmitting(false);
      setSubmitStatus("error");

      let errorMessage = "Something went wrong. Please try again.";
      
      if (error.code === "permission-denied") {
        errorMessage = "Permission denied. Please check your account.";
      } else if (error.code === "unavailable") {
        errorMessage = "Service temporarily unavailable. Please try again later.";
      } else if (error.code === "deadline-exceeded") {
        errorMessage = "Request timed out. Please check your connection.";
      }

      Alert.alert("Submission Failed", errorMessage, [
        { text: "Cancel", style: "cancel" },
        ...(retryCount < 2 ? [{
          text: "Try Again",
          onPress: () => submitFeedback(retryCount + 1),
        }] : [])
      ]);
    }
  }, [feedback, rating, feedbackType, closeFeedbackModal]);

  const renderStars = useCallback(() => {
    return (
      <View style={styles.starsContainer}>
        {[1, 2, 3, 4, 5].map((star) => (
          <TouchableOpacity
            key={star}
            onPress={() => setRating(star)}
            style={styles.starButton}
            activeOpacity={0.7}
          >
            <Ionicons
              name={star <= rating ? "star" : "star-outline"}
              size={32}
              color={star <= rating ? "#FFD700" : "#666"}
            />
          </TouchableOpacity>
        ))}
      </View>
    );
  }, [rating]);

  const feedbackTypes = useMemo(() => [
    { id: "general", label: "General Feedback", icon: "chatbubble-outline" },
    { id: "bug", label: "Report Bug", icon: "bug-outline" },
    { id: "feature", label: "Feature Request", icon: "bulb-outline" },
    { id: "complaint", label: "Complaint", icon: "warning-outline" },
  ], []);

  const renderMenuItem = useCallback((item) => (
    <View key={item.id} style={styles.menuItemWrapper}>
      <TouchableOpacity
        style={styles.menuItem}
        onPress={() => handleMenuItemPress(item)}
        activeOpacity={0.7}
      >
        <View style={styles.menuItemContent}>
          <View
            style={[
              styles.iconContainer,
              { backgroundColor: `${item.color}20` },
            ]}
          >
            <Ionicons name={item.icon} size={24} color={item.color} />
          </View>
          <View style={styles.textContainer}>
            <Text style={[styles.menuItemTitle, typography.cardText]}>
              {item.title}
            </Text>
            <Text style={[styles.menuItemSubtitle, typography.cardText]}>
              {item.subtitle}
            </Text>
          </View>
          <Ionicons
            name={expandedItem === item.id ? "chevron-up" : "chevron-forward"}
            size={20}
            color="#666"
          />
        </View>
      </TouchableOpacity>

      {item.type === "toggle" && expandedItem === item.id && (
        <View style={styles.expandedContent}>
          <Text style={[styles.expandedText, typography.cardText]}>
            {item.content}
          </Text>
        </View>
      )}
    </View>
  ), [expandedItem, typography, handleMenuItemPress]);

  const retryConnection = useCallback(() => {
    setError(null);
    setLoading(true);
  }, []);

  if (loading) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <ActivityIndicator size="large" color="#FF6B35" />
        <Text style={styles.loadingText}>Loading menu items...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <Ionicons name="warning-outline" size={48} color="#FF6B35" />
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={retryConnection}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <>
      <ScrollView style={styles.container}>
        <View style={styles.header}>
          <Text style={[styles.headerTitle, typography.h1]}>More</Text>
          <Text style={[styles.headerSubtitle, typography.cardText]}>
            Additional options and information
          </Text>
        </View>

        <View style={styles.menuContainer}>
          {menuItems.map(renderMenuItem)}
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>© 2025 ProArena</Text>
          <Text style={styles.footerText}>Version 1.0.1</Text>
        </View>
      </ScrollView>

      {/* Feedback Modal */}
      <Modal
        visible={feedbackModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={closeFeedbackModal}
      >
        <View style={styles.modalOverlay}>
          <Animated.View
            style={[
              styles.modalContainer,
              {
                transform: [{
                  scale: modalAnimation.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.9, 1],
                  }),
                }],
                opacity: modalAnimation,
              },
            ]}
          >
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Send Feedback</Text>
              <TouchableOpacity onPress={closeFeedbackModal} style={styles.closeButton}>
                <Ionicons name="close" size={24} color="#fff" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
              <Text style={styles.sectionTitle}>Feedback Type</Text>
              <View style={styles.feedbackTypes}>
                {feedbackTypes.map((type) => (
                  <TouchableOpacity
                    key={type.id}
                    style={[
                      styles.typeButton,
                      feedbackType === type.id && styles.typeButtonActive,
                    ]}
                    onPress={() => setFeedbackType(type.id)}
                    activeOpacity={0.7}
                  >
                    <Ionicons
                      name={type.icon}
                      size={20}
                      color={feedbackType === type.id ? "#FF6B35" : "#888"}
                    />
                    <Text
                      style={[
                        styles.typeButtonText,
                        feedbackType === type.id && styles.typeButtonTextActive,
                      ]}
                    >
                      {type.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.sectionTitle}>Rate Your Experience</Text>
              {renderStars()}
              {rating > 0 && (
                <Text style={styles.ratingText}>
                  {rating === 1 && "Poor"}
                  {rating === 2 && "Fair"}
                  {rating === 3 && "Good"}
                  {rating === 4 && "Very Good"}
                  {rating === 5 && "Excellent"}
                </Text>
              )}

              <Text style={styles.sectionTitle}>Your Feedback</Text>
              <TextInput
                style={styles.feedbackInput}
                placeholder="Tell us what you think..."
                placeholderTextColor="#888"
                multiline
                numberOfLines={6}
                value={feedback}
                onChangeText={setFeedback}
                textAlignVertical="top"
                maxLength={1000}
                editable={!isSubmitting}
              />

              <Text style={styles.characterCount}>
                {feedback.length}/1000 characters
              </Text>

              <TouchableOpacity
                style={[
                  styles.submitButton,
                  isSubmitting && styles.submitButtonDisabled,
                ]}
                onPress={submitFeedback}
                disabled={isSubmitting}
                activeOpacity={0.8}
              >
                {isSubmitting ? (
                  <>
                    <ActivityIndicator size="small" color="#fff" style={styles.submitIcon} />
                    <Text style={styles.submitButtonText}>Submitting...</Text>
                  </>
                ) : (
                  <>
                    <Ionicons name="send" size={20} color="#fff" style={styles.submitIcon} />
                    <Text style={styles.submitButtonText}>Send Feedback</Text>
                  </>
                )}
              </TouchableOpacity>
            </ScrollView>
          </Animated.View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#1a1a1a",
  },
  centerContent: {
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    color: "#fff",
    fontSize: 16,
    marginTop: 16,
  },
  errorText: {
    color: "#fff",
    fontSize: 16,
    marginTop: 16,
    textAlign: "center",
    paddingHorizontal: 32,
  },
  retryButton: {
    backgroundColor: "#FF6B35",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 16,
  },
  retryButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  header: {
    padding: 20,
    paddingTop: 60,
  },
  headerTitle: {
    color: "#fff",
    fontSize: 28,
    marginBottom: 5,
    textAlign: "center",
  },
  headerSubtitle: {
    color: "#888",
    fontSize: 16,
    textAlign: "center",
  },
  menuContainer: {
    padding: 20,
    paddingTop: 10,
  },
  menuItemWrapper: {
    marginBottom: 12,
  },
  menuItem: {
    backgroundColor: "#2a2a2a",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#333",
  },
  menuItemContent: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 16,
  },
  textContainer: {
    flex: 1,
  },
  menuItemTitle: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 4,
  },
  menuItemSubtitle: {
    color: "#888",
    fontSize: 14,
  },
  expandedContent: {
    backgroundColor: "#2a2a2a",
    padding: 16,
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
    borderTopWidth: 1,
    borderColor: "#333",
  },
  expandedText: {
    color: "#ccc",
    fontSize: 14,
    lineHeight: 20,
  },
  footer: {
    padding: 20,
    paddingTop: 40,
    alignItems: "center",
  },
  footerText: {
    color: "#666",
    fontSize: 12,
    marginBottom: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.8)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalContainer: {
    backgroundColor: "#2a2a2a",
    borderRadius: 16,
    width: "100%",
    maxHeight: "85%",
    borderWidth: 1,
    borderColor: "#444",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#444",
  },
  modalTitle: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "bold",
  },
  closeButton: {
    padding: 4,
  },
  modalContent: {
    padding: 20,
  },
  sectionTitle: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 12,
    marginTop: 8,
  },
  feedbackTypes: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginBottom: 20,
  },
  typeButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#333",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#444",
  },
  typeButtonActive: {
    backgroundColor: "#FF6B3520",
    borderColor: "#FF6B35",
  },
  typeButtonText: {
    color: "#888",
    fontSize: 14,
    marginLeft: 6,
  },
  typeButtonTextActive: {
    color: "#FF6B35",
  },
  starsContainer: {
    flexDirection: "row",
    justifyContent: "center",
    marginVertical: 10,
  },
  starButton: {
    padding: 5,
  },
  ratingText: {
    color: "#FFD700",
    fontSize: 16,
    textAlign: "center",
    fontWeight: "500",
    marginBottom: 15,
  },
  feedbackInput: {
    backgroundColor: "#333",
    borderRadius: 12,
    padding: 15,
    color: "#fff",
    fontSize: 16,
    minHeight: 120,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#444",
  },
  characterCount: {
    color: "#888",
    fontSize: 12,
    textAlign: "right",
    marginBottom: 20,
  },
  submitButton: {
    backgroundColor: "#FF6B35",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
    borderRadius: 12,
    marginTop: 10,
  },
  submitButtonDisabled: {
    backgroundColor: "#666",
  },
  submitIcon: {
    marginRight: 8,
  },
  submitButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
});