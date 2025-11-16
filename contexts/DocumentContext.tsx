import AsyncStorage from '@react-native-async-storage/async-storage';
import createContextHook from '@nkzw/create-context-hook';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ScannedDocument, ScannedPage } from '../types/document';

const STORAGE_KEY = 'scanned_documents';

export const [DocumentProvider, useDocuments] = createContextHook(() => {
  const [documents, setDocuments] = useState<ScannedDocument[]>([]);
  const [batchMode, setBatchMode] = useState(true);
  const [currentBatchId, setCurrentBatchId] = useState<string | null>(null);

  const documentsQuery = useQuery({
    queryKey: ['documents'],
    queryFn: async () => {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (docs: ScannedDocument[]) => {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(docs));
      return docs;
    },
  });

  const { mutate: saveDocuments } = saveMutation;

  useEffect(() => {
    if (documentsQuery.data) {
      setDocuments(documentsQuery.data);
    }
  }, [documentsQuery.data]);

  const addDocument = useCallback((doc: ScannedDocument) => {
    const updated = [doc, ...documents];
    setDocuments(updated);
    saveDocuments(updated);
  }, [documents, saveDocuments]);

  const startBatch = useCallback(() => {
    const batchId = Date.now().toString();
    setCurrentBatchId(batchId);
    setBatchMode(true);
    return batchId;
  }, [setBatchMode]);

  const endBatch = useCallback(() => {
    setCurrentBatchId(null);
    setBatchMode(false);
  }, []);

  const updateDocument = useCallback((id: string, updates: Partial<ScannedDocument>) => {
    const updated = documents.map((doc) =>
      doc.id === id ? { ...doc, ...updates, updatedAt: Date.now() } : doc
    );
    setDocuments(updated);
    saveDocuments(updated);
  }, [documents, saveDocuments]);

  const deleteDocument = useCallback((id: string) => {
    const updated = documents.filter((doc) => doc.id !== id);
    setDocuments(updated);
    saveDocuments(updated);
  }, [documents, saveDocuments]);

  const addPageToDocument = useCallback((docId: string, page: ScannedPage) => {
    const doc = documents.find((d) => d.id === docId);
    if (doc) {
      updateDocument(docId, {
        pages: [...doc.pages, page],
      });
    }
  }, [documents, updateDocument]);

  return useMemo(() => ({
    documents,
    addDocument,
    updateDocument,
    deleteDocument,
    addPageToDocument,
    isLoading: documentsQuery.isLoading,
    batchMode,
    setBatchMode,
    currentBatchId,
    startBatch,
    endBatch,
  }), [documents, addDocument, updateDocument, deleteDocument, addPageToDocument, documentsQuery.isLoading, batchMode, setBatchMode, currentBatchId, startBatch, endBatch]);
});
