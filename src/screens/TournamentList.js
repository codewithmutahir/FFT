import React from "react";
import { View, Text, Button, StyleSheet } from "react-native";

export default function TournamentList({ navigation }) {
  return (
    <View style={styles.container}>
      <Text style={styles.heading}>Available Tournaments</Text>
      {/* Dummy tournament list */}
      <View style={styles.card}>
        <Text style={styles.tournamentName}>Free Fire Daily Match</Text>
        <Button
          title="Join"
          onPress={() => navigation.navigate("JoinForm", { tournamentId: 1 })}
        />
      </View>
      <View style={styles.card}>
        <Text style={styles.tournamentName}>Free Fire Paid Match</Text>
        <Button
          title="Join"
          onPress={() => navigation.navigate("JoinForm", { tournamentId: 2 })}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20 },
  heading: { fontSize: 22, fontWeight: "bold", marginBottom: 20 },
  card: {
    padding: 15,
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    marginBottom: 15,
  },
  tournamentName: { fontSize: 18, marginBottom: 10 },
});
