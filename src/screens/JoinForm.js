import React, { useState } from "react";
import { View, Text, TextInput, Button, StyleSheet, Alert } from "react-native";

export default function JoinForm({ route }) {
  const { tournamentId } = route.params;
  const [playerName, setPlayerName] = useState("");
  const [gameId, setGameId] = useState("");

  const handleJoin = () => {
    if (!playerName || !gameId) {
      Alert.alert("Error", "Please fill in all fields");
      return;
    }
    Alert.alert(
      "Success",
      `You have joined tournament #${tournamentId} as ${playerName}`
    );
    setPlayerName("");
    setGameId("");
  };

  return (
    <View style={styles.container}>
      <Text style={styles.heading}>Join Tournament #{tournamentId}</Text>

      <TextInput
        style={styles.input}
        placeholder="Player Name"
        value={playerName}
        onChangeText={setPlayerName}
      />
      <TextInput
        style={styles.input}
        placeholder="Game ID"
        value={gameId}
        onChangeText={setGameId}
      />

      <Button title="Join Now" onPress={handleJoin} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20 },
  heading: { fontSize: 20, fontWeight: "bold", marginBottom: 20 },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    padding: 10,
    marginBottom: 15,
  },
});
