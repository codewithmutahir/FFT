// AuthProvider.js
import React, { createContext, useState, useEffect } from "react";
import {
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut
} from "firebase/auth";
import { auth } from "../firebase";
import AsyncStorage from "@react-native-async-storage/async-storage";

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [initializing, setInitializing] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (usr) => {
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
    createUserWithEmailAndPassword(auth, email, password);

  const login = (email, password) =>
    signInWithEmailAndPassword(auth, email, password);

  const logout = async () => {
    await signOut(auth);
    await AsyncStorage.removeItem("user"); // Ensure local data is cleared
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{ user, initializing, register, login, logout }}
    >
      {children}
    </AuthContext.Provider>
  );
};
