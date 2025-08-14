import React from "react";
import { View, Text, Image, StyleSheet } from "react-native";

export default function AuthHeader({ title }) {
  return (
    <View style={styles.container}>
      <Image
        source={require("../../assets/logo.png")} // apni image ka path
        style={styles.logo}
        resizeMode="contain"
      />
      <Text style={styles.title}>{title}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    marginBottom: 30,
  },
  logo: {
    width: 100,
    height: 100,
    marginBottom: 10,
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    color: "#333",
  },
});
