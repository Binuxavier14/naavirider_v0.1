import { Image, StyleSheet, Platform, View, Text, TextInput, TouchableOpacity, Animated, Easing, ScrollView, ActivityIndicator, Dimensions, Alert, Button } from 'react-native';


import MapView, { Marker } from 'react-native-maps';
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

  const [tripDetails, setTripDetails] = useState(null);
  const [showRideRequest, setShowRideRequest] = useState(false);
  const [tripData, setTripData] = useState(null); // State to store API response
  const [fetchData] = useLazyQuery(getBoatTypes);

// console.log('selectedBoat',selectedBoat)
  const handleSelect = (zone) => {
    setSelectedZone(zone.name);
  };
  useEffect(() => {
    if (route.params?.isBooking) {
      if(route.params.tripDetails?.rstatus?.includes('TRIP_ACCEPTED#')){
      setIsBooking(true);
      setTripData(route.params.tripDetails)
      }
      console.log('trip',route.params.tripDetails?.tripsk)
      setSelectedTripType(route.params.tripDetails?.tripType)
      setTripDetails(JSON.parse(route.params.tripDetails?.tripamountinfo)); 
      setRiderRequestSK(route.params.tripDetails?.tripsk)
      setRiderRequestPK(route.params.tripDetails?.trippk)
    }
  }, [route.params]);
  // console.log('tripDetails',tripDetails);

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
    console.log('key',key)
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
    console.log('key',key)
    setSelectedTime(key?.value)
    setSelectedDateEpoch(Math?.floor(dateLabels[selectedDate]?.epoch / 1000));

  };
  
// console.log('selectedDateEpoch',selectedDateEpoch)
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

