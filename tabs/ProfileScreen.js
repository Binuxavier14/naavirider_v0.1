import React, { useEffect } from "react";
import { View, Text, StyleSheet, Image, TouchableOpacity, Switch } from "react-native";
import Icon from "react-native-vector-icons/MaterialIcons";
import { getUserInfo } from "../query/query";
import { useQuery } from "@apollo/client";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useNavigation } from '@react-navigation/native';

const isAuthenticated = async () => {
  try {
    const authToken = await AsyncStorage.getItem('authToken');
    const userInfo = await AsyncStorage.getItem('userInfo');
    console.log('authToken', authToken);
    console.log('userInfo', userInfo);
    return !!authToken;
  } catch (error) {
    console.error('Error checking authentication:', error);
    return false;
  }
};

const ProfileScreen = () => {
  const [notificationsEnabled, setNotificationsEnabled] = React.useState(true);
  const navigation = useNavigation();

  const toggleNotifications = () => {
    setNotificationsEnabled((prev) => !prev);
  };
  const { data, loading: apiLoading } = useQuery(getUserInfo, {
    fetchPolicy: "network-only",
    variables: { input: {userType :'rider'} },
  });

  const handleLogout = async () => {
    try {
      await AsyncStorage.removeItem('authToken');
      await AsyncStorage.removeItem('userInfo');
      
      // Reset to unauthenticated flow
      navigation.reset({
        index: 0,
        routes: [{ name: 'Login' }],
      });
    } catch (error) {
      console.error('Error during logout:', error);
    }
  };
  
  useEffect(() => {
    const checkAuth = async () => {
      const authenticated = await isAuthenticated();
      if (!authenticated) {
        // Reset to unauthenticated flow
        navigation.reset({
          index: 0,
          routes: [{ name: 'Login' }],
        });
      }
    };
  
    checkAuth();
  }, []);
  

  return (
    <View style={styles.container}>
      {/* Header Section */}
      <View style={styles.header}>
        <Image
          source={{ uri: "https://via.placeholder.com/100" }} // Replace with the user's profile image URL
          style={styles.profileImage}
        />
        <Text style={styles.name}>{data?.getUserInfo[0]?.riderfirstname} {data?.getUserInfo[0]?.riderlastname}</Text>
        <Text style={styles.phoneNumber}>{data?.getUserInfo[0]?.SK}</Text>
        <TouchableOpacity>
          <Text style={styles.editProfile}>Edit Profile</Text>
        </TouchableOpacity>
      </View>

     

      {/* Trips Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>TRIPS</Text>
        <TouchableOpacity style={styles.row} onPress={() => navigation.navigate('MyTrips')} >
          <Icon name="map" size={24} color="#000" />
          <Text style={styles.rowText}>My Trips</Text>
          <Icon name="chevron-right" size={24} color="#ccc" />
        </TouchableOpacity>
      </View>

      {/* Settings Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>SETTINGS</Text>
        <View style={styles.row}>
          <Text style={styles.rowText}>Notifications</Text>
          <Switch
            value={notificationsEnabled}
            onValueChange={toggleNotifications}
            thumbColor={notificationsEnabled ? "#4CAF50" : "#f4f3f4"}
            trackColor={{ false: "#ccc", true: "#4CAF50" }}
          />
        </View>
        <TouchableOpacity style={styles.row}>
          <Text style={styles.rowText}>Payment Method</Text>
          <Icon name="chevron-right" size={24} color="#ccc" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.row}>
          <Text style={styles.rowText}>My Rewards</Text>
          <Icon name="chevron-right" size={24} color="#ccc" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.row} onPress={handleLogout}>
          <Icon name="logout" size={24} color="#000" />
          <Text style={styles.rowText}>Logout</Text>
          <Icon name="chevron-right" size={24} color="#ccc" />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f9f9f9",
  },
  header: {
    alignItems: "center",
    padding: 20,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  profileImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginBottom: 10,
  },
  name: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#000",
  },
  phoneNumber: {
    fontSize: 14,
    color: "#666",
    marginBottom: 10,
  },
  editProfile: {
    fontSize: 14,
    color: "#007BFF",
    textDecorationLine: "underline",
  },
  section: {
    marginTop: 20,
    backgroundColor: "#fff",
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: "#eee",
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#666",
    marginBottom: 10,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  rowText: {
    fontSize: 16,
    color: "#000",
    flex: 1,
    marginLeft: 10,
  },
});

export default ProfileScreen;
