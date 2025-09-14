import React, { useEffect, useState, useCallback, useMemo } from "react";
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
  TextInput,
  Alert,
} from "react-native";
import firestore from "@react-native-firebase/firestore";
import { typography } from "../../theme/typography";
import ShimmerPlaceHolder from "react-native-shimmer-placeholder";
import Ionicons from "react-native-vector-icons/Ionicons";

// Image component with fallback
const ImageWithFallback = ({ uri, style, onLoadStart, onLoad, onError, ...props }) => {
  const [imageError, setImageError] = useState(false);
  const [loading, setLoading] = useState(true);
  
  if (imageError) {
    return (
      <View style={[style, styles.imageFallback]}>
        <Ionicons name="image-outline" size={48} color="#666" />
        <Text style={styles.fallbackText}>Image unavailable</Text>
      </View>
    );
  }
  
  return (
    <View style={[style, { position: 'relative' }]}>
      {loading && (
        <View style={styles.imageLoader}>
          <ActivityIndicator color="#ff4500" size="small" />
        </View>
      )}
      <Image 
        source={{ uri }}
        style={style}
        onLoadStart={() => {
          setLoading(true);
          onLoadStart?.();
        }}
        onLoad={() => {
          setLoading(false);
          onLoad?.();
        }}
        onError={() => {
          setLoading(false);
          setImageError(true);
          onError?.();
        }}
        {...props}
      />
    </View>
  );
};

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

const EmptyState = ({ onRefresh, hasSearchQuery }) => (
  <View style={styles.emptyContainer}>
    <Ionicons 
      name={hasSearchQuery ? "search-outline" : "game-controller"} 
      size={64} 
      color="#666" 
    />
    <Text style={styles.emptyTitle}>
      {hasSearchQuery ? "No Results Found" : "No Tournaments Yet"}
    </Text>
    <Text style={styles.emptySubtext}>
      {hasSearchQuery 
        ? "Try adjusting your search terms"
        : "Check back soon for exciting gaming tournaments!"
      }
    </Text>
    {!hasSearchQuery && (
      <TouchableOpacity 
        style={styles.refreshButton}
        onPress={onRefresh}
      >
        <Text style={styles.refreshText}>Refresh</Text>
      </TouchableOpacity>
    )}
  </View>
);

