"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.scoreTranscript = scoreTranscript;
function tokenize(text) {
    return text
        .toLowerCase()
        .replace(/[^a-z0-9'\s-]/g, ' ')
        .split(/\s+/)
        .filter(Boolean);
}
function levenshtein(a, b) {
    const matrix = Array.from({ length: a.length + 1 }, () => new Array(b.length + 1).fill(0));
    for (let i = 0; i <= a.length; i++)
        matrix[i][0] = i;
    for (let j = 0; j <= b.length; j++)
        matrix[0][j] = j;
    for (let i = 1; i <= a.length; i++) {
        for (let j = 1; j <= b.length; j++) {
            const cost = a[i - 1] === b[j - 1] ? 0 : 1;
            matrix[i][j] = Math.min(matrix[i - 1][j] + 1, matrix[i][j - 1] + 1, matrix[i - 1][j - 1] + cost);
        }
    }
    return matrix[a.length][b.length];
}
function isWordMatch(expected, spoken) {
    if (expected === spoken)
        return true;
    const normalizedExpected = expected.replace(/'/g, '');
    const normalizedSpoken = spoken.replace(/'/g, '');
    if (normalizedExpected === normalizedSpoken)
        return true;
    const maxDistance = expected.length <= 4 ? 1 : 2;
    return levenshtein(normalizedExpected, normalizedSpoken) <= maxDistance;
}
function scoreTranscript(expected, transcript) {
    const expectedWords = tokenize(expected);
    const spokenWords = tokenize(transcript);
    if (expectedWords.length === 0)
        return [];
    let spokenIndex = 0;
    return expectedWords.map((word) => {
        let correct = false;
        const searchEnd = Math.min(spokenIndex + 4, spokenWords.length);
        for (let i = spokenIndex; i < searchEnd; i++) {
            if (isWordMatch(word, spokenWords[i])) {
                correct = true;
                spokenIndex = i + 1;
                break;
            }
        }
        if (!correct && spokenIndex < spokenWords.length) {
            spokenIndex += 1;
        }
        return { word, correct };
    });
}
//# sourceMappingURL=word-scorer.js.map