import { useLazyQuery, useMutation, useQuery } from '@apollo/client';
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
  RefreshControl,
  Image,
} from 'react-native';
import { getPaymentTrip, getTripsByUser, getUserDetails } from '../query/query';
import Icon from 'react-native-vector-icons/Ionicons';

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


};

function convertTimestamp(timestamp) {
  const date = new Date(timestamp * 1000); // Convert to milliseconds
  const day = date.toLocaleString('en-US', { weekday: 'long' }); // Get day of the week
  const formattedDate = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }); // Get formatted date
  return { day, date: formattedDate };
}

const TripCard = ({ trip, onStartTrip,onEndTrip  }) => (
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

      {/* Start Trip Button for Payment Confirmed */}
      {trip?.rstatus.includes('TRIP_ACCEPTED') && (
        <TouchableOpacity
          style={styles.startTripButton}
          onPress={() => onStartTrip(trip)}
        >
          <Text style={styles.startTripButtonText}>Pay now</Text>
        </TouchableOpacity>
      )}
       {trip?.rstatus.includes('TRIP_PAYMENT_DONE#') && (
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
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [activeTripId, setActiveTripId] = useState(null);
  const [ws, setWs] = useState(null);
  const [driverPK ,setDriverPK] = useState('');
  const [driverSK ,setDriverSK] = useState('');
  const [loading, setLoading] = useState(false); // New state for loading
  const [refreshing, setRefreshing] = useState(false);


  const { data, loading: apiLoading,refetch } = useQuery(getTripsByUser, {
    fetchPolicy: "network-only",
    variables: { input: {isEndTrip : 'false'} },
  });

  const [getDriverDetails, { data:driverdata,loading: orderIDLoading }] = useLazyQuery(
    getUserDetails,
    {
      fetchPolicy: "network-only",
      onCompleted: (response) => {
       console.log('response1',response)
       setModalVisible(true);

      },
    }
  );
  const [getOTP, { data:otpdata,loading: otplaoding }] = useLazyQuery(
    getPaymentTrip,
    {
      fetchPolicy: "network-only",
      onCompleted: (response) => {
       console.log('response',response)
      
      },
    }
  );
  // console.log('tripdata1',data)  

const onRefresh = () => {
    setRefreshing(true);
    setTimeout(() => {
     refetch();
      setRefreshing(false);
    }, 2000);
  };

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


 

  const closeModal = () => {
    setModalVisible(false);
    setOtp(['', '', '', '', '', '']); // Reset OTP
  };

  console.log('activeTripId',activeTripId)
  return (
    <View style={styles.container}>
       {(apiLoading ||orderIDLoading ||otplaoding) && (
        <View style={styles.loadingOverlay}>
           <View style={styles.loadingCard}>
          <Icon name="boat" size={50} color="black" />
          {/* <Text>Searching Boat ...</Text> */}
          <ActivityIndicator size="large" color="black" style={{ marginTop: 20 }} />
          </View>
        </View>
      )}

      <Text style={styles.title}>Your Upcoming Trips</Text>
      <FlatList
        data={data?.getTripsByUser}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          // <TripCard trip={item} onStartTrip={handleStartTrip}  onEndTrip={handleEndTrip} />
<TripCard trip={item} onStartTrip={() => handlePayNow(item)} onEndTrip={() => handleViewDetails(item)} />
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
            <Image
              source={{
                uri: "https://via.placeholder.com/50",
              }}
              style={styles.avatar}
            />
            <View style={styles.driverInfo}>
              <Text style={styles.driverName}> {driverdata?.getUserDetails[0]?.driverFirstName} {driverdata?.getUserDetails[0]?.driverLastName}</Text>
              <Text style={styles.rating}>⭐ "4.8"</Text>
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
  }
</Text>

            </Text>
            <Text style={styles.timeText}>
              <Text style={styles.timeValue}>  OTP : {otpdata?.getPaymentTrip[0]?.otp}</Text>
            </Text>
          </View>
          <TouchableOpacity style={styles.closeButton}  onPress={closeModal}>
            <Text style={styles.closeText}>✕</Text>
          </TouchableOpacity>
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
    height:400
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
});
