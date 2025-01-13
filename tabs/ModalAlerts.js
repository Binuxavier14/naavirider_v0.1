import React from 'react'
import { Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export default function ModalAlerts({ isVisible, onClose, title ,body}) {
  return (
       <Modal
      visible={isVisible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.refundmodalContainer}>
          {/* Success Icon */}
          <View style={styles.iconContainer}>
            <View style={styles.successCircle}>
              <Text style={styles.successCheck}>✔</Text>
            </View>
          </View>

          {/* Title */}
          <Text style={styles.title}>{title}</Text>

          {/* Refund Details */}
          <Text style={styles.message}>
           {body}
          </Text>
          {/* <Text style={styles.subMessage}>
            The amount will appear in your original payment method within 3–5 business days.
          </Text> */}

          {/* Done Button */}
          <TouchableOpacity style={styles.doneButton} onPress={onClose}>
            <Text style={styles.doneButtonText}>Done</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  )
}
const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: "rgba(0, 0, 0, 0.5)", // Dimmed background
        justifyContent: "center",
        alignItems: "center",
      },
      refundmodalContainer: {
        backgroundColor: "#fff",
        borderRadius: 16,
        padding: 20,
        alignItems: "center",
        width: "90%",
        elevation: 5, // Shadow for Android
        shadowColor: "#000", // Shadow for iOS
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
      },
      iconContainer: {
        marginBottom: 20,
      },
      successCircle: {
        backgroundColor: "#4CAF50", // Green background
        width: 50,
        height: 50,
        borderRadius: 25,
        justifyContent: "center",
        alignItems: "center",
      },
      successCheck: {
        color: "#fff",
        fontSize: 24,
        fontWeight: "bold",
      },
     
      message: {
        fontSize: 16,
        color: "#333",
        textAlign: "center",
        marginBottom: 10,
      },
      refundAmount: {
        fontWeight: "bold",
        color: "#000",
      },
      subMessage: {
        fontSize: 14,
        color: "#666",
        textAlign: "center",
        marginBottom: 20,
      },
      doneButton: {
        backgroundColor: "#007BFF", // Blue button
        paddingVertical: 10,
        paddingHorizontal: 20,
        borderRadius: 8,
        alignItems: "center",
        width: "100%",
      },
      doneButtonText: {
        color: "#fff",
        fontSize: 16,
        fontWeight: "bold",
      },
      title: {
        fontSize: 20,
        fontWeight: "bold",
        color: "#000",
        marginBottom: 10,
      },
})