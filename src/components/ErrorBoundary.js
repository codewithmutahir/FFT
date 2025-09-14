import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, AppState } from 'react-native';
import { firebase } from '@react-native-firebase/app';

class ErrorBoundary extends React.Component {
  state = { 
    hasError: false, 
    error: null,
    appState: AppState.currentState
  };

  componentDidMount() {
    AppState.addEventListener('change', this._handleAppStateChange);
  }

  componentWillUnmount() {
    AppState.removeEventListener('change', this._handleAppStateChange);
  }

  _handleAppStateChange = nextAppState => {
    if (
      this.state.appState.match(/inactive|background/) &&
      nextAppState === 'active' &&
      this.state.hasError
    ) {
      // Auto-retry when app comes to foreground
      this.resetError();
    }
    this.setState({ appState: nextAppState });
  };

  static getDerivedStateFromError(error) {
    // Don't set error state for non-fatal errors
    if (error.message?.includes('Network request failed')) {
      return null;
    }
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    console.log('Error caught by boundary:', {
      error: error?.message,
      componentStack: info?.componentStack
    });
  }

  resetError = async () => {
    try {
      // Verify Firebase connection
      await firebase.app().database().getPlatformConfig();
      this.setState({ hasError: false, error: null });
    } catch (error) {
      console.error('Reset error failed:', error);
      // Show specific error message
      this.setState({
        error: 'Cannot connect to server. Please check your internet connection.'
      });
    }
  };

  render() {
    if (this.state.hasError) {
      return (
        <View style={styles.container}>
          <Text style={styles.title}>App Error</Text>
          <Text style={styles.message}>
            {this.state.error?.message || 'Please restart the app'}
          </Text>
          <TouchableOpacity 
            style={styles.button}
            onPress={this.resetError}
          >
            <Text style={styles.buttonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a1a',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  title: {
    color: '#FF6B35',
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  message: {
    color: '#fff',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 24,
    paddingHorizontal: 20,
  },
  button: {
    backgroundColor: '#FF6B35',
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 8,
    elevation: 3,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  }
});

export default ErrorBoundary;