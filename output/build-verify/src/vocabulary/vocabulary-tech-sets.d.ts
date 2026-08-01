import { CefrLevel } from '@prisma/client';
export type VocabularySeedWord = [
    string,
    string,
    string,
    string,
    string
];
export type VocabularySeedSet = {
    slug: string;
    title: string;
    description: string;
    icon: string;
    color: string;
    cefrLevel: CefrLevel;
    topic: string;
    isFeatured: boolean;
    sortOrder: number;
    words: VocabularySeedWord[];
};
export declare const TECH_VOCABULARY_SETS: VocabularySeedSet[];
