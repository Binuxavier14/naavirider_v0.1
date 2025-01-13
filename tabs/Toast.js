import React, { useEffect, useRef } from 'react';
import { Animated, Text, StyleSheet, View, TouchableOpacity, Platform } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons'; // Importing Material Icons

const Toast = ({ message, visible, onClose }) => {
  const fadeAnim = useRef(new Animated.Value(0)).current; // Initial opacity is 0

  useEffect(() => {
    if (visible) {
      // Fade in
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();

      // Auto close after 5 seconds
      const timer = setTimeout(() => {
        // Fade out
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }).start(() => onClose());
      }, 5000);

      return () => clearTimeout(timer);
    }
  }, [visible]);

  if (!visible) return null;

  return (
    <Animated.View style={[styles.toast, { opacity: fadeAnim }]}>
      <View style={styles.iconContainer}>
        <Icon name="check" size={16} color="#fff" style={styles.iconShadow} />
      </View>
      <Text style={styles.message}>{message}</Text>
      <TouchableOpacity onPress={onClose}>
        <Icon name="close" size={18} color="#52C41A" style={styles.iconShadow} />
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  toast: {
    position: 'absolute',
    top: 10, // Top of the screen
    left: 20,
    right: 20,
    paddingVertical: 10,
    paddingHorizontal: 10,
    backgroundColor: '#DFF6DD', // Light green background
    borderWidth: 1,
    borderColor: '#52C41A', // Green border
    borderRadius: 25,
    flexDirection: 'row',
    alignItems: 'center',
    elevation: 5,
    zIndex: 999,
  },
  iconContainer: {
    backgroundColor: '#52C41A', // Green background for the icon
    borderRadius: 15,
    width: 30,
    height: 30,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 2, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
      },
      android: {
        elevation: 6, // Adds shadow for Android
      },
    }),
  },
  iconShadow: {
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 2, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 3.84,
      },
      android: {
        elevation: 6,
      },
    }),
  },
  message: {
    color: '#333', // Green text
    fontSize: 16,
    flex: 1,
  },
});

export default Toast;
