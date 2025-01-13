import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Image,
  KeyboardAvoidingView,
  ScrollView,
  Platform,
  Modal,
  Button,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import SmsRetriever from 'react-native-sms-retriever';
import Auth0 from 'react-native-auth0';
import Icon from 'react-native-vector-icons/AntDesign';
import { useNavigation } from '@react-navigation/native';

const auth0 = new Auth0({
  domain: 'dev-rmnczioodo05vbpz.us.auth0.com',
  clientId: 'M1Lo7rO1o2Sh7NNzqkhacQSECzSKlN0k',
});

const LoginScreen = () => {
  const [mobileNumber, setMobileNumber] = useState('');
  const [actualOtp, setActualOtp] = useState('');
  const [otp, setOtp] = useState(Array(6).fill(''));
  const [isOtpSent, setIsOtpSent] = useState(false);
  const [isChecked, setIsChecked] = useState(false);
  const [isTermsModalVisible, setIsTermsModalVisible] = useState(false);
  const [isPrivacyModalVisible, setIsPrivacyModalVisible] = useState(false);

  const navigation = useNavigation();
  const otpInputRefs = useRef(Array.from({ length: 6 }, () => useRef(null)));

  useEffect(() => {
    if (navigation.isReady) {
      sendOtp();
    }
  }, [navigation.isReady]);

  const handleTermsPress = () => {
    setIsTermsModalVisible(true); // Show the modal
  };

  const handleCloseModal = () => {
    setIsTermsModalVisible(false); // Hide the modal
    setIsPrivacyModalVisible(false); // Hide the modal

  };
  const handlePrivacyPress = () => {
    setIsPrivacyModalVisible(true); // Show the modal
  };

 
//console.log('isTermsModalVisible',isTermsModalVisible)
  const startSmsListener = async () => {
    try {
      const registered = await SmsRetriever.startSmsRetriever();
      if (registered) {
        SmsRetriever.addSmsListener((event) => {
          const message = event.message;
          const extractedOtp = message.match(/\d{6}/)?.[0]; // Extract 6-digit OTP
          if (extractedOtp) {
            const otpArray = extractedOtp.split(''); // Convert OTP string to array
            setOtp(otpArray); // Update the OTP state
            setActualOtp(extractedOtp);
  
            // Autofill all OTP inputs
            otpArray.forEach((digit, index) => {
              if (otpInputRefs.current[index] && otpInputRefs.current[index].current) {
                otpInputRefs.current[index].current.setNativeProps({ text: digit });
              }
            });
  
            // Optionally, remove the SMS listener after successful autofill
            SmsRetriever.removeSmsListener();
          }
        });
      }
    } catch (error) {
      console.error('Error starting SMS listener:', error);
    }
  };
  

  const sendOtp = async () => {
    try {
      const response = await fetch('https://dev-rmnczioodo05vbpz.us.auth0.com/passwordless/start', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          client_id: 'M1Lo7rO1o2Sh7NNzqkhacQSECzSKlN0k',
          client_secret: 'M0x4YjE68Rqyd7mW7A5AguyZeez7fwSd6Ba3N4ZuEz0xsPvZyEND0GegG3fJseeQ',
          connection: 'sms',
          phone_number: '+91' + mobileNumber,
          send: 'code',
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
      const response = await fetch('https://dev-rmnczioodo05vbpz.us.auth0.com/oauth/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          grant_type: 'http://auth0.com/oauth/grant-type/passwordless/otp',
          client_id: 'M1Lo7rO1o2Sh7NNzqkhacQSECzSKlN0k',
          client_secret: 'M0x4YjE68Rqyd7mW7A5AguyZeez7fwSd6Ba3N4ZuEz0xsPvZyEND0GegG3fJseeQ',
          otp: actualOtp,
          realm: 'sms',
          username: '+91' + mobileNumber,
          audience: 'https://aws.amazon.com/',
          scope: 'openid profile email',
        }),
      });

      const credentials = await response.json();
      if (credentials.error) {
        throw new Error(credentials.error_description || 'Failed to verify OTP');
      }

      if (credentials.access_token) {
        await AsyncStorage.setItem('authToken', credentials.access_token);
      }

      if (credentials.id_token) {
        await AsyncStorage.setItem('userInfo', JSON.stringify(credentials.id_token));
        await AsyncStorage.setItem('idToken', credentials.id_token);
        navigation.reset({
          index: 0,
          routes: [{ name: 'Onboarding' }],
        });
      }

      // Alert.alert('Login Successful', 'You have been authenticated.');
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
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View style={styles.topContent}>
          <Image source={require('../assets/images/two.png')} style={styles.logo} />
          <Text style={styles.header}>
            {!isOtpSent ? "Get started with\nNaavi!" : "We've sent an OTP on your number"}
          </Text>

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
              <Text style={styles.phoneNumberText}>
                OTP sent on <Text style={styles.phoneNumberText1}>+91{mobileNumber}</Text>
              </Text>
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
                <TouchableOpacity
                  style={styles.checked}
                  onPress={() => setIsChecked(!isChecked)}
                >
                  <Icon
                    name={isChecked ? 'checkcircle' : 'checkcircleo'}
                    size={20}
                    color="black"
                  />
                </TouchableOpacity>
                <Text style={styles.termsText}>
                  By continuing, you agree to our{' '}
                  <Text style={styles.linkText}  onPress={handleTermsPress}>Terms & Conditions</Text> and{' '}
                  <Text style={styles.linkText} onPress={handlePrivacyPress}>Privacy Policy</Text>
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
              <Text style={styles.resendText} onPress={sendOtp}>
                Resend OTP
              </Text>
            </>
          )}
        </View>

        <Modal
      visible={isTermsModalVisible}
      transparent={true}
      animationType="slide"
      onRequestClose={handleCloseModal} // Handles closing on back button (Android)
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle} >Terms & Conditions</Text>
          <ScrollView style={styles.modalBody}>
            <Text style={{fontSize:14,lineHeight:18,marginBottom:10,color:'#333'
}}>
            Last updated on Dec 18 2024

