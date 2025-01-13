import { useMutation } from "@apollo/client";
import React, { useEffect, useState, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Modal,
  Alert,
} from "react-native";
import { cancelRiderRequestedTrip } from "../query/query";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { ProgressBar } from 'react-native-paper';

const RideRequestScreen = ({ tripDetails, onClose ,tripRefetchdetails,data,onNotFoundshow}) => {
  const [timeLeft, setTimeLeft] = useState(180); // Default to 180 seconds
  const [cancelEnabled, setCancelEnabled] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showDriverNotFound, setShowDriverNotFound] = useState(false); // For "Driver Not Found" logic
  const [ws, setWs] = useState(null);

  const [progress, setProgress] = useState(0);
  const [createdOn, setCreatedOn] = useState(tripDetails?.createdOn); // Get the createdOn time from tripDetails
  const [currentTime, setCurrentTime] = useState(Date.now()); // Get the current time

  const statusMessages = [
    "We are looking for the best rides for you.",
    "Searching for available drivers nearby.",
    "Almost there! Hang tight as we find your boat.",
    "Matching you with the most reliable driver.",
    "Just a moment longer! Finalizing your booking.",
    "Your perfect ride is just around the corner.",
    "Scanning the waters for the best boat options.",
    "Ensuring a smooth journey—stay with us!",
    "Finding the quickest route for your ride.",
    "Optimizing your ride experience for safety and comfort.",
    "Hold tight! We're confirming driver availability.",
    "Connecting you to a highly-rated captain.",
    "Navigating through the options for your best match.",
    "Your adventure is about to begin! One moment please.",
    "Aligning the stars to find your perfect boat match.",
    "Preparing your journey with care and precision.",
    "Ensuring the best fit for your travel needs.",
    "Loading the best options for your ride.",
    "Anchors away! Matching you with the ideal boat.",
    "Almost done! Your ride is being secured."
  ];
  
  const [currentMessageIndex, setCurrentMessageIndex] = useState(0);


  const [requestRide, { loading }] = useMutation(cancelRiderRequestedTrip, {
    onCompleted: (response) => {
      if (response.cancelRiderRequestedTrip.responsestatus) {
        onClose();
        tripRefetchdetails()
      }
    },
  });

  const onAddClick = () => {
    requestRide({
      variables: {
        input: {
          PK: tripDetails?.PK,
          SK: tripDetails?.SK,
        },
      },
    });
  };
 useEffect(() => {
    const messageInterval = setInterval(() => {
      setCurrentMessageIndex((prevIndex) => (prevIndex + 1) % statusMessages.length);
    }, 10000); // Change message every 5 seconds

    return () => clearInterval(messageInterval); // Cleanup interval
  }, []);

  useEffect(() => {
    if (timeLeft > 0) {
      const timer = setInterval(() => {
        setCurrentTime(Date.now()); // Update the current time
        setTimeLeft((prev) => prev - 1);
        setProgress((prev) => (prev + 0.008) % 1); // Update progress with a wave effect (0.005 can be adjusted for wave speed)
      }, 20); // Adjust interval for smoother animation (lower value for smoother)

      return () => clearInterval(timer); // Cleanup interval
    } else {
      setCancelEnabled(true); // Enable cancel button when time runs out
      setTimeout(() => {
        onClose();
      }, 2000);
    }
  }, [timeLeft, currentTime]); // Add currentTime to the dependency array

  useEffect(() => {
    if (createdOn) {
      const timeDifference = currentTime - createdOn; // Calculate the time difference
      if (timeDifference < 180000) { // If the time difference is less than 3 minutes
        setTimeLeft(Math.floor((180000 - timeDifference) / 1000)); // Set the time left to the remaining time
      }
    }
  }, [createdOn, currentTime]); // Add createdOn and currentTime to the dependency array

  const handleCancelRide = () => {
      setShowCancelModal(true); // Show confirmation modal
  };

  const confirmCancelRide = () => {
    setShowCancelModal(false); // Close modal
    onAddClick(); // Trigger ride cancellation mutation
  };

   const onNotFound = () => {
    setShowDriverNotFound(false);
    onClose();
  };

  

 

  return (
    <View style={styles.container}>
      <View style={styles.requestCard}>
        <Text style={styles.statusText}>Finding the best boat rides for you</Text>
        <View style={styles.avatarContainer}>
          <Image
            source={require('../assets/images/driver.png')}
            style={styles.avatar}
          />
        </View>
 <Text style={styles.statusTextarray}>
          {statusMessages[currentMessageIndex]} {/* Display the current status message */}
        </Text>
        <ProgressBar progress={progress} color={'#000'} style={{width: '100%', height: 10, marginBottom: 20,borderRadius:10}} />

        <TouchableOpacity
          style={[
            styles.cancelButton,
            cancelEnabled ? styles.enabledButton : styles.enabledButton,
          ]}
          onPress={handleCancelRide}
        >
          <Text style={styles.buttonText}>Cancel Ride</Text>
        </TouchableOpacity>
      </View>

      {/* Cancel Confirmation Modal */}
      {showCancelModal && (
        <Modal transparent animationType="fade" visible={showCancelModal}>
          <View style={styles.overlay}>
            <View style={styles.modalCard}>
              <Text style={styles.modalTitle}>Are you sure you want to cancel the ride?</Text>
              <Text style={styles.modalSubtitle}>
                Your driver will be here shortly
              </Text>
              <View style={styles.modalButtonContainer}>
                <TouchableOpacity
                  style={styles.modalCancelButton}
                  onPress={confirmCancelRide}
                >
                  <Text style={styles.modalCancelText}>Cancel Request</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.modalWaitButton}
                  onPress={() => setShowCancelModal(false)}
                >
                  <Text style={styles.modalWaitText}>Wait for Driver</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      )}
      
       


    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    flex: 1,
    justifyContent: "flex-end",
    alignItems: "bottom",
    zIndex: 1,

  },
  requestCard: {
    backgroundColor: "#f9f9f9",
    borderRadius: 10,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
    borderWidth: 1,
    borderColor: "#ccc",
  },
  statusText: {
    fontSize: 18,
    color: "#333",
    fontWeight: "600",
    textAlign: "center",
    marginBottom: 15,
  },
  statusTextarray: {
    fontSize: 16,          // Slightly smaller font for a clean look
    color: "#555",         // Neutral gray color for readability
    fontWeight: "500",     // Medium weight for better emphasis
    textAlign: "center",   // Center-align the text
    marginBottom: 20,      // Add spacing below for better layout
    lineHeight: 22,        // Improved readability for multiline text
  },
  avatarContainer: {
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 15,
  },
  avatar: {
    width: 150,
    height: 100,
    borderRadius: 40,
  },
  cancelButton: {
    padding: 15,
    borderRadius: 8,
    width: "100%",
    alignItems: "center",
    marginBottom: 20,
  },
  enabledButton: {
    backgroundColor: "#000",
  },
  disabledButton: {
    backgroundColor: "#ccc",
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)", // Dim background
    justifyContent: "center",
    alignItems: "center",
  },
  modalCard: {
    backgroundColor: "#fff",
    borderRadius: 15,
    padding: 20,
    width: "90%",
    alignItems: "center",
  },
  image: {
    width: 100,
    height: 100,
    marginBottom: 20,
    resizeMode: 'contain',
    borderRadius:40
  },
  retryText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 10,
    textAlign: "center",
  },
  modalSubtitle: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
    marginBottom: 20,
  },
  modalButtonContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
  },
  modalCancelButton: {
    backgroundColor: "#ff4444",
    padding: 12,
    borderRadius: 8,
    flex: 1,
    marginRight: 10,
    alignItems: "center",
  },
  modalCancelText: {
    color: "#fff",
    fontWeight: "bold",
  },
  modalWaitButton: {
    backgroundColor: "#ccc",
    padding: 12,
    borderRadius: 8,
    flex: 1,
    alignItems: "center",
  },
  modalWaitText: {
    color: "#333",
    fontWeight: "bold",
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
});

export default RideRequestScreen;
