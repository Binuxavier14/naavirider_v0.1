// import React from 'react';
// import { View, Text, Button } from 'react-native';
// import AsyncStorage from '@react-native-async-storage/async-storage';

// function Onboarding({ navigation }) {
//   const finishOnboarding = async () => {
//     await AsyncStorage.setItem('hasOnboarded', 'true');
//     navigation.replace('TabsNavigator'); // Navigate to main tabs
//   };

//   return (
//     <View>
//       <Text>Welcome to the App!</Text>
//       <Button title="Get Started" onPress={finishOnboarding} />
//     </View>
//   );
// }

// export default Onboarding;
import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, ScrollView, Platform, ActivityIndicator } from 'react-native';
// import { useRouter } from 'expo-router';
import { useMutation, useQuery } from '@apollo/client';
import {addUser, getUserInfo} from '../query/query'
import Ionicons from 'react-native-vector-icons/Ionicons';
import { Formik } from 'formik';
import * as Yup from 'yup';
import { useNavigation } from '@react-navigation/native';

// Form validation schema using Yup
const validationSchema = Yup.object().shape({
  firstname: Yup.string().required('First name is required'),
  lastname: Yup.string().required('Last name is required'),
  email: Yup.string().email('Invalid email address').required('Email is required'),
});

export default function Onboarding() {
//   const router = useRouter();
  const [loading, setLoading] = useState(false);
  const navigation = useNavigation();

  const { data, loading: apiLoading, refetch } = useQuery(getUserInfo, {
    fetchPolicy: "network-only",
    variables: { input: {userType :'rider'} },
    onCompleted: (fetchedData) => {
     console.log('data',data)
      setLoading(false); 
      if (fetchedData && fetchedData?.getUserInfo && fetchedData?.getUserInfo?.length > 0) {
        navigation.replace('TabsNavigator');      }
    },
  });

  const [addUserFunction, { loading: mloading }] = useMutation(
    addUser,
    {
      onCompleted: (response) => {
if(response?.addUser?.responsestatus) {
    navigation.replace('TabsNavigator'); }     },
      onError: () => {},
    }
  );

  const handleSkip = () => {
    navigation.replace('TabsNavigator');   };

  const handleSubmit = (values) => {
        console.log('Form values:', values);

    addUserFunction({
        variables: {
          input: {
            riderfirstname: values.firstname,
            riderlastname: values.lastname,
            rideremail: values.email,
           
          },
        },
      });
    // router.replace('/(tabs)'); 
  };
  console.log('datasss',data)

  if (loading || apiLoading) {    return (
      <View style={styles.loadingContainer}>
        <Ionicons name="boat" size={50} color="black" />
        <ActivityIndicator size="large" color="black" style={{ marginTop: 20 }} />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
    <ScrollView contentContainerStyle={styles.scrollContainer}>
    <Formik
          initialValues={{ firstname: '', lastname: '', email: '' }}
          validationSchema={validationSchema}
          onSubmit={handleSubmit}
        >
          {({ handleChange, handleBlur, handleSubmit, values, errors, touched }) => (
            <>
              <View style={styles.topContent}>
                <Text style={styles.header}>Let’s get you {"\n"}onboarded</Text>
                <Text style={styles.subtitle}>Enter your personal details and you are good to go</Text>

                <Text style={styles.label}>First name</Text>
                <TextInput
                  style={[styles.input, errors.firstname && touched.firstname ? styles.inputError : null]}
                  onChangeText={handleChange('firstname')}
                  onBlur={handleBlur('firstname')}
                  value={values.firstname}
                  keyboardType="email-address"
                />
                {errors.firstname && touched.firstname && (
                  <Text style={styles.errorText}>{errors.firstname}</Text>
                )}

                <Text style={styles.label}>Last name</Text>
                <TextInput
                  style={[styles.input, errors.lastname && touched.lastname ? styles.inputError : null]}
                  onChangeText={handleChange('lastname')}
                  onBlur={handleBlur('lastname')}
                  value={values.lastname}
                  keyboardType="email-address"
                />
                {errors.lastname && touched.lastname && (
                  <Text style={styles.errorText}>{errors.lastname}</Text>
                )}

                <Text style={styles.label}>Email</Text>
                <TextInput
                  style={[styles.input, errors.email && touched.email ? styles.inputError : null]}
                  onChangeText={handleChange('email')}
                  onBlur={handleBlur('email')}
                  value={values.email}
                  keyboardType="email-address"
                />
                {errors.email && touched.email && (
                  <Text style={styles.errorText}>{errors.email}</Text>
                )}
              </View>

              <View style={styles.bottomContent}>
                {/* <TouchableOpacity onPress={() => router.replace('/(tabs)')}> */}
                <TouchableOpacity onPress={() =>  navigation.replace('TabsNavigator')} >
                  <Text style={styles.skipText}>Skip for now</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.button} onPress={handleSubmit}>
                  <Text style={styles.buttonText}>Let’s get started</Text>
                </TouchableOpacity>
              </View>
            </>
          )}
        </Formik>
    </ScrollView>
  </KeyboardAvoidingView>

    // <View style={styles.container}>
    //   <Text style={styles.title}>Let’s get you onboarded</Text>
    //   <Text style={styles.subtitle}>Enter your personal details and you are good to go</Text>

    //   <TextInput style={styles.input} placeholder="First name" />
    //   <TextInput style={styles.input} placeholder="Last name" />
    //   <TextInput style={styles.input} placeholder="Email" keyboardType="email-address" />

      
    // </View>
  );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#FFFFFF' },
    scrollContainer: { flexGrow: 1, justifyContent: 'space-between', padding: 20 },
    topContent: { flex: 1,marginTop:50 },
    bottomContent: { width: '100%', marginBottom: 20 },
    header: { fontSize: 34, fontWeight: 'bold', marginBottom: 20 },

  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    color: '#777',
    // textAlign: 'center',
    marginBottom: 30,
  },
  phoneInputContainer: {
    flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#ccc', borderRadius: 5, marginBottom: 20, paddingHorizontal: 10,
  },
  label: { fontSize: 16, color: '#333333', marginBottom: 8 },

  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 12,
    marginBottom: 20,
    fontSize: 16,
  },
  inputError: { borderColor: 'red' },
  errorText: { color: 'red', fontSize: 12, marginBottom: 10 },
  skipText: {
    textAlign: 'center',
    fontSize: 16,
    color: '#888',
    marginBottom: 20,
  },
  button: {
    backgroundColor: '#000',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
});
