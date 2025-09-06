// AuthProvider.js
import React, { createContext, useState, useEffect } from "react";
import auth from "@react-native-firebase/auth";
import firestore from "@react-native-firebase/firestore";
import AsyncStorage from "@react-native-async-storage/async-storage";

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [initializing, setInitializing] = useState(true);
  const [coins, setCoins] = useState(0); // 🔹 coins state add kiya

  useEffect(() => {
    const unsubscribe = auth().onAuthStateChanged(async (usr) => {
      try {
        if (usr) {
          const userData = { uid: usr.uid, email: usr.email };
          setUser(userData);
          await AsyncStorage.setItem("user", JSON.stringify(userData));

          // 🔹 Firestore coins listener lagao
          const unsubscribeCoins = firestore()
            .collection("users")
            .doc(usr.uid)
            .onSnapshot((doc) => {
              if (doc.exists) {
                setCoins(doc.data().coins || 0);
              } else {
                setCoins(0);
              }
            });

          // cleanup for coins listener
          return () => unsubscribeCoins();
        } else {
          setUser(null);
          setCoins(0); // logout pe reset
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
      await AsyncStorage.removeItem("user");
      setUser(null);
      setCoins(0); // logout ke sath coins clear
    } catch (error) {
      console.error("Logout error:", error);
      throw error;
    }
  };

  return (
    <AuthContext.Provider
      value={{ user, coins, setCoins, initializing, register, login, logout }}
    >
      {children}
    </AuthContext.Provider>
  );
};
