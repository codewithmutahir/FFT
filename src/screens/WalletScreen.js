import { useState, useEffect, useContext, useCallback } from "react";
import { useFocusEffect } from '@react-navigation/native';
import {
  View,
  Text,
  TextInput,
  Button,
  FlatList,
  StyleSheet,
  Image,
  TouchableOpacity,
  Linking,
  Alert,
  ActivityIndicator,
} from "react-native";
import firestore from "@react-native-firebase/firestore";
import Ionicons from "react-native-vector-icons/Ionicons";
import * as ImagePicker from "expo-image-picker";
import axios from "axios";
import { AuthContext } from "../AuthProvider";
import {
  EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME,
  EXPO_PUBLIC_CLOUDINARY_UPLOAD_PRESET,
} from "@env";
import { typography } from "../../theme/typography";

export default function WalletScreen({ navigation }) {
  const { user } = useContext(AuthContext);
  const [activeSection, setActiveSection] = useState(null);
  const [depositAmount, setDepositAmount] = useState("");
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [accountType, setAccountType] = useState("");
  const [accountName, setAccountName] = useState("");
  const [proof, setProof] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [error, setError] = useState("");
  const [isFocused, setIsFocused] = useState(false);
  const [userCoins, setUserCoins] = useState(0); // Keep for withdrawal validation
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Deposit account details
  const DEPOSIT_ACCOUNT = {
    number: "03282217923",
    name: "Muther Hussain",
    type: "EasyPaisa"
  };

  // Debug log to check if update received
  console.log("🔥 Wallet Screen Loaded - Version Check:", {
    hasAccountFields: typeof setAccountNumber === 'function',
    accountNumberState: accountNumber,
    timestamp: new Date().toISOString(),
    updateReceived: "NEW_WITHDRAWAL_FIELDS_LOADED"
  });

  // Cloudinary configuration
  const CLOUDINARY_UPLOAD_URL = `https://api.cloudinary.com/v1_1/${EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME}/image/upload`;

  const AUTH_ADMIN_ID = "e1N3TDFz2fd7VF4Ynfct3RnUDBC3";

  // Fetch user coins for withdrawal validation
  useFocusEffect(
    useCallback(() => {
      if (!user) {
        console.log("No user logged in, skipping coins fetch");
        setUserCoins(0);
        return;
      }

      console.log("Setting up real-time listener for user coins:", user.uid);

      const unsubscribeCoins = firestore()
        .collection('users')
        .doc(user.uid)
        .onSnapshot(
          (docSnapshot) => {
            console.log("Snapshot data:", docSnapshot.data());
            if (docSnapshot.exists) {
              const userData = docSnapshot.data();
              const coins = userData.coins || 0;
              console.log("User coins updated:", coins);
              setUserCoins(coins);
            } else {
              console.log("User document not found");
              setUserCoins(0);
            }
          },
          (error) => {
            console.error("Error fetching user coins:", error);
            setError("Failed to load coin balance: " + error.message);
          }
        );

      return () => {
        console.log("Cleaning up coins listener");
        unsubscribeCoins();
      };
    }, [user])
  );

  useEffect(() => {
    if (!user) {
      console.log("No user logged in, skipping transaction listener");
      return;
    }

    let transactionsQuery;
    const isAdmin = user.uid === AUTH_ADMIN_ID;

    if (isAdmin) {
      transactionsQuery = firestore()
        .collection('transactions')
        .where('status', 'in', ['pending', 'approved', 'rejected']);
      console.log(
        "Admin query: Looking for all transactions (pending, approved, rejected)"
      );
    } else {
      transactionsQuery = firestore()
        .collection('transactions')
        .where('userId', '==', user.uid)
        .where('status', 'in', ['approved', 'rejected', 'failed']);
      console.log("User query: Looking for user's non-pending transactions");
    }

    const subscriber = transactionsQuery.onSnapshot(
      async (snapshot) => {
        console.log("Firestore snapshot received:", {
          docCount: snapshot.size,
          isAdmin: isAdmin,
          query: isAdmin
            ? "all transactions (pending, approved, rejected)"
            : "user's approved/rejected/failed",
        });

        const userPromises = snapshot.docs.map(async (docSnapshot) => {
          const data = { id: docSnapshot.id, ...docSnapshot.data() };
          if (data.userId) {
            try {
              const userDoc = await firestore()
                .collection('users')
                .doc(data.userId)
                .get();
              
              if (userDoc.exists) {
                const userData = userDoc.data();
                return {
                  ...data,
                  inGameName: userData.inGameName || "Unknown",
                  inGameUID: userData.inGameUID || "Unknown",
                };
              } else {
                console.log(
                  `User document not found for userId: ${data.userId}`
                );
                return {
                  ...data,
                  inGameName: "Unknown User",
                  inGameUID: "Unknown",
                };
              }
            } catch (userError) {
              console.error(
                `Error fetching user data for ${data.userId}:`,
                userError
              );
              return {
                ...data,
                inGameName: "Error Loading",
                inGameUID: "Error",
              };
            }
          }
          return data;
        });

        const userTransactions = await Promise.all(userPromises);
        console.log("Final transactions to display:", userTransactions);
        setTransactions(
          userTransactions.sort(
            (a, b) =>
              b.timestamp.toDate().getTime() - a.timestamp.toDate().getTime()
          )
        );
      },
      (error) => {
        console.error("Firestore listener error:", error.message);
        setError("Failed to load transactions: " + error.message);
      }
    );

    return () => {
      console.log("Cleaning up Firestore listener");
      subscriber();
    };
  }, [user]);

  // Pick image for deposit proof
  const pickImage = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 1,
    });
    if (!result.canceled) {
      setProof(result.assets[0].uri);
    }
  };

  // Copy account number to clipboard
  const copyAccountNumber = () => {
    Alert.alert(
      "Account Number",
      DEPOSIT_ACCOUNT.number,
      [
        { text: "OK" }
      ]
    );
  };

  // Handle deposit with Cloudinary upload
  const handleDeposit = async () => {
    if (!depositAmount || isNaN(depositAmount) || Number(depositAmount) <= 0) {
      setError("Please enter a valid amount");
      return;
    }
    if (!proof) {
      setError("Please upload payment proof");
      return;
    }

    setIsSubmitting(true);
    try {
      const formData = new FormData();
      formData.append("file", {
        uri: proof,
        type: "image/jpeg",
        name: `proof_${Date.now()}.jpg`,
      });
      formData.append("upload_preset", EXPO_PUBLIC_CLOUDINARY_UPLOAD_PRESET);

      const response = await axios.post(CLOUDINARY_UPLOAD_URL, formData, {
        headers: { "Content-Type": "multipart/form-data" },
        timeout: 10000,
      });

      console.log("Cloudinary Upload Response:", response.data);

      const proofUrl = response.data.secure_url;

      const transactionData = {
        userId: user.uid,
        type: "deposit",
        amount: Number(depositAmount),
        proof: proofUrl,
        status: "pending",
        timestamp: firestore.Timestamp.now(),
      };

      console.log("Creating transaction document:", transactionData);

      await firestore()
        .collection("transactions")
        .add(transactionData);

      setDepositAmount("");
      setProof(null);
      setError("");
      setActiveSection(null);
      alert("Deposit request submitted. Awaiting admin approval.");
    } catch (error) {
      const errorMessage =
        error.response?.data?.error?.message || error.message;
      console.error("Deposit Error:", errorMessage);
      setError("Failed to submit deposit: " + errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle withdraw
  const handleWithdraw = async () => {
    if (
      !withdrawAmount ||
      isNaN(withdrawAmount) ||
      Number(withdrawAmount) < 500
    ) {
      setError("Minimum withdrawal is 500 coins");
      return;
    }

    if (!accountNumber.trim()) {
      setError("Please enter your account number");
      return;
    }

    if (!accountType.trim()) {
      setError("Please enter account type (EasyPaisa/JazzCash)");
      return;
    }

    if (!accountName.trim()) {
      setError("Please enter account holder name");
      return;
    }

    if (userCoins < Number(withdrawAmount)) {
      setError(`You don't have enough coins. Current balance: ${userCoins} coins`);
      return;
    }

    setIsSubmitting(true);
    try {
      const transactionData = {
        userId: user.uid,
        type: "withdraw",
        amount: Number(withdrawAmount),
        accountNumber: accountNumber.trim(),
        accountType: accountType.trim(),
        accountName: accountName.trim(),
        proof: null,
        status: "pending",
        timestamp: firestore.Timestamp.now(),
      };

      console.log("Creating withdrawal transaction:", transactionData);

      await firestore()
        .collection("transactions")
        .add(transactionData);

      setWithdrawAmount("");
      setAccountNumber("");
      setAccountType("");
      setAccountName("");
      setError("");
      setActiveSection(null);
      alert("Withdrawal request submitted. Awaiting admin approval.");
    } catch (error) {
      console.error("Withdrawal error:", error);
      setError("Failed to submit withdrawal: " + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Admin approve transaction
  const handleApproveTransaction = async (transaction) => {
    try {
      console.log("Approving transaction:", transaction.id);

      await firestore()
        .collection("transactions")
        .doc(transaction.id)
        .update({ status: "approved" });

      if (transaction.type === "deposit") {
        await firestore()
          .collection("users")
          .doc(transaction.userId)
          .update({
            coins: firestore.FieldValue.increment(transaction.amount)
          });
        
        console.log(
          `Approved deposit ${transaction.id}, added ${transaction.amount} coins to user ${transaction.userId}`
        );
      } else if (transaction.type === "withdraw") {
        await firestore()
          .collection("users")
          .doc(transaction.userId)
          .update({
            coins: firestore.FieldValue.increment(-transaction.amount)
          });
        
        console.log(`Approved withdrawal ${transaction.id}, deducted ${transaction.amount} coins from user ${transaction.userId}`);
      }

      alert(
        `Approved ${transaction.type} of ${transaction.amount} coins for ${transaction.inGameName}`
      );
    } catch (error) {
      console.error("Error approving transaction:", error.message);
      setError("Failed to approve transaction: " + error.message);
    }
  };

  // Admin reject transaction
  const handleRejectTransaction = async (transaction) => {
    try {
      console.log("Rejecting transaction:", transaction.id);

      await firestore()
        .collection("transactions")
        .doc(transaction.id)
        .update({ status: "rejected" });

      console.log(
        `Rejected transaction ${transaction.id} for ${transaction.inGameName}`
      );
      alert(
        `Rejected ${transaction.type} request for ${transaction.inGameName}`
      );
    } catch (error) {
      console.error("Error rejecting transaction:", error.message);
      setError("Failed to reject transaction: " + error.message);
    }
  };

  // Debug function to show all transactions (for admin)
  const showAllTransactions = async () => {
    if (user?.uid === AUTH_ADMIN_ID) {
      try {
        const snapshot = await firestore()
          .collection("transactions")
          .get();
        
        console.log("ALL TRANSACTIONS IN DATABASE:");
        snapshot.docs.forEach((doc) => {
          console.log(doc.id, doc.data());
        });
      } catch (error) {
        console.error("Error fetching all transactions:", error);
      }
    }
  };

  // Render transaction history item
  const renderTransaction = ({ item }) => (
    <View style={styles.transactionCard}>
      <Text style={styles.transactionText}>
        {item.type.charAt(0).toUpperCase() + item.type.slice(1)}: {item.amount}{" "}
        Coins
      </Text>
      <Text style={styles.transactionText}>
        User: {item.inGameName} (UID: {item.inGameUID})
      </Text>
      
      {item.type === "withdraw" && (
        <>
          {item.accountNumber && (
            <Text style={styles.transactionText}>
              Account: {item.accountNumber}
            </Text>
          )}
          {item.accountType && (
            <Text style={styles.transactionText}>
              Type: {item.accountType}
            </Text>
          )}
          {item.accountName && (
            <Text style={styles.transactionText}>
              Name: {item.accountName}
            </Text>
          )}
        </>
      )}
      
      <Text
        style={[
          styles.transactionText,
          {
            color:
              item.status === "approved"
                ? "#00ff00"
                : item.status === "rejected"
                ? "#ff0000"
                : item.status === "failed"
                ? "#ff4500"
                : "#ffaa00",
          },
        ]}
      >
        Status: {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
      </Text>
      <Text style={styles.transactionText}>
        Date:{" "}
        {item.timestamp
          .toDate()
          .toLocaleString("en-PK", { timeZone: "Asia/Karachi" })}
      </Text>
      {item.proof && (
        <TouchableOpacity onPress={() => Linking.openURL(item.proof)}>
          <Image source={{ uri: item.proof }} style={styles.proofImage} />
        </TouchableOpacity>
      )}

      {item.adminNote && (
        <Text style={styles.transactionText}>Note: {item.adminNote}</Text>
      )}
      {user && user.uid === AUTH_ADMIN_ID && item.status === "pending" && (
        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={[styles.approveButton, styles.button]}
            onPress={() => handleApproveTransaction(item)}
          >
            <Text style={styles.approveButtonText}>Approve</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.rejectButton, styles.button]}
            onPress={() => handleRejectTransaction(item)}
          >
            <Text style={styles.rejectButtonText}>Reject</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
      </View>

      {activeSection === null ? (
        <View style={styles.cardContainer}>
          <TouchableOpacity
            style={styles.card}
            onPress={() => setActiveSection("deposit")}
          >
            <Ionicons
              name="cash-outline"
              size={50}
              color="#08CB00"
              style={styles.cardIcon}
            ></Ionicons>
            <Text style={[styles.cardTitle, typography.headerTitle]}>
              Deposit
            </Text>
            <Text style={styles.cardSubtitle}>Add funds to your wallet</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.card}
            onPress={() => setActiveSection("withdraw")}
          >
            <Ionicons
              name="card-outline"
              size={50}
              color="#33A1E0"
              style={styles.cardIcon}
            ></Ionicons>
            <Text style={[styles.cardTitle, typography.headerTitle]}>
              Withdraw
            </Text>
            <Text style={styles.cardSubtitle}>Request a withdrawal</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.card}
            onPress={() => setActiveSection("history")}
          >
            <Ionicons
              name="cash-outline"
              size={50}
              color="#E43636"
              style={styles.cardIcon}
            ></Ionicons>
            <Text style={[styles.cardTitle, typography.headerTitle]}>
              Transactions
            </Text>
            <Text style={styles.cardSubtitle}>
              View your transaction history
            </Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          {activeSection === "deposit" && (
            <View style={styles.section}>
              <Text
                style={[
                  styles.sectionTitle,
                  typography.headerTitle,
                  { paddingBottom: 10 },
                ]}
              >
                Deposit Funds
              </Text>

              <View style={styles.accountInfoCard}>
                <Text style={styles.accountInfoTitle}>
                  <Ionicons name="information-circle" size={20} color="#ff4500" />
                  {" "}Deposit To This Account
                </Text>
                
                <View style={styles.accountInfoRow}>
                  <Text style={styles.accountInfoLabel}>Account Type:</Text>
                  <Text style={styles.accountInfoValue}>{DEPOSIT_ACCOUNT.type}</Text>
                </View>
                
                <View style={styles.accountInfoRow}>
                  <Text style={styles.accountInfoLabel}>Account Number:</Text>
                  <TouchableOpacity onPress={copyAccountNumber} style={styles.accountNumberContainer}>
                    <Text style={styles.accountInfoValue}>{DEPOSIT_ACCOUNT.number}</Text>
                    <Ionicons name="copy-outline" size={16} color="#ff4500" style={{ marginLeft: 8 }} />
                  </TouchableOpacity>
                </View>
                
                <View style={styles.accountInfoRow}>
                  <Text style={styles.accountInfoLabel}>Account Name:</Text>
                  <Text style={styles.accountInfoValue}>{DEPOSIT_ACCOUNT.name}</Text>
                </View>

                <Text style={styles.instructionText}>
                  💡 Send money to the above account, then upload payment proof below
                </Text>
              </View>

              <TextInput
                placeholder="Enter amount"
                placeholderTextColor={"#6c6c6cff"}
                value={depositAmount}
                onChangeText={setDepositAmount}
                keyboardType="numeric"
                style={[styles.input, isFocused && { borderColor: "#ff4500" }]}
                onFocus={() => setIsFocused(true)}
                onBlur={() => setIsFocused(false)}
              />
              <TouchableOpacity
                style={[
                  typography.button,
                  {
                    marginBottom: 10,
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "center",
                  },
                  isSubmitting && { opacity: 0.6 },
                ]}
                onPress={pickImage}
                disabled={isSubmitting}
              >
                <Ionicons
                  name="image-outline"
                  size={20}
                  color="white"
                  style={{ marginRight: 8 }}
                />
                <Text style={typography.buttonText}>Pick Payment Proof</Text>
              </TouchableOpacity>

              {proof && (
                <Image source={{ uri: proof }} style={styles.proofImage} />
              )}

              {error ? <Text style={styles.error}>{error}</Text> : null}

              <TouchableOpacity
                style={[typography.button, isSubmitting && { opacity: 0.6 }]}
                onPress={handleDeposit}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={typography.buttonText}>Submit Deposit</Text>
                )}
              </TouchableOpacity>
            </View>
          )}

          {activeSection === "withdraw" && (
            <View style={styles.section}>
              <Text
                style={[
                  styles.sectionTitle,
                  typography.headerTitle,
                  { paddingBottom: 10 },
                ]}
              >
                Withdraw Funds
              </Text>

              <TextInput
                placeholder="Enter amount (min 500 coins)"
                placeholderTextColor={"#6c6c6cff"}
                value={withdrawAmount}
                onChangeText={setWithdrawAmount}
                keyboardType="numeric"
                style={[styles.input, isFocused && { borderColor: "#ff4500" }]}
                onFocus={() => setIsFocused(true)}
                onBlur={() => setIsFocused(false)}
              />
              
              <TextInput
                placeholder="Account Number (03xxxxxxxxx)"
                placeholderTextColor={"#6c6c6cff"}
                value={accountNumber}
                onChangeText={setAccountNumber}
                keyboardType="phone-pad"
                style={[styles.input, isFocused && { borderColor: "#ff4500" }]}
                onFocus={() => setIsFocused(true)}
                onBlur={() => setIsFocused(false)}
              />

              <TextInput
                placeholder="Account Type (EasyPaisa/JazzCash)"
                placeholderTextColor={"#6c6c6cff"}
                value={accountType}
                onChangeText={setAccountType}
                style={[styles.input, isFocused && { borderColor: "#ff4500" }]}
                onFocus={() => setIsFocused(true)}
                onBlur={() => setIsFocused(false)}
              />

              <TextInput
                placeholder="Account Holder Name"
                placeholderTextColor={"#6c6c6cff"}
                value={accountName}
                onChangeText={setAccountName}
                style={[styles.input, isFocused && { borderColor: "#ff4500" }]}
                onFocus={() => setIsFocused(true)}
                onBlur={() => setIsFocused(false)}
              />

              {error ? <Text style={styles.error}>{error}</Text> : null}
              <TouchableOpacity
                style={[typography.button, isSubmitting && { opacity: 0.6 }]}
                onPress={handleWithdraw}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={typography.buttonText}>Submit Withdrawal</Text>
                )}
              </TouchableOpacity>
            </View>
          )}

          {activeSection === "history" && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>
                Transaction History
                {user?.uid === AUTH_ADMIN_ID &&
                  " (Admin View - All Transactions)"}
              </Text>
              <Text style={styles.debugText}>
                Found {transactions.length} transactions
                {user?.uid === AUTH_ADMIN_ID &&
                  " (Pending, Approved, Rejected)"}
              </Text>
              
              {user?.uid === AUTH_ADMIN_ID && (
                <TouchableOpacity
                  style={styles.debugButton}
                  onPress={showAllTransactions}
                >
                  <Text style={styles.debugButtonText}>Debug: Show All Transactions</Text>
                </TouchableOpacity>
              )}

              <FlatList
                data={transactions}
                renderItem={renderTransaction}
                keyExtractor={(item) => item.id}
                extraData={transactions}
                ListEmptyComponent={
                  <View>
                    <Text style={styles.transactionText}>
                      No transactions found
                    </Text>
                    {user?.uid === AUTH_ADMIN_ID && (
                      <Text style={styles.debugText}>
                        Admin: Looking for transactions with status = "pending",
                        "approved", or "rejected"
                      </Text>
                    )}
                  </View>
                }
              />
            </View>
          )}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 10, backgroundColor: "#1a1a1a" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    padding: 15,
    paddingTop: 20,
  },
  backButton: {
    padding: 10,
  },
  backButtonText: {
    color: "#ff4500",
    fontSize: 16,
    fontWeight: "bold",
  },
  balanceContainer: {
    paddingHorizontal: 15,
    paddingBottom: 20,
  },
  balanceCard: {
    backgroundColor: "#2a2a2a",
    borderRadius: 12,
    padding: 20,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#ff4500",
    elevation: 4,
  },
  balanceTextContainer: {
    marginLeft: 15,
    flex: 1,
  },
  balanceLabel: {
    color: "#ccc",
    fontSize: 14,
    fontWeight: "500",
  },
  balanceAmount: {
    color: "#ff4500",
    fontSize: 24,
    fontWeight: "bold",
    marginTop: 2,
  },
  balanceInfo: {
    backgroundColor: "#2a2a2a",
    borderRadius: 8,
    padding: 12,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: "#ff4500",
  },
  balanceInfoText: {
    color: "#ff4500",
    fontSize: 16,
    fontWeight: "bold",
    textAlign: "center",
  },
  cardContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
  card: {
    backgroundColor: "#2a2a2a",
    padding: 20,
    borderRadius: 12,
    marginBottom: 15,
    width: "80%",
    alignItems: "center",
    elevation: 4,
    borderWidth: 1,
    borderColor: "#ff4400a3",
  },
  cardIcon: {
    marginBottom: 10,
  },
  cardTitle: {
    color: "#ff4500",
    fontSize: 20,
    marginBottom: 5,
  },
  cardSubtitle: { color: "#fff", fontSize: 14 },
  section: { flex: 1, padding: 10 },
  sectionTitle: {
    color: "#fff",
    fontSize: 20,
    marginBottom: 10,
  },
  accountInfoCard: {
    backgroundColor: "#2a2a2a",
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#ff4500",
  },
  accountInfoTitle: {
    color: "#ff4500",
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 12,
    textAlign: "center",
  },
  accountInfoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
    paddingVertical: 4,
  },
  accountInfoLabel: {
    color: "#ccc",
    fontSize: 14,
    fontWeight: "500",
  },
  accountInfoValue: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
  accountNumberContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  instructionText: {
    color: "#ffaa00",
    fontSize: 12,
    textAlign: "center",
    marginTop: 8,
    fontStyle: "italic",
  },
  input: {
    borderWidth: 1,
    borderColor: "#fff",
    color: "#fff",
    padding: 18,
    borderRadius: 8,
    marginBottom: 10,
    fontSize: 16,
  },
  proofImage: { 
    width: 100, 
    height: 100, 
    marginVertical: 10, 
    borderRadius: 4 
  },
  error: {
    color: "red",
    marginBottom: 10,
    fontFamily: "WorkSans-Regular",
    fontSize: 16,
  },
  transactionCard: {
    backgroundColor: "#2a2a2a",
    padding: 10,
    borderRadius: 8,
    marginBottom: 10,
    elevation: 2,
  },
  transactionText: { 
    color: "#fff", 
    marginBottom: 5 
  },
  debugText: { 
    color: "#ffaa00", 
    marginBottom: 5, 
    fontSize: 12 
  },
  debugButton: {
    backgroundColor: "#0066cc",
    padding: 8,
    borderRadius: 4,
    marginBottom: 10,
    alignItems: "center",
  },
  debugButtonText: { 
    color: "#fff", 
    fontSize: 12 
  },
  buttonContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 5,
  },
  button: {
    padding: 8,
    borderRadius: 4,
    alignItems: "center",
    flex: 1,
  },
  approveButton: {
    backgroundColor: "#00ff00",
    marginRight: 5,
  },
  rejectButton: {
    backgroundColor: "#ff0000",
    marginLeft: 5,
  },
  approveButtonText: { 
    color: "#fff", 
    fontWeight: "bold" 
  },
  rejectButtonText: { 
    color: "#fff", 
    fontWeight: "bold" 
  },
});