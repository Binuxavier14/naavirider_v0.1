import React, { useState, useRef ,useEffect} from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, Image, KeyboardAvoidingView, ScrollView, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Auth0 from 'react-native-auth0';
import Icon from 'react-native-vector-icons/AntDesign';
import { useNavigation } from '@react-navigation/native';

const auth0 = new Auth0({
  domain: 'dev-0d2vacav84pvzvyr.us.auth0.com',
  clientId: '9wd2JFw9cFlUAMlRPkPBTIabmp11My9W',
});

const LoginScreen = () => { // Receive navigation prop from React Navigation
  const [mobileNumber, setMobileNumber] = useState('');
  const [actualotp, setActualOtp] = useState('');
  const [otp, setOtp] = useState(Array(6).fill('')); // Six-box OTP state
  const [isOtpSent, setIsOtpSent] = useState(false);
  const [isChecked, setIsChecked] = useState(false); // Checkbox state

  const navigation = useNavigation();
  const otpInputRefs = useRef(Array.from({ length: 6 }, () => useRef(null)));

 

  const sendOtp = async () => {
    try {
      const response = await fetch('https://dev-0d2vacav84pvzvyr.us.auth0.com/passwordless/start', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          client_id: '9wd2JFw9cFlUAMlRPkPBTIabmp11My9W',
          client_secret: '14TGUfJw4sf7PWu0B4Tl4sxSdWYUQDU_ABBl4k7DKLAe6h8SMITag1kp-aW_sAG4',
          connection: 'sms',
          phone_number: '+91' + mobileNumber,
          send: 'code'
        }),
      });

      const result = await response.json();
      
      if (result.error) {
        throw new Error(result.error_description || 'Failed to send OTP');
      }

      setIsOtpSent(true);
      Alert.alert('OTP Sent', 'Please check your phone for the OTP.');
    } catch (error) {
      console.error('Error sending OTP:', error);
      Alert.alert('Error', 'Failed to send OTP.');
    }
  };

  const verifyOtp = async () => {
    try {
      const response = await fetch('https://dev-0d2vacav84pvzvyr.us.auth0.com/oauth/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          grant_type: 'http://auth0.com/oauth/grant-type/passwordless/otp',
          client_id: '9wd2JFw9cFlUAMlRPkPBTIabmp11My9W',
          client_secret: '14TGUfJw4sf7PWu0B4Tl4sxSdWYUQDU_ABBl4k7DKLAe6h8SMITag1kp-aW_sAG4',
          otp : actualotp,
          realm: 'sms',
          username: '+91' + mobileNumber,
          audience: 'https://aws.amazon.com/',
          scope: 'openid profile email' 
        }),
      });

      const credentials = await response.json();
      console.log('credentials', credentials);
      if (credentials.error) {
        throw new Error(credentials.error_description || 'Failed to verify OTP');
      }

      if (credentials.access_token) {
        await AsyncStorage.setItem('authToken', credentials.access_token);
      }
      
      if (credentials.id_token) {
        await AsyncStorage.setItem('userInfo', JSON.stringify(credentials.id_token));
        await AsyncStorage.setItem('idToken', credentials.id_token);
          // navigation.replace('Onboarding');
          navigation.reset({
            index: 0,
            routes: [{ name: 'Onboarding' }],
          }); 
        
      }

      Alert.alert('Login Successful', 'You have been authenticated.');
      // Ensure navigation is not undefined before navigating
        } catch (error) {
      console.error('Error verifying OTP:', error);
      Alert.alert('Error', 'Invalid OTP. Please try again.');
    }
  };

  const handleOtpChange = (value, index) => {
    const updatedOtp = [...otp];
    updatedOtp[index] = value;
    setOtp(updatedOtp);
    const actualOTP = updatedOtp?.join("");
    setActualOtp(actualOTP);

    // Focus on the next input box if a digit is entered
    if (value && index < 5) otpInputRefs.current[index + 1].current.focus();
    // Focus back if cleared and there's a previous box
    if (!value && index > 0) otpInputRefs.current[index - 1].current.focus();
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View style={styles.topContent}>
          <Image source={require('../assets/images/two.png')} style={styles.logo} />
          <Text style={styles.header}>{!isOtpSent ?  "Get started with\nNaavi!" : "We've sent an OTP on your number"}</Text>

          {!isOtpSent ? (
            <>
              <Text style={styles.label}>Enter mobile number</Text>
              <View style={styles.phoneInputContainer}>
                <Text style={styles.countryCode}>+91</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Enter your mobile number"
                  keyboardType="phone-pad"
                  value={mobileNumber}
                  onChangeText={setMobileNumber}
                />
              </View>
            </>
          ) : (
            <>
              <Text style={styles.phoneNumberText}>OTP sent on <Text style={styles.phoneNumberText1}>+91{mobileNumber}</Text></Text>
              <View style={styles.otpContainer}>
                {otp.map((digit, index) => (
                  <TextInput
                    key={index}
                    ref={otpInputRefs.current[index]}
                    style={styles.otpInput}
                    keyboardType="number-pad"
                    maxLength={1}
                    value={digit}
                    onChangeText={(value) => handleOtpChange(value, index)}
                  />
                ))}
              </View>
            </>
          )}
        </View>

        <View style={styles.bottomContent}>
          {!isOtpSent ? (
            <>
              <View style={styles.checkboxContainer}>
                <TouchableOpacity style={styles.checked} onPress={() => setIsChecked(!isChecked)}>
                  <Icon name={isChecked ? "checkcircle" : "checkcircleo"} size={20} color="black" />
                </TouchableOpacity>
                <Text style={styles.termsText}>
                  By continuing, you agree to our <Text style={styles.linkText}>Terms & Conditions</Text> and <Text style={styles.linkText}>Privacy Policy</Text>
                </Text>
              </View>
              <TouchableOpacity
                style={[styles.button, !isChecked && styles.buttonDisabled]}
                onPress={sendOtp}
                disabled={!isChecked}
              >
                <Text style={styles.buttonText}>Continue</Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <TouchableOpacity style={styles.button} onPress={verifyOtp}>
                <Text style={styles.buttonText}>Verify</Text>
              </TouchableOpacity>
              <Text style={styles.resendText} onPress={sendOtp} >Resend OTP</Text>
            </>
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  scrollContainer: { flexGrow: 1, justifyContent: 'space-between', padding: 20 },
  topContent: { flex: 1, marginTop: 50 },
  bottomContent: { width: '100%', marginBottom: 20 },
  logo: { width: 100, height: 100,borderRadius:50 },
  header: { fontSize: 34, fontWeight: 'bold', marginBottom: 20 },
  label: { fontSize: 16, color: '#333333', marginBottom: 8 },
  phoneNumberText: { fontSize: 14, color: '#333333', marginBottom: 20 },
  phoneNumberText1: { fontSize: 14, color: '#333333', fontWeight: 'bold' },
  phoneInputContainer: {
    flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#ccc', borderRadius: 5, marginBottom: 20, paddingHorizontal: 10,
  },
  countryCode: { fontSize: 16, marginRight: 10, color: '#333333' },
  input: { flex: 1, height: 50, fontSize: 16, color: '#333333' },
  otpContainer: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
  otpInput: {
    width: 40, height: 50, borderWidth: 1, borderColor: '#ccc', borderRadius: 5, textAlign: 'center', fontSize: 18,color: '#333'
  },
  checkboxContainer: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  checked: { marginRight: 5 },
  termsText: { fontSize: 12, color: '#333333' },
  linkText: { textDecorationLine: 'underline', color: '#000000', fontWeight: 'bold' },
  button: { backgroundColor: '#00796B', borderRadius: 10, paddingVertical: 15, alignItems: 'center' },
  buttonDisabled: { backgroundColor: '#B0BEC5' },
  buttonText: { color: '#FFFFFF', fontSize: 16, fontWeight: 'bold' },
  resendText: { marginTop: 10, textAlign: 'center', color: '#999' },
});

export default LoginScreen;
