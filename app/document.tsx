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
  ScrollView,
  Platform,
  Alert,
} from 'react-native';
import { Share2, Trash2, Edit3, Plus } from 'lucide-react-native';
import { useDocuments } from '../contexts/DocumentContext';

export default function DocumentScreen() {
  const params = useLocalSearchParams<{ documentId: string }>();
  const { documents, deleteDocument, updateDocument } = useDocuments();
  const [isDeleting, setIsDeleting] = useState(false);

  const doc = documents.find((d) => d.id === params.documentId);

  const handleShare = useCallback(async () => {
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
            onPress: (newTitle) => {
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
    router.push('/camera');
  }, []);

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

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          title: 'Document',
          headerRight: () => (
            <View style={styles.headerButtons}>
              <TouchableOpacity
                style={styles.headerButton}
                onPress={handleShare}
              >
                <Share2 size={22} color="#007AFF" strokeWidth={2} />
              </TouchableOpacity>
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

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.titleSection}>
          <View style={styles.titleRow}>
            <Text style={styles.title}>{doc.title}</Text>
            <TouchableOpacity
              style={styles.editButton}
              onPress={handleEditTitle}
            >
              <Edit3 size={18} color="#007AFF" strokeWidth={2} />
            </TouchableOpacity>
          </View>
          <Text style={styles.metadata}>
            {doc.pages.length} {doc.pages.length === 1 ? 'page' : 'pages'} • Created {formattedDate}
          </Text>
        </View>

        <View style={styles.pagesSection}>
          <Text style={styles.sectionTitle}>PAGES</Text>
          {doc.pages.map((page, index) => (
            <View key={page.id} style={styles.pageItem}>
              <View style={styles.pageNumber}>
                <Text style={styles.pageNumberText}>{index + 1}</Text>
              </View>
              <View style={styles.pagePreview}>
                <Image
                  source={{ uri: page.uri }}
                  style={styles.pageImage}
                  contentFit="cover"
                />
              </View>
              <View style={styles.pageInfo}>
                <Text style={styles.pageFilter}>
                  Filter: {page.filter.charAt(0).toUpperCase() + page.filter.slice(1)}
                </Text>
              </View>
            </View>
          ))}
          
          <TouchableOpacity
            style={styles.addPageButton}
            onPress={handleAddPage}
          >
            <Plus size={24} color="#007AFF" strokeWidth={2.5} />
            <Text style={styles.addPageText}>Add Page</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
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
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
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
  editButton: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  metadata: {
    fontSize: 15,
    color: '#666666',
  },
  pagesSection: {
    marginTop: 20,
    paddingHorizontal: 20,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#666666',
    marginBottom: 12,
    letterSpacing: 0.5,
  },
  pageItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    gap: 12,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  pageNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#007AFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pageNumberText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  pagePreview: {
    width: 60,
    height: 80,
    borderRadius: 8,
    backgroundColor: '#F5F5F5',
    overflow: 'hidden',
  },
  pageImage: {
    width: '100%',
    height: '100%',
  },
  pageInfo: {
    flex: 1,
  },
  pageFilter: {
    fontSize: 15,
    color: '#666666',
  },
  addPageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    gap: 8,
    borderWidth: 2,
    borderColor: '#007AFF',
    borderStyle: 'dashed',
  },
  addPageText: {
    fontSize: 17,
    fontWeight: '600',
    color: '#007AFF',
  },
  errorText: {
    fontSize: 16,
    color: '#666666',
    textAlign: 'center',
    marginTop: 40,
  },
});
