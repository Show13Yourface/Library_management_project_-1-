export interface Book {
  id: string;
  title: string;
  author: string;
  category: string;
  total_copies: number;
  available_copies: number;
}

export interface Student {
  id: string;
  name: string;
  email: string;
  phone: string;
  borrowed_books: string; // JSON string as per requirement
}

export interface ParsedStudent extends Omit<Student, 'borrowed_books'> {
  borrowed_books: string[]; // Parsed array of book IDs
}

export enum TransactionStatus {
  PENDING = 'pending',
  ISSUED = 'issued',
  RETURN_REQUESTED = 'return_requested',
  RETURNED = 'returned',
  REJECTED = 'rejected'
}

export interface Transaction {
  id: string;
  student_id: string;
  book_id: string;
  issue_date: string;
  return_date?: string;
  status: TransactionStatus;
}

export enum UserRole {
  ADMIN = 'ADMIN',
  STUDENT = 'STUDENT'
}

export interface User {
  id: string;
  name: string;
  role: UserRole;
  email?: string;
}
