// import React, { useState } from 'react';
// import { Text, TouchableOpacity, View } from 'react-native';
// import RazorpayCheckout from 'react-native-razorpay';

// export default function App() {
//   const [paymentId, setPaymentId] = useState('');

//   const handlePayment = () => {
//     const options = {
//       description: 'Product Purchase',
//       image: 'https://your-logo-url.com/logo.png',
//       currency: 'INR',
//       key: 'rzp_test_hFWHEWrGaQh7hO', // Replace with your Razorpay Key ID
//       amount: '5000', // Amount in paise (e.g., 5000 paise = ₹50)
//       name: 'Your Company Name',
//       prefill: {
//         email: 'user@example.com',
//         contact: '9999999999',
//         name: 'John Doe'
//       },
//       theme: { color: '#53a20e' }
//     };
    
//     RazorpayCheckout.open(options)
//       .then((data) => {
//         // Payment successful
//         console.log('Payment successful', data);
//       })
//       .catch((error) => {
//         // Payment failed
//         console.error('Payment failed', error);
//       });

//   };

//   return (
//     <View>
//             <TouchableOpacity  onPress={handlePayment} >
//             <Text  >Payment</Text>

//             </TouchableOpacity>

//     </View>
//   );
// }
import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
// import { createStackNavigator } from '@react-navigation/stack';
import { ApolloProvider } from '@apollo/client';
import client from './apolloClient';
import LoginScreen from './login'; // Adjust the import path to where LoginScreen is
import Onboarding from './onboarding'; // Adjust the import path to where OnboardingScreen is
import TabsNavigator from './tabs/TabsNavigator'; // Adjust the import path to where OnboardingScreen is
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createNativeStackNavigator } from '@react-navigation/native-stack';


const Stack = createNativeStackNavigator();

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(null); // `null` for loading state

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const token = await AsyncStorage.getItem('authToken');
        setIsAuthenticated(!!token); // Set true if token exists, false otherwise
      } catch (error) {
        console.error('Error fetching auth token:', error);
        setIsAuthenticated(false); // Handle errors gracefully
      }
    };

    checkAuth();
  }, []);
  if (isAuthenticated === null) {
    // Show a loading state while checking authentication
    return null; // Replace with a spinner if needed
  }
console.log('isAuthenticated',isAuthenticated)
  // if (!isAuthenticated) {
  //    return (
  //     <ApolloProvider client={client}>
  //     <NavigationContainer>
  //       <Onboarding />
  //     </NavigationContainer>
  //     </ApolloProvider>
  //   );
  // }
//   if (isAuthenticated) {
//     return (
//       <ApolloProvider client={client}>

//      <NavigationContainer>
//        <LoginScreen />
//      </NavigationContainer>
//      </ApolloProvider>
//    );
//  }

  return (
    <ApolloProvider client={client}>
      <NavigationContainer>
        <Stack.Navigator initialRouteName={isAuthenticated ? 'Onboarding' : 'Login'}>
          <Stack.Screen name="Login" component={LoginScreen} options={{ headerShown: false }} />
          <Stack.Screen name="Onboarding" component={Onboarding} options={{ headerShown: false }} />
          <Stack.Screen name="TabsNavigator" component={TabsNavigator} options={{ headerShown: false }} />
        </Stack.Navigator>
      </NavigationContainer>
    </ApolloProvider>
  );
}
