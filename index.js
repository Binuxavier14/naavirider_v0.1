/**
 * @format
 */

import { AppRegistry, Platform } from 'react-native';
import messaging from '@react-native-firebase/messaging';
import notifee, { AndroidImportance } from '@notifee/react-native';
import App from './App';
import { name as appName } from './app.json';

// Request Notification Permission
const requestUserPermission = async () => {
  const authStatus = await messaging().requestPermission();
  const enabled =
    authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
    authStatus === messaging.AuthorizationStatus.PROVISIONAL;

  if (enabled) {
    console.log('Notification permission granted.');
  } else {
    console.log('Notification permission denied.');
  }
};

// Create a notification channel (for Android)
const createNotificationChannel = async () => {
  if (Platform.OS === 'android') {
    await notifee.createChannel({
      id: 'default',
      name: 'Default Channel',
      importance: AndroidImportance.HIGH,
    });
  }
};

// Retrieve FCM Token and send to your server
const getFCMToken = async () => {
  try {
    const token = await messaging().getToken();
    console.log('FCM Token:', token);

    // Send this token to your server
    await sendTokenToServer(token);
  } catch (error) {
    console.error('Error retrieving FCM token:', error);
  }
};

const sendTokenToServer = async (token) => {
  // Replace this with your server API call
  console.log('Token sent to server:', token);
};

// Background Message Handler
messaging().setBackgroundMessageHandler(async (remoteMessage) => {
  console.log('Message received in background:', remoteMessage);

  await notifee.displayNotification({
    title: remoteMessage.notification?.title || 'Background Notification',
    body: remoteMessage.notification?.body || 'You have a new message.',
    android: {
      channelId: 'default',
      pressAction: { id: 'default' },
    },
  });
});

// App Initialization
const setupNotifications = async () => {
  await requestUserPermission();
  await createNotificationChannel();
  await getFCMToken();

  // Listen for token refresh
  messaging().onTokenRefresh(async (token) => {
    console.log('FCM Token refreshed:', token);
    await sendTokenToServer(token);
  });
};

setupNotifications();

// Handle notification taps (background/inactive)
messaging().onNotificationOpenedApp((remoteMessage) => {
  console.log('Notification caused app to open:', remoteMessage);
});

messaging()
  .getInitialNotification()
  .then((remoteMessage) => {
    if (remoteMessage) {
      console.log('Notification caused app to open from quit state:', remoteMessage);
    }
  });

AppRegistry.registerComponent(appName, () => App);
