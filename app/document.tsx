import { Image } from 'expo-image';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import * as Haptics from 'expo-haptics';
import * as Sharing from 'expo-sharing';
import { useCallback, useState } from 'react';
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Platform,
  Alert,
  FlatList,
  useWindowDimensions,
  NativeScrollEvent,
  NativeSyntheticEvent,
} from 'react-native';
import { Trash2, Edit3, PlusSquare, Upload } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useDocuments } from '../contexts/DocumentContext';

export default function DocumentScreen() {
  const params = useLocalSearchParams<{ documentId: string }>();
  const { documents, deleteDocument, updateDocument, setBatchMode } = useDocuments();
  const [isDeleting, setIsDeleting] = useState(false);
  const [activePageIndex, setActivePageIndex] = useState(0);
  const insets = useSafeAreaInsets();
  const { width: windowWidth } = useWindowDimensions();
  const previewImageWidth = Math.max(windowWidth - 40, 260);
  const previewImageHeight = Math.min(previewImageWidth * 1.3, 520);
  const doc = documents.find((d) => d.id === params.documentId);

  const handlePreviewScroll = useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (!doc) return;

    const { contentOffset, layoutMeasurement } = event.nativeEvent;
    const pageWidth = layoutMeasurement?.width || windowWidth;
    if (!pageWidth) return;

    const fractionalIndex = contentOffset.x / pageWidth;
    const totalPages = doc.pages.length;
    const clampedIndex = Math.min(
      Math.max(Math.round(fractionalIndex), 0),
      Math.max(totalPages - 1, 0)
    );

    if (clampedIndex !== activePageIndex) {
      setActivePageIndex(clampedIndex);
    }
  }, [doc, windowWidth, activePageIndex]);

  const handleExport = useCallback(async () => {
    if (!doc) return;

    if (Platform.OS !== 'web') {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }

    try {
      const isAvailable = await Sharing.isAvailableAsync();
      if (isAvailable && doc.thumbnail) {
        await Sharing.shareAsync(doc.thumbnail, {
          mimeType: 'image/jpeg',
          dialogTitle: 'Share Document',
        });
      }
    } catch (error) {
      console.error('Error sharing:', error);
    }
  }, [doc]);

  const handleDelete = useCallback(() => {
    if (!doc || !params.documentId) return;

    if (Platform.OS === 'web') {
      const confirmed = window.confirm('Are you sure you want to delete this document?');
      if (confirmed) {
        setIsDeleting(true);
        deleteDocument(params.documentId);
        router.back();
      }
    } else {
      Alert.alert(
        'Delete Document',
        'Are you sure you want to delete this document?',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Delete',
            style: 'destructive',
            onPress: () => {
              setIsDeleting(true);
              deleteDocument(params.documentId);
              router.back();
            },
          },
        ]
      );
    }
  }, [doc, params.documentId, deleteDocument]);

  const handleEditTitle = useCallback(() => {
    if (!doc || !params.documentId) return;

    if (Platform.OS !== 'web') {
      Haptics.selectionAsync();
    }

    if (Platform.OS === 'web') {
      const newTitle = window.prompt('Enter new title:', doc.title);
      if (newTitle && newTitle !== doc.title) {
        updateDocument(params.documentId, { title: newTitle });
      }
    } else {
      Alert.prompt(
        'Rename Document',
        'Enter a new name for this document',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Save',
            onPress: (newTitle?: string) => {
              if (newTitle && newTitle !== doc.title) {
                updateDocument(params.documentId, { title: newTitle });
              }
            },
          },
        ],
        'plain-text',
        doc.title
      );
    }
  }, [doc, params.documentId, updateDocument]);

  const handleAddPage = useCallback(() => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    if (!doc) return;
    setBatchMode(true);
    router.push({
      pathname: '/camera',
      params: { appendTo: doc.id },
    });
  }, [doc, setBatchMode]);

  if (!doc) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>Document not found</Text>
      </View>
    );
  }

  const formattedDate = new Date(doc.createdAt).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  const exportDisabled = doc.pages.length === 0;

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          title: 'Document',
          headerRight: () => (
            <View style={styles.headerButtons}>
              <TouchableOpacity
                style={styles.headerButton}
                onPress={handleDelete}
                disabled={isDeleting}
              >
                <Trash2 size={22} color="#FF3B30" strokeWidth={2} />
              </TouchableOpacity>
            </View>
          ),
        }}
      />

      <View style={styles.content}>
        <View style={styles.titleSection}>
          <TouchableOpacity
            style={styles.titleRow}
            onPress={handleEditTitle}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel="Rename document"
          >
            <Text style={styles.title}>{doc.title}</Text>
            <View style={styles.editIconWrapper}>
              <Edit3 size={18} color="#007AFF" strokeWidth={2} />
            </View>
          </TouchableOpacity>
          <Text style={styles.metadata}>
            {doc.pages.length} {doc.pages.length === 1 ? 'page' : 'pages'} • Created {formattedDate}
          </Text>
        </View>

        <View style={styles.previewSection}>
          {doc.pages.length > 0 ? (
            <>
              <FlatList
                data={doc.pages}
                keyExtractor={(item) => item.id}
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                snapToAlignment="center"
                decelerationRate="fast"
                nestedScrollEnabled
                style={styles.previewList}
                contentContainerStyle={styles.previewListContent}
                renderItem={({ item }) => (
                  <View style={[styles.previewSlide, { width: windowWidth }]}>
                    <View
                      style={[
                        styles.previewFrame,
                        { width: previewImageWidth, height: previewImageHeight },
                      ]}
                    >
                      <Image
                        source={{ uri: item.uri }}
                        style={styles.previewImage}
                        contentFit="cover"
                      />
                    </View>
                  </View>
                )}
                onScroll={handlePreviewScroll}
                scrollEventThrottle={16}
              />
              <View style={styles.previewIndicators}>
                <Text style={styles.previewIndicatorText}>
                  Page {Math.min(activePageIndex + 1, doc.pages.length)} of {doc.pages.length}
                </Text>
              </View>
            </>
          ) : (
            <View style={styles.previewPlaceholder}>
              <Text style={styles.previewPlaceholderTitle}>No pages yet</Text>
              <Text style={styles.previewPlaceholderText}>
                Add a page to start building this document.
              </Text>
            </View>
          )}
        </View>
      </View>

      <View style={[styles.bottomActions, { paddingBottom: Math.max(insets.bottom, 12) }]}>
        <View style={styles.bottomActionsRow}>
          <TouchableOpacity
            style={styles.bottomAction}
            onPress={handleAddPage}
            accessibilityRole="button"
            accessibilityLabel="Add new page"
          >
            <View style={styles.bottomIconWrapper}>
              <PlusSquare size={28} color="#0A84FF" strokeWidth={2.2} />
            </View>
            <Text style={styles.bottomActionLabel}>Add Pages</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.bottomAction}
            onPress={handleExport}
            accessibilityRole="button"
            accessibilityLabel="Export document"
            disabled={exportDisabled}
          >
            <View style={[styles.bottomIconWrapper, exportDisabled && styles.bottomIconDisabled]}>
              <Upload size={26} color={exportDisabled ? '#9E9E9E' : '#111111'} strokeWidth={2.2} />
            </View>
            <Text style={[styles.bottomActionLabel, exportDisabled && styles.bottomActionDisabled]}>
              Export
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  headerButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  headerButton: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
    paddingBottom: 110,
  },
  titleSection: {
    backgroundColor: '#FFFFFF',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 8,
  },
  title: {
    flex: 1,
    fontSize: 28,
    fontWeight: '700',
    color: '#000000',
    lineHeight: 34,
  },
  editIconWrapper: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  metadata: {
    fontSize: 15,
    color: '#666666',
  },
  previewSection: {
    flex: 1,
    paddingTop: 20,
    paddingBottom: 32,
    backgroundColor: '#FFFFFF',
  },
  previewList: {
    flexGrow: 0,
  },
  previewListContent: {
    alignItems: 'center',
  },
  previewSlide: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewFrame: {
    borderRadius: 0,
    overflow: 'hidden',
    backgroundColor: '#000000',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: 'transparent',
    elevation: 0,
  },
  previewImage: {
    width: '100%',
    height: '100%',
    borderRadius: 0,
  },
  previewIndicators: {
    marginTop: 16,
    alignItems: 'center',
    width: '100%',
    paddingHorizontal: 20,
  },
  previewIndicatorText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333333',
  },
  previewPlaceholder: {
    marginHorizontal: 20,
    paddingVertical: 60,
    paddingHorizontal: 24,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    backgroundColor: '#FAFAFA',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  previewPlaceholderTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2C2C2E',
  },
  previewPlaceholderText: {
    fontSize: 15,
    color: '#6B6B6B',
    textAlign: 'center',
  },
  bottomActions: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 24,
    paddingTop: 6,
    backgroundColor: 'rgba(245, 245, 245, 0.98)',
    borderTopWidth: 1,
    borderTopColor: '#E5E5E5',
  },
  bottomActionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-evenly',
    alignItems: 'flex-start',
    paddingVertical: 8,
  },
  bottomAction: {
    alignItems: 'center',
    gap: 6,
  },
  bottomIconWrapper: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bottomIconDisabled: {
    opacity: 0.5,
  },
  bottomActionLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#111111',
  },
  bottomActionDisabled: {
    color: '#9E9E9E',
  },
  errorText: {
    fontSize: 16,
    color: '#666666',
    textAlign: 'center',
    marginTop: 40,
  },
});
