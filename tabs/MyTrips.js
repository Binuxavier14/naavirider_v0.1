import { useMutation, useQuery } from '@apollo/client';
import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { useEffect, useState } from 'react';
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
} from 'react-native';
import { getTripsByUser } from '../query/query';
import Icon from 'react-native-vector-icons/Ionicons';
import { useNavigation } from '@react-navigation/native';

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
  else if(status.includes('TRIP_ENDED#')){
    return { backgroundColor: '#2196F3' };  
  }
 

};

const getStatus = (status) => {
if(status.includes('TRIP_ACCEPTED#')){
  return 'Waiting for Payment';
}
else if(status.includes('TRIP_PAYMENT_DONE#')){
  return 'Payment Completed';
}
else if(status.includes('TRIP_ENDED#')){
  return 'Trip Completed';
}


};

function convertTimestamp(timestamp) {
  const date = new Date(timestamp * 1000); // Convert to milliseconds
  const day = date.toLocaleString('en-US', { weekday: 'long' }); // Get day of the week
  const formattedDate = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }); // Get formatted date
  return { day, date: formattedDate };
}

const TripCard = ({ trip  }) => (
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
      <Text style={styles.details}>
  {`${convertTimestamp(trip?.tripdate).day}, ${convertTimestamp(trip?.tripdate).date}`}
</Text>
      <Text style={styles.details}>{trip?.timeSlot}</Text>

     
    </View>
  </View>
);

const MyTrips = () => {
 
  const [modalVisible, setModalVisible] = useState(false);
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [activeTripId, setActiveTripId] = useState(null);
  const [ws, setWs] = useState(null);
  const [driverPK ,setDriverPK] = useState('');
  const [driverSK ,setDriverSK] = useState('');
  const [loading, setLoading] = useState(false); // New state for loading
  const navigation = useNavigation();


  const { data, loading: apiLoading } = useQuery(getTripsByUser, {
    fetchPolicy: "network-only",
    variables: { input: {isEndTrip : 'true'} },
  });
  console.log('tripdata1',data)  


  const handlePayNow = (trip) => {
    navigation.navigate('Home', {
      isBooking: true,
      tripDetails: trip,
    });
  };


 

  const closeModal = () => {
    setModalVisible(false);
    setOtp(['', '', '', '', '', '']); // Reset OTP
  };

  
  return (
    <View style={styles.container}>
       {loading && (
        <View style={styles.loadingOverlay}>
           <View style={styles.loadingCard}>
          <Icon name="boat" size={50} color="black" />
          {/* <Text>Searching Boat ...</Text> */}
          <ActivityIndicator size="large" color="black" style={{ marginTop: 20 }} />
          </View>
        </View>
      )}

      <Text style={styles.title}>My Trips</Text>
      <FlatList
        data={data?.getTripsByUser}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          // <TripCard trip={item} onStartTrip={handleStartTrip}  onEndTrip={handleEndTrip} />
<TripCard trip={item} />
        )}
      />

      {/* OTP Modal */}
     

    </View>
  );
};

export default MyTrips;

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
  startTripButton: {
    marginTop: 10,
    backgroundColor: '#4CAF50',
    paddingVertical: 10,
    borderRadius: 5,
    alignItems: 'center',
  },
  startTripButtonText: {
    color: '#FFF',
    fontWeight: 'bold',
    fontSize:19
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center', // Centers the modal vertically
    alignItems: 'center', // Centers the modal horizontally
  },
  modalContent: {
    backgroundColor: '#FFF',
    width: '90%',
    borderRadius: 10,
    padding: 20,
    alignItems: 'center', // Aligns content in the center
    justifyContent: 'center', // Ensures content inside modal is centered
  },
  
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  otpContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  otpBox: {
    borderWidth: 1,
    borderColor: '#CCC',
    width: 40,
    height: 40,
    textAlign: 'center',
    fontSize: 16,
    marginHorizontal: 5,
    borderRadius: 5,
  },
  confirmButton: {
    backgroundColor: '#000000',
    paddingVertical: 10,
    paddingHorizontal: 30,
    borderRadius: 10,
  },
  confirmButtonText: {
    color: '#FFF',
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
});