export default function TournamentCategories({ navigation }) {
  const [categories, setCategories] = useState([]);
  const [activeTournaments, setActiveTournaments] = useState({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [imageAspectRatios, setImageAspectRatios] = useState({});
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);

  // Memoized filtered categories
  const filteredCategories = useMemo(() => {
    if (!searchQuery.trim()) return categories;
    const query = searchQuery.toLowerCase().trim();
    return categories.filter(category => 
      category.name.toLowerCase().includes(query) ||
      category.description.toLowerCase().includes(query)
    );
  }, [categories, searchQuery]);

  // Optimized image aspect ratio calculation
  const getImageAspectRatio = useCallback((imageUrl, itemId) => {
    // Skip if already calculated
    if (imageAspectRatios[itemId]) return;
    
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
        console.log('Error getting image size for', itemId, ':', error);
        // Fallback to default aspect ratio
        setImageAspectRatios(prev => ({
          ...prev,
          [itemId]: 16/9
        }));
      }
    );
  }, [imageAspectRatios]);

  // Refresh functionality
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    // The real-time listeners will automatically update the data
    // Just add a small delay to show the refresh animation
    setTimeout(() => {
      setRefreshing(false);
    }, 1000);
  }, []);

  // Force refresh data (useful for retry scenarios)
  const forceRefresh = useCallback(() => {
    setLoading(true);
    setImageAspectRatios({});
    // The listeners will re-fetch data
  }, []);

  useEffect(() => {
    let mounted = true;

    // Fetch tournament categories with real-time listener
    const unsubCategories = firestore()
      .collection("tournament-categories")
      .onSnapshot(
        (snapshot) => {
          if (!mounted) return;
          
          try {
            const categoryList = snapshot.docs.map((doc) => ({
              id: doc.id,
              ...doc.data(),
            }));
            
            // Get aspect ratios for new images only
            categoryList.forEach(category => {
              if (category.imageUrl && !imageAspectRatios[category.id]) {
                getImageAspectRatio(category.imageUrl, category.id);
              }
            });
            
            setCategories(categoryList);
            if (loading) setLoading(false);
          } catch (error) {
            console.error("Error processing categories:", error);
            if (loading) setLoading(false);
          }
        },
        (error) => {
          console.error("Error fetching categories:", error);
          if (mounted) {
            setLoading(false);
            Alert.alert(
              "Connection Error", 
              "Unable to load tournaments. Please check your internet connection.",
              [{ text: "Retry", onPress: forceRefresh }]
            );
          }
        }
      );

    // Fetch active tournaments with real-time listener
    const unsubTournaments = firestore()
      .collection("active-tournaments")
      .where("isActive", "==", true)
      .onSnapshot(
        (snapshot) => {
          if (!mounted) return;
          
          try {
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
          } catch (error) {
            console.error("Error processing tournaments:", error);
          }
        },
        (error) => {
          console.error("Error fetching tournaments:", error);
        }
      );

    return () => {
      mounted = false;
      unsubCategories?.();
      unsubTournaments?.();
    };
  }, [getImageAspectRatio, loading, forceRefresh, imageAspectRatios]);

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
        <ImageWithFallback 
          uri={item.imageUrl}
          style={[
            styles.categoryImage, 
            { height: imageHeight }
          ]}
          resizeMode="cover"
        />
        
        <View style={styles.categoryContent}>
          <Text style={[typography.h1, styles.categoryTitle]} numberOfLines={2}>
            {item.name}
          </Text>
          <Text style={styles.categoryDescription} numberOfLines={3}>
            {item.description}
          </Text>

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
            accessible={true}
            accessibilityLabel={`Explore ${item.name} tournaments`}
            accessibilityHint={hasActiveTournaments 
              ? `${activeTournamentsCount} tournaments available` 
              : "Currently no tournaments available"
            }
            accessibilityRole="button"
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

  const SearchHeader = () => (
    <View style={styles.searchContainer}>
      <View style={styles.searchHeader}>
        <Text style={[styles.screenTitle, typography.h1]}>Tournament Categories</Text>
        <TouchableOpacity
          style={styles.searchToggle}
          onPress={() => {
            setShowSearch(!showSearch);
            if (showSearch) {
              setSearchQuery('');
            }
          }}
        >
          <Ionicons 
            name={showSearch ? "close" : "search"} 
            size={24} 
            color="#ff4500" 
          />
        </TouchableOpacity>
      </View>
      
      {showSearch && (
        <View style={styles.searchInputContainer}>
          <Ionicons name="search" size={20} color="#888" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search tournaments..."
            placeholderTextColor="#888"
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoFocus={true}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity
              style={styles.clearSearch}
              onPress={() => setSearchQuery('')}
            >
              <Ionicons name="close-circle" size={20} color="#888" />
            </TouchableOpacity>
          )}
        </View>
      )}
    </View>
  );

  return (
    <View style={styles.container}>
      <SearchHeader />
      
      <FlatList
        data={loading ? [] : filteredCategories}
        renderItem={renderCategory}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContainer}
        ListEmptyComponent={
          loading ? (
            renderSkeletonLoaders()
          ) : (
            <EmptyState 
              onRefresh={forceRefresh} 
              hasSearchQuery={!!searchQuery.trim()}
            />
          )
        }
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#ff4500"
            colors={["#ff4500"]}
          />
        }
        showsVerticalScrollIndicator={false}
        removeClippedSubviews={true}
        maxToRenderPerBatch={5}
        updateCellsBatchingPeriod={100}
        windowSize={10}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#1a1a1a",
  },
  searchContainer: {
    backgroundColor: "#2a2a2a",
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#ff450033",
  },
  searchHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  screenTitle: {
    color: "#ff4500",
    fontSize: 20,
  },
  searchToggle: {
    padding: 5,
  },
  searchInputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1a1a1a",
    borderRadius: 10,
    marginTop: 10,
    paddingHorizontal: 12,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    color: "#fff",
    fontSize: 16,
    paddingVertical: 12,
  },
  clearSearch: {
    padding: 5,
  },
  listContainer: {
    padding: 15,
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
    resizeMode: "cover",
  },
  imageLoader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.3)',
    zIndex: 1,
  },
  imageFallback: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#333',
  },
  fallbackText: {
    color: '#888',
    fontSize: 12,
    marginTop: 8,
  },
  categoryContent: {
    padding: 20,
  },
  categoryTitle: {
    marginBottom: 8,
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
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
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
  // Empty state styles
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 50,
  },
  emptyTitle: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "bold",
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtext: {
    color: "#888",
    fontSize: 16,
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 20,
  },
  refreshButton: {
    backgroundColor: "#ff4500",
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  refreshText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
});