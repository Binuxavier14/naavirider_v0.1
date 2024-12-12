import { gql } from "@apollo/client";

export const getBoat = gql`
  query getBoat($input: boatinput!) {
    getBoat(input: $input) {
      PK
      SK
      boatType
      boatNumber
      boatCapacity
      boatOwner
      state
      zoneName
      river
      zoneID
      boatName
      cityName
      driverKey
    }
  }
`;
export const getUserInfo = gql`
  query getUserInfo($input: userinput!) {
    getUserInfo(input: $input) {
     PK
     SK
     riderfirstname
     riderlastname
     status
     createdBy
     userType
    }
  }
`;
export const getUserDetails = gql`
  query getUserDetails($input: userinput!) {
    getUserDetails(input: $input) {
     
     driverFirstName
     driverLastName
     
    }
  }
`;
export const getTripsByUser = gql`
  query getTripsByUser($input: tripinput!) {
    getTripsByUser(input: $input) {
     
tripType
numberofriders
boatType
timeSlot
tripday
tripdate
rstatus
zoneID
tripBookingType
PK
SK
trippk
tripsk
tripamountinfo
zonename
driverphonenumber
    }
  }
`;
export const getTripUser = gql`
  query getTripUser($input: tripinput!) {
    getTripUser(input: $input) {
     
tripType
numberofriders
boatType
timeSlot
tripday
tripdate
rstatus
zoneID   
PK
SK
tripBookingType   
createdOn
tripamountinfo
    }
  }
`;
export const getPaymentOrderId = gql`
  query getPaymentOrderId($input: tripinput!) {
    getPaymentOrderId(input: $input) {
     orderID
    }
  }
`;

export const getZonesList = gql`
  query getZonesList($input: tripinput!) {
    getZonesList(input: $input) {
     
zonename
zonenumber
zoneID
PK
SK
    }
  }
`;

export const getPaymentTrip = gql`
  query getPaymentTrip($input: tripinput!) {
    getPaymentTrip(input: $input) {
     
    otp
     
    }
  }
`;

export const addUser = gql`
  mutation addUser($input: userinput!) {
    addUser(input: $input) {
      responsestatus
      responsemessage
    }
  }
`;
export const riderRequestTrip = gql`
  mutation riderRequestTrip($input: tripinput!) {
    riderRequestTrip(input: $input) {
      responsestatus
      PK
      SK
      boatType
      zoneID
    }
  }
`;
export const  cancelRiderRequestedTrip = gql`
  mutation cancelRiderRequestedTrip($input: tripinput!) {
    cancelRiderRequestedTrip(input: $input) {
      responsestatus
      zoneID
      boatType
    }
  }
`;

export const ACCEPTED_TRIP_SUBSCRIPTION = gql`
  subscription acceptedTrip {
    acceptedTrip {
      responsestatus
     
    }
  }
`;

export const getBoatTypes = gql`
  query getBoatTypes($input: boatinput!) {
    getBoatTypes(input: $input) {
      PK
    SK
    marginpercent
    triptype_cross
    triptype_full
    triptype_half
    }
  }
`;
export const getBoatTypePrice = gql`
  query getBoatTypePrice($input: tripinput!) {
    getBoatTypePrice(input: $input) {
      PK
    SK
    triptype_cross
     triptype_full
     triptype_half
     triptype_full_with_margin
     triptype_half_with_margin
     triptype_cross_with_margin
     triptype_full_with_margin_gst
     triptype_half_with_margin_gst
     triptype_cross_with_margin_gst
     triptype_full_partial
     triptype_half_partial
     triptype_cross_partial
     triptype_full_partial_gst
     triptype_half_partial_gst
     triptype_cross_partial_gst
    }
  }
`;