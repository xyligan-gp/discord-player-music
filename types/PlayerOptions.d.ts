export interface PlayerOptions {
  autoAddingTracks?: boolean;
  searchResultsLimit?: number;
  synchronLoop?: boolean;
  defaultVolume?: number;

  databaseConfig?: DatabaseConfig;
  progressConfig?: ProgressConfig;
  collectorsConfig?: CollectorsConfig;
}

export interface DatabaseConfig {
  path?: string;
  checkInterval?: string;
}

interface ProgressConfig {
  size?: number;
  line?: string;
  slider?: string;
}

interface CollectorsConfig {
  message?: MessageCollectorConfig;
  reaction?: ReactionCollectorConfig;
}

interface MessageCollectorConfig {
  time?: string;
  attempts?: number;
}

interface ReactionCollectorConfig {
  time?: string;
  attempts?: number;
  reactions?: string[];
}
