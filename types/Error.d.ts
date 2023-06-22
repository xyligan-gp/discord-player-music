declare class PlayerError extends Error {
    constructor(error: string);

    public name: string;
}

export { PlayerError };