import React, { useEffect } from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import Home from './Home';
import Explore from './Explore';
import ProfileScreen from './ProfileScreen';
import MyTrips from './MyTrips'; // Import MyTrips screen
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Colors } from 'react-native/Libraries/NewAppScreen';
import Icon from 'react-native-vector-icons/FontAwesome6'; // Replace 'FontAwesome' with your desired library
import Icons from 'react-native-vector-icons/Ionicons'; // Replace 'FontAwesome' with your desired library
import { useNavigation } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

const Tabs = createBottomTabNavigator();
const Stack = createNativeStackNavigator(); // Create a Stack Navigator for Profile

const HomeIcon = ({ color }) => <Icon name="ship" size={30} color={color} />;
const ExploreIcon = ({ color }) => <Icon name="map-location-dot" size={30} color={color} />;
const ProfileIcon = ({ color }) => <Icons name="person-circle-outline" size={30} color={color} />;


const isAuthenticated = async () => {
  try {
    const authToken = await AsyncStorage.getItem('authToken');
    return !!authToken;
  } catch (error) {
    console.error('Error checking authentication:', error);
    return false;
  }
};

// Define the Profile Stack Navigator
function ProfileNavigator() {
  return (
    <Stack.Navigator>
      <Stack.Screen
        name="ProfileScreen"
        component={ProfileScreen}
        options={{ title: 'Profile' }}
      />
      <Stack.Screen
        name="MyTrips"
        component={MyTrips}
        options={{ title: 'My Trips' }}
      />
    </Stack.Navigator>
  );
}

function TabsNavigator() {
  const navigation = useNavigation();

  useEffect(() => {
    const checkAuth = async () => {
      const authenticated = await isAuthenticated();
      if (!authenticated) {
        // navigation.replace('Login');
        navigation.reset({
          index: 0,
          routes: [{ name: 'Login' }],
        });
      }
    };

    checkAuth();
  }, []);

  return (
    <Tabs.Navigator
      screenOptions={{
        tabBarActiveTintColor: Colors.tint,
        headerShown: false,
      }}
    >
      <Tabs.Screen
        name="Home"
        component={Home}
        options={{
          title: 'Home',
          tabBarIcon: HomeIcon,
        }}
      />
      <Tabs.Screen
        name="Explore"
        component={Explore}
        options={{
          title: 'Explore',
          tabBarIcon: ExploreIcon,
        }}
      />
      <Tabs.Screen
        name="Profile"
        component={ProfileNavigator} // Pass ProfileNavigator as the component
        options={{
          title: 'Profile',
          tabBarIcon: ProfileIcon,
        }}
      />
    </Tabs.Navigator>
  );
}

export default TabsNavigator;
