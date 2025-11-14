import { CameraView, CameraType, useCameraPermissions } from 'expo-camera';
import { router } from 'expo-router';
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
import { SafeAreaView } from 'react-native-safe-area-context';
import { X, Circle, Sparkles, Check, Layers } from 'lucide-react-native';
import { useDocuments } from '../contexts/DocumentContext';
import type { ScannedDocument, ScannedPage } from '../types/document';

export default function CameraScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const [facing, setFacing] = useState<CameraType>('back');
  const [isCapturing, setIsCapturing] = useState(false);
  const [batchPages, setBatchPages] = useState<ScannedPage[]>([]);
  const cameraRef = useRef<CameraView>(null);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const { addDocument, batchMode, startBatch, endBatch, addPageToDocument } = useDocuments();
  const [activeBatchId, setActiveBatchId] = useState<string | null>(null);

  useEffect(() => {
    if (batchMode && !activeBatchId) {
      const batchId = startBatch();
      setActiveBatchId(batchId);
    }
  }, [batchMode, activeBatchId, startBatch]);

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

  const handleCapture = useCallback(async () => {
    if (!cameraRef.current || isCapturing) return;

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

        if (batchMode) {
          if (batchPages.length === 0) {
            const doc: ScannedDocument = {
              id: activeBatchId || Date.now().toString(),
              title: `Scan ${new Date().toLocaleDateString()}`,
              pages: [page],
              createdAt: Date.now(),
              updatedAt: Date.now(),
              thumbnail: photo.uri,
            };
            addDocument(doc);
            setActiveBatchId(doc.id);
          } else if (activeBatchId) {
            addPageToDocument(activeBatchId, page);
          }
          
          setBatchPages([...batchPages, page]);
        } else {
          const doc: ScannedDocument = {
            id: Date.now().toString(),
            title: `Scan ${new Date().toLocaleDateString()}`,
            pages: [page],
            createdAt: Date.now(),
            updatedAt: Date.now(),
            thumbnail: photo.uri,
          };

          addDocument(doc);
          router.back();
        }
      }
    } catch (error) {
      console.error('Error capturing photo:', error);
    } finally {
      setIsCapturing(false);
    }
  }, [isCapturing, stopPulse, addDocument, batchMode, batchPages, activeBatchId, addPageToDocument]);

  const handleFinishBatch = useCallback(() => {
    if (Platform.OS !== 'web') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
    endBatch();
    setBatchPages([]);
    setActiveBatchId(null);
    router.back();
  }, [endBatch]);



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
        flash="auto"
      >
        <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
          <View style={styles.header}>
            <TouchableOpacity
              style={styles.headerButton}
              onPress={() => {
                if (Platform.OS !== 'web') {
                  Haptics.selectionAsync();
                }
                if (batchMode && batchPages.length > 0) {
                  endBatch();
                  setBatchPages([]);
                  setActiveBatchId(null);
                }
                router.back();
              }}
            >
              <X size={28} color="#FFFFFF" strokeWidth={2.5} />
            </TouchableOpacity>

            <View style={styles.headerRight}>
              <TouchableOpacity
                style={styles.batchToggle}
                onPress={() => {
                  if (Platform.OS !== 'web') {
                    Haptics.selectionAsync();
                  }
                  if (!batchMode) {
                    const batchId = startBatch();
                    setActiveBatchId(batchId);
                  } else {
                    if (batchPages.length > 0) {
                      endBatch();
                      setBatchPages([]);
                      setActiveBatchId(null);
                    }
                  }
                }}
              >
                <Layers size={20} color={batchMode ? '#007AFF' : '#FFFFFF'} strokeWidth={2} />
              </TouchableOpacity>
              
              {batchMode && (
                <View style={styles.batchBadge}>
                  <Text style={styles.batchBadgeText}>
                    {batchPages.length} {batchPages.length === 1 ? 'page' : 'pages'}
                  </Text>
                </View>
              )}
            </View>
          </View>

          <View style={styles.overlay}>
            <View style={styles.scanFrame} />
          </View>

          <View style={styles.controls}>
            <View style={styles.controlsInner}>
              {batchMode && batchPages.length > 0 ? (
                <TouchableOpacity
                  style={styles.leftControl}
                  onPress={handleFinishBatch}
                >
                  <View style={styles.finishButton}>
                    <Check size={28} color="#FFFFFF" strokeWidth={2.5} />
                  </View>
                </TouchableOpacity>
              ) : (
                <View style={styles.leftControl} />
              )}
              
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
                  {isCapturing ? (
                    <ActivityIndicator size="large" color="#007AFF" />
                  ) : (
                    <Circle size={64} color="#007AFF" strokeWidth={3} fill="#FFFFFF" />
                  )}
                </Animated.View>
              </TouchableOpacity>

              <View style={styles.rightControl} />
            </View>
          </View>
        </SafeAreaView>
      </CameraView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  camera: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  batchToggle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  batchBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  batchBadgeText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#007AFF',
  },
  headerButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scanFrame: {
    width: '85%',
    aspectRatio: 0.7,
    borderWidth: 2,
    borderColor: '#FFFFFF',
    borderRadius: 12,
    backgroundColor: 'transparent',
  },
  controls: {
    paddingHorizontal: 20,
    paddingBottom: 24,
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
  finishButton: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#34C759',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#34C759',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 4,
  },
  captureButton: {
    width: 80,
    height: 80,
    alignItems: 'center',
    justifyContent: 'center',
  },
  captureButtonInner: {
    width: 80,
    height: 80,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rightControl: {
    width: 60,
    alignItems: 'flex-end',
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
