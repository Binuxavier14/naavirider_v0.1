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
  Platform,
  Share,
  PermissionsAndroid,
  RefreshControl,
  Linking,
} from 'react-native';
import { getSignedURL, getTripsByUser } from '../query/query';
import Icon from 'react-native-vector-icons/Ionicons';
import { useNavigation } from '@react-navigation/native';
import RNFetchBlob from 'rn-fetch-blob';
import RNFS from 'react-native-fs';

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
else if(status.includes('TRIP_ENDED#')){
  return 'Trip Completed';
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

const TripCard = ({ trip,onStartTrip  }) => (
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

      <TouchableOpacity
          style={styles.startTripButton}
          onPress={() => onStartTrip(trip)}
        >
          <Text style={styles.startTripButtonText}>View Invoice</Text>
        </TouchableOpacity>
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
  const [refreshing, setRefreshing] = useState(false);


  const { data, loading: apiLoading,refetch } = useQuery(getTripsByUser, {
    fetchPolicy: "network-only",
    variables: { input: {isEndTrip : 'true'} },
  });
  // console.log('tripdata1',data)  

  const [getFileUrl, { loading: attachmentDataLoading }] = useLazyQuery(getSignedURL, {
    onCompleted: async (response) => {
      const url = response?.getSignedURL?.url;
      //console.log('url',url)
      if (url) {
        handleSaveAndPrint({ pdfUrl: url });
        //console.log('hi');
      } else {
        Alert.alert('Error', 'No URL found for the file.');
      }
    },
  });
  
  const onRefresh = () => {
    setRefreshing(true);
    refetch();
    setTimeout(() => {
      
      setRefreshing(false);
    }, 2000);
  };
  // Function to request storage permissions and download the PDF
  const downloadPDF = async (url, fileName) => {
    // Request storage permission for Android
    const requestStoragePermission = async () => {
      if (Platform.OS === 'android') {
        try {
          const granted = await PermissionsAndroid.request(
            PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE,
            {
              title: 'Storage Permission Required',
              message: 'This app needs access to your storage to download files.',
              buttonNeutral: 'Ask Me Later',
              buttonNegative: 'Cancel',
              buttonPositive: 'OK',
            }
          );
  
          return granted === PermissionsAndroid.RESULTS.GRANTED;
        } catch (err) {
          console.warn('Permission request error:', err);
          return false;
        }
      }
      return true; // iOS doesn't require runtime permission
    };
  
    try {
      const isPermissionGranted = await requestStoragePermission();
      if (!isPermissionGranted) {
        Alert.alert('Permission Denied', 'Cannot download the file without storage permission.');
        return;
      }
  
      const { dirs } = RNFetchBlob.fs;
      const path = `${dirs.DownloadDir}/${fileName}`; // Save to Downloads directory
  
      RNFetchBlob.config({
        fileCache: true,
        addAndroidDownloads: {
          useDownloadManager: true,
          notification: true,
          path,
          description: 'Downloading PDF file',
        },
      })
        .fetch('GET', url)
        .then((res) => {
          Alert.alert(
            'Download Successful',
            `File downloaded to ${res.path()}`,
            [
              {
                text: 'Open File',
                onPress: () => {
                  RNFetchBlob.android.actionViewIntent(res.path(), 'application/pdf');
                },
              },
              {
                text: 'Close',
                style: 'cancel',
              },
            ]
          );
        })
        .catch((error) => {
          console.error('File download error:', error);
          Alert.alert('Error', 'An error occurred while downloading the file.');
        });
    } catch (error) {
      console.error('Error during file download process:', error);
      Alert.alert('Error', 'An unexpected error occurred.');
    }
  };

  const handlePayNow = (trip) => {
    const url = trip?.invoicefilekey; 
    getFileUrl({
      variables: {
        input: {
          key: trip?.invoicefilekey,
        },
      },
    });
    // Replace with your actual URL
  };

  const handleSaveAndPrint = async (dataurl) => {
    console.log('daturl',dataurl)
    try {
      if (!dataurl || !dataurl.pdfUrl) {
        Alert.alert('Error', 'Invalid URL for the file.');
        return;
      }
  
      const pdfUrl = dataurl.pdfUrl;
      const decodedUrl = decodeURIComponent(pdfUrl);
      const fileNameMatch = decodedUrl.match(/\/([^/]+\.pdf)(?:\?|$)/);
      const fileName = fileNameMatch ? fileNameMatch[1] : 'downloaded_file.pdf';
      const { dirs } = RNFetchBlob.fs;
      const filePath = `${dirs.DownloadDir}/${fileName}`;
      const finalFilePath = filePath.endsWith('.pdf') ? filePath : `${filePath}.pdf`;
  
      // Check and request storage permissions
      const permissionGranted = await checkAndRequestPermissions();
  
      if (!permissionGranted) {
        Alert.alert(
          'Permission Denied',
          'Storage permission is required to download and save files. Please enable it in settings.',
          [
            {
              text: 'Open Settings',
              onPress: () => Linking.openSettings(),
            },
            {
              text: 'Cancel',
              style: 'cancel',
            },
          ]
        );
        return;
      }
  
      // Download the file using RNFS
      const downloadResult = await RNFS.downloadFile({
        fromUrl: pdfUrl,
        toFile: finalFilePath,
      }).promise;
  
      if (downloadResult.statusCode === 200) {
        Alert.alert(
          'File Saved',
          `File saved to: ${finalFilePath}`,
          [
            {
              text: 'Open File',
              onPress: () => {
                RNFetchBlob.android.actionViewIntent(finalFilePath, 'application/pdf');
              },
            },
            {
              text: 'Close',
              style: 'cancel',
            },
          ]
        );
      } else {
        throw new Error(`Failed to download file. Status code: ${downloadResult.statusCode}`);
      }
    } catch (error) {
      console.error('Error during file download process:', error);
      Alert.alert('Error', 'An unexpected error occurred while downloading the file.');
    }
  };
  
  // Function to check and request permissions
  const checkAndRequestPermissions = async () => {
    if (Platform.OS === 'android') {
      const sdkVersion = Platform.Version;
  
      // For Android 13 and above, use READ_MEDIA permissions
      if (sdkVersion >= 33) {
        const readMediaPermission = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.READ_MEDIA_IMAGES // Replace with READ_MEDIA_DOCUMENTS if using Android 14+
        );
  
        return readMediaPermission === PermissionsAndroid.RESULTS.GRANTED;
      }
  
      // For Android 10–12, use WRITE_EXTERNAL_STORAGE
      if (sdkVersion >= 29) {
        const writePermission = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE
        );
  
        return writePermission === PermissionsAndroid.RESULTS.GRANTED;
      }
  
      // For older versions, request READ_EXTERNAL_STORAGE
      const readPermission = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE
      );
  
      return readPermission === PermissionsAndroid.RESULTS.GRANTED;
    }
  
    return true; // iOS does not require these permissions
  };
 

  const closeModal = () => {
    setModalVisible(false);
    setOtp(['', '', '', '', '', '']); // Reset OTP
  };

  
  return (
    <View style={styles.container}>
       {attachmentDataLoading && (
        <View style={styles.loadingOverlay}>
           <View style={styles.loadingCard}>
          <Icon name="boat" size={50} color="black" />
          {/* <Text>Searching Boat ...</Text> */}
          <ActivityIndicator size="large" color="black" style={{ marginTop: 20 }} />
          </View>
        </View>
      )}

      {/* <Text style={styles.title}>My Trips</Text> */}
     
      {data?.getTripsByUser?.length !== 0 ? 
      <FlatList
        data={data?.getTripsByUser}
        keyExtractor={(item) => item.SK}
        renderItem={({ item }) => (
          // <TripCard trip={item} onStartTrip={handleStartTrip}  onEndTrip={handleEndTrip} />
<TripCard trip={item}  onStartTrip={() => handlePayNow(item)} />
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
    paddingVertical: 10,
    borderRadius: 5,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#7997a1',
    },
  startTripButtonText: {
    color: '#7997a1',
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
  nodataboatCard: {
    height:300,
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
