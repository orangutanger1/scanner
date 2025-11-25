import { CameraView, CameraType, useCameraPermissions } from 'expo-camera';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useState, useRef, useCallback, useEffect } from 'react';
import { 
  StyleSheet, 
  Text, 
  TouchableOpacity, 
  View, 
  Animated, 
  Platform,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { X, Sparkles, Layers, Zap } from 'lucide-react-native';
import { useDocuments } from '../contexts/DocumentContext';
import type { ScannedDocument, ScannedPage } from '../types/document';

export default function CameraScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const facing: CameraType = 'back';
  const [isCapturing, setIsCapturing] = useState(false);
  const [batchPages, setBatchPages] = useState<ScannedPage[]>([]);
  const cameraRef = useRef<CameraView>(null);
  const [cameraReady, setCameraReady] = useState(false);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const { addDocument, batchMode, setBatchMode, startBatch, endBatch, addPageToDocument } = useDocuments();
  const [activeBatchId, setActiveBatchId] = useState<string | null>(null);
  const [modeFeedbackText, setModeFeedbackText] = useState('');
  const [flashMode, setFlashMode] = useState<'auto' | 'on' | 'off'>('auto');
  const modeFeedbackOpacity = useRef(new Animated.Value(0)).current;
  const params = useLocalSearchParams<{ appendTo?: string }>();
  const appendDocumentId = typeof params.appendTo === 'string' ? params.appendTo : undefined;
  const isAppendMode = Boolean(appendDocumentId);
  const insets = useSafeAreaInsets();

  const topInset = Math.max(insets.top, 24);

  useFocusEffect(
    useCallback(() => {
      setBatchMode(true);
    }, [setBatchMode])
  );

  useEffect(() => {
    if (isAppendMode && appendDocumentId) {
      setBatchMode(true);
      setActiveBatchId(appendDocumentId);
    }
  }, [isAppendMode, appendDocumentId, setBatchMode]);

  useEffect(() => {
    if (!batchMode) {
      setBatchPages([]);
      setActiveBatchId(appendDocumentId ?? null);
    }
  }, [batchMode, appendDocumentId]);


  const startPulse = useCallback(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.2,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [pulseAnim]);

  const stopPulse = useCallback(() => {
    pulseAnim.stopAnimation();
    pulseAnim.setValue(1);
  }, [pulseAnim]);

  const addPageToSession = useCallback((page: ScannedPage) => {
    const appendedToExisting = Boolean(appendDocumentId);

    if (appendDocumentId) {
      addPageToDocument(appendDocumentId, page);
      if (Platform.OS !== 'web') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    }

    if (batchMode) {
      if (!appendDocumentId) {
        if (!activeBatchId) {
          const doc: ScannedDocument = {
            id: Date.now().toString(),
            title: `Scan ${new Date().toLocaleDateString()}`,
            pages: [page],
            createdAt: Date.now(),
            updatedAt: Date.now(),
            thumbnail: page.uri,
          };
          addDocument(doc);
          setActiveBatchId(doc.id);
        } else {
          addPageToDocument(activeBatchId, page);
        }
      }

      setBatchPages((prev) => [...prev, page]);
    } else if (!appendedToExisting) {
      const doc: ScannedDocument = {
        id: Date.now().toString(),
        title: `Scan ${new Date().toLocaleDateString()}`,
        pages: [page],
        createdAt: Date.now(),
        updatedAt: Date.now(),
        thumbnail: page.uri,
      };

      addDocument(doc);
      router.back();
    } else {
      router.back();
    }
  }, [appendDocumentId, addDocument, addPageToDocument, activeBatchId, batchMode]);

  const handleCapture = useCallback(async () => {
    if (!cameraRef.current || isCapturing || !cameraReady) return;

    if (Platform.OS !== 'web') {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }

    setIsCapturing(true);
    stopPulse();

    try {
      const photo = await cameraRef.current.takePictureAsync({
        quality: 1,
        base64: false,
      });

      if (photo) {
        const page: ScannedPage = {
          id: Date.now().toString(),
          uri: photo.uri,
          filter: 'original',
          timestamp: Date.now(),
        };

        addPageToSession(page);
      }
    } catch (error) {
      console.error('Error capturing photo:', error);
    } finally {
      setIsCapturing(false);
    }
  }, [addPageToSession, cameraReady, isCapturing, stopPulse]);

  const handleCloseCamera = useCallback(() => {
    if (Platform.OS !== 'web') {
      Haptics.selectionAsync();
    }

    if (batchMode) {
      endBatch();
    }

    setBatchPages([]);
    setActiveBatchId(null);

    const canGoBack = typeof router.canGoBack === 'function' ? router.canGoBack() : false;

    if (canGoBack) {
      router.back();
    } else {
      router.replace('/');
    }
  }, [batchMode, endBatch]);

  const handleDone = useCallback(() => {
    if (batchMode && batchPages.length > 0) {
      if (Platform.OS !== 'web') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    }
    handleCloseCamera();
  }, [batchMode, batchPages, handleCloseCamera]);

  const handleImportFromLibrary = useCallback(async () => {
    if (Platform.OS !== 'web') {
      Haptics.selectionAsync();
    }

    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsMultipleSelection: true,
        quality: 1,
      });

      if (result.canceled || !result.assets?.length) {
        return;
      }

      result.assets.forEach((asset, index) => {
        if (!asset.uri) {
          return;
        }

        const page: ScannedPage = {
          id: `${Date.now()}-library-${index}-${asset.assetId ?? Math.random().toString(36).slice(2, 6)}`,
          uri: asset.uri,
          filter: 'original',
          timestamp: Date.now(),
        };

        addPageToSession(page);
      });
    } catch (error) {
      console.error('Error importing from photo library:', error);
    }
  }, [addPageToSession]);

  const handleImportFromFiles = useCallback(async () => {
    if (Platform.OS !== 'web') {
      Haptics.selectionAsync();
    }

    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'image/*',
        multiple: true,
        copyToCacheDirectory: true,
      });

      if (result.canceled || !result.assets?.length) {
        return;
      }

      result.assets.forEach((asset, index) => {
        if (!asset.uri) {
          return;
        }

        const page: ScannedPage = {
          id: `${Date.now()}-file-${index}-${Math.random().toString(36).slice(2, 6)}`,
          uri: asset.uri,
          filter: 'original',
          timestamp: Date.now(),
        };

        addPageToSession(page);
      });
    } catch (error) {
      console.error('Error importing from files:', error);
    }
  }, [addPageToSession]);

  const showModeFeedback = useCallback((text: string) => {
    setModeFeedbackText(text);
    modeFeedbackOpacity.setValue(0);
    Animated.sequence([
      Animated.timing(modeFeedbackOpacity, {
        toValue: 1,
        duration: 150,
        useNativeDriver: true,
      }),
      Animated.delay(800),
      Animated.timing(modeFeedbackOpacity, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }),
    ]).start();
  }, [modeFeedbackOpacity]);

  const handleToggleBatchMode = useCallback(() => {
    if (Platform.OS !== 'web') {
      Haptics.selectionAsync();
    }

    const nextModeIsBatch = !batchMode;

    if (batchMode) {
      endBatch();
      setBatchPages([]);
      setActiveBatchId(appendDocumentId ?? null);
    } else {
      startBatch();
      setBatchPages([]);
      setActiveBatchId(appendDocumentId ?? null);
    }
    showModeFeedback(nextModeIsBatch ? 'Batch mode' : 'Single mode');
  }, [appendDocumentId, batchMode, endBatch, startBatch, showModeFeedback]);

  const handleCycleFlashMode = useCallback(() => {
    if (Platform.OS !== 'web') {
      Haptics.selectionAsync();
    }

    setFlashMode((prev) => {
      if (prev === 'auto') return 'on';
      if (prev === 'on') return 'off';
      return 'auto';
    });
  }, []);



  if (!permission) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={styles.permissionContainer}>
        <Sparkles size={64} color="#007AFF" strokeWidth={1.5} />
        <Text style={styles.permissionTitle}>Camera Access Required</Text>
        <Text style={styles.permissionText}>
          We need your permission to use the camera for scanning documents
        </Text>
        <TouchableOpacity style={styles.permissionButton} onPress={requestPermission}>
          <Text style={styles.permissionButtonText}>Grant Permission</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <CameraView 
        ref={cameraRef} 
        style={styles.camera} 
        facing={facing}
        flash={flashMode}
        onCameraReady={() => setCameraReady(true)}
        onMountError={(error) => console.error('Camera mount error:', error)}
      />
      <SafeAreaView style={styles.safeArea} edges={['bottom']}>
        <View style={[styles.topSafeOverlay, { height: topInset }]} />
        <View
          style={[
            styles.header,
            styles.headerRaised,
            { paddingTop: Math.max(topInset * 0.2, 8), paddingBottom: 10 },
          ]}
        >
          <View style={styles.headerLeft}>
            <TouchableOpacity
              style={styles.headerButton}
              onPress={handleCloseCamera}
            >
              <X size={24} color="#FFFFFF" strokeWidth={2.5} />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.flashButton, flashMode !== 'off' && styles.flashButtonActive]}
              onPress={handleCycleFlashMode}
              accessibilityRole="button"
              accessibilityLabel="Toggle flash mode"
            >
              <View style={styles.flashIconWrapper}>
                <Zap
                  size={18}
                  color={flashMode === 'off' ? '#FFFFFF' : '#FFD60A'}
                  strokeWidth={2.5}
                />
                {flashMode === 'auto' && (
                  <Text style={styles.flashAutoBadge}>A</Text>
                )}
              </View>
            </TouchableOpacity>
          </View>

          <View style={styles.headerRight}>
            <TouchableOpacity
              style={styles.modeButton}
              onPress={handleToggleBatchMode}
              accessibilityRole="switch"
              accessibilityState={{ checked: batchMode }}
              accessibilityLabel="Toggle batch scanning session"
              accessibilityHint={batchMode ? 'Switch to single capture mode' : 'Switch to batch capture mode'}
            >
              <View style={styles.modeContent}>
                <View style={styles.modeIconWrapper}>
                  <Layers size={18} color={batchMode ? '#3EB1FF' : '#FFFFFF'} strokeWidth={2.2} />
                  {!batchMode && <View style={styles.modeSlash} />}
                </View>
                <Text
                  style={[
                    styles.modeLabel,
                    batchMode ? styles.modeLabelActive : styles.modeLabelInactive,
                  ]}
                >
                  {batchMode ? 'Batch' : 'Single'}
                </Text>
              </View>
            </TouchableOpacity>
          </View>
        </View>

        <Animated.View pointerEvents="none" style={[styles.modeFeedback, { opacity: modeFeedbackOpacity }]}>
          <Text style={styles.modeFeedbackText}>{modeFeedbackText}</Text>
        </Animated.View>

        <View style={styles.controlsStack}>
          <View style={styles.primaryControls}>
            <View style={styles.controlsInner}>
              <View style={styles.leftControl}>
                <TouchableOpacity onPress={handleCloseCamera} disabled={isCapturing}>
                  <Text style={[styles.cancelButtonText, isCapturing && styles.cancelButtonDisabled]}>Cancel</Text>
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                style={styles.captureButton}
                onPress={handleCapture}
                disabled={isCapturing}
                onPressIn={startPulse}
                onPressOut={stopPulse}
              >
                <Animated.View
                  style={[
                    styles.captureButtonInner,
                    { transform: [{ scale: pulseAnim }] },
                  ]}
                >
                  <View style={styles.captureCircle}>
                    {isCapturing ? (
                      <ActivityIndicator size="small" color="#007AFF" />
                    ) : batchMode ? (
                      <Text style={styles.captureCountText}>{batchPages.length}</Text>
                    ) : null}
                  </View>
                </Animated.View>
              </TouchableOpacity>

              <View style={styles.rightControl}>
                <TouchableOpacity onPress={handleDone} disabled={isCapturing}>
                  <Text style={[styles.doneButtonText, isCapturing && styles.doneButtonDisabled]}>Done</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>

          <View style={styles.secondaryActions}>
            <TouchableOpacity
              style={[styles.secondaryButton, isCapturing && styles.secondaryButtonDisabled]}
              onPress={handleImportFromLibrary}
              disabled={isCapturing}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 12 }}
            >
              <Text style={styles.secondaryButtonText}>Photos</Text>
            </TouchableOpacity>
            <View style={styles.secondaryDivider} />
            <TouchableOpacity
              style={[styles.secondaryButton, isCapturing && styles.secondaryButtonDisabled]}
              onPress={handleImportFromFiles}
              disabled={isCapturing}
              hitSlop={{ top: 8, bottom: 8, left: 12, right: 8 }}
            >
              <Text style={styles.secondaryButtonText}>Files</Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  camera: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
  },
  safeArea: {
    flex: 1,
    position: 'relative',
  },
  topSafeOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: '#000000',
    zIndex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    zIndex: 2,
  },
  headerRaised: {
    marginTop: -8,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerButton: {
    minWidth: 36,
    height: 36,
    borderRadius: 18,
    padding: 4,
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
  flashButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    padding: 4,
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
  flashButtonActive: {
    opacity: 1,
  },
  flashIconWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  flashAutoBadge: {
    position: 'absolute',
    right: -6,
    bottom: -4,
    fontSize: 10,
    fontWeight: '700',
    color: '#FFD60A',
  },
  modeButton: {
    padding: 6,
    backgroundColor: 'transparent',
  },
  modeContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  modeIconWrapper: {
    width: 28,
    height: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 6,
  },
  modeSlash: {
    position: 'absolute',
    width: 2,
    height: 20,
    backgroundColor: '#FFFFFF',
    opacity: 0.8,
    transform: [{ rotate: '-45deg' }],
    borderRadius: 1,
  },
  modeLabel: {
    fontSize: 15,
    fontWeight: '600',
  },
  modeLabelActive: {
    color: '#3EB1FF',
  },
  modeLabelInactive: {
    color: '#FFFFFF',
    opacity: 0.85,
  },
  modeFeedback: {
    position: 'absolute',
    top: 120,
    alignSelf: 'center',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 18,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
  },
  modeFeedbackText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  controlsStack: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 36,
    paddingHorizontal: 20,
  },
  primaryControls: {
    paddingBottom: 16,
    paddingTop: 8,
  },
  controlsInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  leftControl: {
    width: 60,
    alignItems: 'flex-start',
  },
  rightControl: {
    width: 60,
    alignItems: 'flex-end',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  cancelButtonDisabled: {
    opacity: 0.5,
  },
  captureButton: {
    width: 88,
    height: 88,
    alignItems: 'center',
    justifyContent: 'center',
  },
  captureButtonInner: {
    width: 88,
    height: 88,
    alignItems: 'center',
    justifyContent: 'center',
  },
  captureCircle: {
    width: 74,
    height: 74,
    borderRadius: 37,
    backgroundColor: '#FFFFFF',
    borderWidth: 3,
    borderColor: '#007AFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  captureCountText: {
    fontSize: 24,
    fontWeight: '700',
    color: '#007AFF',
  },
  secondaryActions: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 18,
  },
  secondaryButton: {
    paddingVertical: 6,
  },
  secondaryDivider: {
    width: StyleSheet.hairlineWidth,
    height: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
  },
  secondaryButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  secondaryButtonDisabled: {
    opacity: 0.5,
  },
  doneButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    textAlign: 'right',
  },
  doneButtonDisabled: {
    opacity: 0.5,
  },
  permissionContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
    gap: 16,
  },
  permissionTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#000000',
    textAlign: 'center',
    marginTop: 16,
  },
  permissionText: {
    fontSize: 16,
    color: '#666666',
    textAlign: 'center',
    lineHeight: 24,
  },
  permissionButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 12,
    marginTop: 8,
  },
  permissionButtonText: {
    fontSize: 17,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