For the purpose of these Terms and Conditions, The term "we", "us", "our" used anywhere on this page shall mean SCUTU TECHNOLOGIES PRIVATE LIMITED, whose registered/operational office is 651, Kiran Arcade, 2nd Floor, 27th Main, 13th Cross, HSR Layout Bengaluru KARNATAKA 560102 . "you", “your”, "user", “visitor” shall mean any natural or legal person who is visiting our website and/or agreed to purchase from us.            </Text>

<Text style={styles.boldtext}>Your use of the website and/or purchase from us are governed by following Terms and Conditions:</Text>
            <View style={styles.bulletList}>
              <Text style={styles.bulletItem}>
                {'\u2022'} The content of the pages of this website is subject to change without notice.
              </Text>
              <Text style={styles.bulletItem}>
                {'\u2022'} Neither we nor any third parties provide any warranty or guarantee as to the accuracy, timeliness, performance, completeness or suitability of the information and materials found or offered on this website for any particular purpose. You acknowledge that such information and materials may contain inaccuracies or errors and we expressly exclude liability for any such inaccuracies or errors to the fullest extent permitted by law.
              </Text>
              <Text style={styles.bulletItem}>
                {'\u2022'} Your use of any information or materials on our website and/or product pages is entirely at your own risk, for which we shall not be liable. It shall be your own responsibility to ensure that any products, services or information available through our website and/or product pages meet your specific requirements.
              </Text>
              <Text style={styles.bulletItem}>
                {'\u2022'} Our website contains material which is owned by or licensed to us. This material includes, but are not limited to, the design, layout, look, appearance and graphics. Reproduction is prohibited other than in accordance with the copyright notice, which forms part of these terms and conditions.
              </Text>
              <Text style={styles.bulletItem}>
                {'\u2022'} All trademarks reproduced in our website which are not the property of, or licensed to, the operator are acknowledged on the website.
              </Text>
              <Text style={styles.bulletItem}>
                {'\u2022'} Unauthorized use of information provided by us shall give rise to a claim for damages and/or be a criminal offense.
              </Text>
              <Text style={styles.bulletItem}>
                {'\u2022'} From time to time our website may also include links to other websites. These links are provided for your convenience to provide further information.
              </Text>
              <Text style={styles.bulletItem}>
                {'\u2022'} You may not create a link to our website from another website or document without SCUTU TECHNOLOGIES PRIVATE LIMITED’s prior written consent.
              </Text>
              <Text style={styles.bulletItem}>
                {'\u2022'} Any dispute arising out of use of our website and/or purchase with us and/or any engagement with us is subject to the laws of India .
              </Text>
              <Text style={styles.bulletItem}>
                {'\u2022'} We, shall be under no liability whatsoever in respect of any loss or damage arising directly or indirectly out of the decline of authorization for any Transaction, on Account of the Cardholder having exceeded the preset limit mutually agreed by us with our acquiring bank from time to time
              </Text>
            </View>

          </ScrollView>
          <TouchableOpacity
                style={{backgroundColor:'#000000',borderRadius: 10,
                  paddingVertical: 10,
                  alignItems: 'center',}}
                onPress={handleCloseModal}
              >
                <Text style={styles.buttonText}>Close</Text>
              </TouchableOpacity>
          {/* <Button title="Close" onPress={handleCloseModal} style={{backgroundColor:'#000000'}} /> */}
        </View>
      </View>
    </Modal>

    <Modal
      visible={isPrivacyModalVisible}
      transparent={true}
      animationType="slide"
      onRequestClose={handleCloseModal} // Handles closing on back button (Android)
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle} >Privacy Policy</Text>
          <ScrollView style={styles.modalBody}>
            <Text style={{fontSize:14,lineHeight:18,marginBottom:10,color:'#333'}}>
            Last updated on Dec 18 2024

