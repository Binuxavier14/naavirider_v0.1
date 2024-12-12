import { ApolloClient, InMemoryCache, createHttpLink, ApolloLink } from '@apollo/client';
import AsyncStorage from '@react-native-async-storage/async-storage';

const httpLink = createHttpLink({
  uri: 'https://7w4zpgctonb7ldpcg4bam3jrbi.appsync-api.ap-southeast-1.amazonaws.com/graphql', // Replace with your GraphQL endpoint
});

const authLink = new ApolloLink(async (operation, forward) => {
  // const token = await AsyncStorage.getItem('authToken');
  const token = await AsyncStorage.getItem('idToken');
  console.log('toeknss',token)
  
  operation.setContext(({ headers = {} }) => ({
    headers: {
      ...headers,
      authorization: token ? `Bearer ${token}` : '',
    },
  }));

  return forward(operation);
});

const client = new ApolloClient({
  link: ApolloLink.from([authLink, httpLink]), 
  cache: new InMemoryCache(),
});

export default client;
