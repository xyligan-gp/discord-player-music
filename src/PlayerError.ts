export class PlayerError extends Error {
    public name: string;
    
    constructor(error: string) {
        super(error);
        
        this.name = 'PlayerError';
    }
}