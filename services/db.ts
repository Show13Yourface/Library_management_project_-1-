import { Book, Student, Transaction, TransactionStatus, ParsedStudent } from '../types';

// Keys for LocalStorage
const STORAGE_KEYS = {
  BOOKS: 'lib_books',
  STUDENTS: 'lib_students',
  TRANSACTIONS: 'lib_transactions',
};

// Initial Data if storage is empty
const INITIAL_BOOKS: Book[] = [
  { id: '1', title: 'The Pragmatic Programmer', author: 'Andrew Hunt', category: 'Tech', total_copies: 5, available_copies: 5 },
  { id: '2', title: 'To Kill a Mockingbird', author: 'Harper Lee', category: 'Fiction', total_copies: 3, available_copies: 3 },
  { id: '3', title: 'React Design Patterns', author: 'Multiple', category: 'Tech', total_copies: 2, available_copies: 2 },
];

const INITIAL_STUDENTS: Student[] = [
  { id: 'S1', name: 'Alice Johnson', email: 'alice@test.com', phone: '555-0101', borrowed_books: '[]' },
  { id: 'S2', name: 'Bob Smith', email: 'bob@test.com', phone: '555-0102', borrowed_books: '[]' },
];

const INITIAL_TRANSACTIONS: Transaction[] = [];

// Helper to load from storage
const load = <T>(key: string, initial: T[]): T[] => {
  const stored = localStorage.getItem(key);
  return stored ? JSON.parse(stored) : initial;
};

// Helper to save to storage
const save = (key: string, data: any) => {
  localStorage.setItem(key, JSON.stringify(data));
};

export const db = {
  // --- Books ---
  getBooks: (): Book[] => load(STORAGE_KEYS.BOOKS, INITIAL_BOOKS),
  
  saveBooks: (books: Book[]) => {
    save(STORAGE_KEYS.BOOKS, books);
    // Trigger storage event for cross-tab sync if needed, mostly for single page react refresh
  },

  addBook: (book: Omit<Book, 'id'>) => {
    const books = db.getBooks();
    const newBook = { ...book, id: Date.now().toString() };
    db.saveBooks([...books, newBook]);
    return newBook;
  },

  updateBook: (id: string, updates: Partial<Book>) => {
    const books = db.getBooks();
    const updated = books.map(b => b.id === id ? { ...b, ...updates } : b);
    db.saveBooks(updated);
  },

  deleteBook: (id: string) => {
    const books = db.getBooks();
    db.saveBooks(books.filter(b => b.id !== id));
  },

  // --- Students ---
  getStudents: (): Student[] => load(STORAGE_KEYS.STUDENTS, INITIAL_STUDENTS),
  
  saveStudents: (students: Student[]) => save(STORAGE_KEYS.STUDENTS, students),

  getStudentByEmail: (email: string): Student | undefined => {
    return db.getStudents().find(s => s.email.toLowerCase() === email.toLowerCase());
  },

  updateStudentBorrowedBooks: (studentId: string, bookId: string, action: 'add' | 'remove') => {
    const students = db.getStudents();
    const updatedStudents = students.map(s => {
      if (s.id === studentId) {
        let borrowed: string[] = [];
        try {
          borrowed = JSON.parse(s.borrowed_books || '[]');
        } catch (e) { borrowed = []; }

        if (action === 'add') {
          if (!borrowed.includes(bookId)) borrowed.push(bookId);
        } else {
          borrowed = borrowed.filter(id => id !== bookId);
        }
        return { ...s, borrowed_books: JSON.stringify(borrowed) };
      }
      return s;
    });
    db.saveStudents(updatedStudents);
  },

  // --- Transactions ---
  getTransactions: (): Transaction[] => load(STORAGE_KEYS.TRANSACTIONS, INITIAL_TRANSACTIONS),
  
  saveTransactions: (txs: Transaction[]) => save(STORAGE_KEYS.TRANSACTIONS, txs),

  createTransaction: (studentId: string, bookId: string, type: 'issue' | 'return') => {
    const txs = db.getTransactions();
    // Check if there is already a pending request
    const existingPending = txs.find(t => 
      t.student_id === studentId && 
      t.book_id === bookId && 
      (t.status === TransactionStatus.PENDING || t.status === TransactionStatus.RETURN_REQUESTED)
    );

    if (existingPending) throw new Error("A pending request already exists for this book.");

    if (type === 'issue') {
      const newTx: Transaction = {
        id: Date.now().toString(),
        student_id: studentId,
        book_id: bookId,
        issue_date: new Date().toISOString().split('T')[0],
        status: TransactionStatus.PENDING
      };
      db.saveTransactions([...txs, newTx]);
    } else {
      // For return, find the issued transaction
      const issuedTx = txs.find(t => 
        t.student_id === studentId && 
        t.book_id === bookId && 
        t.status === TransactionStatus.ISSUED
      );
      if (!issuedTx) throw new Error("No active issued record found for this book.");
      
      const updatedTxs = txs.map(t => 
        t.id === issuedTx.id ? { ...t, status: TransactionStatus.RETURN_REQUESTED } : t
      );
      db.saveTransactions(updatedTxs);
    }
  },

  processTransaction: (txId: string, action: 'approve' | 'reject') => {
    const txs = db.getTransactions();
    const tx = txs.find(t => t.id === txId);
    if (!tx) return;

    const books = db.getBooks();
    const book = books.find(b => b.id === tx.book_id);

    if (action === 'reject') {
        const newStatus = tx.status === TransactionStatus.PENDING ? TransactionStatus.REJECTED : TransactionStatus.ISSUED; 
        // If return request rejected, goes back to issued. If issue request rejected, goes to rejected (history) or just delete? Let's say REJECTED.
        
        const updatedTxs = txs.map(t => t.id === txId ? { ...t, status: TransactionStatus.REJECTED } : t);
        db.saveTransactions(updatedTxs);
        return;
    }

    // Approve Logic
    if (tx.status === TransactionStatus.PENDING) {
      if (!book || book.available_copies < 1) throw new Error("Book not available");
      
      // Update Transaction
      const updatedTxs = txs.map(t => 
        t.id === txId ? { ...t, status: TransactionStatus.ISSUED, issue_date: new Date().toISOString().split('T')[0] } : t
      );
      db.saveTransactions(updatedTxs);

      // Update Book Copies
      db.updateBook(book.id, { available_copies: book.available_copies - 1 });

      // Update Student Record
      db.updateStudentBorrowedBooks(tx.student_id, tx.book_id, 'add');

    } else if (tx.status === TransactionStatus.RETURN_REQUESTED) {
      // Update Transaction
      const updatedTxs = txs.map(t => 
        t.id === txId ? { ...t, status: TransactionStatus.RETURNED, return_date: new Date().toISOString().split('T')[0] } : t
      );
      db.saveTransactions(updatedTxs);

      // Update Book Copies
      if (book) {
        db.updateBook(book.id, { available_copies: book.available_copies + 1 });
      }

      // Update Student Record
      db.updateStudentBorrowedBooks(tx.student_id, tx.book_id, 'remove');
    }
  },

  // --- Reset/Import ---
  importData: (books: Book[], students: Student[], transactions: Transaction[]) => {
    db.saveBooks(books);
    db.saveStudents(students);
    db.saveTransactions(transactions);
  }
};
