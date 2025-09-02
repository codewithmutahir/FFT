// AuthProvider.js
import React, { createContext, useState, useEffect } from "react";
import auth from "@react-native-firebase/auth";
import AsyncStorage from "@react-native-async-storage/async-storage";

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [initializing, setInitializing] = useState(true);

  useEffect(() => {
    const unsubscribe = auth().onAuthStateChanged(async (usr) => {
      try {
        if (usr) {
          const userData = { uid: usr.uid, email: usr.email };
          setUser(userData);
          await AsyncStorage.setItem("user", JSON.stringify(userData));
        } else {
          setUser(null);
          await AsyncStorage.removeItem("user");
        }
      } catch (error) {
        console.error("Auth state error:", error);
      } finally {
        setInitializing(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const register = (email, password) =>
    auth().createUserWithEmailAndPassword(email, password);

  const login = (email, password) =>
    auth().signInWithEmailAndPassword(email, password);

  const logout = async () => {
    try {
      await auth().signOut();
      await AsyncStorage.removeItem("user"); // Ensure local data is cleared
      setUser(null);
    } catch (error) {
      console.error("Logout error:", error);
      throw error;
    }
  };

  return (
    <AuthContext.Provider
      value={{ user, initializing, register, login, logout }}
    >
      {children}
    </AuthContext.Provider>
  );
};