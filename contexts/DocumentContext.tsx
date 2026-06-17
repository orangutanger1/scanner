import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { ScannedDocument, ScannedPage } from '../types/document';

const STORAGE_KEY = 'scanned_documents';

function useDocumentStore() {
  const [documents, setDocuments] = useState<ScannedDocument[]>([]);
  const [batchMode, setBatchMode] = useState(true);
  const [currentBatchId, setCurrentBatchId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((stored) => setDocuments(stored ? JSON.parse(stored) : []))
      .finally(() => setIsLoading(false));
  }, []);

  // write-through: every mutation persists the next state
  const commitDocuments = useCallback((updater: (prev: ScannedDocument[]) => ScannedDocument[]) => {
    setDocuments((prev) => {
      const updated = updater(prev);
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      return updated;
    });
  }, []);

  const addDocument = useCallback((doc: ScannedDocument) => {
    commitDocuments((prev) => [doc, ...prev]);
  }, [commitDocuments]);

  const startBatch = useCallback(() => {
    const batchId = Date.now().toString();
    setCurrentBatchId(batchId);
    setBatchMode(true);
    return batchId;
  }, []);

  const endBatch = useCallback(() => {
    setCurrentBatchId(null);
    setBatchMode(false);
  }, []);

  const updateDocument = useCallback((id: string, updates: Partial<ScannedDocument>) => {
    commitDocuments((prev) =>
      prev.map((doc) =>
        doc.id === id ? { ...doc, ...updates, updatedAt: Date.now() } : doc
      )
    );
  }, [commitDocuments]);

  const deleteDocument = useCallback((id: string) => {
    commitDocuments((prev) => prev.filter((doc) => doc.id !== id));
  }, [commitDocuments]);

  const addPageToDocument = useCallback((docId: string, page: ScannedPage) => {
    commitDocuments((prev) =>
      prev.map((doc) => {
        if (doc.id !== docId) return doc;
        return {
          ...doc,
          pages: [...doc.pages, page],
          updatedAt: Date.now(),
          thumbnail: doc.thumbnail ?? page.uri,
        };
      })
    );
  }, [commitDocuments]);

  return useMemo(() => ({
    documents,
    addDocument,
    updateDocument,
    deleteDocument,
    addPageToDocument,
    isLoading,
    batchMode,
    setBatchMode,
    currentBatchId,
    startBatch,
    endBatch,
  }), [documents, addDocument, updateDocument, deleteDocument, addPageToDocument, isLoading, batchMode, currentBatchId, startBatch, endBatch]);
}

type DocumentStore = ReturnType<typeof useDocumentStore>;

const DocumentContext = createContext<DocumentStore | null>(null);

export function DocumentProvider({ children }: { children: ReactNode }) {
  return (
    <DocumentContext.Provider value={useDocumentStore()}>
      {children}
    </DocumentContext.Provider>
  );
}

export function useDocuments() {
  const ctx = useContext(DocumentContext);
  if (!ctx) {
    throw new Error('useDocuments must be used within a DocumentProvider');
  }
  return ctx;
}
