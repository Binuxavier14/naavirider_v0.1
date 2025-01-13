import { Image, StyleSheet, Platform, View, Text, TextInput, TouchableOpacity, Animated, Easing, ScrollView, ActivityIndicator, Dimensions, Alert, Button, Modal } from 'react-native';

import PersonIcon from "react-native-vector-icons/Ionicons";
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import { useEffect, useRef, useState } from 'react';
import Icon from 'react-native-vector-icons/Ionicons';
import Fontisto from 'react-native-vector-icons/AntDesign';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useLazyQuery, useMutation, useQuery } from '@apollo/client';
import {getBoat, getBoatTypePrice, getBoatTypes, getPaymentOrderId, getPaymentTrip, getTripsByUser, getTripUser, getUserDetails, getUserInfo, getZonesList, riderRequestTrip} from '../query/query'
import AsyncStorage from '@react-native-async-storage/async-storage';
import RazorpayCheckout from 'react-native-razorpay';
import { Dropdown } from 'react-native-element-dropdown';
import RideRequestScreen from './RideRequestScreen';
import notifee, { AndroidImportance ,EventType} from '@notifee/react-native';
import messaging from '@react-native-firebase/messaging';
import { useRefetch } from '../RefetchProvider';
import ModalAlerts from './ModalAlerts';
import Toast from './Toast';

const generateTimeSlots = (startTime, endTime) => {
  const timeSlots = [];
  let current = startTime;
  while (current <= endTime) {
    const hours = Math.floor(current / 60);
    const minutes = current % 60;
    const period = hours < 12 ? 'AM' : 'PM';
    const formattedHours = (`0${hours % 12 || 12}`).slice(-2); // 12-hour format with leading zero
    const formattedMinutes = (`0${minutes}`).slice(-2);
    timeSlots.push(`${formattedHours}:${formattedMinutes} ${period}`);
    current += 30; // Increment by 30 minutes
  }
  return timeSlots;
};


const getStartOfDayMinutes = (hour, minute) => hour * 60 + minute;

export default function Home({route, navigation }) {
  const [numberOfPeople, setNumberOfPeople] = useState(3);
  const [selectedTripType, setSelectedTripType] = useState('Full Trip');
  const [isExpanded, setIsExpanded] = useState(false);
  const [showGST, setshowGST] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isBooking, setIsBooking] = useState(false);
  const [visible, setVisible] = useState(false);
  const [selectedPayementmethod, setSelectedPayemntmethod] = useState('Full Payment');
  const [selectedBoat, setSelectedBoat] = useState(null);
  const screenWidth = Dimensions.get('window').width;
  const [selectedZone, setSelectedZone] = useState(null);
  const [selectedDate, setSelectedDate] = useState('Today');
  const [selectedTime, setSelectedTime] = useState(null);
  const [timeSlots, setTimeSlots] = useState([]);
  const [selectedDateEpoch, setSelectedDateEpoch] = useState(null);
  const [dateLabels, setDateLabels] = useState({});
  const [driverFound, setDriverFound] = useState(false);
  const [socket, setSocket] = useState(null);
  const [bookingType, setBookingType] = useState('now');
  const [ws, setWs] = useState(null);
  const [riderRequestPk ,setRiderRequestPK] = useState('');
  const [riderRequestSk ,setRiderRequestSK] = useState('');
  const [riderRequestPkBookLater ,setRiderRequestPKBookLater] = useState('');
  const [riderRequestSkBookLater ,setRiderRequestSKBookLater] = useState('');
  const [riderPhnum ,setRiderPhnum] = useState('');
  const [driverPhnum ,setDriverPhnum] = useState('');
  const [driverPK ,setDriverPK] = useState('');
  const [driverSK ,setDriverSK] = useState('');
  const [boatsWithCapacity, setBoatsWithCapacity] = useState([]);
  const [laterPayment, setlaterPayment] = useState(false);
  const [tripDetails, setTripDetails] = useState(null);
  const [showRideRequest, setShowRideRequest] = useState(false);
  const [tripData, setTripData] = useState(null); // State to store API response
  const [modaldriverfound, setModaldriverfound] = useState(false);
  const [modalpaymentdone, setModalPayment] = useState(false);
  const [toastVisible, setToastVisible] = useState(false);
  const [tripassigned, setTripAssigned] = useState(false);
  const [showNotFound, setShowNotFound] = useState(false); // For "Driver Not Found" logic

  const [fetchData] = useLazyQuery(getBoatTypes);
  const { refetchFunction } = useRefetch();

// //console.log('tripData',tripData)
  const handleSelect = (zone) => {
    setSelectedZone(zone.name);
  };
  useEffect(() => {
    if (route.params?.isBooking) {
      if(route.params.tripDetails?.rstatus?.includes('TRIP_ACCEPTED#')){
      setIsBooking(true);
      setTripData(route.params.tripDetails)
      }
      // //console.log('trip',route.params.tripDetails?.tripsk)
      setSelectedTripType(route.params.tripDetails?.tripType)
      setTripDetails(JSON.parse(route.params.tripDetails?.tripamountinfo)); 
      setRiderRequestSK(route.params.tripDetails?.tripsk)
      setRiderRequestPK(route.params.tripDetails?.trippk)
    }
  }, [route.params]);
  // //console.log('tripDetails',tripDetails);

  useEffect(() => {
    const now = new Date();

    const formatDate = (date) =>
      date.toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' });

    const today = new Date();
    const tomorrow = new Date();
    tomorrow.setDate(now.getDate() + 1);

    const dayAfterTomorrow = new Date();
    dayAfterTomorrow.setDate(now.getDate() + 2);

    setDateLabels({
      Today: { label: formatDate(today), epoch: today.getTime() },
      Tomorrow: { label: formatDate(tomorrow), epoch: tomorrow.getTime() },
      'Day After Tomorrow': { label: formatDate(dayAfterTomorrow), epoch: dayAfterTomorrow.getTime() },
    });
  }, []);

  const handleDateSelection = (key) => {
    // //console.log('key',key)
    setSelectedDate(key);
    setSelectedDateEpoch(Math?.floor(dateLabels[key || selectedDate]?.epoch / 1000));
    if(key === 'Today'){
      setBookingType('now');
    }
    if(key !== 'Today'){
      setBookingType('later');
    }
  };
  const handleDateTimeSelection = (key) => {
    // //console.log('key',key)
    setSelectedTime(key?.value)
    setSelectedDateEpoch(Math?.floor(dateLabels[selectedDate]?.epoch / 1000));

  };
  
// //console.log('selectedDateEpoch',selectedDateEpoch)
  useEffect(() => {
    const now = new Date();
    const currentMinutes = getStartOfDayMinutes(now.getHours(), now.getMinutes());
    const endOfDayMinutes = getStartOfDayMinutes(23, 30); // 8:00 PM
    const startOfDayMinutes = getStartOfDayMinutes(5, 0); // 5:00 AM

    let slots = [];
    if (selectedDate === 'Today') {
      const nextAvailableSlot = Math.max(
        Math.ceil(currentMinutes / 30) * 30, // Round to the next 30-minute slot
        startOfDayMinutes
      );
            if (nextAvailableSlot < endOfDayMinutes) {
        slots = generateTimeSlots(nextAvailableSlot, endOfDayMinutes);
      }
    } else {
      slots = generateTimeSlots(startOfDayMinutes, endOfDayMinutes); // Full range for other days
    }

    setTimeSlots(slots);
  }, [selectedDate]);

// //console.log('timeSlots',timeSlots)
  const openMenu = () => setVisible(true);
  const closeMenu = () => setVisible(false);

  const [mapRegion, setMapRegion] = useState({
    latitude: 25.3000, // Latitude for Shivala Ghat, Varanasi
  longitude: 83.0000, // Longitude for Shivala Ghat, Varanasi
    latitudeDelta: 0.02,
    longitudeDelta: 0.02,
  });

  const cardHeight = useRef(new Animated.Value(380)).current;

  const toggleCard = () => {
    Animated.timing(cardHeight, {
      toValue: isExpanded ? 380 : 650,
      duration: 100,
      easing: Easing.ease,
      useNativeDriver: false,
    }).start();
    setIsExpanded(!isExpanded);
  };


  const toggleExpanded = () => {
    setshowGST((prev) => !prev);
  };

  const incrementPeople = () => {
    setNumberOfPeople((prev) => prev + 1);
  };

  const decrementPeople = () => {
    if (numberOfPeople > 1) {
      setNumberOfPeople((prev) => prev - 1);
    }
  };

  const tripTypes = [
    { label: 'Full Trip', key: 'Full Trip' },
    { label: 'Half Trip', key: 'Half Trip' },
    { label: 'Cross Trip', key: 'Cross Trip' },
  ];

  const paymentOption = [
    { label: 'Full Payment', key: 'Full Payment' },
    { label: 'Partial Payment', key: 'Partial Payment' },
    // Add more boat options here as needed
  ];

  const { data, loading: apiLoading } = useQuery(getUserInfo, {
    fetchPolicy: "network-only",
    variables: { input: {userType :'rider'} },
  });

  const { data:zonelist } = useQuery(getZonesList, {
    fetchPolicy: "network-only",
    variables: { input: { } },
  });
  // //console.log('zonelist',zonelist)
  const { data:boatsss } = useQuery(getBoatTypePrice, {
    fetchPolicy: "network-only",
    variables: { input: { } },
  });
  useEffect(() => {
    if (boatsss?.getBoatTypePrice) {
      const boatsWithCapacity = boatsss?.getBoatTypePrice?.map((boat) => {
        let capacity;
        switch (boat.SK) {
          case "BOATTYPE#SMALL":
            capacity = "1-10";
            break;
          case "BOATTYPE#MEDIUM":
            capacity = "1-20";
            break;
          case "BOATTYPE#LARGE":
            capacity = "1-30";
            break;
          case "BOATTYPE#EXTRALARGE":
            capacity = "1-40";
            break;
          default:
            capacity = "0";
        }
        return { ...boat, capacity }; // Add 'capacity' key to the object
      });
      setBoatsWithCapacity(boatsWithCapacity);
    }
  }, [boatsss]);

  // console.log('boatsss',boatsWithCapacity)

  // //console.log('zonelist',zonelist)
  const toCamelCase = (str) => str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
  const formattedZoneOptions = zonelist?.getZonesList.map((zone) => ({
    ...zone,
    zonenameCamelCase: toCamelCase(zone.zonename),
  })) || [];
