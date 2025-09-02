import React, { useState } from "react";
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
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { typography } from "../../theme/typography";

const { width } = Dimensions.get("window");

export default function MoreScreen({ navigation }) {
  const [expandedItem, setExpandedItem] = useState(null);
  const [feedbackModalVisible, setFeedbackModalVisible] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [feedbackType, setFeedbackType] = useState("general");
  const [rating, setRating] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [modalAnimation] = useState(new Animated.Value(0));

  const toggleExpand = (id) => {
    setExpandedItem((prev) => (prev === id ? null : id));
  };

  const openLink = (url, title) => {
    Alert.alert(title, "This will open in your browser", [
      { text: "Cancel", style: "cancel" },
      { text: "Open", onPress: () => Linking.openURL(url) },
    ]);
  };

  const openFeedbackModal = () => {
    setFeedbackModalVisible(true);
    Animated.spring(modalAnimation, {
      toValue: 1,
      useNativeDriver: true,
      tension: 100,
      friction: 8,
    }).start();
  };

  const closeFeedbackModal = () => {
    Animated.timing(modalAnimation, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start(() => {
      setFeedbackModalVisible(false);
      setFeedback("");
      setRating(0);
      setFeedbackType("general");
    });
  };

  const submitFeedback = async () => {
    if (!feedback.trim()) {
      Alert.alert("Error", "Please write your feedback before submitting.");
      return;
    }

    setIsSubmitting(true);

    try {
      const email = "mutharsoomro13@gmail.com"; // Yahan apna email address daalo
      const subject = `App Feedback - ${feedbackType.charAt(0).toUpperCase() + feedbackType.slice(1)}`;

      const body = encodeURIComponent(`
        Feedback Type: ${feedbackType.charAt(0).toUpperCase() + feedbackType.slice(1)}
        Rating: ${rating}/5 stars
        Date: ${new Date().toLocaleDateString()}

        Feedback:
        ${feedback}

        ---
        Sent from Gaming App
            `);

      const mailtoUrl = `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${body}`;

      await Linking.openURL(mailtoUrl);

      // Success feedback
      setTimeout(() => {
        setIsSubmitting(false);
        closeFeedbackModal();
        Alert.alert(
          "Thank You!",
          "Your feedback has been sent. We appreciate your input and will get back to you soon.",
          [{ text: "OK", style: "default" }]
        );
      }, 1000);
    } catch (error) {
      setIsSubmitting(false);
      Alert.alert("Error", "Unable to send feedback. Please try again later.");
    }
  };

  const renderStars = () => {
    return (
      <View style={styles.starsContainer}>
        {[1, 2, 3, 4, 5].map((star) => (
          <TouchableOpacity
            key={star}
            onPress={() => setRating(star)}
            style={styles.starButton}
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
  };

  const feedbackTypes = [
    { id: "general", label: "General Feedback", icon: "chatbubble-outline" },
    { id: "bug", label: "Report Bug", icon: "bug-outline" },
    { id: "feature", label: "Feature Request", icon: "bulb-outline" },
    { id: "complaint", label: "Complaint", icon: "warning-outline" },
  ];

  const menuItems = [
    {
      id: "wallet",
      title: "Wallet",
      subtitle: "Deposit & Withdraw funds",
      icon: "wallet-outline",
      color: "#08CB00",
      action: () => navigation.navigate("Wallet"),
      type: "navigate",
    },
    {
      id: "updates",
      title: "Updates & News",
      subtitle: "Latest app updates and announcements",
      icon: "newspaper-outline",
      color: "#33A1E0",
      action: () => navigation.navigate("Updates"),
      type: "navigate",
    },
    {
      id: "feedback",
      title: "Send Feedback",
      subtitle: "Share your thoughts with us",
      icon: "mail-outline",
      color: "#FF6B35",
      action: openFeedbackModal,
      type: "action",
    },
    {
      id: "privacy",
      title: "Privacy Policy",
      subtitle: "How we handle your data",
      icon: "shield-checkmark-outline",
      color: "#9C27B0",
      action: () => toggleExpand("privacy"),
      type: "toggle",
      content: `We respect your privacy. Your data is securely stored and never shared with third parties without consent. This is a simplified example, you can add more detailed content here.`,
    },
    {
      id: "terms",
      title: "Terms & Conditions",
      subtitle: "Rules and guidelines",
      icon: "document-text-outline",
      color: "#FF9800",
      action: () => toggleExpand("terms"),
      type: "toggle",
      content: `By using this app, you agree to follow the rules, respect other users, and not misuse the service. Add your full terms here.`,
    },
    {
      id: "support",
      title: "Help & Support",
      subtitle: "Get help or contact us",
      icon: "help-circle-outline",
      color: "#4CAF50",
      action: () =>
        openLink("mailto:mutharsoomro13@gmail.com", "Contact Support"),
      type: "link",
    },
    {
      id: "share",
      title: "Share App",
      subtitle: "Invite your friends",
      icon: "share-social-outline",
      color: "#ff4500",
      action: () => {
        Alert.alert(
          "Share App",
          "Tell your friends about our amazing gaming app!",
          [
            { text: "Cancel", style: "cancel" },
            {
              text: "Share",
              onPress: () => {
                Linking.openURL("https://yourwebsite.com/download");
              },
            },
          ]
        );
      },
      type: "action",
    },
  ];

  const renderMenuItem = (item) => (
    <View key={item.id} style={styles.menuItemWrapper}>
      <TouchableOpacity
        style={styles.menuItem}
        onPress={item.action}
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

      {/* Expanded content */}
      {item.type === "toggle" && expandedItem === item.id && (
        <View style={styles.expandedContent}>
          <Text style={[styles.expandedText, typography.cardText]}>
            {item.content}
          </Text>
        </View>
      )}
    </View>
  );

  return (
    <>
      <ScrollView style={styles.container}>
        <View style={styles.header}>
          <Text style={[styles.headerTitle, typography.headerTitle]}>More</Text>
          <Text style={styles.headerSubtitle}>
            Additional options and information
          </Text>
        </View>

        <View style={styles.menuContainer}>
          {menuItems.map(renderMenuItem)}
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>App Version 1.0.0</Text>
          <Text style={styles.footerText}>© 2024 Your Gaming App</Text>
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
                transform: [
                  {
                    scale: modalAnimation.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0.9, 1],
                    }),
                  },
                ],
                opacity: modalAnimation,
              },
            ]}
          >
            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Send Feedback</Text>
              <TouchableOpacity
                onPress={closeFeedbackModal}
                style={styles.closeButton}
              >
                <Ionicons name="close" size={24} color="#fff" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalContent}>
              {/* Feedback Type Selection */}
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

              {/* Rating */}
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

              {/* Feedback Text */}
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
              />

              {/* Submit Button */}
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
                  <Text style={styles.submitButtonText}>Sending...</Text>
                ) : (
                  <>
                    <Ionicons
                      name="send"
                      size={20}
                      color="#fff"
                      style={styles.submitIcon}
                    />
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
  header: {
    padding: 20,
    paddingTop: 60,
  },
  headerTitle: {
    color: "#fff",
    fontSize: 28,
    fontWeight: "bold",
    marginBottom: 5,
  },
  headerSubtitle: {
    color: "#888",
    fontSize: 16,
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
  // Modal Styles
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
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#444",
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
