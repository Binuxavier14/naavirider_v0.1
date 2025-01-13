import { useLazyQuery, useMutation, useQuery } from '@apollo/client';
import AsyncStorage from '@react-native-async-storage/async-storage';
import PersonIcon from "react-native-vector-icons/Ionicons";
import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Modal,
  TextInput,
  Alert,
  ScrollView,
  TouchableWithoutFeedback,
  ActivityIndicator,
  RefreshControl,
  Image,
} from 'react-native';
import { getPaymentTrip, getTripsByUser, getUserDetails, getUserInfo, refundPaidTrip } from '../query/query';
import Icon from 'react-native-vector-icons/Ionicons';
import { useRefetch } from '../RefetchProvider';
import { Dropdown } from 'react-native-element-dropdown';
import { ref } from 'yup';
import ModalAlerts from './ModalAlerts';
import Toast from './Toast';

// Sample trip data


// Helper function to style the status badge
const getStatusStyle = (status) => {
 
  if(status.includes('TRIP_ACCEPTED#')){
    return { backgroundColor: '#FDD835' };
  }
  else if(status.includes('TRIP_PAYMENT_DONE#')){
    return { backgroundColor: '#4CAF50' };
  }
  else if(status.includes('TRIP_STARTED#')){
    return { backgroundColor: '#2196F3' };
  }
  else if(status.includes('REFUND_REQUESTED#')){
    return { backgroundColor: '#2196F3' };
  }
  else if(status.includes('REFUND_PROCESSED#')){
    return { backgroundColor: '#4CAF50' };
  }
 

};

const getStatus = (status) => {
if(status.includes('TRIP_ACCEPTED#')){
  return 'Waiting for Payment';
}
else if(status.includes('TRIP_PAYMENT_DONE#')){
  return 'Payment Completed';
}
else if(status.includes('TRIP_STARTED#')){
  return 'Trip Started';
}
else if(status.includes('REFUND_REQUESTED#')){
  return 'Refund Initiated';
}
else if(status.includes('REFUND_PROCESSED#')){
  return 'Refund Completed';
}


};

function convertTimestamp(timestamp) {
  const date = new Date(timestamp * 1000); // Convert to milliseconds
  const day = date.toLocaleString('en-US', { weekday: 'long' }); // Get day of the week
  const formattedDate = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }); // Get formatted date
  return { day, date: formattedDate };
}

const TripCard = ({ trip, onStartTrip,onEndTrip,onRefundTrip  }) => (
  <View style={styles.card}>
    <View style={styles.header}>
      <Text style={[styles.status, getStatusStyle(trip.rstatus)]}>
        {getStatus(trip.rstatus)}
      </Text>
    </View>
    <View style={styles.body}>
      <View style={styles.route}>
        <Text style={styles.routeCode}>{trip?.zonename || '-'}</Text>
        <Text style={styles.dots}>--------</Text>
        <Text style={styles.routeCode}>{trip?.tripType}</Text>
      </View>
      <View style={styles.cityRow}>
        <Text style={styles.city}>Pickup</Text>
        <Text style={styles.city}>Type</Text>
      </View>
            <View style={styles.cityRow}>
<View>
      <Text style={styles.details}>
  {`${convertTimestamp(trip?.tripdate).day}, ${convertTimestamp(trip?.tripdate).date}`}
</Text>
      <Text style={styles.timedetails}>{trip?.timeSlot}</Text>
      </View>
      <View>
        <Text  style={styles.details}>Payment Type</Text>
        <Text style={{fontSize: 16,
    color: '#555',
    marginTop: 5,
    fontWeight:'bold',textAlign:'right'}}>  {trip?.paymentType ? trip.paymentType.charAt(0).toUpperCase() + trip.paymentType.slice(1) : '-'}
        </Text>
        </View>
      </View>
      {/* Start Trip Button for Payment Confirmed */}
      {trip?.rstatus.includes('TRIP_ACCEPTED') && (
        <TouchableOpacity
          style={styles.startTripButton}
          onPress={() => onStartTrip(trip)}
        >
          <Text style={styles.startTripButtonText}>Pay now</Text>
        </TouchableOpacity>
      )}
       {(trip?.rstatus.includes('TRIP_PAYMENT_DONE#') || trip?.rstatus.includes('REFUND_REQUESTED#') ) && (
        <>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <TouchableOpacity
            style={styles.startTripButton}
            onPress={() => onEndTrip(trip)}
          >
            <Text style={styles.startTripButtonText}>View Details</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.refundTripButton}
            onPress={() => onRefundTrip(trip)}
          >
            <Text style={styles.refundTripButtonText}>Refund</Text>
          </TouchableOpacity>
        </View>
        </>
      )}
       {trip?.rstatus.includes('TRIP_ACCEPTED') || trip?.rstatus.includes('REFUND_PROCESSED#')  && (
        <TouchableOpacity
          style={styles.startTripButton}
          onPress={() => onEndTrip(trip)}
        >
          <Text style={styles.startTripButtonText}>View Details</Text>
        </TouchableOpacity>
      )}
    </View>
  </View>
);

