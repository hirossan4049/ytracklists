export interface Track {
  number: string;
  artist: string;
  title: string;
  timestamp: string;
  raw: string;
}

export interface SearchResult {
  id?: string;
  uniqueId?: string;
  name: string;
  url: string;
}

export interface TracklistState {
  results: SearchResult[];
  selected: SearchResult | null;
  tracks: Track[] | null;
  name: string | null;
  url: string | null;
}

export interface SearchResponse {
  success: boolean;
  results?: SearchResult[];
  error?: string;
}

export interface FetchResponse {
  success: boolean;
  tracks?: Track[];
  error?: string;
}

export interface ApiTracklistProperties {
  id_tracklist: string;
  id_unique: string;
  tracklistname: string;
  url_name: string;
}

export interface ApiTracklistItem {
  object: string;
  properties: ApiTracklistProperties;
}

export interface ApiSearchResponse {
  success: boolean;
  data: ApiTracklistItem[];
}
