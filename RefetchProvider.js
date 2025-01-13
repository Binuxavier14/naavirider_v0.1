import React, { createContext, useContext, useState } from 'react';

const RefetchContext = createContext(null);

export const RefetchProvider = ({ children }) => {
  const [refetchFunction, setRefetchFunction] = useState(null);

  return (
    <RefetchContext.Provider value={{ refetchFunction, setRefetchFunction }}>
      {children}
    </RefetchContext.Provider>
  );
};

export function useRefetch() {
  const context = useContext(RefetchContext);
  if (!context) {
    return { refetchFunction: null }; // Provide a default value
  }
  return context;
}