// console.log('timeSlots',timeSlots)
  const openMenu = () => setVisible(true);
  const closeMenu = () => setVisible(false);

  const [mapRegion, setMapRegion] = useState({
    latitude: 25.3000, // Latitude for Shivala Ghat, Varanasi
  longitude: 83.0000, // Longitude for Shivala Ghat, Varanasi
    latitudeDelta: 0.02,
    longitudeDelta: 0.02,
  });

  const cardHeight = useRef(new Animated.Value(500)).current;

  const toggleCard = () => {
    Animated.timing(cardHeight, {
      toValue: isExpanded ? 400 : 650,
      duration: 300,
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
            capacity = "1-3";
            break;
          case "BOATTYPE#MEDIUM":
            capacity = "1-5";
            break;
          case "BOATTYPE#LARGE":
            capacity = "5-10";
            break;
          case "BOATTYPE#EXTRALARGE":
            capacity = "10-15";
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

  // console.log('zonelist',zonelist)
  const toCamelCase = (str) => str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
  const formattedZoneOptions = zonelist?.getZonesList.map((zone) => ({
    ...zone,
    zonenameCamelCase: toCamelCase(zone.zonename),
  })) || [];
// console.log('formattedZoneOptions',zonelist)
  
  const { data:triprequestData, loading: requestLoading,refetch:tripRefetchdetails } = useQuery(getTripUser, {
    fetchPolicy: "network-only",
    variables: { input: {} },
    onCompleted: (fetchedData) => {
      setTripData(fetchedData?.getTripUser[0] || null); 
      // setTripDetails(JSON.parse(fetchedData?.getTripUser[0]?.tripamountinfo)); 
      // setSelectedTripType(fetchedData?.getTripUser[0]?.tripType)

    },
  });
// console.log('triprequestData',triprequestData)
  const [getorderIDdata, { loading: orderIDLoading }] = useLazyQuery(
    getPaymentOrderId,
    {
      fetchPolicy: "network-only",
      onCompleted: (response) => {
       console.log('response',response)
       const amountsent = selectedTripType === "Full Trip"
       ? (selectedPayementmethod === 'Full Payment' ? selectedBoat?.triptype_full_with_margin_gst || tripDetails?.triptype_full_with_margin_gst : selectedBoat?.triptype_full_partial_gst || tripDetails?.triptype_full_partial_gst) 
       : selectedTripType === "Half Trip"
       ? (selectedPayementmethod === 'Full Payment' ? selectedBoat?.triptype_half_with_margin_gst || tripDetails?.triptype_half_with_margin_gst : selectedBoat?.triptype_half_partial_gst || tripDetails?.triptype_half_partial_gst)
       : (selectedPayementmethod === 'Full Payment' ? selectedBoat?.triptype_cross_with_margin_gst || tripDetails?.triptype_cross_with_margin_gst : selectedBoat?.triptype_cross_partial_gst || tripDetails?.triptype_cross_partial_gst)
       
       const forBooklater  = JSON.stringify({'pkskvalue': `${riderRequestPkBookLater}$#$${riderRequestSkBookLater}`, 'bookingtype': `${bookingType}`});
       const forBooknow  = JSON.stringify({'pkskvalue': `${riderRequestPk}$#$${riderRequestSk}`, 'bookingtype': `${bookingType}`});
           const options = {
         description: bookingType === 'now' ? forBooknow : forBooklater,
         image: 'https://your-logo-url.com/logo.png',
         currency: 'INR',
         key: 'rzp_test_hFWHEWrGaQh7hO',
         amount: amountsent * 100,
         order_id: response?.getPaymentOrderId?.orderID,
         name: 'Your Company Name',
         prefill: {
           email: 'user@example.com',
           contact: '9999999999',
           name: 'John Doe'
         },
         theme: { color: '#53a20e' }
       };
       
       RazorpayCheckout.open(options)
         .then((data) => {
           // Payment successful
           console.log('Payment successful', data);
         })
         .catch((error) => {
           // Payment failed
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
      console.log('Driver Details fetched:', fetchedData.getUserDetails);
      setDriverFound(true);

      Alert.alert(
        'Driver Details',
        `Name: ${fetchedData.getUserDetails.driverFirstName}`
      );
    },
    onError: (error) => {
        console.error('Error fetching driver details:', error);
        Alert.alert('Error', 'Failed to fetch driver details.');
      },
    });

    const { data:tripdetails, loading:triploading, refetch:tripRefetch } = useQuery(getPaymentTrip, {
        fetchPolicy: 'network-only', 
        variables: { input: { PK: driverPK, SK: driverSK } },
        skip: !driverSK && !driverPK, 
        onCompleted: (fetchedData) => {
          console.log('Trip Details fetched:', fetchedData.getPaymentTrip);
          Alert.alert(
            'Trip Details',
            `Name: ${fetchedData.getPaymentTrip.otp}`
          );
        },
        onError: (error) => {
            console.error('Error fetching Trip details:', error);
            Alert.alert('Error', 'Failed to fetch Trip details.');
          },
        });

// console.log('tripdetails',tripdetails)
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
            console.log('Received message1:', message);
    
            // Handle keep-alive messages
            if (message.type === 'ka') {
              return; // Ignore keep-alive messages
            }
    
            if (message.type === 'connection_ack') {
              console.log('Connection acknowledged by server.');
    
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
              
              console.log('Sending subscription message:', subscriptionMessage);
              websocket.send(JSON.stringify(subscriptionMessage));
            }
    
            if (message.type === 'data') {
              // Handle subscription data
              console.log('Received subscription data:', message.payload);
              const responsestatus = message?.payload?.data?.acceptedTrip?.responsestatus;
              setRiderRequestPK(message?.payload?.data?.acceptedTrip?.PK);
              setRiderRequestSK(message?.payload?.data?.acceptedTrip?.SK)
              if (responsestatus) {
                console.log('AcceptedTrip subscription successful:', responsestatus);
                Alert.alert('Driver Found', 'Your driver has accepted the trip.');
                setLoading(false);
                setIsBooking(true); 
                tripRefetchdetails();
                setShowRideRequest(false);


              }
            }
    
            if (message.type === 'error') {
              console.error('Subscription error:', JSON.stringify(message));
              if (message.payload?.errors?.[0]?.message) {
                // console.error('Detailed subscription error:', message.payload.errors[0].message);
                // Alert.alert('Subscription Error', message.payload.errors[0].message);
              }
            }
          } catch (err) {
            console.error('Error processing WebSocket message1:', err);
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
  }, [data]);


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
            console.log('Received message2:', message);
    
            // Handle keep-alive messages
            if (message.type === 'ka') {
              return; // Ignore keep-alive messages
            }
    
            if (message.type === 'connection_ack') {
              console.log('Connection acknowledged by server.');
    
              // Start subscription after connection acknowledgment
              const subscriptionMessage = {
                id: '2',
                type: 'start',
                payload: {
                  data: "{\"query\": \"subscription MySubscription {\\n updatedPaymentCaptured {\\n responsestatus \\n riderphonenumber \\n driverphonenumber \\n PK \\n SK \\n }}\"}",
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
              const responsestatus = message?.payload?.data?.updatedPaymentCaptured?.responsestatus;
              setRiderPhnum(message?.payload?.data?.updatedPaymentCaptured?.riderphonenumber);
              setDriverPhnum(message?.payload?.data?.updatedPaymentCaptured?.driverphonenumber);
              setDriverPK(message?.payload?.data?.updatedPaymentCaptured?.PK);
              setDriverSK(message?.payload?.data?.updatedPaymentCaptured?.SK);
              if (responsestatus) {
                console.log('Payment successful:', responsestatus);
                Alert.alert('Paymnet', 'Your Payment was succesful.');
                refetch({ input: { userType: 'driver', driverphonenumber: message?.payload?.data?.updatedPaymentCaptured?.driverphonenumber } });
                tripRefetch({ input: { PK: message?.payload?.data?.updatedPaymentCaptured?.PK, SK: message?.payload?.data?.updatedPaymentCaptured?.SK } });
                sendPaymentNotification();
                // setLoading(false);
                // setDriverFound(true);
                // setIsBooking(true); 

              }
            }
    
            if (message.type === 'error') {
              console.error('Subscription error:', JSON.stringify(message));
              if (message.payload?.errors?.[0]?.message) {
                console.error('Detailed subscription error:', message.payload.errors[0].message);
                Alert.alert('Subscription Error', message.payload.errors[0].message);
              }
            }
          } catch (err) {
            console.error('Error processing WebSocket message2:', err);
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
            console.log('Received message3:', message);
    
            // Handle keep-alive messages
            if (message.type === 'ka') {
              return; // Ignore keep-alive messages
            }
    
            if (message.type === 'connection_ack') {
              console.log('Connection acknowledged by server.');
    
              // Start subscription after connection acknowledgment
              const subscriptionMessage = {
                id: '5',
                type: 'start',
                payload: {
                  data: "{\"query\": \"subscription MySubscription {\\n tripLaterPaymentCaptured_sub {\\n responsestatus \\n }}\"}",
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
              const responsestatus = message?.payload?.data?.tripLaterPaymentCaptured_sub?.responsestatus;
              // setRiderPhnum(message?.payload?.data?.updatedPaymentCaptured?.riderphonenumber);
              // setDriverPhnum(message?.payload?.data?.updatedPaymentCaptured?.driverphonenumber);
              // setDriverPK(message?.payload?.data?.updatedPaymentCaptured?.PK);
              // setDriverSK(message?.payload?.data?.updatedPaymentCaptured?.SK);
              if (responsestatus) {
                console.log('Payment successful:', responsestatus);
                Alert.alert('Paymnet', 'Your Payment was succesful.');
                // refetch({ input: { userType: 'driver', driverphonenumber: message?.payload?.data?.updatedPaymentCaptured?.driverphonenumber } });
                // tripRefetch({ input: { PK: message?.payload?.data?.updatedPaymentCaptured?.PK, SK: message?.payload?.data?.updatedPaymentCaptured?.SK } });
                sendPaymentNotification();
                // setLoading(false);
                // setDriverFound(true);
                // setIsBooking(true); 

              }
            }
    
            if (message.type === 'error') {
              console.error('Subscription error:', JSON.stringify(message));
              if (message.payload?.errors?.[0]?.message) {
                console.error('Detailed subscription error:', message.payload.errors[0].message);
                Alert.alert('Subscription Error', message.payload.errors[0].message);
              }
            }
          } catch (err) {
            console.error('Error processing WebSocket message3:', err);
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
            console.log('Received message4:', message);
    
            // Handle keep-alive messages
            if (message.type === 'ka') {
              return; // Ignore keep-alive messages
            }
    
            if (message.type === 'connection_ack') {
              console.log('Connection acknowledged by server.');

              const subscriptionData = {
                query: `
                  subscription MySubscription($riderphonenumber: String!) {
                    startedTrip(riderphonenumber: $riderphonenumber) {
                      responsestatus
                    }
                  }
                `,
                variables: {
                  riderphonenumber: data && data?.getUserInfo[0]?.SK, // Replace with dynamic value if needed
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
              
              console.log('Sending subscription message:', subscriptionMessage);
              websocket.send(JSON.stringify(subscriptionMessage));
            }
    
            if (message.type === 'data') {
              // Handle subscription data
              console.log('Received subscription data:', message.payload);
              const responsestatus = message?.payload?.data?.startedTrip?.responsestatus;
            //   setRiderPhnum(message?.payload?.data?.updatedPaymentCaptured?.riderphonenumber);
            //   setDriverPhnum(message?.payload?.data?.updatedPaymentCaptured?.driverphonenumber);
            //   setDriverPK(message?.payload?.data?.updatedPaymentCaptured?.PK);
            //   setDriverSK(message?.payload?.data?.updatedPaymentCaptured?.SK);
              if (responsestatus) {
                console.log('Trip Started:', responsestatus);
                Alert.alert('Trip', 'Your Trip started.');
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
  }, [data]);

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
            console.log('Received message5:', message);
    
            // Handle keep-alive messages
            if (message.type === 'ka') {
              return; // Ignore keep-alive messages
            }
    
            if (message.type === 'connection_ack') {
              console.log('Connection acknowledged by server.');
    

              const subscriptionData = {
                query: `
                  subscription MySubscription($riderphonenumber: String!) {
                    endededTrip(riderphonenumber: $riderphonenumber) {
                      responsestatus
                    }
                  }
                `,
                variables: {
                  riderphonenumber: data && data?.getUserInfo[0]?.SK, // Replace with dynamic value if needed
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
              
              console.log('Sending subscription message:', subscriptionMessage);
              websocket.send(JSON.stringify(subscriptionMessage));
            }
    
            if (message.type === 'data') {
              // Handle subscription data
              console.log('Received subscription data:', message.payload);
              const responsestatus = message?.payload?.data?.endededTrip?.responsestatus;
            //   setRiderPhnum(message?.payload?.data?.updatedPaymentCaptured?.riderphonenumber);
            //   setDriverPhnum(message?.payload?.data?.updatedPaymentCaptured?.driverphonenumber);
            //   setDriverPK(message?.payload?.data?.updatedPaymentCaptured?.PK);
            //   setDriverSK(message?.payload?.data?.updatedPaymentCaptured?.SK);
              if (responsestatus) {
                console.log('Trip Ended:', responsestatus);
                Alert.alert('Trip', 'Your Trip Ended.');
                handleClose();
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
  }, [data]);

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
          host: 'hpcr5w3qvbbgxe7x3gzuyoerdu.appsync-api.ap-southeast-1.amazonaws.com',
        };
        const base64Headers = btoa(JSON.stringify(headers));
        const base64Payload = btoa(JSON.stringify({})); // Properly stringify empty object
    
        // Define the WebSocket URL with encoded headers
        const websocketUrl = `wss://hpcr5w3qvbbgxe7x3gzuyoerdu.appsync-realtime-api.ap-southeast-1.amazonaws.com/graphql?header=${base64Headers}&payload=${base64Payload}`;
    
        const websocket = new WebSocket(websocketUrl, 'graphql-ws');
    
        websocket.onopen = () => {
          console.log('WebSocket connected');
    
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
            console.log('Received6:', message);
    
            // Handle keep-alive messages
            if (message.type === 'ka') {
              return; // Ignore keep-alive messages
            }
    
            if (message.type === 'connection_ack') {
              console.log('Connection acknowledged by server.');
    
              // Start subscription after connection acknowledgment
              const subscriptionMessage = {
                id: '6',
                type: 'start',
                payload: {
                  data: "{\"query\": \"subscription MySubscription {\\n assignedDrivertoTrip {\\n responsestatus \\n }}\"}",
                  extensions: {
                    authorization: {
                      host: 'hpcr5w3qvbbgxe7x3gzuyoerdu.appsync-api.ap-southeast-1.amazonaws.com',
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
              const responsestatus = message?.payload?.data?.assignedDrivertoTrip?.responsestatus;
            //   setRiderPhnum(message?.payload?.data?.updatedPaymentCaptured?.riderphonenumber);
            //   setDriverPhnum(message?.payload?.data?.updatedPaymentCaptured?.driverphonenumber);
            //   setDriverPK(message?.payload?.data?.updatedPaymentCaptured?.PK);
            //   setDriverSK(message?.payload?.data?.updatedPaymentCaptured?.SK);
              if (responsestatus) {
                console.log('Driver has been assigned:', responsestatus);
                Alert.alert('Driver Assigned', 'Driver has been assigned.');
                handleClose();
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
                Alert.alert('Subscription Error', message.payload.errors[0].message);
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

  const [addUserFunction, { loading: mloading }] = useMutation(
    riderRequestTrip,
    {
      onCompleted: (response) => {
        console.log('response',response?.riderRequestTrip)

if(response?.riderRequestTrip?.responsestatus) {
  console.log('responsetrip',response?.riderRequestTrip)
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
// console.log('redierpk',riderRequestSkBookLater)
  const handleCloseRideRequest = () => {
    setShowRideRequest(false); // Close the RideRequestScreen
    // setLoading(false); 

  };


  


  
  // console.log('pkskvalue',JSON.stringify({'pkskvalue': `${bookLaterPK}$#$${bookLaterSK}`, 'bookingtype':'later'}))
// console.log('bookingType', bookingType === 'later' ? 'later' : 'now')
// console.log('selectedDate',selectedDate)
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
// console.log('selectedZone',selectedZone?.zoneID)


const handleBookButtonPress = () => {
  console.log('hi');
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
  console.log('input', input)
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
    // Listen for foreground notification taps
    const unsubscribe = notifee.onForegroundEvent(({ type, detail }) => {
      if (type === EventType.PRESS && detail.pressAction?.id === 'home') {
        navigation.navigate('Home');
      }
    });

    // Handle background notification taps
    notifee.onBackgroundEvent(async ({ type, detail }) => {
      if (type === EventType.PRESS && detail.pressAction?.id === 'home') {
        navigation.navigate('Home');
      }
    });

    return () => unsubscribe(); // Clean up
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

      console.log('Payment notification sent.');
    } catch (error) {
      console.error('Error displaying notification:', error);
    }
  };

  return (
    <View style={styles.container}>
    {/* Map Background */}
    <MapView
      style={StyleSheet.absoluteFillObject}
      region={mapRegion}
      onRegionChangeComplete={(region) => setMapRegion(region)}
    >
      <Marker coordinate={{ latitude: mapRegion.latitude, longitude: mapRegion.longitude }} />
    </MapView>
    {(loading ||mloading) && (
        <View style={styles.loadingOverlay}>
          <Icon name="boat" size={50} color="black" />
          {/* <Text>Searching Boat ...</Text> */}
          <ActivityIndicator size="large" color="black" style={{ marginTop: 20 }} />
        </View>
      )}
      {showRideRequest && bookingType === 'now' && (
        <RideRequestScreen
          tripDetails={triprequestData?.getTripUser[0]}
          onClose={handleCloseRideRequest}
          tripRefetchdetails={tripRefetchdetails} // Pass the close callback
        />
      )}


{/* {driverFound && (
        <View style={styles.driverFoundContainer}>
          <Text>Driver has been found!</Text>
        </View>
      )} */}

    {/* Collapsible Booking Card */}
    <Animated.View style={[styles.bookingCard, { height: cardHeight }]}>
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
       key={index}
       
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
         <Image source={{ uri: 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wCEAAkGBxMQEBUPEBAWFhUXFRcWGBgVFRUVFRgYGBcXFhUVGBcYHSggGBolHRYVITEhJSkrLi4uFyAzODMsNygtLisBCgoKDg0OGhAQGi0lICUtLS0tLS0tLS0tLS0tLSsrLS0tLS0tLS0tKy0tLS0tLSstLS0tLS0tLS0tLS0tLS0tK//AABEIAMIBAwMBIgACEQEDEQH/xAAcAAACAgMBAQAAAAAAAAAAAAAAAQQFAgYHAwj/xAA/EAABAwIDBAgEBAQEBwAAAAABAAIRAyEEBTESQVFhBiJxgZGhsfATMsHRFEJy4QdSYvEjJIKSFTRDY6Kywv/EABkBAQEBAQEBAAAAAAAAAAAAAAABAwIEBf/EACIRAQEAAgIDAAIDAQAAAAAAAAABAhEDMRIhQRNRBCIyYf/aAAwDAQACEQMRAD8A6oE0BC8rULILFZBAIQhA0IQgEIQgEIQgEIQgaSaECQomOzBlEdYkncAJdwmOHNazmvTj4QltCSdA59774AIjfqmxuKRK5tX6fVC1zQ1rXRO1wvAsd/3VQ3pXXcR19oNdcEkAnnHu4XXjU26+Hg3Cq82z2lh7OeJ4cPEhc+zXprXqSyk74bIFmtO3wIc8zv4LVqtVxu657ykxtLXUmdLqLv8AqHtDiPLQLxxnS/Yds04e2AZnjJPyjd3di5e1p5gntB5ETAK96WM2ZBMHyO424p4J5Oy5RnIrtDi0idN45iffqrVrlyDKM/c2G7UgbpItMwLLoGQ502s2x0IEGxGto7iubLF7bBKAo/4hsxPivYOQZlYrIIQYpLKEiqMUJoQNCSFFNNJCDJCSJQNNJCBoQhAIQhAIQtb6V9KW4MbAG1UImJDQBoCSewoL3E4xlP53gcBqT2NFz3LWc56c0qW0yiC+oLaABp37V7EcDC0at0xrVNtoDGNIu5ocXm8Xe4ybcAFrGOxkNsbglpjSLgLuYW9pbG2ZrnW2Nt7iZNxJ6xPG+muq1ytmJP6bTHmq38SXAk7tk+Yv74ryfUj5Lg6jeCupjIlr2qVXBxIhwPODe58160uJJHG8eigUNoHU9/7r3piTu77+Qsu3K0biw1tvF2/yWFLNabjDxB8jpPZuSwj3EHcPPvtc9qgY3CFzyGWjW2z5+9VzpdpOKzTZ+Ug9o+31UOpWc7rTE879krA4OLGCRPo092qKbtw3E2PKPNdSOUjC1iD1vHf3cVcZdjnYd20wkT3tIsRI8FSNvpr2wpTq0M2Xag2MXgmxUuqra6fSCoZcRt/6njn+Ui+i2bot0m2nhjiSHGOtqDuuubYLFyDA6wGn8w5dikYbGOb1jcHuI8Ne9Z3F1t3tpWSp+iuONfCU6hJJiCTvi0+XqrdcKCkglCoSEIQCEIUUJpJoBNJCBhNAQgE0IQCEIQRM1xraFF1Z5gNHu29cA6T5q6vWfWeSdp1gTJA3DgIHrzXTv4u1XfhqFIGA+v1o1IZTe6Bxv9FxLGYjakXtIA5arvCe9plfT0qY4gQDw9+ZUY1TJI4qNMr2dTi5WzNKoYnZuByI5dyRqtNw6ORXg3aNmi/n4qU3LnQCQudyLJaYrgc+QXpRxRMwwC+8km/p+yjikR9VmCReLJuLqrLD4iDECN03A5wpOMxQJBJExB1Gm6N+kquZeCPf7KW+4O0Dpbwg9/3XNrqR4YmWEP1bx5/YgryqMg7TbtPuCeKzp1oaWm7dFFZWFM8WnwXUrixILYiRLToeEbidykU3McIcb6XF/wB14UqsdXVpuLiyk02gmxg6H7xx49nJB4U6pa7qyQN+8eOvYpFPEl08jtex2Ssaddr5Y8bLriRpPPw8kqbdh2sQbH1B5aKDsH8N8aH4c05EscTHJxJnxlbguPdDcW6hjaewYbUcGOb+qBI5THguwArK9u4aSEIBCEIBCSFFNNJCBoSTQZAoWKyCBoSQgaEIQab/ABOwpfh6NRok060+NOpB/wBwb6b1wN9PamG7JGt55SvqDOsAMRh6lEkjaFiNQ4EOaRxggW36Lh9Tou9mMr0a2zTc8GpSJJ+FU60u2TrY8jE3AXeF1tLNtKhTcJRLzsgKRSy1xeQQJa4tOkSDB0Jm62PJ8sDBJ1U5OWYxpxcNyquweUuaQdgO74+it3YJxbGw0dpnyEeqtmMA3JPIC8v5ra9k4ZOmoYzK3TIPiAoUFtnW7BI+63iqwFVmMy9r9y0x5v24y4Psa26nA2mnTWPy/wBUaxxU2JbM2PlyK9H5O8fKT5g+IXmzBPYNI7/utZlL9YXCz4r8SYlQ2ki0SN4+yssRRdMu8gotejI2h3/efqtYwynt40n7Olu36j6r2bVuCO7iOX0XiLWkHvAP1lYzujxXThLqt1dzmdO2eYPqvZlSQJgyvBtSbFItLZaffA+HquVbJ0WxX+ZpA/lqUz3bYkHzXdwvnbJpFRhFjtNMzG8GV9DYadkSssu3ceqEIQCEkKAQhCKE0k0AhCFFNCSaqBOUkIMkSsUIMlX5nlVDENivRZUbrFRrXtB/m6wOyeYhT5SIlSq5X0ow7RiHfDpBjQ1oa0CAGgdXqj5Z1jW94NlDw7TuWzdI6AOKqE/0D/waoPwmt0Xly7r38d/rFd+HcToSvVuCOqmCqG3Q6vMmfErn1Gm6q6tGF4fDVhVeDqQEU6DD+YeIXULYiU6aiY3BuOg8FsNDBBe5wsKy6cXVc6xdB4JGyffDgqd7iF1h+Fa8EECFRZ30YDml7BfhuW+HN+3mz4P057UE3AE7+P8AZebT74KVi8MWEgi4Udzbz3/VeqV5LGdOpElTH3APuOC8KdKYgX0jjfRbblfR2k1oOKqOANwynqO0kH0XGecx7acfFln0q8mol1Sm1upe1o7SQB6lfQbVyTDZJSpVqNfC1HPpirT221AA9kvEExYtmBO6d6620rO5TL3FywuF1TQhJHITWKEQJysU1NqyQlKaqmhJCgaYSQqGmkhECEwkgEIXjjqbn0qjGGHOY4NPBxaQD4pVc86TZ7S+PUG2J2o/2gN+io3ZqJEHVatnGBfSeRiHbDmkgg6yCllFT4tVtJu0STYwQNCb8lneGdvRhzWetL3GZ1FlW4npBVmGtHmrLH5Rs6jRa/jKZBgWTDHC/HfJc572bs3rv49yybjahI+YEKvpUnOf1tstGoFp5BSW5a4mQNm5+ZxmJtoeELf+seb+1/bYcszao2ASSOH7LacJmgdE/uFz2hgqrCNmrPIyfNbDlmErk9YsA3xr4H7Lz8knb08e+q2/DmTAPuFP+GC2IsomBpEMBc4ntgjyAViPeqxjuuY9LcvLapIHveqLL8udVcGNE/QcfNdG6T5aanWbfW3OFh0Zyf4Qc4i5gHuleicusP8ArDLi3lv4oMLk7aRB369nP1VgzDvM7fjy5KZnlE3aG6ttzvDo7vVVeGruZDS4kbuSw8rl7r3YYSTWK26KmcQWnSCCDv0hdOYLLl+SWxUjeB6rqS04/rzfze5SKSELZ4ghJCgEIQgacpICDJCEIpoSTQNCSaqBCEIBCEIOf/xR6LsxLWYnb2XNOy6/zNIJEcwR4E8FrfRHLG03PrSXEAUxMWgAnT/SF0XpfSa+kxjhPXLo3WaRf/ctey/CBrdloAEk25lY5ZXenq4cJZuouMw+0Dz9wtXxOVySNPJb+7DjZVLjcvc8yDHmuPcr0bl9NMGTPmW+SkUMke43cfAK0/FOo1DTqRZXWBxbSBZW55fScePxX5fkVNt3Xd/V7hXdLDNG4cFIpVmm69mMbJc11juO48uS4vsvp64elA1t2e+ISqgiTonRqwYv771nXfPsJb6ca9ozausr1YbQobzrbv8A2XthtCVL0d1r+e1HGm2JDm1CQf6SII8Q3wUL8LUOzts2d+0bCO1XeNotkFwOsg8IU5mCGLYGOlpbv3diS/G8y1ELohhPi1/ibpnub9yugFVWQ4MUmWGuhHAK1W+E1Hg/kcnnn6AKEJLRgEJIQNCSEU00kIMk1gnKDJCUpoGhJCBoSTQCEIQal0yxZa9rdwbPiTPoFV4TFDZbfVrT4gH6q36d5a59MV2CdgQ79OoPdJntXNWZ38MEVJIb8sa/p5rC43yr28eeMwm3QnY6mBrdQa+dMpyS4Ady5/i+kBqXY1wHaAfL7qjr5g97tPKStcePKplzYY9e204zFjEYh1XcdJ381Io19g62WsUcS8CeX2Xm7MXTcK5cW0n8iRvlDG+yrSljxEHx3/uud5Xmhc4Mdv0+y2WjVht7hYZ4XGtcc5nNr9uKh2vYrFtWRO+Fp+Frl0XV/hq8rKzTqpr3LFlbZa48ifJRjWnistQQN4IV+OJ2eExe3Qa13zABZ4jEuLqeDpWqVtTpss/MZ4kA+B5KZg6AaBa6WW4EvzIVtG06F+Ze6o0D1PcFpx+6nNnrG6bbSphoDRoBA7Bos0kL0PAEIKSAQlKFA0LGU1VNMJIUDQhCoaAkmgYTWKcoGhKUFA0JApoE5oIIIkEQQdCDqFwnpvkLsLi3NAPwz1mni0k7P27Qu7rXummS/iqEsE1GSRGrmn5m/Udkb1Lde47x11XJG0nMaCKbgDeNmbcZAuFi3BPqGRTPa7qj7rZMVithomIIEcrKD/xEOtteC5mX175jjr3VZ/wh+8juElR6mSQZcSTuE2Wy06g3DvWDnhs7/qufyX45ywwaxQyvZqBxm11e1KnV2U209r36rzcIN5UytyvtMcZJ6Z4W3YrPD1dd/v0VS117KXQfw99y4sW1cUn299ymYQ3VKzEfVWOCqyuakX+HurPJ/mqdjf8A6VbhdIU3LDFbtaR5g/dd8fbLl6XCE0l6HkJCEigELFCgEwkhVWSawlOVBkhKU0DQkhBkhJCBoSQqGhJCgaYKxTQcx6WUf8zWpxADg4W/naHepVLRwIG/yC2X+I1I067ao0fTgfqYet5Fi092PIEgrPx/T2cec8d1YPp7p+iC0FwJP2VezGzMn+9l7NxJ858v7eCeNi3PayLSBFt/uQolYahRqmOJPsLyr4ubn19VPE8ns10E6Lzq40MVXXx24LxpkuN1pMP2zvJ8i0pYkuN1s+WO0Wt5dhz8xWy4FsXWeemuEumyYQ8FaZfgKtd4dSdsNa4bTyJt+ZrQdSRPZPcazo/gnYqpsMsxsbb+H9IO9x8tV0XDUG02hjBDQIAWvDx7915+fk16irxtHYdA0heCtMxpS3a4eiqytM8dV54SRTWJXCkhCECTSQimhCFAJykgIMgmsQmEDTSQgaSEIBNJCBoSQgrOkeSsxtE0nnZcDtMeBJY8AgGN4vBHBcnznovisOSHUHPAmH0wXsIG/qi3YYK7YvKvXDBO/hvVm/i70+fnMcLOaWxrNk/jkAgH3quwZrUdVI+IerNgNDu8d8nuWk9LMGCLAA699gVb67d4+2m1MVz+i8fiuepgwMqQyiGqecdzjyvaDSwpN4VjhMNdZg8lIonis8s61x45E7DNj3b91c5JgKmKqijS7XOizG73HnwG896p8DRqV6jaNFpc9xgAeZJ3Abyu0dGMiZgqApNu43qO3udHoNAP3Ti4vO+05uXwmp2nZXl7MPSbSpiGgd5O9xO8nipaAmvfJp84iFVYnBFt23HmrZYvMBS47WXSiFMnQE9gKwIV23WdyK9JrhcD3zXH418lEhWJwI/mKS4/HV8orZQkEws3ZoQhQNCSaAQhJBlKYWKYQNNJCBoQhAIWLnQJKgYyqXW0HD78V3jhalrLFY/8tPXTaiR3Df6KNRYYLnX7b+JXph6V0ZhU2aZutpjqOdqfHv67RznXetb6QOsHcz5/2Vs98u2joLknQDW5WvZjiQ+WxexM6gG7QRuc4Hag3ALf5rYZ9Vvx/wCop6kKO4SveoLoLFhvT2PJquOj2SVMZU2KcAC7nu+Vo3dpN4G+N1yqoNhdWyfCDB4RtIgfEd138nHUdwhvcu8MfKsuXPwnrt44fB08EzZoPIfA26lttxE2tZreQ7yVa5R0wAcKeI0JgP4fqA3cwtax9cXJMKnAdUNuq3j+Y9nAc1tvx6eSzfbtrXAiQZBuCNDzWS530M6Sim8YVx/wvlY4/ldw/T6di6Gt5dxlZoLxrncvZeJuZVRkwQsHXPJBdeAiYVQ4QsNsIQULVmhC8T0AJoQiBBQhAIQhA00IQCaEIBBQhBg/XuCh1h1x2fRCF7MemX1nSVXmv3QhTLpce1IWgtYCAQX0wQdCC5sg8QtLwby5lRxJJNetJNyf8Vwud9gB3IQvLn/l6eH/AEwrap7kkLCva9cu/wCYpD/uM/8AYLqGapoW/F1Xk/kdxq+NvUg8VhmxilbiB3cEIXbFhlw6w7l2HLTNGmSZ6jfQIQu+PuuM0leLkIWzNgN6wehCI8EIQor/2Q==' }} style={styles.driverImage} />
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
         <Text >Total fare</Text>

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
       <Text >Total fare</Text>

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
  fontSize: 16,
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
});
