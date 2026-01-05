
import * as XLSX from 'xlsx';
import { Question, Difficulty } from '../types';

export const parseQuestionFile = async (file: File): Promise<Question[]> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        
        // Convert to JSON
        const jsonData: any[] = XLSX.utils.sheet_to_json(worksheet);

        if (jsonData.length === 0) {
            reject(new Error("File appears to be empty"));
            return;
        }

        // Helper: Robust key lookup
        const getRowValue = (row: any, searchTerms: string[], allowPartial: boolean = false): string | undefined => {
             const keys = Object.keys(row);
             const searchLower = searchTerms.map(s => s.toLowerCase());

             // 1. Exact Match
             for (const key of keys) {
                 const keyLower = key.toLowerCase().trim();
                 if (searchLower.includes(keyLower)) {
                     const val = row[key];
                     if (val !== undefined && val !== null && String(val).trim() !== '') return String(val).trim();
                 }
             }

             if (!allowPartial) return undefined;

             // 2. Partial Match
             for (const key of keys) {
                 const keyLower = key.toLowerCase().trim();
                 for (const term of searchLower) {
                     if (keyLower.includes(term)) {
                         const val = row[key];
                         if (val !== undefined && val !== null && String(val).trim() !== '') return String(val).trim();
                     }
                 }
             }
             return undefined;
        };

        // Heuristic: Find explanation column by length if explicit lookup fails
        // We look for a column that is NOT the question, answer, or option, but has long text.
        const detectExplanationColumn = (rows: any[]): string | null => {
            const sampleSize = Math.min(rows.length, 10);
            const candidates: Record<string, number> = {};
            const bannedKeys = ['question', 'text', 'option', 'answer', 'subject', 'difficulty', 'level', 'q', 'a', 'b', 'c', 'd', 'ans'];

            for (let i = 0; i < sampleSize; i++) {
                const row = rows[i];
                Object.keys(row).forEach(key => {
                    const keyLower = key.toLowerCase();
                    // Skip known columns
                    if (bannedKeys.some(b => keyLower.includes(b))) return;
                    
                    const val = String(row[key]);
                    if (val.length > 15) { // Threshold for "explanation-like" text
                        candidates[key] = (candidates[key] || 0) + 1;
                    }
                });
            }

            // Return the key with the most hits
            let bestKey = null;
            let maxHits = 0;
            Object.entries(candidates).forEach(([key, hits]) => {
                if (hits > maxHits) {
                    maxHits = hits;
                    bestKey = key;
                }
            });
            return bestKey;
        };

        const heuristicExplanationKey = detectExplanationColumn(jsonData);

        // Map loosely to Question format
        const questions: Question[] = jsonData.map((row: any, index: number): Question | null => {
            
            let text = getRowValue(row, ['Question', 'question', 'Text', 'text', 'Q', 'Prompt'], false);
            if (!text) text = getRowValue(row, ['Question', 'Text', 'Prompt'], true);
            
            const options: string[] = [];
            const optA = getRowValue(row, ['Option A', 'A', 'a', 'option1', 'Option 1'], true);
            const optB = getRowValue(row, ['Option B', 'B', 'b', 'option2', 'Option 2'], true);
            const optC = getRowValue(row, ['Option C', 'C', 'c', 'option3', 'Option 3'], true);
            const optD = getRowValue(row, ['Option D', 'D', 'd', 'option4', 'Option 4'], true);

            if (optA) options.push(optA);
            if (optB) options.push(optB);
            if (optC) options.push(optC);
            if (optD) options.push(optD);

            let correctAnswer = getRowValue(row, ['Correct Answer', 'Answer', 'correct', 'answer', 'Ans', 'Key'], true) || '';
            
            if (correctAnswer.length === 1 && /^[A-D]$/i.test(correctAnswer)) {
                const map: {[key: string]: number} = {'A':0, 'B':1, 'C':2, 'D':3};
                const idx = map[correctAnswer.toUpperCase()];
                if (idx < options.length) {
                    correctAnswer = options[idx];
                }
            }

            // Subject
            let rawSubject = getRowValue(row, ['Subject', 'subject', 'Topic', 'topic', 'Category'], true) || '';
            let subjectId = undefined;
            if (rawSubject) {
                const s = rawSubject.toLowerCase();
                if (s.includes('geo')) subjectId = 'geo';
                else if (s.includes('sci')) subjectId = 'sci';
                else if (s.includes('nut') || s.includes('food')) subjectId = 'nut';
                else if (s.includes('tech') || s.includes('comp')) subjectId = 'tech';
                else if (s.includes('math')) subjectId = 'math';
                else if (s.includes('gen')) subjectId = 'gen';
            }

            // Difficulty
            let rawDiff = getRowValue(row, ['Difficulty', 'difficulty', 'Level', 'level'], true) || '';
            let difficulty = undefined;
            if (rawDiff) {
                const d = rawDiff.toLowerCase();
                if (d === 'easy' || d === '1') difficulty = Difficulty.EASY;
                else if (d === 'medium' || d === 'med' || d === '2') difficulty = Difficulty.MEDIUM;
                else if (d === 'hard' || d === '3') difficulty = Difficulty.HARD;
            }
            
            // Explanation: Explicit -> Fuzzy -> Heuristic
            let explanation = getRowValue(row, ['Explanation', 'explain', 'Reason', 'reason', 'Note', 'Rationale', 'Feedback', 'Context', 'Description', 'Details', 'Info'], true);
            
            if (!explanation && heuristicExplanationKey && row[heuristicExplanationKey]) {
                explanation = String(row[heuristicExplanationKey]).trim();
            }

            if (!text || options.length < 2 || !correctAnswer) {
                return null;
            }

            return {
                id: `file-${index}`,
                text: text,
                options,
                correctAnswer,
                explanation: explanation,
                subject: subjectId,
                difficulty: difficulty
            };
        }).filter((q): q is Question => q !== null);

        if (questions.length === 0) {
            reject(new Error("No valid questions found. Ensure columns: Question, Option A-D, Answer."));
        } else {
            resolve(questions);
        }

      } catch (err) {
        reject(new Error("Failed to parse file. Please ensure it is a valid Excel or CSV file."));
      }
    };

    reader.onerror = () => reject(new Error("Error reading file"));
    reader.readAsBinaryString(file);
  });
};


