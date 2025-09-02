import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const { width, height } = Dimensions.get('window');

const tourSteps = [
  {
    id: 'welcome',
    title: 'Welcome to Your Dashboard!',
    description: 'This is your home base where you can see all your gaming activities.',
    position: { top: 100, left: 20, right: 20 },
  },
  {
    id: 'wallet',
    title: 'Manage Your Coins',
    description: 'Tap here to manage your coins and add funds to participate in tournaments!',
    position: { top: 60, right: 20, width: 200 },
  },
  {
    id: 'updates',
    title: 'Tournament Updates',
    description: 'Check here for important tournament updates, room IDs, and passwords! The red dot indicates new updates.',
    position: { top: 110, right: 10, width: 220 },
  },
  {
    id: 'tournaments',
    title: 'Your Tournaments',
    description: 'These cards show tournaments you\'ve joined and won. Tap them to browse more tournaments or view leaderboards!',
    position: { top: 200, left: 20, right: 20 },
  },
  {
    id: 'quickActions',
    title: 'Quick Actions',
    description: 'These buttons help you perform common tasks quickly. Join tournaments or add coins with just one tap!',
    position: { bottom: 150, left: 20, right: 20 },
  },
];

const CustomTour = ({ visible, onClose, currentStep = 0 }) => {
  const [step, setStep] = useState(currentStep);

  const currentTourStep = tourSteps[step];

  const nextStep = () => {
    if (step < tourSteps.length - 1) {
      setStep(step + 1);
    } else {
      onClose();
    }
  };

  const prevStep = () => {
    if (step > 0) {
      setStep(step - 1);
    }
  };

  const skipTour = () => {
    onClose();
  };

  if (!visible || !currentTourStep) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
    >
      {/* Dark Overlay */}
      <View style={styles.overlay}>
        {/* Tooltip */}
        <View style={[styles.tooltip, currentTourStep.position]}>
          {/* Close/Skip Button */}
          <TouchableOpacity style={styles.closeButton} onPress={skipTour}>
            <Ionicons name="close" size={20} color="#fff" />
          </TouchableOpacity>

          {/* Content */}
          <Text style={styles.title}>{currentTourStep.title}</Text>
          <Text style={styles.description}>{currentTourStep.description}</Text>

          {/* Navigation */}
          <View style={styles.navigation}>
            <View style={styles.stepIndicator}>
              <Text style={styles.stepText}>
                {step + 1} of {tourSteps.length}
              </Text>
            </View>

            <View style={styles.buttons}>
              {step > 0 && (
                <TouchableOpacity
                  style={[styles.button, styles.prevButton]}
                  onPress={prevStep}
                >
                  <Text style={styles.buttonText}>Previous</Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity
                style={[styles.button, styles.nextButton]}
                onPress={nextStep}
              >
                <Text style={styles.buttonTextPrimary}>
                  {step === tourSteps.length - 1 ? 'Got it!' : 'Next'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  tooltip: {
    backgroundColor: '#2a2a2a',
    borderRadius: 12,
    padding: 20,
    maxWidth: width - 40,
    position: 'absolute',
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  closeButton: {
    position: 'absolute',
    top: 10,
    right: 10,
    padding: 5,
    zIndex: 1,
  },
  title: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
    paddingRight: 30,
  },
  description: {
    color: '#ccc',
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 20,
  },
  navigation: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  stepIndicator: {
    flex: 1,
  },
  stepText: {
    color: '#aaa',
    fontSize: 12,
  },
  buttons: {
    flexDirection: 'row',
    gap: 10,
  },
  button: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  prevButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#555',
  },
  nextButton: {
    backgroundColor: '#ff4500',
  },
  buttonText: {
    color: '#ccc',
    fontSize: 14,
    fontWeight: '600',
  },
  buttonTextPrimary: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
});

export default CustomTour;