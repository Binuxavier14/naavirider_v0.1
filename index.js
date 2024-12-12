/**
 * @format
 */

import { AppRegistry, Platform, Alert } from 'react-native';
import App from './App';
import { name as appName } from './app.json';
import notifee, { AndroidImportance, AuthorizationStatus } from '@notifee/react-native';

// Function to handle global notification setup and permission requests
const setupNotifications = async () => {
  try {
    // Create a notification channel for Android
    if (Platform.OS === 'android') {
      await notifee.createChannel({
        id: 'default',
        name: 'Default Channel',
        importance: AndroidImportance.HIGH,
      });
    }

    // Check notification permissions
    const settings = await notifee.getNotificationSettings();

    if (settings.authorizationStatus === AuthorizationStatus.DENIED) {
      // Request permissions if they are not already granted
      const newSettings = await notifee.requestPermission();

      if (newSettings.authorizationStatus === AuthorizationStatus.AUTHORIZED) {
        console.log('Notification permissions granted.');
      } else {
        Alert.alert(
          'Notification Permissions Denied',
          'You have denied notification permissions. Enable them in settings to receive notifications.'
        );
      }
    } else if (settings.authorizationStatus === AuthorizationStatus.AUTHORIZED) {
      console.log('Notification permissions already granted.');
    }
  } catch (error) {
    console.error('Error during notification setup:', error);
  }
};

// Call the setup function during app startup
setupNotifications();

AppRegistry.registerComponent(appName, () => App);
