import { ApolloClient, InMemoryCache, createHttpLink, ApolloLink } from '@apollo/client';
import AsyncStorage from '@react-native-async-storage/async-storage';
import jwtDecode from 'jwt-decode';

// GraphQL endpoint
const httpLink = createHttpLink({
  uri: 'https://7w4zpgctonb7ldpcg4bam3jrbi.appsync-api.ap-southeast-1.amazonaws.com/graphql', // Replace with your GraphQL endpoint
});

// Function to refresh the access token
const refreshAccessToken = async () => {
  try {
    const refreshToken = await AsyncStorage.getItem('refreshToken');
    if (!refreshToken) {
      throw new Error('No refresh token available');
    }

    const response = await fetch('https://dev-rmnczioodo05vbpz.us.auth0.com/oauth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: 'M1Lo7rO1o2Sh7NNzqkhacQSECzSKlN0k',
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
      }),
    });

    const result = await response.json();
    if (result.access_token) {
      // Store the new tokens
      await AsyncStorage.setItem('authToken', result.access_token);
      if (result.id_token) {
        await AsyncStorage.setItem('idToken', result.id_token);
      }
      return result.access_token;
    } else {
      throw new Error('Failed to refresh token');
    }
  } catch (error) {
    console.error('Error refreshing access token:', error);
    await AsyncStorage.clear(); // Clear session if refresh fails
    return null;
  }
};

// Apollo Link to handle authentication and token refresh
const authLink = new ApolloLink(async (operation, forward) => {
  let token = await AsyncStorage.getItem('idToken');
//console.log('toeknss',token)
  // Check if token is expired
  if (token) {
    const decoded = jwtDecode(token);
    const currentTime = Math.floor(Date.now() / 1000);
    if (decoded.exp < currentTime) {
      // Token expired, refresh it
      token = await refreshAccessToken();
    }
  }

  // Add the token to the headers
  operation.setContext(({ headers = {} }) => ({
    headers: {
      ...headers,
      authorization: token ? `Bearer ${token}` : '',
    },
  }));

  return forward(operation);
});

// Apollo Client instance
const client = new ApolloClient({
  link: ApolloLink.from([authLink, httpLink]),
  cache: new InMemoryCache(),
});

export default client;
