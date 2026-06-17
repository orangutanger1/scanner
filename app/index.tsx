import { Image } from 'expo-image';
import { router, Stack } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Dimensions,
  FlatList,
  Keyboard,
  LayoutAnimation,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  UIManager,
  View,
} from 'react-native';
import { FileText, Plus, Search, Trash2, X, LayoutGrid, List as ListIcon } from 'lucide-react-native';
import { Swipeable } from 'react-native-gesture-handler';
import { useDocuments } from '../contexts/DocumentContext';
import type { ScannedDocument } from '../types/document';

const { width } = Dimensions.get('window');
const EXPANDED_SEARCH_BAR_WIDTH = Math.min(width - 140, 320);
const GRID_COLUMNS = 3;
const GRID_GAP = 12;
const GRID_ITEM_WIDTH = (width - 32 - GRID_GAP * (GRID_COLUMNS - 1)) / GRID_COLUMNS;

export default function HomeScreen() {
  const { documents, isLoading, deleteDocument } = useDocuments();
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchActive, setIsSearchActive] = useState(false);
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [isNavigating, setIsNavigating] = useState(false);
  const searchInputRef = useRef<TextInput | null>(null);
  const trimmedQuery = searchQuery.trim();

  useEffect(() => {
    if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
      UIManager.setLayoutAnimationEnabledExperimental(true);
    }
  }, []);

  useEffect(() => {
    if (isSearchActive) {
      searchInputRef.current?.focus();
    }
  }, [isSearchActive]);

  const sortedDocuments = useMemo(() => {
    const query = trimmedQuery.toLowerCase();
    return documents
      .filter((document) => !query || document.title.toLowerCase().includes(query))
      .sort((a, b) => b.createdAt - a.createdAt);
  }, [documents, trimmedQuery]);

  const showBaseEmpty = !isLoading && documents.length === 0 && trimmedQuery.length === 0;
  const showSearchEmpty = !isLoading && trimmedQuery.length > 0 && sortedDocuments.length === 0;

  const animateSearchToggle = useCallback(() => {
    if (Platform.OS === 'web') {
      return;
    }
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
  }, []);

  const handleNewScan = useCallback(() => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    router.push('/camera');
  }, []);

  const handleActivateSearch = useCallback(() => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    animateSearchToggle();
    setIsSearchActive(true);
  }, [animateSearchToggle]);

  const handleCancelSearch = useCallback(() => {
    if (Platform.OS !== 'web') {
      Haptics.selectionAsync();
    }
    animateSearchToggle();
    setIsSearchActive(false);
    setSearchQuery('');
    Keyboard.dismiss();
  }, [animateSearchToggle]);

  const handleClearQuery = useCallback(() => {
    setSearchQuery('');
  }, []);

  const handleToggleViewMode = useCallback(() => {
    if (Platform.OS !== 'web') {
      Haptics.selectionAsync();
    }
    setViewMode((prev) => (prev === 'list' ? 'grid' : 'list'));
  }, []);

  const handleDocumentPress = useCallback((doc: ScannedDocument) => {
    if (isNavigating) return; // Prevent double navigation
    
    if (Platform.OS !== 'web') {
      Haptics.selectionAsync();
    }
    
    setIsNavigating(true);
    router.push({
      pathname: '/document',
      params: { documentId: doc.id },
    });
    
    // Reset the flag after navigation completes
    setTimeout(() => {
      setIsNavigating(false);
    }, 500);
  }, [isNavigating]);

  const handleDeleteDocument = useCallback((docId: string) => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    deleteDocument(docId);
  }, [deleteDocument]);

  const renderDocument = useCallback(({ item, index }: { item: ScannedDocument; index: number }) => {
    const created = new Date(item.createdAt);
    const createdLabel = created.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
    const createdTime = created.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
    });
    const isoDate = created.toISOString().slice(0, 10);
    const previewUri = item.thumbnail ?? item.pages[0]?.uri;
    const scanLabel = `${item.pages.length} ${item.pages.length === 1 ? 'scan' : 'scans'}`;
    const metadataLine = `${createdLabel} • ${createdTime} • ${scanLabel}`;
  const gridMetadataLine = `${isoDate} ${createdTime}`;

    if (viewMode === 'grid') {
      const gridItemStyles = [
        styles.gridItem,
        ((index + 1) % GRID_COLUMNS !== 0 ? styles.gridItemSpacing : undefined),
      ];

      return (
        <TouchableOpacity
          style={gridItemStyles}
          onPress={() => handleDocumentPress(item)}
          activeOpacity={0.7}
        >
          <View style={styles.gridPreviewContainer}>
            {previewUri ? (
              <Image
                source={{ uri: previewUri }}
                style={styles.gridPreviewImage}
                contentFit="cover"
              />
            ) : (
              <View style={styles.gridPlaceholder}>
                <FileText size={32} color="#CCCCCC" strokeWidth={1.5} />
              </View>
            )}
            <View style={styles.gridPageCountBadge}>
              <Text style={styles.gridPageCountText}>{item.pages.length}</Text>
            </View>
          </View>
          <View style={styles.gridInfo}>
            <Text style={styles.gridTitle} numberOfLines={2}>
              {item.title}
            </Text>
            <Text style={styles.gridMetadata} numberOfLines={2}>
              {gridMetadataLine}
            </Text>
          </View>
        </TouchableOpacity>
      );
    }

    return (
      <Swipeable
        overshootRight={false}
        renderRightActions={() => (
          <TouchableOpacity
            style={styles.deleteAction}
            onPress={() => handleDeleteDocument(item.id)}
          >
            <Trash2 size={20} color="#FFFFFF" strokeWidth={2.5} />
            <Text style={styles.deleteActionText}>Remove</Text>
          </TouchableOpacity>
        )}
      >
        <TouchableOpacity
          style={styles.documentRow}
          onPress={() => handleDocumentPress(item)}
        >
          <View style={styles.previewContainer}>
            {previewUri ? (
              <Image
                source={{ uri: previewUri }}
                style={styles.previewImage}
                contentFit="cover"
              />
            ) : (
              <View style={styles.placeholderThumbnail}>
                <FileText size={24} color="#CCCCCC" strokeWidth={1.5} />
              </View>
            )}
            <View style={styles.previewBadge}>
              <Text style={styles.previewBadgeText}>{item.pages.length}</Text>
            </View>
          </View>
          <View style={styles.documentInfo}>
            <Text style={styles.documentTitle} numberOfLines={1}>
              {item.title}
            </Text>
            <Text style={styles.metaLine} numberOfLines={1}>
              {metadataLine}
            </Text>
          </View>
        </TouchableOpacity>
      </Swipeable>
    );
  }, [handleDeleteDocument, handleDocumentPress, viewMode]);

  const renderSearchEmpty = useCallback(() => {
    if (!showSearchEmpty) {
      return null;
    }

    return (
      <View style={styles.emptySearchContainer}>
        <Search size={56} color="#CCCCCC" strokeWidth={1.5} />
        <Text style={styles.emptyTitle}>No matches</Text>
        <Text style={styles.emptyText}>
          {`We couldn't find any documents for "${trimmedQuery}".`}
        </Text>
      </View>
    );
  }, [showSearchEmpty, trimmedQuery]);

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          title: 'My Scans',
          headerLargeTitle: true,
          headerLeft: () => (
            <View style={[styles.headerLeftContainer, isSearchActive && styles.headerLeftExpanded]}>
              {isSearchActive ? (
                <>
                  <View
                    style={[styles.searchBar, { width: EXPANDED_SEARCH_BAR_WIDTH }]}
                    accessible
                    accessibilityRole="search"
                    accessibilityLabel="Search documents"
                  >
                    <Search size={18} color="#8E8E93" strokeWidth={2} />
                    <TextInput
                      ref={searchInputRef}
                      style={styles.searchInput}
                      placeholder="Search documents"
                      placeholderTextColor="#8E8E93"
                      value={searchQuery}
                      onChangeText={setSearchQuery}
                      returnKeyType="search"
                      autoCorrect={false}
                      autoCapitalize="none"
                    />
                    {searchQuery.length > 0 && (
                      <TouchableOpacity
                        onPress={handleClearQuery}
                        style={styles.clearButton}
                        accessibilityRole="button"
                        accessibilityLabel="Clear search"
                      >
                        <X size={16} color="#8E8E93" strokeWidth={2.5} />
                      </TouchableOpacity>
                    )}
                  </View>
                  <TouchableOpacity
                    style={styles.cancelButton}
                    onPress={handleCancelSearch}
                    accessibilityRole="button"
                    accessibilityLabel="Cancel search"
                  >
                    <Text style={styles.cancelButtonText}>Cancel</Text>
                  </TouchableOpacity>
                </>
              ) : (
                <TouchableOpacity
                  style={styles.searchButton}
                  onPress={handleActivateSearch}
                  accessibilityRole="button"
                  accessibilityLabel="Search documents"
                >
                  <Search size={24} color="#007AFF" strokeWidth={2.5} />
                </TouchableOpacity>
              )}
            </View>
          ),
          headerRight: () => (
            <TouchableOpacity
              onPress={handleToggleViewMode}
              style={styles.viewToggle}
              accessibilityRole="button"
              accessibilityLabel={viewMode === 'list' ? 'Switch to grid view' : 'Switch to list view'}
              accessibilityHint="Toggles between compact list and grid layouts"
            >
              {viewMode === 'list' ? (
                <LayoutGrid size={24} color="#007AFF" strokeWidth={2} />
              ) : (
                <ListIcon size={24} color="#007AFF" strokeWidth={2} />
              )}
            </TouchableOpacity>
          ),
        }}
      />

      {showBaseEmpty ? (
        <View style={styles.emptyFixedWrapper}>
          <View style={styles.emptyContainer}>
            <FileText size={64} color="#CCCCCC" strokeWidth={1.5} />
            <Text style={styles.emptyTitle}>No documents yet</Text>
            <Text style={styles.emptyText}>
              Tap the + button to scan your first document
            </Text>
          </View>
        </View>
      ) : (
        <FlatList
          key={viewMode}
          data={sortedDocuments}
          renderItem={renderDocument}
          keyExtractor={(item) => item.id}
          numColumns={viewMode === 'grid' ? GRID_COLUMNS : 1}
          columnWrapperStyle={viewMode === 'grid' ? styles.gridColumnWrapper : undefined}
          contentContainerStyle={[
            styles.list,
            !isLoading && sortedDocuments.length === 0 && styles.listEmpty,
          ]}
          contentInsetAdjustmentBehavior="automatic"
          ListHeaderComponent={
            sortedDocuments.length > 0 ? <View style={styles.listHeaderSpacer} /> : null
          }
          ListEmptyComponent={renderSearchEmpty}
          showsVerticalScrollIndicator={false}
        />
      )}

      <View style={styles.fabContainer}>
        <TouchableOpacity
          style={styles.fab}
          onPress={handleNewScan}
        >
          <Plus size={28} color="#FFFFFF" strokeWidth={2.5} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  searchButton: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: -8,
  },
  headerLeftContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    maxWidth: width - 32,
    flexShrink: 1,
  },
  headerLeftExpanded: {
    paddingRight: 48,
  },
  searchBar: {
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  searchInput: {
    flex: 1,
    marginHorizontal: 8,
    paddingVertical: 0,
    fontSize: 15,
    color: '#000000',
  },
  clearButton: {
    padding: 4,
  },
  cancelButton: {
    marginLeft: 12,
  },
  cancelButtonText: {
    fontSize: 16,
    color: '#007AFF',
  },
  viewToggle: {
    padding: 8,
    marginRight: -8,
  },
  list: {
    paddingHorizontal: 16,
    paddingBottom: 100,
    gap: 12,
  },
  listEmpty: {
    flex: 1,
  },
  listHeaderSpacer: {
    height: 12,
  },
  gridColumnWrapper: {
    justifyContent: 'flex-start',
  },
  deleteAction: {
    width: 80,
    marginVertical: 0,
    borderRadius: 12,
    backgroundColor: '#FF3B30',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  deleteActionText: {
    marginTop: 4,
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  documentRow: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 10,
    gap: 10,
    alignItems: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  previewContainer: {
    width: 48,
    height: 64,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#F2F2F7',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#E5E5EA',
    position: 'relative',
  },
  previewImage: {
    width: '100%',
    height: '100%',
  },
  placeholderThumbnail: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F2F2F7',
  },
  documentInfo: {
    flex: 1,
    justifyContent: 'center',
    gap: 2,
  },
  documentTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#000000',
    letterSpacing: -0.3,
  },
  metaLine: {
    fontSize: 12,
    color: '#6D6D72',
  },
  previewBadge: {
    position: 'absolute',
    right: 4,
    bottom: 4,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 6,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  previewBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  // Grid Styles
  gridItem: {
    width: GRID_ITEM_WIDTH,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 8,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
    marginBottom: GRID_GAP,
  },
  gridItemSpacing: {
    marginRight: GRID_GAP,
  },
  gridPreviewContainer: {
    width: '100%',
    aspectRatio: 0.65,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#F2F2F7',
    marginBottom: 8,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#E5E5EA',
  },
  gridPreviewImage: {
    width: '100%',
    height: '100%',
  },
  gridPlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gridPageCountBadge: {
    position: 'absolute',
    bottom: 6,
    right: 6,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  gridPageCountText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '600',
  },
  gridInfo: {
    gap: 2,
  },
  gridTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000000',
    letterSpacing: -0.2,
  },
  gridMetadata: {
    fontSize: 11,
    color: '#8E8E93',
    textAlign: 'center',
  },
  emptyFixedWrapper: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  emptySearchContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingHorizontal: 40,
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#000000',
    marginTop: 8,
  },
  emptyText: {
    fontSize: 16,
    color: '#666666',
    textAlign: 'center',
    lineHeight: 24,
  },
  fabContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 20,
    alignItems: 'center',
  },
  fab: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#007AFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
});
