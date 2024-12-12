import { useMutation } from "@apollo/client";
import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Modal,
} from "react-native";
import { cancelRiderRequestedTrip } from "../query/query";
import AsyncStorage from "@react-native-async-storage/async-storage";

const RideRequestScreen = ({ tripDetails, onClose ,tripRefetchdetails}) => {
  const [timeLeft, setTimeLeft] = useState(180); // Default to 180 seconds
  const [cancelEnabled, setCancelEnabled] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showDriverNotFound, setShowDriverNotFound] = useState(false); // For "Driver Not Found" logic
  const [ws, setWs] = useState(null);

console.log('tripDetails',tripDetails)
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

  // useEffect(() => {
  //   if (tripDetails?.createdOn) {
  //     const createdTimeIST = Math.floor(tripDetails.createdOn / 1000);
  //     const createdTimeGMT = createdTimeIST - 19800; // Convert IST to GMT
  //     const currentTime = Math.floor(Date.now() / 1000); // Current time in seconds
  //     const elapsedTime = currentTime - createdTimeGMT;
  //     const remainingTime = Math.max(180 - elapsedTime, 0); // Prevent negative time
  //     setTimeLeft(remainingTime);
  //     // setCancelEnabled(remainingTime <= 0);
  //   }
  // }, [tripDetails]);

  useEffect(() => {
    if (timeLeft > 0) {
      const timer = setInterval(() => {
        setTimeLeft((prev) => prev - 1);
      }, 1000);

      return () => clearInterval(timer); // Cleanup interval
    } else {
      setCancelEnabled(true); // Enable cancel button when time runs out
      setTimeout(() => {
        onClose();
      }, 2000);
      

    }
  }, [timeLeft]);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs
      .toString()
      .padStart(2, "0")}`;
  };

  const handleCancelRide = () => {
      setShowCancelModal(true); // Show confirmation modal
    
  };

  const confirmCancelRide = () => {
    setShowCancelModal(false); // Close modal
    onAddClick(); // Trigger ride cancellation mutation
  };

  useEffect(() => {
    const setupWebSocket = async () => {
      try {
        // Get the authentication token
        const token = await AsyncStorage.getItem('idToken');
        if (!token) {
          console.error('No authentication token found');
          return;
        }
        console.log('Token retrieved:', token);
    
        // Setup headers for the WebSocket connection
        const headers = {
          Authorization: `Bearer ${token}`,
          host: '7w4zpgctonb7ldpcg4bam3jrbi.appsync-api.ap-southeast-1.amazonaws.com',
        };
        const base64Headers = btoa(JSON.stringify(headers));
        const base64Payload = btoa(JSON.stringify({})); // Properly stringify empty object
    
        // Define the WebSocket URL with encoded headers
        const websocketUrl = `wss://7w4zpgctonb7ldpcg4bam3jrbi.appsync-realtime-api.ap-southeast-1.amazonaws.com/graphql?header=${base64Headers}&payload=${base64Payload}`;
    
        const websocket = new WebSocket(websocketUrl, 'graphql-ws');
    
        websocket.onopen = () => {
          console.log('WebSocket connected');
    
          // Initialize connection with `connection_init` message
          websocket.send(
            JSON.stringify({
              type: 'connection_init',
              payload: {
                Authorization: `Bearer ${token}`,
              },
            })
          );
        };
    
        websocket.onmessage = (event) => {
          try {
            const message = JSON.parse(event.data);
            console.log('Received message7:', message);
    
            // Handle keep-alive messages
            if (message.type === 'ka') {
              return; // Ignore keep-alive messages
            }
    
            if (message.type === 'connection_ack') {
              console.log('Connection acknowledged by server.');
    
              // Start subscription after connection acknowledgment
              const subscriptionMessage = {
                id: '7',
                type: 'start',
                payload: {
                  data: "{\"query\": \"subscription MySubscription {\\n deleteRiderRequestedTrip {\\n responsestatus \\n }}\"}",
                  extensions: {
                    authorization: {
                      host: '7w4zpgctonb7ldpcg4bam3jrbi.appsync-api.ap-southeast-1.amazonaws.com',
                      Authorization: `Bearer ${token}`
                    }
                  }
                }
              };
              
              console.log('Sending subscription message:', subscriptionMessage);
              websocket.send(JSON.stringify(subscriptionMessage));
            }
    
            if (message.type === 'data') {
              // Handle subscription data
              console.log('Received subscription data:', message.payload);
              const responsestatus = message?.payload?.data?.deleteRiderRequestedTrip?.responsestatus;
            //   setRiderPhnum(message?.payload?.data?.updatedPaymentCaptured?.riderphonenumber);
            //   setDriverPhnum(message?.payload?.data?.updatedPaymentCaptured?.driverphonenumber);
            //   setDriverPK(message?.payload?.data?.updatedPaymentCaptured?.PK);
            //   setDriverSK(message?.payload?.data?.updatedPaymentCaptured?.SK);
              if (responsestatus) {
                console.log('Trip Ended:', responsestatus);
                tripRefetchdetails()
                setShowDriverNotFound(true); // Show "Driver Not Found" message
                setTimeout(() => {
                  setShowDriverNotFound(false); // Close the modal after 2 seconds
                  onClose();
                }, 2000);
                // refetch({ input: { userType: 'driver', driverphonenumber: message?.payload?.data?.updatedPaymentCaptured?.driverphonenumber } });
                // tripRefetch({ input: { PK: message?.payload?.data?.updatedPaymentCaptured?.PK, SK: message?.payload?.data?.updatedPaymentCaptured?.SK } });

                // setLoading(false);
                // setDriverFound(true);
                // setIsBooking(true); 

              }
            }
    
            if (message.type === 'error') {
              console.error('Subscription error:', JSON.stringify(message));
              if (message.payload?.errors?.[0]?.message) {
                console.error('Detailed subscription error:', message.payload.errors[0].message);
              }
            }
          } catch (err) {
            console.error('Error processing WebSocket message5:', err);
          }
        };
    
        websocket.onerror = (error) => {
          // console.error('WebSocket error:', error);
        };
    
        websocket.onclose = () => {
          console.log('WebSocket disconnected, retrying...');
          setTimeout(setupWebSocket, 3000);
        };
    
        setWs(websocket);
      } catch (err) {
        console.error('Error in setupWebSocket:', err);
      }
    };
  
    setupWebSocket();
  
    return () => {
      if (ws) {
        ws.close();
      }
    };
  }, []);

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

        <Text style={styles.timerText}>{formatTime(timeLeft)}</Text>

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
      {showDriverNotFound && (
        <Modal transparent animationType="fade" visible={showDriverNotFound}>
          <View style={styles.overlay}>
          <View style={styles.modalCard}>
          {/* Add your image */}
          <Image
            source={require('../assets/images/notfound.png')} // Replace with your image path
            style={styles.image}
          />
          <Text style={styles.modalTitle}>Oops! Boat Driver Not Found</Text>
          <Text style={styles.modalSubtitle}>
            It seems we couldn't find a boat driver for your trip. Please try booking again.
          </Text>
          {/* Retry button */}

        </View>
          </View>
        </Modal>
      )}

    </View>
  );
};

const styles = StyleSheet.create({
  container: {
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
  timerText: {
    fontSize: 36,
    fontWeight: "bold",
    color: "#333",
    textAlign: "center",
    marginBottom: 20,
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
});

export default RideRequestScreen;
