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
import { FileText, Plus, Search, Trash2, X } from 'lucide-react-native';
import { Swipeable } from 'react-native-gesture-handler';
import { useDocuments } from '../contexts/DocumentContext';
import type { ScannedDocument } from '../types/document';

const { width } = Dimensions.get('window');
const SEARCH_BAR_WIDTH = Math.min(width - 80, 320);

export default function HomeScreen() {
  const { documents, isLoading, deleteDocument } = useDocuments();
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchActive, setIsSearchActive] = useState(false);
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

  const filteredDocuments = useMemo(() => {
    if (!trimmedQuery) {
      return documents;
    }

    const query = trimmedQuery.toLowerCase();
    return documents.filter((document) =>
      document.title.toLowerCase().includes(query)
    );
  }, [documents, trimmedQuery]);

  const sortedDocuments = useMemo(() => {
    return [...filteredDocuments].sort((a, b) => b.createdAt - a.createdAt);
  }, [filteredDocuments]);

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

  const handleDocumentPress = useCallback((doc: ScannedDocument) => {
    if (Platform.OS !== 'web') {
      Haptics.selectionAsync();
    }
    router.push({
      pathname: '/document',
      params: { documentId: doc.id },
    });
  }, []);

  const handleDeleteDocument = useCallback((docId: string) => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    deleteDocument(docId);
  }, [deleteDocument]);

  const renderDocument = useCallback(({ item }: { item: ScannedDocument }) => {
    const created = new Date(item.createdAt);
    const createdLabel = created.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
    const timeLabel = created.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
    });
    const previewUri = item.thumbnail ?? item.pages[0]?.uri;

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
                <FileText size={32} color="#CCCCCC" strokeWidth={1.5} />
              </View>
            )}
          </View>
          <View style={styles.documentInfo}>
            <Text style={styles.documentTitle} numberOfLines={2}>
              {item.title}
            </Text>
            <View style={styles.metaRow}>
              <Text style={styles.metaPrimary}>{createdLabel}</Text>
              <View style={styles.metaDot} />
              <Text style={styles.metaSecondary}>{timeLabel}</Text>
            </View>
            <Text style={styles.metaSecondary}>
              {item.pages.length} {item.pages.length === 1 ? 'page' : 'pages'} • Last updated {new Date(item.updatedAt).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
              })}
            </Text>
          </View>
        </TouchableOpacity>
      </Swipeable>
    );
  }, [handleDeleteDocument, handleDocumentPress]);

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
            <View style={styles.headerLeftContainer}>
              {isSearchActive ? (
                <>
                  <View
                    style={[styles.searchBar, { width: SEARCH_BAR_WIDTH }]}
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
          data={sortedDocuments}
          renderItem={renderDocument}
          keyExtractor={(item) => item.id}
          contentContainerStyle={[
            styles.list,
            !isLoading && sortedDocuments.length === 0 && styles.listEmpty,
          ]}
          contentInsetAdjustmentBehavior="automatic"
          ListHeaderComponent={
            sortedDocuments.length > 0 ? <View style={styles.listHeaderSpacer} /> : null
          }
          ItemSeparatorComponent={() => <View style={styles.separator} />}
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
  list: {
    paddingHorizontal: 20,
    paddingBottom: 24,
    gap: 16,
  },
  listEmpty: {
    flex: 1,
  },
  listHeaderSpacer: {
    height: 12,
  },
  separator: {
    height: 16,
  },
  deleteAction: {
    width: 96,
    marginVertical: 4,
    borderRadius: 16,
    backgroundColor: '#FF3B30',
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteActionText: {
    marginTop: 4,
    fontSize: 13,
    fontWeight: '600',
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
  documentRow: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 12,
    gap: 12,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  previewContainer: {
    width: 96,
    height: 128,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#F0F0F0',
  },
  previewImage: {
    width: '100%',
    height: '100%',
  },
  placeholderThumbnail: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F0F0F0',
  },
  documentInfo: {
    flex: 1,
    justifyContent: 'center',
    gap: 8,
  },
  documentTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#000000',
    lineHeight: 22,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  metaPrimary: {
    fontSize: 14,
    color: '#0A0A0A',
    fontWeight: '600',
  },
  metaDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#C7C7CC',
  },
  metaSecondary: {
    fontSize: 14,
    color: '#6B6B6B',
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
