export interface PlayerOptions {
    autoAddingTracks?: boolean;
    searchResultsLimit?: number;
    synchronLoop?: boolean;
    defaultVolume?: number;

    databaseConfig?: {
        path?: string;
        checkInterval?: string;
    }

    progressConfig?: {
        size?: number;
        line?: string;
        slider?: string;
    }

    collectorsConfig?: {
        message?: {
            time?: string;
            attempts?: number;
        }

        reaction?: {
            time?: string;
            attempts?: number;
            reactions?: Array<string>;
        }
    }
}