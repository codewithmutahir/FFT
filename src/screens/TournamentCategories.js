import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  Animated,
} from "react-native";
import firestore from "@react-native-firebase/firestore";
import { typography } from "../../theme/typography";
import ShimmerPlaceHolder from "react-native-shimmer-placeholder";

const SkeletonLoader = () => {
  return (
    <View style={styles.skeletonCard}>
      <ShimmerPlaceHolder style={styles.skeletonImage} />
      <View style={styles.skeletonContent}>
        <ShimmerPlaceHolder style={styles.skeletonTitle} />
        <ShimmerPlaceHolder style={styles.skeletonDescription} />
        <ShimmerPlaceHolder style={styles.skeletonStatus} />
      </View>
    </View>
  );
};

export default function TournamentCategories({ navigation }) {
  const [categories, setCategories] = useState([]);
  const [activeTournaments, setActiveTournaments] = useState({});
  const [loading, setLoading] = useState(true);
  const [imageAspectRatios, setImageAspectRatios] = useState({});

  // Function to get image dimensions and calculate aspect ratio
  const getImageAspectRatio = (imageUrl, itemId) => {
    Image.getSize(
      imageUrl,
      (width, height) => {
        const aspectRatio = width / height;
        setImageAspectRatios(prev => ({
          ...prev,
          [itemId]: aspectRatio
        }));
      },
      (error) => {
        console.log('Error getting image size:', error);
        // Fallback to default aspect ratio
        setImageAspectRatios(prev => ({
          ...prev,
          [itemId]: 16/9 // Default 16:9 aspect ratio
        }));
      }
    );
  };

  useEffect(() => {
    // Fetch tournament categories with real-time listener
    const unsubCategories = firestore()
      .collection("tournament-categories")
      .onSnapshot(
        (snapshot) => {
          const categoryList = snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
          }));
          
          // Get aspect ratios for all images
          categoryList.forEach(category => {
            if (category.imageUrl) {
              getImageAspectRatio(category.imageUrl, category.id);
            }
          });
          
          setCategories(categoryList);
        },
        (error) => {
          console.error("Error fetching categories:", error);
          setLoading(false);
        }
      );

    // Fetch active tournaments with real-time listener
    const unsubTournaments = firestore()
      .collection("active-tournaments")
      .where("isActive", "==", true)
      .onSnapshot(
        (snapshot) => {
          const tournaments = snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
          }));

          const grouped = tournaments.reduce((acc, tournament) => {
            const categoryId = tournament.categoryId;
            if (!acc[categoryId]) acc[categoryId] = [];
            acc[categoryId].push(tournament);
            return acc;
          }, {});

          setActiveTournaments(grouped);
          setLoading(false);
        },
        (error) => {
          console.error("Error fetching tournaments:", error);
          setLoading(false);
        }
      );

    return () => {
      unsubCategories();
      unsubTournaments();
    };
  }, []);

  const handleCategoryPress = (item) => {
    const activeTournamentsCount = activeTournaments[item.id]?.length || 0;
    const hasActiveTournaments = activeTournamentsCount > 0;

    if (hasActiveTournaments) {
      navigation.navigate("TournamentList", {
        categoryId: item.id,
        categoryName: item.name,
        tournaments: activeTournaments[item.id],
      });
    }
  };

  const renderCategory = ({ item }) => {
    const activeTournamentsCount = activeTournaments[item.id]?.length || 0;
    const hasActiveTournaments = activeTournamentsCount > 0;
    
    // Calculate dynamic height based on aspect ratio, with min/max constraints
    const aspectRatio = imageAspectRatios[item.id] || 16/9;
    const baseWidth = 350; // Approximate card width
    let imageHeight = baseWidth / aspectRatio;
    
    // Constrain height between 150 and 220 pixels
    imageHeight = Math.max(150, Math.min(220, imageHeight));

    return (
      <View
        style={[
          styles.categoryCard,
          !hasActiveTournaments && styles.inactiveCard,
        ]}
      >
        <Image 
          source={{ uri: item.imageUrl }} 
          style={[
            styles.categoryImage, 
            { height: imageHeight }
          ]}
          resizeMode="cover" // This ensures the image covers the area without distortion
        />
        <View style={styles.categoryContent}>
          <Text style={[typography.h1]}>{item.name}</Text>
          <Text style={styles.categoryDescription}>{item.description}</Text>

          <View style={styles.statusContainer}>
            {hasActiveTournaments ? (
              <>
                <View style={styles.activeIndicator} />
                <Text style={styles.activeText}>
                  {activeTournamentsCount} Active Tournament
                  {activeTournamentsCount > 1 ? "s" : ""}
                </Text>
              </>
            ) : (
              <>
                <View style={styles.inactiveIndicator} />
                <Text style={styles.inactiveText}>No Active Tournaments</Text>
              </>
            )}
          </View>

          <TouchableOpacity
            style={[
              styles.exploreButton,
              !hasActiveTournaments && styles.disabledButton,
            ]}
            onPress={() => handleCategoryPress(item)}
            disabled={!hasActiveTournaments}
          >
            <Text
              style={[
                styles.exploreButtonText,
                !hasActiveTournaments && styles.disabledButtonText,
                typography.buttonText
              ]}
            >
              {hasActiveTournaments
                ? "EXPLORE TOURNAMENTS"
                : "CURRENTLY UNAVAILABLE"}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderSkeletonLoaders = () => (
    <View>
      {[...Array(3)].map((_, index) => (
        <SkeletonLoader key={index} />
      ))}
    </View>
  );

  return (
    <FlatList
      data={loading ? [] : categories}
      renderItem={renderCategory}
      keyExtractor={(item) => item.id}
      contentContainerStyle={styles.container}
      ListEmptyComponent={
        loading ? (
          renderSkeletonLoaders()
        ) : (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>
              No tournament categories available
            </Text>
          </View>
        )
      }
      showsVerticalScrollIndicator={false}
    />
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 15,
    backgroundColor: "#1a1a1a",
  },
  categoryCard: {
    backgroundColor: "#2a2a2a",
    borderRadius: 16,
    marginBottom: 20,
    elevation: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    overflow: "hidden",
  },
  inactiveCard: {
    opacity: 0.7,
    backgroundColor: "#1f1f1f",
  },
  categoryImage: {
    width: "100%",
    // Height is now dynamic, set in renderCategory
    resizeMode: "cover",
  },
  categoryContent: {
    padding: 20,
  },
  categoryDescription: {
    color: "#cccccc",
    fontSize: 16,
    lineHeight: 22,
    marginBottom: 15,
  },
  statusContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 15,
  },
  activeIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#00ff88",
    marginRight: 8,
  },
  inactiveIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#888",
    marginRight: 8,
  },
  activeText: {
    color: "#00ff88",
    fontSize: 14,
    fontWeight: "600",
  },
  inactiveText: {
    color: "#888",
    fontSize: 14,
    fontWeight: "600",
  },
  exploreButton: {
    backgroundColor: "#ff4500",
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 10,
    alignItems: "center",
  },
  disabledButton: {
    backgroundColor: "#444",
  },
  exploreButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
    letterSpacing: 0.5,
  },
  disabledButtonText: {
    color: "#888",
  },
  // Skeleton styles
  skeletonCard: {
    backgroundColor: "#2a2a2a",
    borderRadius: 16,
    marginBottom: 20,
    overflow: "hidden",
  },
  skeletonImage: {
    width: "100%",
    height: 180,
  },
  skeletonContent: {
    padding: 20,
  },
  skeletonTitle: {
    width: "70%",
    height: 24,
    borderRadius: 4,
    marginBottom: 8,
  },
  skeletonDescription: {
    width: "90%",
    height: 16,
    borderRadius: 4,
    marginBottom: 15,
  },
  skeletonStatus: {
    width: "50%",
    height: 40,
    borderRadius: 10,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 50,
  },
  emptyText: {
    color: "#888",
    fontSize: 18,
    textAlign: "center",
  },
});