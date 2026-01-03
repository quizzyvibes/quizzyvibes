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

        // Map loosely to Question format
        const questions: Question[] = jsonData.map((row: any, index: number): Question | null => {
            // Flexible column matching
            const text = row['Question'] || row['question'] || row['Text'];
            
            // Collect options
            const options: string[] = [];
            ['Option A', 'Option B', 'Option C', 'Option D', 'A', 'B', 'C', 'D'].forEach(key => {
                if (row[key]) options.push(String(row[key]));
            });
            // Fallback for numbered options like option1, option2 etc
             if (options.length === 0) {
                 ['option1', 'option2', 'option3', 'option4'].forEach(key => {
                     if (row[key]) options.push(String(row[key]));
                 });
             }

            let correctAnswer = String(row['Correct Answer'] || row['Answer'] || row['correct'] || '');
            
            // If correct answer is a single letter 'A', map it to the option index
            if (correctAnswer.length === 1 && /^[A-D]$/i.test(correctAnswer)) {
                const map: {[key: string]: number} = {'A':0, 'B':1, 'C':2, 'D':3};
                const idx = map[correctAnswer.toUpperCase()];
                if (idx < options.length) {
                    correctAnswer = options[idx];
                }
            }

            // --- New: Subject Parsing ---
            let rawSubject = row['Subject'] || row['subject'] || row['Topic'] || '';
            let subjectId = undefined;
            if (rawSubject) {
                const s = rawSubject.toLowerCase().trim();
                if (s.includes('geo')) subjectId = 'geo';
                else if (s.includes('sci')) subjectId = 'sci';
                else if (s.includes('nut') || s.includes('food')) subjectId = 'nut';
                else if (s.includes('tech') || s.includes('comp')) subjectId = 'tech';
                else if (s.includes('math')) subjectId = 'math';
                else if (s.includes('gen')) subjectId = 'gen';
            }

            // --- New: Difficulty Parsing ---
            let rawDiff = row['Difficulty'] || row['difficulty'] || row['Level'] || '';
            let difficulty = undefined;
            if (rawDiff) {
                const d = String(rawDiff).toLowerCase().trim();
                if (d === 'easy' || d === '1') difficulty = Difficulty.EASY;
                else if (d === 'medium' || d === 'med' || d === '2') difficulty = Difficulty.MEDIUM;
                else if (d === 'hard' || d === '3') difficulty = Difficulty.HARD;
            }

            if (!text || options.length < 2 || !correctAnswer) {
                // Skip invalid rows gracefully
                return null;
            }

            return {
                id: `file-${index}`,
                text: String(text),
                options,
                correctAnswer,
                explanation: row['Explanation'] || row['explanation'],
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