const Explore = ({ navigation }) => {
 
  const [modalVisible, setModalVisible] = useState(false);
  const [refundVisible, setRefundVisible] = useState(false);
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [activeTripId, setActiveTripId] = useState(null);
  const [ws, setWs] = useState(null);
  const [driverPK ,setDriverPK] = useState('');
  const [driverSK ,setDriverSK] = useState('');
  const [loading, setLoading] = useState(false); // New state for loading
  const [refreshing, setRefreshing] = useState(false);
  const [selectedReason, setSelectedReason] = useState(null);
  const [isRefundModalVisible, setRefundModalVisible] = useState(false);
  const [tripended, setTripEnded] = useState(false);
  const [tripstarted, setTripStarted] = useState(false);


  const { data, loading: apiLoading,refetch } = useQuery(getTripsByUser, {
    fetchPolicy: "network-only",
    variables: { input: {isEndTrip : 'false'} },
  });
  //console.log('data',data)

  const { data:userdata } = useQuery(getUserInfo, {
    fetchPolicy: "network-only",
    variables: { input: {userType :'rider'} },
  });
// //console.log('userdata',userdata)
  const [getDriverDetails, { data:driverdata,loading: orderIDLoading }] = useLazyQuery(
    getUserDetails,
    {
      fetchPolicy: "network-only",
      onCompleted: (response) => {
       //console.log('response1',response)
       setModalVisible(true);

      },
    }
  );
  const [getOTP, { data:otpdata,loading: otplaoding }] = useLazyQuery(
    getPaymentTrip,
    {
      fetchPolicy: "network-only",
      onCompleted: (response) => {
       //console.log('response',response)
      
      },
    }
  );
  // //console.log('tripdata1',data)  

  const onRefresh = () => {
    setRefreshing(true);
    refetch();
    setTimeout(() => {
      
      setRefreshing(false);
    }, 2000);
  };
  const { setRefetchFunction } = useRefetch();

  const stableRefetch = useCallback(() => {
    refetch();
  }, [refetch]);
  
  useEffect(() => {
    if (setRefetchFunction) {
      setRefetchFunction(() => stableRefetch);
    }
  }, [stableRefetch, setRefetchFunction]);
  

  const refundReasons = [
    { label: "Driver didn't show up", value: "Driver didn't show up" },
    { label: "Driver canceled the ride", value: "Driver canceled the ride" },
    { label: "Vehicle not as described", value:  "Vehicle not as described" },
    { label: "Trip canceled by system", value: "Trip canceled by system" },
    { label: "Unsatisfactory service", value: "Unsatisfactory service" },
    { label: "Overcharged or billing error", value: "Overcharged or billing error" },
    { label: "Inaccurate pickup or drop-off location", value: "Inaccurate pickup or drop-off location" },
    { label: "Other reason", value: "Other reason" }
  ];

  const handlePayNow = (trip) => {
    navigation.navigate('Home', {
      isBooking: true,
      tripDetails: trip,
    });
  };
  const handleViewDetails = (trip) => {
    setActiveTripId(trip)
    getDriverDetails({
      variables: {
        input: { userType: 'driver', driverphonenumber: trip?.driverphonenumber },
      },
    });
    getOTP({
      variables: {
        input: { PK: trip?.PK, SK: trip?.SK },
      },
    });
  };

  const handleRefundtrip = (trip) => {
    setActiveTripId(trip);
    setRefundVisible(true);
  };


 
const handleReasonSelection = (item) => {
    setSelectedReason(item.value);
    
  };

  const closeModal = () => {
    setModalVisible(false);
    setRefundVisible(false);
    setSelectedReason(null)
    setOtp(['', '', '', '', '', '']); // Reset OTP
    setRefundModalVisible(false)
  };

  const [addUserFunction, { loading: mloading }] = useMutation(
    refundPaidTrip,
    {
      onCompleted: (response) => {
        refetch();
        closeModal();
        setRefundModalVisible(true)
        //console.log('refunded',response?.refundPaidTrip)

if(response?.refundPaidTrip?.responsestatus) {
  //console.log('responsetrip',response?.refundPaidTrip)
      
}     },
    }
  );
  const handleRefundPress = () => {
    //console.log('hi');
    let   input = {
     PK:activeTripId?.PK,
     SK:activeTripId?.SK,
     refundremarks:selectedReason,
    };
    //console.log('input', input);
    addUserFunction({
      variables: {
        input: {
          PK:activeTripId?.PK,
          SK:activeTripId?.SK,
          refundremarks:selectedReason,
        },
      },
    })
    ;
   
    
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
        //console.log('Token retrieved:', token);
    
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
          //console.log('WebSocket connected');
    
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
            //console.log('Received message8:', message);
    
            // Handle keep-alive messages
            if (message.type === 'ka') {
              return; // Ignore keep-alive messages
            }
    
            if (message.type === 'connection_ack') {
              //console.log('Connection acknowledged by server.');
    

              const subscriptionData = {
                query: `
                  subscription MySubscription($riderphonenumber: String!,$driverphonenumber: String!) {
                    updatedRefundProcessed(riderphonenumber: $riderphonenumber,driverphonenumber: $driverphonenumber) {
                      responsestatus
                    }
                  }
                `,
                variables: {
                  riderphonenumber: userdata && userdata?.getUserInfo[0]?.SK, // Replace with dynamic value if needed
                  driverphonenumber: activeTripId?.driverphonenumber, // Replace with dynamic value if needed
                },
              };

              // Start subscription after connection acknowledgment
              const subscriptionMessage = {
                id: '8',
                type: 'start',
                payload: {
                  // data: "{\"query\": \"subscription MySubscription {\\n updatedRefundProcessed {\\n responsestatus \\n }}\"}",
                  data: JSON.stringify(subscriptionData),
                  extensions: {
                    authorization: {
                      host: '7w4zpgctonb7ldpcg4bam3jrbi.appsync-api.ap-southeast-1.amazonaws.com',
                      Authorization: `Bearer ${token}`
                    }
                  }
                }
              };
              
              //console.log('Sending subscription message:', subscriptionMessage);
              websocket.send(JSON.stringify(subscriptionMessage));
            }
    
            if (message.type === 'data') {
              // Handle subscription data
              //console.log('Received subscription data:', message.payload);
              const responsestatus = message?.payload?.data?.updatedRefundProcessed?.responsestatus;
            //   setRiderPhnum(message?.payload?.data?.updatedPaymentCaptured?.riderphonenumber);
            //   setDriverPhnum(message?.payload?.data?.updatedPaymentCaptured?.driverphonenumber);
            //   setDriverPK(message?.payload?.data?.updatedPaymentCaptured?.PK);
            //   setDriverSK(message?.payload?.data?.updatedPaymentCaptured?.SK);
              if (responsestatus) {
                // //console.log('Trip Ended:', responsestatus);
                // Alert.alert('Refund processed', 'Your Refund processed.');

                // refetch({ input: { userType: 'driver', driverphonenumber: message?.payload?.data?.updatedPaymentCaptured?.driverphonenumber } });
                // tripRefetch({ input: { PK: message?.payload?.data?.updatedPaymentCaptured?.PK, SK: message?.payload?.data?.updatedPaymentCaptured?.SK } });

                // setLoading(false);
                // setDriverFound(true);
                // setIsBooking(true); 

              }
            }
    
            if (message.type === 'error') {
              // console.error('Subscription error:', JSON.stringify(message));
              if (message.payload?.errors?.[0]?.message) {
                // console.error('Detailed subscription error:', message.payload.errors[0].message);
                // Alert.alert('Subscription Error', message.payload.errors[0].message);
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
          //console.log('WebSocket disconnected, retrying...');
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
  }, [userdata,activeTripId]);

  useEffect(() => {
    const setupWebSocket = async () => {
      try {
        // Get the authentication token
        const token = await AsyncStorage.getItem('idToken');
        if (!token) {
          console.error('No authentication token found');
          return;
        }
        //console.log('Token retrieved:', token);
    
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
          //console.log('WebSocket connected');
    
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
            //console.log('Received message5:', message);
    
            // Handle keep-alive messages
            if (message.type === 'ka') {
              return; // Ignore keep-alive messages
            }
    
            if (message.type === 'connection_ack') {
              //console.log('Connection acknowledged by server.');
    

              const subscriptionData = {
                query: `
                  subscription MySubscription($riderphonenumber: String!) {
                    endededTrip(riderphonenumber: $riderphonenumber) {
                      responsestatus
                    }
                  }
                `,
                variables: {
                  riderphonenumber: userdata && userdata?.getUserInfo[0]?.SK, // Replace with dynamic value if needed
                },
              };

              // Start subscription after connection acknowledgment
              const subscriptionMessage = {
                id: '4',
                type: 'start',
                payload: {
                  // data: "{\"query\": \"subscription MySubscription {\\n endededTrip {\\n responsestatus \\n }}\"}",
                  data: JSON.stringify(subscriptionData),
                  extensions: {
                    authorization: {
                      host: '7w4zpgctonb7ldpcg4bam3jrbi.appsync-api.ap-southeast-1.amazonaws.com',
                      Authorization: `Bearer ${token}`
                    }
                  }
                }
              };
              
              //console.log('Sending subscription message:', subscriptionMessage);
              websocket.send(JSON.stringify(subscriptionMessage));
            }
    
            if (message.type === 'data') {
              // Handle subscription data
              //console.log('Received subscription data:', message.payload);
              const responsestatus = message?.payload?.data?.endededTrip?.responsestatus;
            //   setRiderPhnum(message?.payload?.data?.updatedPaymentCaptured?.riderphonenumber);
            //   setDriverPhnum(message?.payload?.data?.updatedPaymentCaptured?.driverphonenumber);
            //   setDriverPK(message?.payload?.data?.updatedPaymentCaptured?.PK);
            //   setDriverSK(message?.payload?.data?.updatedPaymentCaptured?.SK);
              if (responsestatus) {
                //console.log('Trip Ended:', responsestatus);
                setTripEnded(true);
                refetch();

                // refetch({ input: { userType: 'driver', driverphonenumber: message?.payload?.data?.updatedPaymentCaptured?.driverphonenumber } });
                // tripRefetch({ input: { PK: message?.payload?.data?.updatedPaymentCaptured?.PK, SK: message?.payload?.data?.updatedPaymentCaptured?.SK } });

                // setLoading(false);
                // setDriverFound(true);
                // setIsBooking(true); 

              }
            }
    
            if (message.type === 'error') {
              // console.error('Subscription error:', JSON.stringify(message));
              if (message.payload?.errors?.[0]?.message) {
                // console.error('Detailed subscription error:', message.payload.errors[0].message);
                // Alert.alert('Subscription Error', message.payload.errors[0].message);
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
          //console.log('WebSocket disconnected, retrying...');
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
  }, [userdata]);

  useEffect(() => {
    const setupWebSocket = async () => {
      try {
        // Get the authentication token
        const token = await AsyncStorage.getItem('idToken');
        if (!token) {
          console.error('No authentication token found');
          return;
        }
        //console.log('Token retrieved:', token);
    
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
          //console.log('WebSocket connected');
    
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
            //console.log('Received message4:', message);
    
            // Handle keep-alive messages
            if (message.type === 'ka') {
              return; // Ignore keep-alive messages
            }
    
            if (message.type === 'connection_ack') {
              //console.log('Connection acknowledged by server.');

              const subscriptionData = {
                query: `
                  subscription MySubscription($riderphonenumber: String!) {
                    startedTrip(riderphonenumber: $riderphonenumber) {
                      responsestatus
                    }
                  }
                `,
                variables: {
                  riderphonenumber: userdata && userdata?.getUserInfo[0]?.SK, // Replace with dynamic value if needed
                },
              };
    
              // Start subscription after connection acknowledgment
              const subscriptionMessage = {
                id: '3',
                type: 'start',
                payload: {
                  data: JSON.stringify(subscriptionData),
                    extensions: {
                    authorization: {
                      host: '7w4zpgctonb7ldpcg4bam3jrbi.appsync-api.ap-southeast-1.amazonaws.com',
                      Authorization: `Bearer ${token}`
                    }
                  }
                }
              };
              
              //console.log('Sending subscription message:', subscriptionMessage);
              websocket.send(JSON.stringify(subscriptionMessage));
            }
    
            if (message.type === 'data') {
              // Handle subscription data
              //console.log('Received subscription data:', message.payload);
              const responsestatus = message?.payload?.data?.startedTrip?.responsestatus;
            //   setRiderPhnum(message?.payload?.data?.updatedPaymentCaptured?.riderphonenumber);
            //   setDriverPhnum(message?.payload?.data?.updatedPaymentCaptured?.driverphonenumber);
            //   setDriverPK(message?.payload?.data?.updatedPaymentCaptured?.PK);
            //   setDriverSK(message?.payload?.data?.updatedPaymentCaptured?.SK);
              if (responsestatus) {
                //console.log('Trip Started:', responsestatus);
                setTripStarted(true);
                refetch();
                               
                // refetch({ input: { userType: 'driver', driverphonenumber: message?.payload?.data?.updatedPaymentCaptured?.driverphonenumber } });
                // tripRefetch({ input: { PK: message?.payload?.data?.updatedPaymentCaptured?.PK, SK: message?.payload?.data?.updatedPaymentCaptured?.SK } });

                // setLoading(false);
                // setDriverFound(true);
                // setIsBooking(true); 

              }
            }
    
            if (message.type === 'error') {
              // console.error('Subscription error:', JSON.stringify(message));
              if (message.payload?.errors?.[0]?.message) {
                // console.error('Detailed subscription error:', message.payload.errors[0].message);
                // Alert.alert('Subscription Error', message.payload.errors[0].message);
              }
            }
          } catch (err) {
            console.error('Error processing WebSocket message4:', err);
          }
        };
    
        websocket.onerror = (error) => {
          // console.error('WebSocket error:', error);
        };
    
        websocket.onclose = () => {
          //console.log('WebSocket disconnected, retrying...');
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
  }, [userdata]);

  //console.log('activeTripId',activeTripId)
  return (
    <View style={styles.container}>
       {(apiLoading || orderIDLoading || otplaoding ) && (
        <View style={styles.loadingOverlay}>
           <View style={styles.loadingCard}>
          <Icon name="boat" size={50} color="black" />
          {/* <Text>Searching Boat ...</Text> */}
          <ActivityIndicator size="large" color="black" style={{ marginTop: 20 }} />
          </View>
        </View>
      )}

      <Text style={styles.title}>Your Upcoming Trips</Text>

      <View style={styles.toastcontainer}>

      <Toast
        message="Your Trip has been ended!"
        visible={tripended}
        onClose={() => setTripEnded(false)}
      />
      <Toast
        message="Your Trip has been started!"
        visible={tripstarted}
        onClose={() => setTripStarted(false)}
      />
      </View>

      {/* <ModalAlerts  isVisible={tripended}
  onClose={() => setTripEnded(false)}
  title="Trip Ended !"
  body ="Your Trip has been ended"/>

<ModalAlerts  isVisible={tripstarted}
  onClose={() => setTripStarted(false)}
  title="Trip Started !"
  body ="Your Trip has been started"/> */}

      <View >
 
     {data?.getTripsByUser?.length !== 0 ?

      <FlatList
        data={data?.getTripsByUser}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          // <TripCard trip={item} onStartTrip={handleStartTrip}  onEndTrip={handleEndTrip} />
<TripCard trip={item} onStartTrip={() => handlePayNow(item)} onEndTrip={() => handleViewDetails(item)} onRefundTrip={() => handleRefundtrip(item)} />
        )}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['grey']}
            progressBackgroundColor={'black'}
          />
        }
      />
      : <ScrollView
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          colors={['grey']}
          progressBackgroundColor={'black'}
        />
      }
    >
      <View style={styles.nodataboatCard}>
        <View style={styles.nodataIcon}>
          <Icon name="boat" size={80} color="#dddddd" />
          <Text style={{ color: '#dddddd', fontSize: 23 }}>No trips</Text>
        </View>
      </View>
    </ScrollView>
      }

</View>
<Modal
      visible={modalVisible}
      animationType="slide"
      transparent={true}
      onRequestClose={closeModal}    >
      {/* Dimmed Background */}
      <TouchableOpacity style={styles.modalBackground} activeOpacity={1} onPress={closeModal} />

      {/* Bottom Sheet */}
      <View style={styles.tripCard}>
        {/* Header Section */}
        <View style={styles.profileheader}>
          <View style={styles.profileContainer}>
          {driverdata?.getUserDetails.length !== 0 ?
<>
          <PersonIcon name="person-circle-sharp" size={50} color="#ccc" />
            <View style={styles.driverInfo}>
              <Text style={styles.driverName}> {driverdata?.getUserDetails[0]?.driverFirstName} {driverdata?.getUserDetails[0]?.driverLastName}</Text>
              {/* <Text style={styles.rating}>⭐ 4.8</Text> */}
            </View>
</>
:
<View style={styles.banner}>
<Icon name="information-circle" size={20} color="#F5A623" style={styles.icon} />

<Text style={styles.bannerText}>
Your driver will be assiged !.
</Text>
</View>
}
          </View>
          
          <View style={styles.costTimeContainer}>
          <TouchableOpacity style={styles.closeButton}  onPress={closeModal}>
            <Text style={styles.closeText}>✕</Text>
          </TouchableOpacity>
            <Text style={styles.costText}>
              Trip cost{"\n"}
              <Text style={styles.costValue}>
  ₹{
    activeTripId?.tripType === "Full Trip"
      ? (() => {
          const tripAmountInfo = activeTripId?.tripamountinfo;
          if (tripAmountInfo && typeof tripAmountInfo === "string") {
            try {
              const parsed = JSON.parse(tripAmountInfo);
              return activeTripId?.paymentType === 'full' ? parsed?.triptype_full_with_margin_gst : parsed?.triptype_full_partial_gst 
            } catch (error) {
              console.error("Error parsing tripamountinfo:", error);
              return "Error"; // Fallback if JSON parsing fails
            }
          }
          return "Unavailable"; // Fallback if tripamountinfo is invalid
        })()
      : activeTripId?.tripType === "Half Trip"
      ? (() => {
          const tripAmountInfo = activeTripId?.tripamountinfo;
          if (tripAmountInfo && typeof tripAmountInfo === "string") {
            try {
              const parsed = JSON.parse(tripAmountInfo);
              return activeTripId?.paymentType === 'full' ? parsed?.triptype_half_with_margin_gst : parsed?.triptype_half_partial_gst 

            } catch (error) {
              console.error("Error parsing tripamountinfo:", error);
              return "Error";
            }
          }
          return "Unavailable";
        })()
      : (() => {
          const tripAmountInfo = activeTripId?.tripamountinfo;
          if (tripAmountInfo && typeof tripAmountInfo === "string") {
            try {
              const parsed = JSON.parse(tripAmountInfo);
              return activeTripId?.paymentType === 'full' ? parsed?.triptype_cross_with_margin_gst : parsed?.triptype_cross_partial_gst 

            } catch (error) {
              console.error("Error parsing tripamountinfo:", error);
              return "Error";
            }
          }
          return "Unavailable";
        })()
  }
</Text>

            </Text>
            <Text style={styles.timeText}>
              { otpdata?.getPaymentTrip.length !== 0 && !activeTripId?.rstatus?.includes('TRIP_STARTED#') &&
              <Text style={styles.timeValue}>  OTP : {otpdata?.getPaymentTrip[0]?.otp}</Text>}
            </Text>
          </View>
        
        </View>

        {/* Trip Details Section */}
        <View style={styles.tripDetails}>
          <Text style={styles.sectionTitle}>Trip Details</Text>
         
          <View style={styles.locationItem}>
            <View style={styles.locationIcon}>
              <Text style={styles.iconDestination}>📍</Text>
            </View>
            <View style={styles.locationTextContainer}>
              <Text style={styles.locationName}>
                 {activeTripId?.zonename}
              </Text>
              <Text style={styles.locationTime}>
                 Pickup
              </Text>
            </View>
            
          </View>
          <View style={styles.locationItem}>
            <View style={styles.locationIcon}>
              <Icon name="people-circle" size={30} color="black" />
              
            </View>
            <View style={styles.locationTextContainer}>
              <Text style={styles.locationTime}>
                Number of People
              </Text>
              <Text style={styles.locationName}>
              {activeTripId?.numberofriders}
              </Text>
            </View>
          </View>
          <View style={styles.locationItem}>
            <View style={styles.locationIcon}>
            <Icon name="calendar-number" size={30} color="black" />
              
            </View>
            <View style={styles.locationTextContainer}>
            <Text style={styles.locationTime}>
              Time{"\n"}
              <Text style={styles.timeValue}>  {`${convertTimestamp(activeTripId?.tripdate).day}, ${convertTimestamp(activeTripId?.tripdate).date}`}</Text>
            </Text>
            </View>
          </View>
        </View>
      </View>
    </Modal>

    <Modal
      visible={refundVisible}
      animationType="slide"
      transparent={true}
      onRequestClose={closeModal}    >

      {/* Dimmed Background */}
      <TouchableOpacity style={styles.modalBackground} activeOpacity={1} onPress={closeModal} />

      {/* Bottom Sheet */}
      <View style={styles.refundCard}>
      {(mloading) && (
        <View style={styles.loadingOverlay}>
           <View style={styles.loadingCard}>
          <Icon name="boat" size={50} color="black" />
          {/* <Text>Searching Boat ...</Text> */}
          <ActivityIndicator size="large" color="black" style={{ marginTop: 20 }} />
          </View>
        </View>
      )}
        {/* Header Section */}
        <View style={styles.profileheader}>
          <View style={styles.profileContainer}>
          {/* <PersonIcon name="person-circle-sharp" size={50} color="#ccc" /> */}

            <View style={styles.driverInfo}>
              <Text style={styles.driverName}> Refund Process</Text>
            </View>
          </View>
          <View style={styles.costTimeContainer}>
            <Text style={styles.costText}>
              Trip cost{"\n"}
              <Text style={styles.costValue}>
  ₹{
    activeTripId?.tripType === "Full Trip"
      ? (() => {
          const tripAmountInfo = activeTripId?.tripamountinfo;
          if (tripAmountInfo && typeof tripAmountInfo === "string") {
            try {
              const parsed = JSON.parse(tripAmountInfo);
              return activeTripId?.paymentType === 'full' ? parsed?.triptype_full_with_margin_gst : parsed?.triptype_full_partial_gst 
            } catch (error) {
              console.error("Error parsing tripamountinfo:", error);
              return "Error"; // Fallback if JSON parsing fails
            }
          }
          return "Unavailable"; // Fallback if tripamountinfo is invalid
        })()
      : activeTripId?.tripType === "Half Trip"
      ? (() => {
          const tripAmountInfo = activeTripId?.tripamountinfo;
          if (tripAmountInfo && typeof tripAmountInfo === "string") {
            try {
              const parsed = JSON.parse(tripAmountInfo);
              return activeTripId?.paymentType === 'full' ? parsed?.triptype_half_with_margin_gst : parsed?.triptype_half_partial_gst 

            } catch (error) {
              console.error("Error parsing tripamountinfo:", error);
              return "Error";
            }
          }
          return "Unavailable";
        })()
      : (() => {
          const tripAmountInfo = activeTripId?.tripamountinfo;
          if (tripAmountInfo && typeof tripAmountInfo === "string") {
            try {
              const parsed = JSON.parse(tripAmountInfo);
              return activeTripId?.paymentType === 'full' ? parsed?.triptype_cross_with_margin_gst : parsed?.triptype_cross_partial_gst 

            } catch (error) {
              console.error("Error parsing tripamountinfo:", error);
              return "Error";
            }
          }
          return "Unavailable";
        })()
  }
</Text>

            </Text>
            {/* <Text style={styles.timeText}>
              {!activeTripId?.rstatus?.includes('TRIP_STARTED#') &&
              <Text style={styles.timeValue}>  OTP : {otpdata?.getPaymentTrip[0]?.otp}</Text>}
            </Text> */}
          </View>
          <TouchableOpacity style={styles.closeButton}  onPress={closeModal}>
            <Text style={styles.closeText}>✕</Text>
          </TouchableOpacity>
        </View>

        {/* Trip Details Section */}
{!activeTripId?.rstatus?.includes('REFUND_REQUESTED#') &&
        <Dropdown
        style={styles.dropdown}
        containerStyle={styles.dropdownContainer}
        data={refundReasons}
        labelField="label"
        valueField="value"
        placeholder="Select Refund Reason"
        placeholderStyle={{ color: '#888', fontSize: 16 }} // Placeholder text style
        textStyle={{ color: '#333', fontSize: 16 }} // Style for the selected value text
        selectedTextStyle={{ color: '#333', fontSize: 16 }}        
        itemTextStyle={{ color: '#333', fontSize: 16 }} // Style for dropdown items
        value={selectedReason}
        onChange={(item) => handleReasonSelection(item)}
      />
}
        <View style={styles.tripDetails}>
          <Text style={styles.sectionTitle}>Trip Details</Text>
         
          <View style={styles.locationItem}>
            <View style={styles.locationIcon}>
              <Text style={styles.iconDestination}>📍</Text>
            </View>
            <View style={styles.locationTextContainer}>
              <Text style={styles.locationName}>
                 {activeTripId?.zonename}
              </Text>
              <Text style={styles.locationTime}>
                 Pickup
              </Text>
            </View>
            
          </View>
          <View style={styles.locationItem}>
            <View style={styles.locationIcon}>
              <Icon name="people-circle" size={30} color="black" />
              
            </View>
            <View style={styles.locationTextContainer}>
              <Text style={styles.locationTime}>
                Number of People
              </Text>
              <Text style={styles.locationName}>
              {activeTripId?.numberofriders}
              </Text>
            </View>
          </View>
          <View style={styles.locationItem}>
            <View style={styles.locationIcon}>
            <Icon name="calendar-number" size={30} color="black" />
              
            </View>
            <View style={styles.locationTextContainer}>
            <Text style={styles.locationTime}>
              Time{"\n"}
              <Text style={styles.timeValue}>  {`${convertTimestamp(activeTripId?.tripdate).day}, ${convertTimestamp(activeTripId?.tripdate).date}`}</Text>
            </Text>
            </View>
          </View>
        </View>
        <View style={styles.banner}>
        <Icon name="information-circle" size={20} color="#F5A623" style={styles.icon} />

      <Text style={styles.bannerText}>
        Your refund will be credited to your account in 3-5 business days.
      </Text>
    </View>
    {!activeTripId?.rstatus?.includes('REFUND_REQUESTED#') &&

        <TouchableOpacity
  onPress={handleRefundPress}
  style={[
    styles.bookButton,
  selectedReason ? {} : styles.disabledButton, // Change color to indicate disabled state
  ]}
  disabled={!selectedReason} // Disable button if no reason is selected
>
<Text style={styles.bookButtonText}>Initiate Refund</Text>
          </TouchableOpacity>
}
      </View>
    </Modal>

    <Modal
      visible={isRefundModalVisible}
      animationType="slide"
      transparent={true}
      onRequestClose={closeModal}
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
          <Text style={styles.title}>Refund Successful!</Text>

          {/* Refund Details */}
          <Text style={styles.message}>
            We've processed your refund of{" "}
            <Text style={styles.refundAmount}>₹{
    activeTripId?.tripType === "Full Trip"
      ? (() => {
          const tripAmountInfo = activeTripId?.tripamountinfo;
          if (tripAmountInfo && typeof tripAmountInfo === "string") {
            try {
              const parsed = JSON.parse(tripAmountInfo);
              return parsed?.triptype_full_with_margin_gst;
            } catch (error) {
              console.error("Error parsing tripamountinfo:", error);
              return "Error"; // Fallback if JSON parsing fails
            }
          }
          return "Unavailable"; // Fallback if tripamountinfo is invalid
        })()
      : activeTripId?.tripType === "Half Trip"
      ? (() => {
          const tripAmountInfo = activeTripId?.tripamountinfo;
          if (tripAmountInfo && typeof tripAmountInfo === "string") {
            try {
              const parsed = JSON.parse(tripAmountInfo);
              return parsed?.triptype_half_with_margin_gst;
            } catch (error) {
              console.error("Error parsing tripamountinfo:", error);
              return "Error";
            }
          }
          return "Unavailable";
        })()
      : (() => {
          const tripAmountInfo = activeTripId?.tripamountinfo;
          if (tripAmountInfo && typeof tripAmountInfo === "string") {
            try {
              const parsed = JSON.parse(tripAmountInfo);
              return parsed?.triptype_cross_with_margin_gst;
            } catch (error) {
              console.error("Error parsing tripamountinfo:", error);
              return "Error";
            }
          }
          return "Unavailable";
        })()
  }</Text> for the trip selected.
          </Text>
          <Text style={styles.subMessage}>
            The amount will appear in your original payment method within 3–5 business days.
          </Text>

          {/* Done Button */}
          <TouchableOpacity style={styles.doneButton} onPress={closeModal}>
            <Text style={styles.doneButtonText}>Done</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>

     

    </View>
  );
};

export default Explore;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 15,
    backgroundColor: '#F5F5F5',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 15,
    color: '#333',
  },
  card: {
    backgroundColor: '#FFF',
    borderRadius: 10,
    marginBottom: 15,
    padding: 15,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 5,
    elevation: 2,
  },
  header: {
    marginBottom: 10,
  },
  status: {
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 5,
    color: '#FFF',
    fontWeight: 'bold',
    alignSelf: 'flex-start',
  },
  body: {
    marginTop: 5,
  },
  route: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 5,
  },
  routeCode: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  dots: {
    flex: 1,
    textAlign: 'center',
    color: '#999',
  },
  cityRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 5,
  },
  city: {
    fontSize: 14,
    color: '#666',
  },
  
  details: {
    fontSize: 14,
    color: '#555',
    marginTop: 5,
  },
  timedetails: {
    fontSize: 16,
    color: '#555',
    marginTop: 5,
    fontWeight:'bold',
  },
  startTripButton: {
    marginTop: 10,
    backgroundColor: '#000',
    paddingVertical: 10,
    paddingHorizontal: 30,
    borderRadius: 5,
    alignItems: 'center',
  },
  refundTripButton: {
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#000',
    color:'#000',
    paddingVertical: 10,
    paddingHorizontal: 30,
    borderRadius: 5,
    alignItems: 'center',
  },
  refundTripButtonText: {
    color: '#000',
    fontWeight: 'bold',
    fontSize:15
  },
  startTripButtonText: {
    color: '#FFF',
    fontWeight: 'bold',
    fontSize:15
  },
  modalContainer: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    width: "90%",
    backgroundColor: "#FFF",
    borderRadius: 10,
    padding: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 10,
    color: "#333",
  },
  detailLabel: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#555",
    marginTop: 10,
  },
  detailValue: {
    fontSize: 14,
    color: "#333",
    marginTop: 5,
  },

  closeButtonText: {
    color: "#FFF",
    fontWeight: "bold",
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex:1
  },
  loadingCard: {
    backgroundColor: 'white', // Card background color
    padding: 20, // Add padding for inner content
    borderRadius: 15, // Rounded corners
    alignItems: 'center', // Center content horizontally
    justifyContent: 'center', // Center content vertically
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 5, // Shadow for Android
    width: 150, // Fixed width for square
    height: 150,
  },
  modalBackground: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.4)",
  },
  tripCard: {
    position: "absolute",
    bottom: 0,
    width: "100%",
    backgroundColor: "#fff",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    elevation: 10,
    zIndex: 1000,
    height:500
  },
  refundCard: {
    position: "absolute",
    bottom: 0,
    width: "100%",
    backgroundColor: "#fff",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    elevation: 10,
    zIndex: 1000,
    height:600
  },
  profileheader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  profileContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 10,
  },
  driverInfo: {
    flexDirection: "column",
  },
  driverName: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#333",
  },
  rating: {
    fontSize: 14,
    color: "#777",
  },
  costTimeContainer: {
    flexDirection: "column",
    alignItems: "flex-end",
  },
  costText: {
    fontSize: 14,
    color: "#888",
    textAlign: "right",
  },
  costValue: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
    paddingTop:2
  },
  timeText: {
    fontSize: 12,
    color: "#888",
    marginTop: 5,
  },
  timeValue: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
  },
  closeButton: {
    backgroundColor: "#ccc",
    padding: 0,
    borderRadius: 15,
    width: 30,
    height: 30,
    justifyContent: "center",
    alignItems: "center",
  },
  closeText: {
    fontSize: 18,
    color: "#333",
    fontWeight: "bold",
  },
  tripDetails: {
    marginTop: 10,
    marginBottom:50,
    borderWidth: 1,
  borderColor: '#ccc',
  borderRadius: 10,
  padding: 15,
  backgroundColor: '#f9f9f9',


  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#888",
    marginBottom: 10,
  },
  locationItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 15,
  },
  locationIcon: {
    width: 30,
    height: 30,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
  },
  iconStar: {
    fontSize: 18,
    color: "#FFD700",
  },
  iconDestination: {
    fontSize: 18,
    color: "#4CAF50",
  },
  locationTextContainer: {
    flexDirection: "column",
    flex: 1,
  },
  locationName: {
    fontSize: 18,
    color: "#333",
    fontWeight:'bold'
  },
  locationTime: {
    fontSize: 18,
    color: "#777",
  },
  dropdown: {
    height: 50,
    borderColor: '#ccc',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 8,
    backgroundColor: '#fff',
  },
  dropdownContainer: {
    borderRadius: 8,
    elevation: 2,
  },
  bookButton: {
    backgroundColor: '#000',
    paddingVertical: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 20,
    
  },
  bookButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  disabledButton: {
    backgroundColor: '#ccc', // Disabled button color
  },
  banner: {
    flexDirection: "row", // Align items horizontally
    backgroundColor: "#FFF7E6", // Light orange background
    padding: 10,
    borderRadius: 8,
    marginVertical: 10,
  },
  bannerText: {
    color: "#F5A623", // Orange text color
    fontSize: 14,
    fontWeight: "500",
    textAlign: "center",
    paddingRight: 10,

  },
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
  nodataboatCard: {
    height:400,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#f9f9f9',
    borderRadius: 15,
    padding: 35,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 1,
  },
  nodataIcon:{
    ...StyleSheet.absoluteFillObject,

    justifyContent: 'center',
    alignItems: 'center',
  },
});
