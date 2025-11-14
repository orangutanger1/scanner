import { Image } from 'expo-image';
import { router, Stack } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useCallback, useState } from 'react';
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  FlatList,
  Dimensions,
  Platform,
} from 'react-native';
import { FileText, Plus, Search } from 'lucide-react-native';
import { useDocuments } from '../contexts/DocumentContext';
import type { ScannedDocument } from '../types/document';

const { width } = Dimensions.get('window');
const ITEM_WIDTH = (width - 60) / 2;

export default function HomeScreen() {
  const { documents, isLoading } = useDocuments();
  const [searchQuery, setSearchQuery] = useState('');

  const handleNewScan = useCallback(() => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    router.push('/camera');
  }, []);

  const handleSearch = useCallback(() => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    console.log('Search pressed - implement search functionality');
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

  const renderDocument = useCallback(({ item }: { item: ScannedDocument }) => {
    const date = new Date(item.createdAt).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });

    return (
      <TouchableOpacity
        style={styles.documentItem}
        onPress={() => handleDocumentPress(item)}
      >
        <View style={styles.documentThumbnail}>
          {item.thumbnail ? (
            <Image
              source={{ uri: item.thumbnail }}
              style={styles.thumbnailImage}
              contentFit="cover"
            />
          ) : (
            <View style={styles.placeholderThumbnail}>
              <FileText size={40} color="#CCCCCC" strokeWidth={1.5} />
            </View>
          )}
        </View>
        <View style={styles.documentInfo}>
          <Text style={styles.documentTitle} numberOfLines={2}>
            {item.title}
          </Text>
          <Text style={styles.documentMeta}>
            {item.pages.length} {item.pages.length === 1 ? 'page' : 'pages'} • {date}
          </Text>
        </View>
      </TouchableOpacity>
    );
  }, [handleDocumentPress]);

  const renderEmpty = useCallback(() => (
    <View style={styles.emptyContainer}>
      <FileText size={64} color="#CCCCCC" strokeWidth={1.5} />
      <Text style={styles.emptyTitle}>No documents yet</Text>
      <Text style={styles.emptyText}>
        Tap the + button to scan your first document
      </Text>
    </View>
  ), []);

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          title: 'My Scans',
          headerLargeTitle: true,
          headerLeft: () => (
            <TouchableOpacity
              style={styles.searchButton}
              onPress={handleSearch}
            >
              <Search size={24} color="#007AFF" strokeWidth={2.5} />
            </TouchableOpacity>
          ),
        }}
      />

      <FlatList
        data={documents}
        renderItem={renderDocument}
        keyExtractor={(item) => item.id}
        numColumns={2}
        contentContainerStyle={[
          styles.list,
          documents.length === 0 && styles.listEmpty,
        ]}
        columnWrapperStyle={documents.length > 0 ? styles.row : undefined}
        ListEmptyComponent={!isLoading ? renderEmpty : null}
        showsVerticalScrollIndicator={false}
      />

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
  list: {
    padding: 20,
  },
  listEmpty: {
    flex: 1,
  },
  row: {
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  documentItem: {
    width: ITEM_WIDTH,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  documentThumbnail: {
    width: '100%',
    height: ITEM_WIDTH * 1.4,
    backgroundColor: '#F5F5F5',
  },
  thumbnailImage: {
    width: '100%',
    height: '100%',
  },
  placeholderThumbnail: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  documentInfo: {
    padding: 12,
    gap: 4,
  },
  documentTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#000000',
    lineHeight: 20,
  },
  documentMeta: {
    fontSize: 13,
    color: '#666666',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingHorizontal: 40,
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
