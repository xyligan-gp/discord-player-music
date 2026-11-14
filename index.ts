import { Player } from './src/Player';
import { Collector, Events, GuildQueueState, Loop, Search } from './src/PlayerEnums';

export { Player, Collector, Events, GuildQueueState, Loop, Search };

export { PlayerError, PlayerErrorCode } from './src/PlayerError';

export { SourceRegistry } from './src/sources/SourceRegistry';
export { YoutubeiProvider } from './src/sources/YoutubeiProvider';
export { YtDlpProvider } from './src/sources/YtDlpProvider';
export { LrclibProvider } from './src/lyrics/LrclibProvider';
export { createOpusStream, createVolumeResource } from './src/sources/AudioPipeline';

export { QueueManager } from './src/managers/QueueManager';
export { FiltersManager } from './src/managers/FiltersManager';
export { VoiceManager } from './src/managers/VoiceManager';
export { UtilsManager } from './src/managers/UtilsManager';

export type { SourceProvider, SourceStreamOptions, SourceTrack } from './src/sources/SourceProvider';
export type { LyricsProvider, LyricsResult } from './src/lyrics/LyricsProvider';
export type { LrclibProviderOptions } from './src/lyrics/LrclibProvider';
export type { YtDlpProviderOptions } from './src/sources/YtDlpProvider';
export type { YoutubeiProviderOptions } from './src/sources/YoutubeiProvider';
export type { YtDlpInstallOptions } from './src/sources/YtDlpBinary';
export type { SourceRegistryOptions } from './src/sources/SourceRegistry';
export type { PlayerOptions, ResolvedPlayerOptions } from './src/types/PlayerOptions';
export type { PlayerEvents } from './src/types/PlayerEvents';
export type * from './src/types/PlayerData';