// //console.log('formattedZoneOptions',zonelist)
  
  const { data:triprequestData, loading: requestLoading,refetch:tripRefetchdetails } = useQuery(getTripUser, {
    fetchPolicy: "network-only",
    variables: { input: {} },
    onCompleted: (fetchedData) => {
      // setTripData(fetchedData?.getTripUser[0] || null); 
      // setTripDetails(JSON.parse(fetchedData?.getTripUser[0]?.tripamountinfo)); 
      // setSelectedTripType(fetchedData?.getTripUser[0]?.tripType)

    },
  });
// //console.log('triprequestData',triprequestData)
  const [getorderIDdata, { loading: orderIDLoading }] = useLazyQuery(
    getPaymentOrderId,
    {
      fetchPolicy: "network-only",
      onCompleted: (response) => {
      //  //console.log('response',response)
       const amountsent = selectedTripType === "Full Trip"
       ? (selectedPayementmethod === 'Full Payment' ? selectedBoat?.triptype_full_with_margin_gst || tripDetails?.triptype_full_with_margin_gst : selectedBoat?.triptype_full_partial_gst || tripDetails?.triptype_full_partial_gst) 
       : selectedTripType === "Half Trip"
       ? (selectedPayementmethod === 'Full Payment' ? selectedBoat?.triptype_half_with_margin_gst || tripDetails?.triptype_half_with_margin_gst : selectedBoat?.triptype_half_partial_gst || tripDetails?.triptype_half_partial_gst)
       : (selectedPayementmethod === 'Full Payment' ? selectedBoat?.triptype_cross_with_margin_gst || tripDetails?.triptype_cross_with_margin_gst : selectedBoat?.triptype_cross_partial_gst || tripDetails?.triptype_cross_partial_gst)
       
       const forBooklater  = JSON.stringify({'pkskvalue': `${riderRequestPkBookLater}$#$${riderRequestSkBookLater}`, 'bookingtype': `${bookingType}`});
       const forBooknow  = JSON.stringify({'pkskvalue': `${riderRequestPk}$#$${riderRequestSk}`, 'bookingtype': `${bookingType}`});
       const notes =
       bookingType === 'now'
         ? {
             pkskvalue: `${riderRequestPk}$#$${riderRequestSk}`,
             bookingtype: bookingType,
           }
         : {
             pkskvalue: `${riderRequestPkBookLater}$#$${riderRequestSkBookLater}`,
             bookingtype: bookingType,
           };
   
           const options = {
         description: bookingType === 'now' ? forBooknow : forBooklater,
         image: 'https://your-logo-url.com/logo.png',
         currency: 'INR',
         key: 'rzp_test_vGHcGnfF7EcM0B',
         amount: amountsent * 100,
         order_id: response?.getPaymentOrderId?.orderID,
         name: 'Your Company Name',
         prefill: {
           email: 'user@example.com',
           contact: '9999999999',
           name: 'John Doe'
         },
         theme: { color: '#53a20e' },
         notes: notes, // Adding notes object
         timeout: 30, // Timeout in seconds

       };
       let timeout = setTimeout(() => {
        alert('Payment process timed out after 3 minutes!');
      }, 30000);

       RazorpayCheckout.open(options)
         .then((data) => {
          clearTimeout(timeout);  // Clear timeout if payment is successful before 3 minutes
           // Payment successful
           //console.log('Payment successful', data);
         })
         .catch((error) => {
           // Payment failed
           clearTimeout(timeout);  // Clear timeout if payment fails before 3 minutes
           console.error('Payment failed', error);
         });
      },
    }
  );

  // const { data:orderIDdata, loading: orderIDLoading, } = useQuery(getPaymentOrderId, {
  //   fetchPolicy: "network-only",
  //   variables: { input: {} },
  //   onCompleted: (fetchedData) => {

  //     // setTripDetails(JSON.parse(fetchedData?.getTripUser[0]?.tripamountinfo)); 
  //     // setSelectedTripType(fetchedData?.getTripUser[0]?.tripType)

  //   },
  // });

  const { data:driverdetails, loading:driverloading, refetch } = useQuery(getUserDetails, {
    fetchPolicy: 'network-only', 
    variables: { input: { userType: 'driver', driverphonenumber: driverPhnum } },
    skip: !driverPhnum, 
    onCompleted: (fetchedData) => {
      // //console.log('Driver Details fetched:', fetchedData.getUserDetails);
      setDriverFound(true);

      // Alert.alert(
      //   'Driver Details',
      //   `Name: ${fetchedData.getUserDetails.driverFirstName}`
      // );
    },
    onError: (error) => {
        // console.error('Error fetching driver details:', error);
        // Alert.alert('Error', 'Failed to fetch driver details.');
      },
    });
console.log('driverdetails',driverdetails)
    const { data:tripdetails, loading:triploading, refetch:tripRefetch } = useQuery(getPaymentTrip, {
        fetchPolicy: 'network-only', 
        variables: { input: { PK: driverPK, SK: driverSK } },
        skip: !driverSK && !driverPK, 
        onCompleted: (fetchedData) => {
          // //console.log('Trip Details fetched:', fetchedData.getPaymentTrip);
          // Alert.alert(
          //   'Trip Details',
          //   `Name: ${fetchedData.getPaymentTrip.otp}`
          // );
        },
        onError: (error) => {
            // console.error('Error fetching Trip details:', error);
            // Alert.alert('Error', 'Failed to fetch Trip details.');
          },
        });