This privacy policy sets out how SCUTU TECHNOLOGIES PRIVATE LIMITED uses and protects any information that you give SCUTU TECHNOLOGIES PRIVATE LIMITED when you visit their website and/or agree to purchase from them.

SCUTU TECHNOLOGIES PRIVATE LIMITED is committed to ensuring that your privacy is protected. Should we ask you to provide certain information by which you can be identified when using this website, and then you can be assured that it will only be used in accordance with this privacy statement.

SCUTU TECHNOLOGIES PRIVATE LIMITED may change this policy from time to time by updating this page. You should check this page from time to time to ensure that you adhere to these changes.
            </Text>

<Text style={styles.boldtext}>We may collect the following information:</Text>
            <View style={styles.bulletList}>
              <Text style={styles.bulletItem}>
                {'\u2022'} Name
              </Text>
              <Text style={styles.bulletItem}>
                {'\u2022'}Contact information including email address
              </Text>
              <Text style={styles.bulletItem}>
                {'\u2022'}Demographic information such as postcode, preferences and interests, if required
              </Text>
              <Text style={styles.bulletItem}>
                {'\u2022'} Other information relevant to customer surveys and/or offers
              </Text>
             
            </View>

            <Text style={styles.boldtext}>What we do with the information we gather:</Text>
            <Text style={{fontSize:14,lineHeight:18,marginBottom:10,color:'#333'}}>We require this information to understand your needs and provide you with a better service, and in particular for the following reasons:</Text>
            <View style={styles.bulletList}>
              <Text style={styles.bulletItem}>
                {'\u2022'} Internal record keeping.
              </Text>
              <Text style={styles.bulletItem}>
                {'\u2022'}We may use the information to improve our products and services.
              </Text>
              <Text style={styles.bulletItem}>
                {'\u2022'}We may periodically send promotional emails about new products, special offers or other information which we think you may find interesting using the email address which you have provided.
              </Text>
              <Text style={styles.bulletItem}>
                {'\u2022'} From time to time, we may also use your information to contact you for market research purposes. We may contact you by email, phone, fax or mail. We may use the information to customise the website according to your interests.
              </Text>
              <Text style={{fontSize:14,lineHeight:18,marginBottom:10,color:'#333'}}>We are committed to ensuring that your information is secure. In order to prevent unauthorised access or disclosure we have put in suitable measures.</Text>

            </View>
            <Text style={styles.boldtext}>How we use cookies</Text>
            <Text style={{fontSize:14,lineHeight:18,marginBottom:10,color:'#333'}}>A cookie is a small file which asks permission to be placed on your computer's hard drive. Once you agree, the file is added and the cookie helps analyze web traffic or lets you know when you visit a particular site. Cookies allow web applications to respond to you as an individual. The web application can tailor its operations to your needs, likes and dislikes by gathering and remembering information about your preferences.

We use traffic log cookies to identify which pages are being used. This helps us analyze data about webpage traffic and improve our website in order to tailor it to customer needs. We only use this information for statistical analysis purposes and then the data is removed from the system.

