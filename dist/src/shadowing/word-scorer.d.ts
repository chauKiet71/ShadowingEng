export interface ScoredWord {
    word: string;
    correct: boolean;
}
export declare function scoreTranscript(expected: string, transcript: string): ScoredWord[];