// //console.log('tripdetails',tripdetails)
  useEffect(() => {
    const setupWebSocket = async () => {
      try {
        // Get the authentication token
        const token = await AsyncStorage.getItem('idToken');
        if (!token) {
          // console.error('No authentication token found');
          return;
        }
        // //console.log('Token retrieved:', token);
    
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
            // //console.log('Received message1:', message);
    
            // Handle keep-alive messages
            if (message.type === 'ka') {
              return; // Ignore keep-alive messages
            }
    
            if (message.type === 'connection_ack') {
              //console.log('Connection acknowledged by server.');
    
              const subscriptionData = {
                query: `
                  subscription MySubscription($riderphonenumber: String!) {
                    acceptedTrip(riderphonenumber: $riderphonenumber) {
                      responsestatus
                      PK
                      SK
                    }
                  }
                `,
                variables: {
                  riderphonenumber: data && data?.getUserInfo[0]?.SK, // Replace with dynamic value if needed
                },
              };

              // Start subscription after connection acknowledgment
              const subscriptionMessage = {
                id: '1',
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
              
              // //console.log('Sending subscription message:', subscriptionMessage);
              websocket.send(JSON.stringify(subscriptionMessage));
            }
    
            if (message.type === 'data') {
              // Handle subscription data
              // //console.log('Received subscription data:', message.payload);
              const responsestatus = message?.payload?.data?.acceptedTrip?.responsestatus;
              setRiderRequestPK(message?.payload?.data?.acceptedTrip?.PK);
              setRiderRequestSK(message?.payload?.data?.acceptedTrip?.SK)
              if (responsestatus) {
                // //console.log('AcceptedTrip subscription successful:', responsestatus);
                // setModaldriverfound(true)
                setToastVisible(true);
                setLoading(false);
                setIsBooking(true); 
                tripRefetchdetails();
                setShowRideRequest(false);
                if(refetchFunction){
                refetchFunction();
                }


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
            // console.error('Error processing WebSocket message1:', err);
          }
        };
    
        websocket.onerror = (error) => {
          // console.error('WebSocket error:', error);
        };
    
        websocket.onclose = () => {
          // //console.log('WebSocket disconnected, retrying...');
          setTimeout(setupWebSocket, 3000);
        };
    
        setWs(websocket);
      } catch (err) {
        // console.error('Error in setupWebSocket:', err);
      }
    };
  
    setupWebSocket();
  
    return () => {
      if (ws) {
        ws.close();
      }
    };
  }, [data,refetchFunction]);


  useEffect(() => {
    const setupWebSocket = async () => {
      try {
        // Get the authentication token
        const token = await AsyncStorage.getItem('idToken');
        if (!token) {
          // console.error('No authentication token found');
          return;
        }
        // //console.log('Token retrieved:', token);
    
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
          // //console.log('WebSocket connected');
    
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
            // //console.log('Received message2:', message);
    
            // Handle keep-alive messages
            if (message.type === 'ka') {
              return; // Ignore keep-alive messages
            }
    
            if (message.type === 'connection_ack') {
              // //console.log('Connection acknowledged by server.');
    
              // Start subscription after connection acknowledgment
              const subscriptionData = {
                query: `
                  subscription MySubscription($riderphonenumber: String!) {
                    updatedPaymentCaptured(riderphonenumber: $riderphonenumber) {
                      responsestatus
                      PK
                      SK
                      driverphonenumber
                      riderphonenumber
                    }
                  }
                `,
                variables: {
                  riderphonenumber: data && data?.getUserInfo[0]?.SK, // Replace with dynamic value if needed
                },
              };
              
              const subscriptionMessage = {
                id: '2',
                type: 'start',
                payload: {
                  // data: "{\"query\": \"subscription MySubscription {\\n updatedPaymentCaptured {\\n responsestatus \\n riderphonenumber \\n driverphonenumber \\n PK \\n SK \\n }}\"}",
                  data: JSON.stringify(subscriptionData),
                  extensions: {
                    authorization: {
                      host: '7w4zpgctonb7ldpcg4bam3jrbi.appsync-api.ap-southeast-1.amazonaws.com',
                      Authorization: `Bearer ${token}`
                    }
                  }
                }
              };
              
              // //console.log('Sending subscription message:', subscriptionMessage);
              websocket.send(JSON.stringify(subscriptionMessage));
            }
    
            if (message.type === 'data') {
              // Handle subscription data
              // //console.log('Received subscription data:', message.payload);
              const responsestatus = message?.payload?.data?.updatedPaymentCaptured?.responsestatus;
              setRiderPhnum(message?.payload?.data?.updatedPaymentCaptured?.riderphonenumber);
              setDriverPhnum(message?.payload?.data?.updatedPaymentCaptured?.driverphonenumber);
              setDriverPK(message?.payload?.data?.updatedPaymentCaptured?.PK);
              setDriverSK(message?.payload?.data?.updatedPaymentCaptured?.SK);
              if (responsestatus) {
                // //console.log('Payment successful:', responsestatus);

                setModalPayment(true);
                refetch({ input: { userType: 'driver', driverphonenumber: message?.payload?.data?.updatedPaymentCaptured?.driverphonenumber } });
                tripRefetch({ input: { PK: message?.payload?.data?.updatedPaymentCaptured?.PK, SK: message?.payload?.data?.updatedPaymentCaptured?.SK } });
                // sendPaymentNotification();
                if(refetchFunction){
                  refetchFunction();
                  }
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
            // console.error('Error processing WebSocket message2:', err);
          }
        };
    
        websocket.onerror = (error) => {
          // console.error('WebSocket error:', error);
        };
    
        websocket.onclose = () => {
          // //console.log('WebSocket disconnected, retrying...');
          setTimeout(setupWebSocket, 3000);
        };
    
        setWs(websocket);
      } catch (err) {
        // console.error('Error in setupWebSocket:', err);
      }
    };
  
    setupWebSocket();
  
    return () => {
      if (ws) {
        ws.close();
      }
    };
  }, [data,refetchFunction]);

  useEffect(() => {
    const setupWebSocket = async () => {
      try {
        // Get the authentication token
        const token = await AsyncStorage.getItem('idToken');
        if (!token) {
          // console.error('No authentication token found');
          return;
        }
        // //console.log('Token retrieved:', token);
    
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
          // //console.log('WebSocket connected');
    
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
            // //console.log('Received message3:', message);
    
            // Handle keep-alive messages
            if (message.type === 'ka') {
              return; // Ignore keep-alive messages
            }
    
            if (message.type === 'connection_ack') {
              // //console.log('Connection acknowledged by server.');
    
              // Start subscription after connection acknowledgment
              const subscriptionData = {
                query: `
                  subscription MySubscription($riderphonenumber: String!) {
                    tripLaterPaymentCaptured_sub(riderphonenumber: $riderphonenumber) {
                      responsestatus
                  
                    }
                  }
                `,
                variables: {
                  riderphonenumber: data && data?.getUserInfo[0]?.SK, // Replace with dynamic value if needed
                },
              };

              const subscriptionMessage = {
                id: '5',
                type: 'start',
                payload: {
                  // data: "{\"query\": \"subscription MySubscription {\\n tripLaterPaymentCaptured_sub {\\n responsestatus \\n }}\"}",
                  data: JSON.stringify(subscriptionData),
                  extensions: {
                    authorization: {
                      host: '7w4zpgctonb7ldpcg4bam3jrbi.appsync-api.ap-southeast-1.amazonaws.com',
                      Authorization: `Bearer ${token}`
                    }
                  }
                }
              };
              
              // //console.log('Sending subscription message:', subscriptionMessage);
              websocket.send(JSON.stringify(subscriptionMessage));
            }
    
            if (message.type === 'data') {
              // Handle subscription data
              // //console.log('Received subscription data:', message.payload);
              const responsestatus = message?.payload?.data?.tripLaterPaymentCaptured_sub?.responsestatus;
              // setRiderPhnum(message?.payload?.data?.updatedPaymentCaptured?.riderphonenumber);
              // setDriverPhnum(message?.payload?.data?.updatedPaymentCaptured?.driverphonenumber);
              // setDriverPK(message?.payload?.data?.updatedPaymentCaptured?.PK);
              // setDriverSK(message?.payload?.data?.updatedPaymentCaptured?.SK);
              if (responsestatus) {
                // //console.log('Payment successful:', responsestatus);
                // Alert.alert('Paymnet', 'Your Payment was succesful.');
                // refetch({ input: { userType: 'driver', driverphonenumber: message?.payload?.data?.updatedPaymentCaptured?.driverphonenumber } });
                // tripRefetch({ input: { PK: message?.payload?.data?.updatedPaymentCaptured?.PK, SK: message?.payload?.data?.updatedPaymentCaptured?.SK } });
                // sendPaymentNotification();
                            setIsBooking(false);
                            setlaterPayment(true)
                // Alert.alert('Driver', 'You will be assigned a Driver shortly');
                if(refetchFunction){
                  refetchFunction();
                  }
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
            // console.error('Error processing WebSocket message3:', err);
          }
        };
    
        websocket.onerror = (error) => {
          // console.error('WebSocket error:', error);
        };
    
        websocket.onclose = () => {
          // //console.log('WebSocket disconnected, retrying...');
          setTimeout(setupWebSocket, 3000);
        };
    
        setWs(websocket);
      } catch (err) {
        // console.error('Error in setupWebSocket:', err);
      }
    };
  
    setupWebSocket();
  
    return () => {
      if (ws) {
        ws.close();
      }
    };
  }, [data,refetchFunction]);

 

 

  useEffect(() => {
    const setupWebSocket = async () => {
      try {
        // Get the authentication token
        const token = await AsyncStorage.getItem('idToken');
        if (!token) {
          // console.error('No authentication token found');
          return;
        }
        // //console.log('Token retrieved:', token);
    
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
          // //console.log('WebSocket connected');
    
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
            // //console.log('Received message9:', message);
    
            // Handle keep-alive messages
            if (message.type === 'ka') {
              return; // Ignore keep-alive messages
            }
    
            if (message.type === 'connection_ack') {
              // //console.log('Connection acknowledged by server.');
    

              const subscriptionData = {
                query: `
                  subscription MySubscription($riderphonenumber: String!,$rstatus: String!) {
                    deletedAcceptedTrip(riderphonenumber: $riderphonenumber,rstatus: $rstatus) {
                      responsestatus
                    }
                  }
                `,
                variables: {
                  riderphonenumber: data && data?.getUserInfo[0]?.SK,
                  rstatus:'TRIP_ACCEPTED',
                  // Replace with dynamic value if needed
                },
              };

              // Start subscription after connection acknowledgment
              const subscriptionMessage = {
                id: '9',
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
              
              // //console.log('Sending subscription message:', subscriptionMessage);
              websocket.send(JSON.stringify(subscriptionMessage));
            }
    
            if (message.type === 'data') {
              // Handle subscription data
              // //console.log('Received subscription data:', message.payload);
              const responsestatus = message?.payload?.data?.deletedAcceptedTrip?.responsestatus;
            //   setRiderPhnum(message?.payload?.data?.updatedPaymentCaptured?.riderphonenumber);
            //   setDriverPhnum(message?.payload?.data?.updatedPaymentCaptured?.driverphonenumber);
            //   setDriverPK(message?.payload?.data?.updatedPaymentCaptured?.PK);
            //   setDriverSK(message?.payload?.data?.updatedPaymentCaptured?.SK);
              if (responsestatus) {
 Alert.alert('Payment Request Timedout', 'You were ran out of time');
 setIsBooking(false);

                // //console.log('Trip Ended:', responsestatus);
                // setTripEnded(true);
                // handleClose();
                if(refetchFunction){
                  refetchFunction();
                  }
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
  }, [data,refetchFunction]);

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
          host: 'hpcr5w3qvbbgxe7x3gzuyoerdu.appsync-api.ap-southeast-1.amazonaws.com',
        };
        const base64Headers = btoa(JSON.stringify(headers));
        const base64Payload = btoa(JSON.stringify({})); // Properly stringify empty object
    
        // Define the WebSocket URL with encoded headers
        const websocketUrl = `wss://hpcr5w3qvbbgxe7x3gzuyoerdu.appsync-realtime-api.ap-southeast-1.amazonaws.com/graphql?header=${base64Headers}&payload=${base64Payload}`;
    
        const websocket = new WebSocket(websocketUrl, 'graphql-ws');
    
        websocket.onopen = () => {
          //console.log('WebSocket connected');
    
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
            //console.log('Received6:', message);
    
            // Handle keep-alive messages
            if (message.type === 'ka') {
              return; // Ignore keep-alive messages
            }
    
            if (message.type === 'connection_ack') {
              //console.log('Connection acknowledged by server.');
    
              // Start subscription after connection acknowledgment
              const subscriptionData = {
                query: `
                  subscription MySubscription($riderphonenumber: String!) {
                    assignedDrivertoTrip(riderphonenumber: $riderphonenumber) {
                      responsestatus
                     
                    }
                  }
                `,
                variables: {
                  riderphonenumber: data && data?.getUserInfo[0]?.SK, // Replace with dynamic value if needed
                },
              };
              const subscriptionMessage = {
                id: '6',
                type: 'start',
                payload: {
                  // data: "{\"query\": \"subscription MySubscription {\\n assignedDrivertoTrip {\\n responsestatus \\n }}\"}",
                  data: JSON.stringify(subscriptionData),
                  extensions: {
                    authorization: {
                      host: 'hpcr5w3qvbbgxe7x3gzuyoerdu.appsync-api.ap-southeast-1.amazonaws.com',
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
              const responsestatus = message?.payload?.data?.assignedDrivertoTrip?.responsestatus;
            //   setRiderPhnum(message?.payload?.data?.updatedPaymentCaptured?.riderphonenumber);
            //   setDriverPhnum(message?.payload?.data?.updatedPaymentCaptured?.driverphonenumber);
            //   setDriverPK(message?.payload?.data?.updatedPaymentCaptured?.PK);
            //   setDriverSK(message?.payload?.data?.updatedPaymentCaptured?.SK);
              if (responsestatus) {
                //console.log('Driver has been assigned:', responsestatus);
                // Alert.alert('Driver Assigned', 'Driver has been assigned.');
                setTripAssigned(true);
                handleClose();
                // sendTripLaterDriverNotification();
                if(refetchFunction){
                  refetchFunction();
                  }
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
            console.error('Error processing WebSocket:', err);
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
  }, [data,refetchFunction]);

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
            //console.log('errorMesage',JSON.stringify(message))
            //console.log('Received message7:', message);
    
            // Handle keep-alive messages
            if (message.type === 'ka') {
              return; // Ignore keep-alive messages
            }
    
            if (message.type === 'connection_ack') {
              //console.log('Connection acknowledged by server.');

              const subscriptionData = {
                query: `
                  subscription MySubscription($riderphonenumber: String!,$rstatus: String!,) {
                    deleteRiderRequestedTrip(riderphonenumber: $riderphonenumber,rstatus: $rstatus) {
                      responsestatus
                    }
                  }
                `,
                variables: {
                  riderphonenumber: data && data?.getUserInfo[0]?.SK, // Replace with dynamic value if needed
                  rstatus:'RIDER_REQUESTED'
                },
              };
              //console.log('check',`RIDER_REQUESTED#${data && data?.getUserInfo[0]?.SK}`)
              // Start subscription after connection acknowledgment
              const subscriptionMessage = {
                id: '7',
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
              const responsestatus = message?.payload?.data?.deleteRiderRequestedTrip?.responsestatus;
              //console.log('responsestatus',responsestatus)
            //   setDriverPhnum(message?.payload?.data?.updatedPaymentCaptured?.driverphonenumber);
            //   setDriverPK(message?.payload?.data?.updatedPaymentCaptured?.PK);
            //   setDriverSK(message?.payload?.data?.updatedPaymentCaptured?.SK);
              if (responsestatus) {
                setShowNotFound(true);
                // Alert.alert('Trip deleted', 'Your Trip has ended');
                // //console.log('Trip deleted:', responsestatus);
                tripRefetchdetails();

                // setShowDriverNotFound(true); // Show "Driver Not Found" message
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
              }
            }
          } catch (err) {
            // console.error('Error processing WebSocket message5:', err);
          }
        };
    
        websocket.onerror = (error) => {
          // console.error('WebSocket error:', error);
        };
    
        websocket.onclose = () => {
          // //console.log('WebSocket disconnected, retrying...');
          setTimeout(setupWebSocket, 3000);
        };
    
        setWs(websocket);
      } catch (err) {
        // console.error('Error in setupWebSocket:', err);
      }
    };
  
    setupWebSocket();
  
    return () => {
      if (ws) {
        ws.close();
      }
    };
  }, [data]);

  const [addUserFunction, { loading: mloading }] = useMutation(
    riderRequestTrip,
    {
      onCompleted: (response) => {
        // //console.log('response',response?.riderRequestTrip)

if(response?.riderRequestTrip?.responsestatus) {
  // //console.log('responsetrip',response?.riderRequestTrip)
  setRiderRequestPKBookLater(response?.riderRequestTrip?.PK);
  setRiderRequestSKBookLater(response?.riderRequestTrip?.SK);
  setLoading(true); 
  setDriverFound(false);
  tripRefetchdetails();
  setShowRideRequest(true);
  if(selectedDate !== 'Today'){
    setIsBooking(true)

  }
  setTimeout(() => {
    
      setLoading(false); 
    
    
  }, 4000);  

      
    
    
}     },
    }
  );

  useEffect(() => {
    if (showRideRequest) {
      const dataToStore = {
        showRideRequest: true,
        bookingType: 'now', 
        triprequestData: triprequestData, 
      };
      AsyncStorage.setItem('rideRequestTimeLeft', JSON.stringify(dataToStore));
    }
  }, [showRideRequest, bookingType, triprequestData]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const storedData = await AsyncStorage.getItem('rideRequestData');
        if (storedData) {
          const parsedData = JSON.parse(storedData);
          setShowRideRequest(parsedData.showRideRequest);
          setBookingType(parsedData.bookingType);
        } else {
          // Fetch trip details from your API (if needed)
          // ...
        }
      } catch (error) {
        // console.error('Error fetching ride request data:', error);
      }
    };

    fetchData();
  }, []);

  useEffect(() => {
    if (triprequestData && triprequestData?.getTripUser && triprequestData?.getTripUser[0]) {
      // Store the trip data in AsyncStorage when it's available
      const dataToStore = {
        showRideRequest: showRideRequest, // Include showRideRequest and bookingType if needed
        bookingType: bookingType, 
        triprequestData: triprequestData, 
      };
      AsyncStorage.setItem('rideRequestData', JSON.stringify(dataToStore));
    }
  }, [triprequestData, showRideRequest, bookingType]); // Include dependencies

// //console.log('redierpk',riderRequestSkBookLater)
const handleCloseRideRequest = async () => {
  setShowRideRequest(false);

  // Clear the stored timeLeft from AsyncStorage
  try {
    await AsyncStorage.removeItem('rideRequestTimeLeft');
  } catch (error) {
    // console.error('Error clearing timeLeft from AsyncStorage:', error);
  }
};

const onNotFound = () => {
  setShowNotFound(false);
};



  


  
  // //console.log('pkskvalue',JSON.stringify({'pkskvalue': `${bookLaterPK}$#$${bookLaterSK}`, 'bookingtype':'later'}))
// //console.log('bookingType', bookingType === 'later' ? 'later' : 'now')
// //console.log('selectedDate',selectedDate)
  const handleStartJourney = () => {
    setLoading(true); // Show loading overlay
    setTimeout(() => {
      setLoading(false); // Stop loading
    }, 4000); // Hide after 4 seconds
    const amountsent = selectedTripType === "Full Trip"
      ? (selectedPayementmethod === 'Full Payment' ? selectedBoat?.triptype_full_with_margin_gst || tripDetails?.triptype_full_with_margin_gst : selectedBoat?.triptype_full_partial_gst || tripDetails?.triptype_full_partial_gst) 
      : selectedTripType === "Half Trip"
      ? (selectedPayementmethod === 'Full Payment' ? selectedBoat?.triptype_half_with_margin_gst || tripDetails?.triptype_half_with_margin_gst : selectedBoat?.triptype_half_partial_gst || tripDetails?.triptype_half_partial_gst)
      : (selectedPayementmethod === 'Full Payment' ? selectedBoat?.triptype_cross_with_margin_gst || tripDetails?.triptype_cross_with_margin_gst : selectedBoat?.triptype_cross_partial_gst || tripDetails?.triptype_cross_partial_gst)
      
    getorderIDdata({
      variables: {
        input: {
          amount:amountsent * 100 ,
          paymentType:selectedPayementmethod === 'Full Payment' ? 'full' :'partial',
          PK: bookingType === 'now' ? riderRequestPk : riderRequestPkBookLater,
          SK: bookingType === 'now' ? riderRequestSk : riderRequestSkBookLater
         
        },
      },
    });
  };

  const handleClose = () => {
    setLoading(true); // Show loading overlay
    setTimeout(() => {
      setLoading(false); // Stop loading
      setIsBooking(false); // Show booking details
    }, 4000); // Hide after 4 seconds

}
// //console.log('selectedZone',selectedZone?.zoneID)


const handleBookButtonPress = () => {
  // //console.log('hi');
  let   input= {
    cityName : 'VARANASI',
    zoneID : selectedZone?.zoneID,
    tripType : selectedTripType,
    numberofriders :numberOfPeople,
    boatType : selectedBoat?.SK?.split("#")[1],
    riderfirstname : data?.getUserInfo[0]?.riderfirstname,
    riderlastname :data?.getUserInfo[0]?.riderlastname,
    rideremail:'',
    timeSlot:selectedTime,
    tripday:selectedDate === 'Today' ? '0' : selectedDate === 'Tomorrow' ? '1' : '2',
    tripdate:selectedDateEpoch,
    tripamountinfo:JSON.stringify(selectedBoat),
    zonename:selectedZone?.zonename,
   
  }
  addUserFunction({
    variables: {
      input: {
        cityName : 'VARANASI',
    zoneID : selectedZone?.zoneID,
    tripType : selectedTripType,
    numberofriders :numberOfPeople,
    boatType : selectedBoat?.SK?.split("#")[1],
    riderfirstname : data?.getUserInfo[0]?.riderfirstname,
    riderlastname :data?.getUserInfo[0]?.riderlastname,
    rideremail:'',
    timeSlot:selectedTime,
    tripday:selectedDate === 'Today' ? '0' : selectedDate === 'Tomorrow' ? '1' : '2',
    tripdate:selectedDateEpoch,
    tripamountinfo:JSON.stringify(selectedBoat),
    zonename:selectedZone?.zonename,
       
      },
    },
  })
  ;
 
  
};


  const filterBoats = (boats, numberOfPeople, selectedTripType) => {
    return boats.filter((boat) => {
      const capacityRange = boat.capacity.split("-").map(Number); // Convert capacity range to numbers
      return (
        numberOfPeople >= capacityRange[0] &&
        numberOfPeople <= capacityRange[1] &&
        (selectedTripType === "Full Trip"
          ? boat.triptype_full_with_margin
          : selectedTripType === "Half Trip"
          ? boat.triptype_half_with_margin
          : boat.triptype_cross_with_margin)
      );
    });
  };
  
  const filteredBoats = filterBoats(
    boatsWithCapacity,
    numberOfPeople,
    selectedTripType
  );

  // const getFilteredBoats = (numPeople) => {
  //   return boatData.filter((boat) => {
  //     const [min, max] = boat.capacity.split("-").map(Number);
  //     return numPeople >= min && numPeople <= max;
  //   });
  // };

  // const filteredBoats = getFilteredBoats(numberOfPeople);

  useEffect(() => {
    // Foreground Notification Handler
    const unsubscribe = messaging().onMessage(async (remoteMessage) => {
      //console.log('Foreground message:', remoteMessage);

      await notifee.displayNotification({
        title: remoteMessage.notification?.title || 'New Notification',
        body: remoteMessage.notification?.body || 'You have a new message.',
        android: {
          channelId: 'default',
          pressAction: { id: 'default' },
        },
      });
    });

    return unsubscribe; // Cleanup listener
  }, []);

  const sendPaymentNotification = async () => {
    try {
      // Display a notification
      await notifee.displayNotification({
        title: 'Payment Successful',
        body: 'Your payment was successful!',
        android: {
          channelId: 'default', // Use the channel ID created globally
          importance: AndroidImportance.HIGH,
          pressAction: {
            id: 'home', // Action ID matches our handler
          },
        },
      });

      // //console.log('Payment notification sent.');
    } catch (error) {
      console.error('Error displaying notification:', error);
    }
  };

  const sendTripLaterDriverNotification = async () => {
    try {
      // Display a notification
      await notifee.displayNotification({
        title: 'Driver Assigned !',
        body: 'You have been assigned a Driver!',
        android: {
          channelId: 'default', // Use the channel ID created globally
          importance: AndroidImportance.HIGH,
          pressAction: {
            id: 'home', // Action ID matches our handler
          },
        },
      });

      // //console.log('Driver assiged notification sent.');
    } catch (error) {
      console.error('Error displaying notification:', error);
    }
  };

  const boatLocations = [
    { id: 1, latitude: 25.3172500, longitude: 83.0243951 }, // Varanasi
    { id: 2, latitude: 25.3175852, longitude: 83.0246120 }, // Nearby spot 1
    { id: 3, latitude: 25.3172121, longitude: 83.0258837 }, // Nearby spot 2
    { id: 4, latitude: 25.3193918, longitude: 83.0266254 }, // Nearby spot 3
    { id: 5, latitude: 25.3175349, longitude: 83.0269958 }, // Varanasi
    { id: 6, latitude: 25.3201546, longitude: 83.0267088 }, // Nearby spot 1
    { id: 7, latitude: 25.3179901, longitude: 83.0236863 }, // Nearby spot 2
    { id: 8, latitude: 25.3189905, longitude: 83.0248377 }, // Nearby spot 3
    { id: 9, latitude: 25.3187559, longitude: 83.0256279 }, // Nearby spot 3
  ];
  return (
    <View style={styles.container}>
    
    {/* Map Background */}
    <MapView
  provider="google"
  style={StyleSheet.absoluteFillObject}
  initialRegion={{
    latitude: 25.3172500, // Center on Varanasi Ganges River
    longitude: 83.0243951,
    latitudeDelta: 0.01,
    longitudeDelta: 0.01,

  }}
>
{boatLocations.map((boat) => (
  <Marker key={boat.id}
    coordinate={{
      latitude: boat.latitude,
              longitude: boat.longitude,
    }}
  >
     <Image
              source={require('../assets/images/boat.png')} // Replace with your boat image path
              style={{ width: 80, height: 80 }} // Adjust the size of the boat icon
              resizeMode="contain"
            />
  </Marker>
   ))}
</MapView>


    {(loading ||mloading) && (
        <View style={styles.loadingOverlay}>
                     <View style={styles.loadingCard}>

          <Icon name="boat" size={50} color="black" />
          {/* <Text>Searching Boat ...</Text> */}
          <ActivityIndicator size="large" color="black" style={{ marginTop: 20 }} />
        </View>
        </View>
      )}
      {showRideRequest && bookingType === 'now' && triprequestData?.getTripUser && (
        <RideRequestScreen
          tripDetails={triprequestData.getTripUser[0]}
          onClose={handleCloseRideRequest}
          tripRefetchdetails={tripRefetchdetails} // Pass the close callback
          data ={data}

        />
      )}

<ModalAlerts  isVisible={laterPayment}
  onClose={() => setlaterPayment(false)}
  title="Payment Successful !"
  body ="You will be assigned a Driver shortly"/>

<ModalAlerts  isVisible={modalpaymentdone}
  onClose={() => setModalPayment(false)}
  title="Payment Successful !"
  body ="You have successfully completed the payment"/>

<View style={styles.toastcontainer}>

      <Toast
        message="Your Trip has been accepted!"
        visible={toastVisible}
        onClose={() => setToastVisible(false)}
      />

<Toast
        message="Driver assigned for your trip!"
        visible={tripassigned}
        onClose={() => setTripAssigned(false)}
      />
    </View>

{/* <ModalAlerts  isVisible={modaldriverfound}
  onClose={() => setModaldriverfound(false)}
  title="Trip Accepted !"
  body ="Your Trip has been accepted by the driver"/> */}

{/* <ModalAlerts  isVisible={tripended}
  onClose={() => setTripEnded(false)}
  title="Trip Ended !"
  body ="Your Trip has been ended"/> */}

<Modal  animationType="fade"
      transparent={true} visible={showNotFound}
>
          <View style={styles.notfoundoverlay}>
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
          <TouchableOpacity style={styles.doneButton} onPress={onNotFound}>
            <Text style={styles.doneButtonText}>Done</Text>
          </TouchableOpacity>
          {/* Retry button */}

        </View>
          </View>
        </Modal>
{/* {driverFound && (
        <View style={styles.driverFoundContainer}>
          <Text>Driver has been found!</Text>
        </View>
      )} */}

    {/* Collapsible Booking Card */}
    <Animated.View style={[styles.bookingCard, { height: !isBooking ? cardHeight : 600 }]}>
      {/* Overlay to toggle the card */}

      {/* Scrollable Content */}
      <ScrollView  showsVerticalScrollIndicator={false} 
    contentContainerStyle={styles.scrollContent}>
      <TouchableOpacity onPress={toggleCard} style={styles.overlay} />
{!isBooking ? 
<>
        <View style={styles.handle}>
          <View style={styles.handleBar} />
        </View>

        <Text style={styles.label}>Choose pickup point</Text>
        {/* <Button title="Send Payment Notification" onPress={sendPaymentNotification} /> */}

        <Dropdown
        style={styles.dropdown}
        containerStyle={styles.dropdownContainer}
        data={formattedZoneOptions}
        labelField="zonenameCamelCase" // Field for label in the dropdown
        valueField="zonenameCamelCase"   // Field for value
        placeholder="Select a Zone"
        placeholderStyle={{ color: '#888', fontSize: 16 }} // Placeholder text style
  textStyle={{ color: '#333', fontSize: 16 }} // Style for the selected value text
  selectedTextStyle={{ color: '#333', fontSize: 16 }} // Style for selected dropdown text
  itemTextStyle={{ color: '#333', fontSize: 16 }} // Style for dropdown items
        value={selectedZone?.zonenameCamelCase}
        onChange={(item) => setSelectedZone(item)} // Update selected value
      />
<Text style={styles.label}>Choose Date & Time slot</Text>
<View style={styles.dateContainer}>
{Object.keys(dateLabels).map((key) => (
        <TouchableOpacity
          key={key}
          style={[
            styles.dateButton,
            selectedDate === key && styles.selectedDateButton,
          ]}
          onPress={() => handleDateSelection(key)}
        >
          <Text
            style={[
              styles.dateButtonText,
              selectedDate === key && styles.selectedDateText,
            ]}
          >
            {dateLabels[key].label}
          </Text>
        </TouchableOpacity>
      ))}
      </View>

{/* <Text style={styles.label}>Choose Time slot</Text> */}

{/* <View style={styles.zoneOptionsContainer}> */}
<Dropdown
        style={styles.dropdown}
        containerStyle={styles.dropdownContainer}
        data={timeSlots.map((slot) => ({ label: slot, value: slot }))}
         labelField="label"
        valueField="value"
        placeholder="Select a Time"
        placeholderStyle={{ color: '#888', fontSize: 16 }} // Placeholder text style
        textStyle={{ color: '#333', fontSize: 16 }} // Style for the selected value text
        selectedTextStyle={{ color: '#333', fontSize: 16 }} // Style for selected dropdown text
        itemTextStyle={{ color: '#333', fontSize: 16 }} // Style for dropdown items
        value={selectedTime}
        onChange={(item) => handleDateTimeSelection(item)}
      />

      {/* </View> */}
     
        <View style={styles.peopleContainer}>
          <Text style={styles.triplabel}>Number of people</Text>
          <View style={styles.counterContainer}>
            <TouchableOpacity onPress={decrementPeople} style={styles.counterButton}>
              <Text style={styles.counterText}>-</Text>
            </TouchableOpacity>
            <Text style={styles.peopleCount}>{numberOfPeople}</Text>
            <TouchableOpacity onPress={incrementPeople} style={styles.counterButton}>
              <Text style={styles.counterText}>+</Text>
            </TouchableOpacity>
          </View>
        </View>

        <Text style={styles.label}>Trip type</Text>
        <View style={styles.tripTypes}>
          {tripTypes.map((trip) => (
            <TouchableOpacity
              key={trip.key}
              onPress={() => setSelectedTripType(trip.key)}
              style={[
                styles.tripCard,
                selectedTripType === trip.key && styles.selectedTripCard,
              ]}
            >
              <Text style={styles.tripText}>{trip.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.label}>Select boat type</Text>
<View >
  <ScrollView 
    showsVerticalScrollIndicator={false} 
    contentContainerStyle={{ flexGrow: 1 }}
  >
    {filteredBoats?.map((boat,index) => (
       <TouchableOpacity
       key={boat.id}
       
       onPress={() => setSelectedBoat(boat)} // Save the selected boat
     >
      <>
        <View key={boat.id} style={[
          styles.boatCard,
          selectedBoat?.SK === boat.SK && styles.selectedBoatCard, // Highlight selected boat
        ]}
>
          <View style={styles.boatDetails}>
          <Text style={styles.boatText}>{boat.SK.replace("BOATTYPE#", "")}</Text>
                      <View style={styles.capacityContainer}>
              <Icon name="people" size={20} color="#7997a1" />
              <Text style={styles.capacityText}>{boat?.capacity}</Text>
            </View>
            
          </View>
          <View style={styles.priceContainer}>
  <Text style={styles.boatPrice}>
    ₹{" "}
    {selectedTripType === "Full Trip"
      ? boat.triptype_full_with_margin
      : selectedTripType === "Half Trip"
      ? boat.triptype_half_with_margin
      : boat.triptype_cross_with_margin}
  </Text>
  {/* <Text style={styles.gstText}>+GST</Text> */}
</View>
                
        </View>
        </>
        </TouchableOpacity>

      ))
}
    <TouchableOpacity onPress={handleBookButtonPress} style={styles.bookButton}>
            <Text style={styles.bookButtonText}>{bookingType === 'now' ? 'Book for myself' : 'Book for Later'}</Text>
          </TouchableOpacity>
  </ScrollView>
</View>




          </>

      :
      <>
      <TouchableOpacity onPress={toggleCard} style={styles.overlay} />
      <View style={styles.handle}>
          <View style={styles.handleBar} />
        </View>
      <View style={styles.confirmation}>
        {driverFound ?
         <View style={styles.header}>
      <PersonIcon name="person-circle-sharp" size={50} color="#ccc" />
      <View style={styles.driverInfo}>
           <Text style={styles.driverName}>{driverdetails?.getUserDetails[0]?.driverFirstName} {driverdetails?.getUserDetails[0]?.driverLastName}</Text>
           <Text style={styles.driverId}>Driver ID: 1234</Text>
         </View>
         <View>
 
         <Text style={styles.fare}>
         ₹{selectedTripType === "Full Trip"
      ? (selectedPayementmethod === 'Full Payment' ? selectedBoat?.triptype_full_with_margin_gst || tripDetails?.triptype_full_with_margin_gst : selectedBoat?.triptype_full_partial_gst || tripDetails?.triptype_full_partial_gst) 
      : selectedTripType === "Half Trip"
      ? (selectedPayementmethod === 'Full Payment' ? selectedBoat?.triptype_half_with_margin_gst || tripDetails?.triptype_half_with_margin_gst : selectedBoat?.triptype_half_partial_gst || tripDetails?.triptype_half_partial_gst)
      : (selectedPayementmethod === 'Full Payment' ? selectedBoat?.triptype_cross_with_margin_gst || tripDetails?.triptype_cross_with_margin_gst : selectedBoat?.triptype_cross_partial_gst || tripDetails?.triptype_cross_partial_gst)
      } 
      </Text>
         <Text style={{color:'#333'}}>Total fare</Text>

         <View style={styles.otpContainer}>
              <Text style={styles.otpText}>OTP - {tripdetails?.getPaymentTrip[0]?.otp}</Text>
            </View>
 
         </View>
       </View>
       :
       <View style={styles.header}>
       <View style={styles.driverInfo}>
         <Text style={styles.tripHeader}> { bookingType === 'later' ? 'Trip Confirmed !' :' Trip Accepted !'} </Text>
       </View>
       <View>
       <Text style={{color:'#333'}} >Total fare</Text>

       <Text style={styles.fare}>₹{selectedTripType === "Full Trip"
      ? (selectedPayementmethod === 'Full Payment' ? selectedBoat?.triptype_full_with_margin_gst || tripDetails?.triptype_full_with_margin_gst : selectedBoat?.triptype_full_partial_gst || tripDetails?.triptype_full_partial_gst) 
      : selectedTripType === "Half Trip"
      ? (selectedPayementmethod === 'Full Payment' ? selectedBoat?.triptype_half_with_margin_gst || tripDetails?.triptype_half_with_margin_gst : selectedBoat?.triptype_half_partial_gst || tripDetails?.triptype_half_partial_gst)
      : (selectedPayementmethod === 'Full Payment' ? selectedBoat?.triptype_cross_with_margin_gst || tripDetails?.triptype_cross_with_margin_gst : selectedBoat?.triptype_cross_partial_gst || tripDetails?.triptype_cross_partial_gst)
      } 
      
</Text>

       </View>
     </View>
     }
     
      <View style={styles.bookingDetails}>
        <View style={{flexDirection:'row'}}>
        <Text style={styles.bookingdetailsLabel}>Booking details </Text>
        
        </View>
     

        <Text style={styles.detailLabel}>Trip type</Text>
        <Text style={styles.detailValue}>{tripData?.tripType || selectedTripType}          <Text style={styles.detailValue}>{tripData?.timeSlot || selectedTime}</Text>
        </Text>
        <Text style={styles.detailLabel}>Boat type</Text>
        <Text style={styles.detailValue}>{tripData?.boatType || selectedBoat?.SK?.split("#")[1]}</Text>
        {/* <Text style={styles.detailLabel}>Timeslot</Text>
        <Text style={styles.detailValue}>{tripData?.timeSlot || selectedTime}</Text> */}
        <Text style={styles.detailLabel}>Pickup</Text>
        <Text style={styles.detailValue}>{tripData?.zonename || selectedZone?.zonename}</Text>
        {!driverFound &&
        <>
        <Dropdown
        style={styles.dropdown}
        containerStyle={styles.dropdownContainer}
        data={paymentOption}
        labelField="label" // Field for label in the dropdown
        valueField="label"   // Field for value
        placeholder="Select Payment"
        placeholderStyle={{ color: '#888', fontSize: 16 }} // Placeholder text style
  textStyle={{ color: '#333', fontSize: 16 }} // Style for the selected value text
  selectedTextStyle={{ color: '#333', fontSize: 16 }} // Style for selected dropdown text
  itemTextStyle={{ color: '#333', fontSize: 16 }} // Style for dropdown items
        value={selectedPayementmethod}
        onChange={(item) => setSelectedPayemntmethod(item.key)} // Update selected value
      />

        <View style={styles.paycontainer}>
      {/* Toggle Section */}
      <TouchableOpacity onPress={toggleExpanded} style={styles.toggleHeader}>
        <Text style={styles.toPayText}>
          To Pay  ₹{selectedTripType === "Full Trip"
      ? (selectedPayementmethod === 'Full Payment' ? selectedBoat?.triptype_full_with_margin_gst || tripDetails?.triptype_full_with_margin_gst : selectedBoat?.triptype_full_partial_gst || tripDetails?.triptype_full_partial_gst) 
      : selectedTripType === "Half Trip"
      ? (selectedPayementmethod === 'Full Payment' ? selectedBoat?.triptype_half_with_margin_gst || tripDetails?.triptype_half_with_margin_gst : selectedBoat?.triptype_half_partial_gst || tripDetails?.triptype_half_partial_gst)
      : (selectedPayementmethod === 'Full Payment' ? selectedBoat?.triptype_cross_with_margin_gst || tripDetails?.triptype_cross_with_margin_gst : selectedBoat?.triptype_cross_partial_gst || tripDetails?.triptype_cross_partial_gst)
      } 
        </Text>
      </TouchableOpacity>
      

      {/* Breakdown Section */}
      {showGST && (
        <View style={styles.breakdownContainer}>
         
          
          <View style={styles.row}>
            <Text style={styles.label}>Boat fee</Text>
            <Text style={styles.value}>₹{selectedTripType === "Full Trip"
      ? (selectedPayementmethod === 'Full Payment' ? selectedBoat?.triptype_full_with_margin || tripDetails?.triptype_full_with_margin : selectedBoat?.triptype_full_partial || tripDetails?.triptype_full_partial) 
      : selectedTripType === "Half Trip"
      ? (selectedPayementmethod === 'Full Payment' ? selectedBoat?.triptype_half_with_margin || tripDetails?.triptype_half_with_margin : selectedBoat?.triptype_half_partial || tripDetails?.triptype_half_partial)
      : (selectedPayementmethod === 'Full Payment' ? selectedBoat?.triptype_cross_with_margin || tripDetails?.triptype_cross_with_margin : selectedBoat?.triptype_cross_partial || tripDetails?.triptype_cross_partial)
      }  </Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>GST Charges</Text>
            <Text style={styles.value}>₹{selectedTripType === "Full Trip"
      ? selectedBoat?.triptype_full_with_margin_gst - selectedBoat?.triptype_full_with_margin  || tripDetails?.triptype_full_with_margin_gst - tripDetails?.triptype_full_with_margin
      : selectedTripType === "Half Trip"
      ? selectedBoat?.triptype_half_with_margin_gst -selectedBoat?.triptype_half_with_margin || tripDetails?.triptype_half_with_margin_gst -tripDetails?.triptype_half_with_margin
      : selectedBoat?.triptype_cross_with_margin_gst -selectedBoat?.triptype_cross_with_margin || tripDetails?.triptype_cross_with_margin_gst -tripDetails?.triptype_cross_with_margin} </Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.row}>
            <Text style={[styles.label, styles.totalLabel]}>To Pay</Text>
            <Text style={[styles.value, styles.totalValue]}>₹{selectedTripType === "Full Trip"
      ? (selectedPayementmethod === 'Full Payment' ? selectedBoat?.triptype_full_with_margin_gst || tripDetails?.triptype_full_with_margin_gst : selectedBoat?.triptype_full_partial_gst || tripDetails?.triptype_full_partial_gst) 
      : selectedTripType === "Half Trip"
      ? (selectedPayementmethod === 'Full Payment' ? selectedBoat?.triptype_half_with_margin_gst || tripDetails?.triptype_half_with_margin_gst : selectedBoat?.triptype_half_partial_gst || tripDetails?.triptype_half_partial_gst)
      : (selectedPayementmethod === 'Full Payment' ? selectedBoat?.triptype_cross_with_margin_gst || tripDetails?.triptype_cross_with_margin_gst : selectedBoat?.triptype_cross_partial_gst || tripDetails?.triptype_cross_partial_gst)
      } </Text>
      
          </View>
        </View>
      )}
      
        
    </View>
    {selectedPayementmethod !== 'Full Payment' &&
      <View style={styles.banner}>
<Icon name="information-circle" size={20} color="#F5A623" style={styles.icon} />

<Text style={styles.bannerText}> Pay remaining
₹{selectedTripType === "Full Trip"
      ? selectedBoat?.triptype_full_with_margin_gst - selectedBoat?.triptype_full_partial_gst  || tripDetails?.triptype_full_with_margin_gst - tripDetails?.triptype_full_partial_gst
      : selectedTripType === "Half Trip"
      ? selectedBoat?.triptype_half_with_margin_gst -selectedBoat?.triptype_half_partial_gst || tripDetails?.triptype_half_with_margin_gst -tripDetails?.triptype_half_partial_gst
      : selectedBoat?.triptype_cross_with_margin_gst -selectedBoat?.triptype_cross_partial_gst || tripDetails?.triptype_cross_with_margin_gst -tripDetails?.triptype_cross_partial_gst} while ending the trip</Text>
</View>
}
    </>
}
      </View>

      <View style={styles.buttoncontainer}>
        {!driverFound &&
        <>
       
      <TouchableOpacity style={styles.startJourneyButton} onPress={handleStartJourney}>
        <Text  style={styles.startJourneyText}>Pay  ₹{selectedTripType === "Full Trip"
      ? (selectedPayementmethod === 'Full Payment' ? selectedBoat?.triptype_full_with_margin_gst || tripDetails?.triptype_full_with_margin_gst : selectedBoat?.triptype_full_partial_gst || tripDetails?.triptype_full_partial_gst) 
      : selectedTripType === "Half Trip"
      ? (selectedPayementmethod === 'Full Payment' ? selectedBoat?.triptype_half_with_margin_gst || tripDetails?.triptype_half_with_margin_gst : selectedBoat?.triptype_half_partial_gst || tripDetails?.triptype_half_partial_gst)
      : (selectedPayementmethod === 'Full Payment' ? selectedBoat?.triptype_cross_with_margin_gst || tripDetails?.triptype_cross_with_margin_gst : selectedBoat?.triptype_cross_partial_gst || tripDetails?.triptype_cross_partial_gst)
      }   now</Text>
      </TouchableOpacity>
      <TouchableOpacity   style={styles.closeButton}  onPress={handleClose}>
        <Ionicons name="close" size={20} color="#1a586b" />
      </TouchableOpacity>
      </>
}
{driverFound &&
        <>
     
      <TouchableOpacity   style={styles.closeButton}  onPress={handleClose}>
        <Ionicons name="close" size={20} color="#1a586b" />
      </TouchableOpacity>
      </>
}
      </View>
    </View>
    </>}
      </ScrollView>
    </Animated.View>
  </View>
);
};

const styles = StyleSheet.create({
container: {
  flex: 1,
},
toastcontainer: {
  flex: 1,
  justifyContent: 'center',
  alignItems: 'center',
},
bookingCard: {
  position: 'absolute',
  bottom: 0,
  width: '100%',
  backgroundColor: 'rgba(255, 255, 255, 0.9)',
  borderTopLeftRadius: 20,
  borderTopRightRadius: 20,
  padding: 20,
},
capacityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#7997a1',
    borderRadius: 5,
    paddingHorizontal: 8,
    paddingVertical: 3,
    backgroundColor: '#eef2f3',
    width: 80,
    marginBottom: 10,
  },
otpContainer: {
    flexDirection: 'row',
    // alignItems: 'center',
    borderWidth: 1,
    borderColor: '#7997a1',
    borderRadius: 5,
    paddingHorizontal: 8,
    paddingVertical: 3,
    backgroundColor: '#eef2f3',
    marginTop: 10,
  },
  capacityText: {
    marginLeft: 10,
    marginRight: 10,
    color: '#7997a1',
  },
  otpText: {
    marginLeft: 5,
    color: '#7997a1',
    fontWeight:'bold'
  },
overlay: {
  ...StyleSheet.absoluteFillObject,
  // zIndex: 1,
},
handle: {
  alignItems: 'center',
  marginBottom: 10,
},
handleBar: {
  width: 50,
  height: 5,
  backgroundColor: '#ccc',
  borderRadius: 2.5,
},
scrollContent: {
  paddingBottom: 15,
  zIndex: 9,
},
label: {
  fontSize: 16,
  fontWeight: 'bold',
  marginVertical: 10,
  color:'#333'
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
dateContainer: {
  flexDirection: 'row',
  justifyContent: 'space-between',
  marginBottom: 20,
},
dateButton: {
  flex: 1,
  marginHorizontal: 5,
  padding: 10,
  borderRadius: 5,
  borderWidth: 1,
  borderColor: '#CCC',
  alignItems: 'center',
  backgroundColor: '#FFF',
},
selectedDateButton: {
  backgroundColor: '#eef2f3',
  borderColor: '#7997a1',

},
dateButtonText: {
  color: '#333',
  fontSize:14,
  // fontWeight: 'bold',
},
selectedDateText: {
  // color: '#FFF',
},
triplabel: {
  fontSize: 16,
  color: "#777",
  marginVertical: 10,
},
dropcontainer: {
  flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
},
selectedText: {
  fontWeight: 'bold',
},
selectedZoneText: {
  marginTop: 16,
  fontSize: 16,
  color: '#555',
},
selectedOption: {
  borderColor: '#007BFF',
  backgroundColor: '#eef2f3',
  paddingHorizontal:10
},
menu: {
  position: 'absolute',
  zIndex: 10, // Ensure the menu is above other components
},
menuContent: {
  maxHeight: 150, // Show only 3 items initially (adjust as needed)
  overflow: 'scroll', // Allow scrolling for additional items
},
dropdownWrapper: {
  width: '100%', // Ensures the dropdown and button stay aligned
},
input: {
  height: 40,
  borderColor: '#ccc',
  borderWidth: 1,
  borderRadius: 5,
  paddingHorizontal: 10,
  marginBottom: 20,
},
peopleContainer: {
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'space-between',
  borderWidth: 1,
  borderColor: '#ccc',
  borderRadius: 5,
  padding: 10,
  marginVertical: 10,
},
counterContainer: {
  flexDirection: 'row',
  alignItems: 'center',
},
counterButton: {
  backgroundColor: '#ddd',
  padding: 10,
  borderRadius: 5,
  
},
counterText: {
  fontSize: 18,
  fontWeight: 'bold',
  color:'#333'

},
peopleCount: {
  fontSize: 18,
  marginHorizontal: 10,
  color:'#333'

},
tripTypes: {
  flexDirection: 'row',
  justifyContent: 'space-between',
  marginVertical: 10,
},
tripCard: {
  flex: 1,
  padding: 10,
  marginHorizontal: 5,
  borderRadius: 5,
  borderWidth: 1,
  borderColor: '#ccc',
  alignItems: 'center',
},
selectedTripCard: {
  backgroundColor: '#eef2f3',
  borderColor: '#7997a1',
},
tripText: {
  fontSize: 14,
  color:'#333'
},
boatOptions: {
  marginVertical: 10,
},
boatOptionsContainer: {
  height: 80, // Set maximum height to fit 2 items; allows scrolling if content overflows
  borderWidth: 1,
  borderColor: '#ccc',
  borderRadius: 5,
  overflow: 'hidden',
  paddingHorizontal: 10,
  marginVertical: 10,

},
zoneOptionsContainer: {
  height: 45, // Set maximum height to fit 2 items; allows scrolling if content overflows
  borderWidth: 1,
  borderColor: '#ccc',
  borderRadius: 5,
  overflow: 'hidden',
  paddingHorizontal: 10,
  paddingVertical: 3,
  marginVertical: 10,

},
boatOption: {
  flexDirection: 'row',
  justifyContent: 'space-between',
  paddingVertical: 10,
  
},
confirmation: {
  // Styles for the confirmation UI after booking
},
boatText: {
  fontSize: 16,
  color:'#333'
},
priceContainer: {
  alignItems: "center", // Center-align price and GST
  marginTop: 5,
},
boatPrice: {
  fontSize: 18,
  fontWeight: 'bold',
  color: "#333",
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
driverFoundContainer: {
  padding: 20,
  backgroundColor: '#f0f0f0',
  borderRadius: 10,
  alignItems: 'center',
  marginTop: 20,
},
header: {
  flexDirection: 'row',
  alignItems: 'center',
  marginBottom: 10,
},
driverImage: {
  width: 50,
  height: 50,
  borderRadius: 20,
},
driverInfo: {
  flex: 1,
  marginLeft: 10,
},
driverName: {
  fontSize: 19,
  fontWeight: 'bold',
  color:'#333'
},
tripHeader: {
    fontSize: 28, fontWeight: 'bold',color:'#000000'
  },
driverId: {
  fontSize: 12,
  color: '#777',
},
fare: {
  fontSize: 19,
  fontWeight: 'bold',
  color: '#008000',
},
bookingDetails: {
  backgroundColor: '#f9f9f9',
  padding: 15,
  borderRadius: 10,
  marginVertical: 10,
  borderWidth: 1,
  borderColor: '#ccc',
},
detailLabel: {
  fontSize: 15,
  color: '#777',
  marginBottom: 10,
},
bookingdetailsLabel: {
  fontSize: 18,
  color: '#777',
  marginBottom:20,
},
detailValue: {
  fontSize: 18,
  fontWeight: 'bold',
  marginBottom: 15,
  color:'#333'

},
startJourneyButton: {
  flex: 1,
  backgroundColor: 'black',
  paddingVertical: 18,
  borderRadius: 10,
  alignItems: 'center',
  marginRight: 10,
},

startJourneyText: {
  color: '#fff',
  fontSize: 16,
  fontWeight: 'bold',
},
buttoncontainer: {
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'space-between',
  paddingHorizontal: 10,
},
boatCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#f9f9f9',
    borderRadius: 10,
    padding: 15,
    marginBottom: 15,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    borderWidth: 1,
  borderColor: '#ccc',
  },
  selectedBoatCard: {
    borderColor: "#000000",
    borderWidth: 2,
    borderRadius: 10,

  },
  gstText: {
    fontSize: 11, // Smaller font size for "+GST"
    color: "#666", // Lighter color for subtlety
    marginTop: 2,
  },
closeButton: {
  width: 50,
  height: 50,
  borderRadius: 10,
  backgroundColor: '#eef2f3',
  alignItems: 'center',
  justifyContent: 'center',
},
paycontainer: {
  backgroundColor: "#ffffff",
  borderRadius: 8,
  elevation: 2,
  shadowColor: "#000",
  shadowOpacity: 0.1,
  shadowRadius: 4,
  shadowOffset: { width: 0, height: 2 },
  marginTop:5
},
toggleHeader: {
  padding: 16,
  borderBottomWidth: 1,
  borderColor: "#eeeeee",
},
toPayText: {
  fontSize: 18,
  fontWeight: "bold",
  color: "#333",
},
strikeThrough: {
  textDecorationLine: "line-through",
  color: "#999",
  marginRight: 8,
},
savingText: {
  fontSize: 14,
  color: "#34a853",
  marginTop: 4,
},
breakdownContainer: {
  padding: 10,
},
row: {
  flexDirection: "row",
  justifyContent: "space-between",
  marginVertical: 4,
},

value: {
  fontSize: 16,
  color: "#333",
  fontWeight: "bold",
},
freeValue: {
  fontSize: 16,
  color: "#34a853",
  fontWeight: "bold",
},
divider: {
  borderTopWidth: 1,
  borderColor: "#eeeeee",
  marginVertical: 12,
},
totalLabel: {
  fontSize: 18,
  fontWeight: "bold",
  color:'#333'

},
totalValue: {
  fontSize: 18,
  fontWeight: "bold",
  color: "#000",
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
notfoundoverlay: {
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
