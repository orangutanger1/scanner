export type FilterType = 'original' | 'enhanced' | 'grayscale' | 'blackwhite';

export interface ScannedPage {
  id: string;
  uri: string;
  filter: FilterType;
  corners?: { x: number; y: number }[];
  timestamp: number;
}

export interface ScannedDocument {
  id: string;
  title: string;
  pages: ScannedPage[];
  createdAt: number;
  updatedAt: number;
  thumbnail?: string;
}
