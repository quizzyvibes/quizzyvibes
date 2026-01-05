
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

        // Helper: Case-insensitive & trimmed key lookup
        const getValue = (row: any, candidates: string[]): string | undefined => {
             const rowKeys = Object.keys(row);
             for (const candidate of candidates) {
                 // 1. Exact match
                 if (row[candidate] !== undefined && row[candidate] !== null) {
                     return String(row[candidate]).trim();
                 }
                 
                 // 2. Fuzzy match (case insensitive, trimmed)
                 const foundKey = rowKeys.find(k => k.toLowerCase().trim() === candidate.toLowerCase());
                 if (foundKey && row[foundKey] !== undefined && row[foundKey] !== null) {
                     return String(row[foundKey]).trim();
                 }
             }
             return undefined;
        };

        // Map loosely to Question format
        const questions: Question[] = jsonData.map((row: any, index: number): Question | null => {
            
            // 1. Text
            const text = getValue(row, ['Question', 'question', 'Text', 'text', 'Q']);
            
            // 2. Options
            const options: string[] = [];
            const optA = getValue(row, ['Option A', 'A', 'a', 'option1', 'Option 1']);
            const optB = getValue(row, ['Option B', 'B', 'b', 'option2', 'Option 2']);
            const optC = getValue(row, ['Option C', 'C', 'c', 'option3', 'Option 3']);
            const optD = getValue(row, ['Option D', 'D', 'd', 'option4', 'Option 4']);

            if (optA) options.push(optA);
            if (optB) options.push(optB);
            if (optC) options.push(optC);
            if (optD) options.push(optD);

            // 3. Correct Answer
            let correctAnswer = getValue(row, ['Correct Answer', 'Answer', 'correct', 'answer', 'Ans']) || '';
            
            // Map single letter answers (A, B, C, D) to the actual text
            if (correctAnswer.length === 1 && /^[A-D]$/i.test(correctAnswer)) {
                const map: {[key: string]: number} = {'A':0, 'B':1, 'C':2, 'D':3};
                const idx = map[correctAnswer.toUpperCase()];
                if (idx < options.length) {
                    correctAnswer = options[idx];
                }
            }

            // 4. Subject Parsing
            let rawSubject = getValue(row, ['Subject', 'subject', 'Topic', 'topic', 'Category']) || '';
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

            // 5. Difficulty Parsing
            let rawDiff = getValue(row, ['Difficulty', 'difficulty', 'Level', 'level']) || '';
            let difficulty = undefined;
            if (rawDiff) {
                const d = rawDiff.toLowerCase();
                if (d === 'easy' || d === '1') difficulty = Difficulty.EASY;
                else if (d === 'medium' || d === 'med' || d === '2') difficulty = Difficulty.MEDIUM;
                else if (d === 'hard' || d === '3') difficulty = Difficulty.HARD;
            }
            
            // 6. Explanation Parsing (Robust Check)
            const explanation = getValue(row, ['Explanation', 'explanation', 'Explain', 'explain', 'Reason', 'reason', 'Note']);

            // Validation
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
