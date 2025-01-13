/**
 * @format
 */

import { Alert, AppRegistry, Linking, PermissionsAndroid, Platform } from 'react-native';
import messaging from '@react-native-firebase/messaging';
import notifee, { AndroidImportance, AuthorizationStatus } from '@notifee/react-native';
import App from './App';
import { name as appName } from './app.json';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Request Notification Permission
const requestUserPermission = async () => {
  const authStatus = await messaging().requestPermission();
  const enabled =
    authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
    authStatus === messaging.AuthorizationStatus.PROVISIONAL;

  if (enabled) {
    //console.log('Notification permission granted.');
  } else {
    //console.log('Notification permission denied.');
  }
};

const requestMediaPermissions = async () => {
  try {
    const granted = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.READ_MEDIA_IMAGES, // or other media permissions
      {
        title: 'Storage Permission Required',
        message: 'This app needs access to your storage to download files.',
        buttonNeutral: 'Ask Me Later',
        buttonNegative: 'Cancel',
        buttonPositive: 'OK',
      }
    );

    if (granted === PermissionsAndroid.RESULTS.GRANTED) {
      console.log('Media access granted.');
    } else {
      console.log('Media access denied.');
    }
  } catch (error) {
    console.error('Error requesting media permissions:', error);
  }
};




// Create a notification channel (for Android)
const createNotificationChannel = async () => {
  if (Platform.OS === 'android') {
    await notifee.createChannel({
      id: 'default1',
      name: 'Default Channel1',
      sound: 'default',
      importance: AndroidImportance.HIGH,
    });
  }
};

// Retrieve FCM Token and send to your server
const getFCMToken = async () => {
  try {
    const token = await messaging().getToken();
    //console.log('FCM Token:', token);

    // Send this token to your server
    await sendTokenToServer(token);
  } catch (error) {
    console.error('Error retrieving FCM token:', error);
  }
};

const sendTokenToServer = async (token) => {
  if (token) {
    await AsyncStorage.setItem('FCMToken', token);
  }
  // Replace this with your server API call
  //console.log('Token sent to server:', token);
};

// Background Message Handler
messaging().setBackgroundMessageHandler(async (remoteMessage) => {
  //console.log('Message received in background:', remoteMessage);

  await notifee.displayNotification({
    title: remoteMessage.notification?.title || 'Background Notification',
    body: remoteMessage.notification?.body || 'You have a new message.',
    android: {
      channelId: 'default1',
      sound: 'default',
      pressAction: { id: 'default1' },
    },
  });
});

// App Initialization
const setupNotifications = async () => {
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
  await requestMediaPermissions();
  await createNotificationChannel();
  await getFCMToken();

  // Listen for token refresh
  messaging().onTokenRefresh(async (token) => {
    //console.log('FCM Token refreshed:', token);
    await sendTokenToServer(token);
  });
};

setupNotifications();

// Handle notification taps (background/inactive)
messaging().onNotificationOpenedApp((remoteMessage) => {
  //console.log('Notification caused app to open:', remoteMessage);
});

messaging()
  .getInitialNotification()
  .then((remoteMessage) => {
    if (remoteMessage) {
      //console.log('Notification caused app to open from quit state:', remoteMessage);
    }
  });

AppRegistry.registerComponent(appName, () => App);