Overall, cookies help us provide you with a better website, by enabling us to monitor which pages you find useful and which you do not. A cookie in no way gives us access to your computer or any information about you, other than the data you choose to share with us.

You can choose to accept or decline cookies. Most web browsers automatically accept cookies, but you can usually modify your browser setting to decline cookies if you prefer. This may prevent you from taking full advantage of the website.
</Text>

<Text style={styles.boldtext}>Controlling your personal information</Text>
            <Text style={{fontSize:14,lineHeight:18,marginBottom:10,color:'#333'}}>You may choose to restrict the collection or use of your personal information in the following ways:</Text>
            <View style={styles.bulletList}>
              <Text style={styles.bulletItem}>
                {'\u2022'}whenever you are asked to fill in a form on the website, look for the box that you can click to indicate that you do not want the information to be used by anybody for direct marketing purposes
              </Text>
              <Text style={styles.bulletItem}>
                {'\u2022'}if you have previously agreed to us using your personal information for direct marketing purposes, you may change your mind at any time by writing to or emailing us at rajesh.r@vbridgehub.com
              </Text>
             
              <Text style={{fontSize:14,lineHeight:18,marginBottom:10,color:'#333'}}>We will not sell, distribute or lease your personal information to third parties unless we have your permission or are required by law to do so. We may use your personal information to send you promotional information about third parties which we think you may find interesting if you tell us that you wish this to happen.

If you believe that any information we are holding on you is incorrect or incomplete, please write to 651, Kiran Arcade, 2nd Floor, 27th Main, 13th Cross, HSR Layout Bengaluru KARNATAKA 560102 . or contact us at 8317306882 or rajesh.r@vbridgehub.com as soon as possible. We will promptly correct any information found to be incorrect.</Text>

            </View>



          </ScrollView>
          <TouchableOpacity
                style={{backgroundColor:'#000000',borderRadius: 10,
                  paddingVertical: 10,
                  alignItems: 'center',}}
                onPress={handleCloseModal}
              >
                <Text style={styles.buttonText}>Close</Text>
              </TouchableOpacity>
          {/* <Button title="Close" onPress={handleCloseModal} style={{backgroundColor:'#000000'}} /> */}
        </View>
      </View>
    </Modal>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  scrollContainer: { flexGrow: 1, justifyContent: 'space-between', padding: 20 },
  topContent: { flex: 1, marginTop: 50 },
  bottomContent: { width: '100%', marginBottom: 20 },
  logo: { width: 100, height: 100, borderRadius: 50 },
  header: { fontSize: 34, fontWeight: 'bold', marginBottom: 20 ,color:'#333'},
  label: { fontSize: 16, color: '#333', marginBottom: 8, },
  phoneNumberText: { fontSize: 14, color: '#333333', marginBottom: 20 },
  phoneNumberText1: { fontSize: 14, color: '#333333', fontWeight: 'bold' },
  phoneInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 5,
    marginBottom: 20,
    paddingHorizontal: 10,
  },
  countryCode: { fontSize: 16, marginRight: 10, color: '#333333' },
  input: { flex: 1, height: 50, fontSize: 16, color: '#333333' },
  otpContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  otpInput: {
    width: 40,
    height: 50,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 5,
    textAlign: 'center',
    fontSize: 18,
    color: '#333',
  },
  checkboxContainer: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  checked: { marginRight: 5 },
  termsText: { fontSize: 12, color: '#333333' },
  linkText: { textDecorationLine: 'underline', color: '#000000', fontWeight: 'bold' },
  button: {
    backgroundColor: '#00796B',
    borderRadius: 10,
    paddingVertical: 15,
    alignItems: 'center',
  },
  buttonDisabled: { backgroundColor: '#B0BEC5' },
  buttonText: { color: '#FFFFFF', fontSize: 16, fontWeight: 'bold' },
  resendText: { marginTop: 10, textAlign: 'center', color: '#999' },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '90%',
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 20,
    elevation: 5,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
    color:'#333'

  },
  modalBody: {
    maxHeight: 300,
    marginBottom: 20,
  },
  bulletList: {
    marginTop: 5,
  },
  bulletItem: {
    fontSize: 14,
    marginBottom: 10,
    lineHeight: 15,
    color:'#333'
  },
  boldtext:{
    fontSize:16,
    fontWeight:'bold',
    color:'#333',
    marginBottom:10
  }
});

export default LoginScreen;
