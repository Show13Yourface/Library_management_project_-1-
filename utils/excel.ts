import * as XLSX from 'xlsx';
import { Book, Student, Transaction } from '../types';

// Helper to read a file and return JSON
export const readExcelFile = <T>(file: File): Promise<T[]> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json<T>(sheet);
        resolve(jsonData);
      } catch (error) {
        reject(error);
      }
    };
    reader.onerror = (error) => reject(error);
    reader.readAsBinaryString(file);
  });
};

// Helper to download data as Excel
export const downloadExcelFile = (data: any[], fileName: string) => {
  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Sheet1');
  XLSX.writeFile(workbook, `${fileName}.xlsx`);
};

// Generate Sample Files for user to download
export const generateSampleFiles = () => {
  const books: Book[] = [
    { id: '101', title: 'The Great Gatsby', author: 'F. Scott Fitzgerald', category: 'Fiction', total_copies: 5, available_copies: 5 },
    { id: '102', title: 'Clean Code', author: 'Robert C. Martin', category: 'Technology', total_copies: 3, available_copies: 3 },
    { id: '103', title: 'Introduction to Algorithms', author: 'Cormen', category: 'Education', total_copies: 2, available_copies: 2 },
  ];

  const students: Student[] = [
    { id: 'S001', name: 'John Doe', email: 'john@example.com', phone: '1234567890', borrowed_books: '[]' },
    { id: 'S002', name: 'Jane Smith', email: 'jane@example.com', phone: '0987654321', borrowed_books: '[]' },
  ];

  const transactions: Transaction[] = [];

  downloadExcelFile(books, 'books');
  setTimeout(() => downloadExcelFile(students, 'students'), 500);
  setTimeout(() => downloadExcelFile(transactions, 'transactions'), 1000);
};
