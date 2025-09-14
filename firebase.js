import { firebase } from '@react-native-firebase/app';
import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';

// Validate that Firebase is properly initialized
const validateFirebaseSetup = () => {
  try {
    // Check if Firebase app is initialized
    const app = firebase.app();

    return {
      isValid: true,
      projectId: app.options.projectId,
      appId: app.options.appId
    };
  } catch (error) {
    console.error('❌ Firebase initialization failed:', error);
    return {
      isValid: false,
      error: error.message
    };
  }
};

// Test Firebase services
const testFirebaseServices = async () => {
  try {
    // Test Auth
    const authUser = auth().currentUser;
    console.log('🔐 Auth service ready, current user:', authUser?.uid || 'none');
    
    // Test Firestore (simple connection test)
    await firestore().settings({ 
      persistence: true,
      cacheSizeBytes: firestore.CACHE_SIZE_UNLIMITED 
    });
    console.log('🗄️ Firestore service ready');
    
    return { success: true };
  } catch (error) {
    console.error('❌ Firebase services test failed:', error);
    return { success: false, error: error.message };
  }
};

// Initialize and validate in development
if (__DEV__) {
  const validation = validateFirebaseSetup();
  
  if (validation.isValid) {
    console.log('🔥 React Native Firebase setup validated');
    
    // Test services
    testFirebaseServices().then(result => {
      if (result.success) {
        console.log('✅ All Firebase services ready');
      } else {
        console.log('⚠️ Firebase services test failed:', result.error);
      }
    });
  } else {
    console.error('🚨 Firebase setup validation failed:', validation.error);
  }
}

// Export the services
export { auth, firestore };

// Export firebase app for advanced usage
export const firebaseApp = firebase.app();

// Export helper functions
export const getFirebaseInfo = () => {
  try {
    const app = firebase.app();
    return {
      projectId: app.options.projectId,
      appId: app.options.appId,
      databaseURL: app.options.databaseURL,
      isReady: true
    };
  } catch (error) {
    return {
      isReady: false,
      error: error.message
    };
  }
};