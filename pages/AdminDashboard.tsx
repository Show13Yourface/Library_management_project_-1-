import React, { useState, useEffect } from 'react';
import { AuthContext } from '../App';
import { db } from '../services/db';
import { Book, Student, Transaction, TransactionStatus } from '../types';
import { readExcelFile, downloadExcelFile, generateSampleFiles } from '../utils/excel';
import { Button, Input, Card, Badge } from '../components/ui';
import { LogOut, Book as BookIcon, Users, FileSpreadsheet, Plus, Trash2, Edit2, Check, X, Download, Upload } from 'lucide-react';
import toast from 'react-hot-toast';

const AdminDashboard: React.FC = () => {
  const { logout } = React.useContext(AuthContext);
  const [activeTab, setActiveTab] = useState<'books' | 'students' | 'transactions'>('books');
  
  // Data State
  const [books, setBooks] = useState<Book[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [refresh, setRefresh] = useState(0);

  // Form State
  const [isBookModalOpen, setIsBookModalOpen] = useState(false);
  const [editingBook, setEditingBook] = useState<Book | null>(null);
  const [bookForm, setBookForm] = useState<Partial<Book>>({});

  useEffect(() => {
    setBooks(db.getBooks());
    setStudents(db.getStudents());
    setTransactions(db.getTransactions());
  }, [refresh]);

  const triggerRefresh = () => setRefresh(p => p + 1);

  // --- Excel Handlers ---
  const handleExport = () => {
    downloadExcelFile(books, 'books');
    downloadExcelFile(students, 'students');
    downloadExcelFile(transactions, 'transactions');
    toast.success('Data exported to Excel files');
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'books' | 'students' | 'transactions') => {
    if (!e.target.files?.[0]) return;
    try {
      const data = await readExcelFile(e.target.files[0]);
      if (type === 'books') db.saveBooks(data as Book[]);
      if (type === 'students') db.saveStudents(data as Student[]);
      if (type === 'transactions') db.saveTransactions(data as Transaction[]);
      
      triggerRefresh();
      toast.success(`${type} imported successfully`);
    } catch (error) {
      toast.error('Failed to parse Excel file');
      console.error(error);
    }
  };

  // --- Book Actions ---
  const handleSaveBook = (e: React.FormEvent) => {
    e.preventDefault();
    if (!bookForm.title || !bookForm.author || !bookForm.total_copies) return;

    if (editingBook) {
      db.updateBook(editingBook.id, bookForm);
      toast.success('Book updated');
    } else {
      db.addBook({
        title: bookForm.title!,
        author: bookForm.author!,
        category: bookForm.category || 'General',
        total_copies: Number(bookForm.total_copies),
        available_copies: Number(bookForm.total_copies) // Default available = total
      });
      toast.success('Book added');
    }
    setIsBookModalOpen(false);
    setEditingBook(null);
    setBookForm({});
    triggerRefresh();
  };

  const handleDeleteBook = (id: string) => {
    if (confirm('Are you sure you want to delete this book?')) {
      db.deleteBook(id);
      triggerRefresh();
      toast.success('Book deleted');
    }
  };

  // --- Transaction Actions ---
  const handleTransaction = (id: string, action: 'approve' | 'reject') => {
    try {
      db.processTransaction(id, action);
      triggerRefresh();
      toast.success(`Request ${action}ed`);
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center sticky top-0 z-10 shadow-sm">
        <div className="flex items-center gap-2">
          <div className="bg-blue-600 p-2 rounded-lg text-white">
            <BookIcon size={20} />
          </div>
          <span className="font-bold text-xl text-gray-800">Admin Panel</span>
        </div>
        <div className="flex items-center gap-4">
          <Button variant="outline" onClick={handleExport} className="flex items-center gap-2 text-sm">
            <Download size={16} /> Export Excel
          </Button>
           <Button variant="outline" onClick={generateSampleFiles} className="flex items-center gap-2 text-sm">
            <FileSpreadsheet size={16} /> Sample Data
          </Button>
          <Button variant="secondary" onClick={logout} className="flex items-center gap-2 text-sm">
            <LogOut size={16} /> Logout
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 container mx-auto p-6 max-w-7xl">
        
        {/* Navigation Tabs */}
        <div className="flex gap-4 mb-6 border-b border-gray-200">
          <button 
            onClick={() => setActiveTab('books')}
            className={`pb-3 px-1 font-medium text-sm transition-colors relative ${activeTab === 'books' ? 'text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
          >
            Manage Books
            {activeTab === 'books' && <span className="absolute bottom-0 left-0 w-full h-0.5 bg-blue-600"></span>}
          </button>
          <button 
            onClick={() => setActiveTab('students')}
            className={`pb-3 px-1 font-medium text-sm transition-colors relative ${activeTab === 'students' ? 'text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
          >
            Students
            {activeTab === 'students' && <span className="absolute bottom-0 left-0 w-full h-0.5 bg-blue-600"></span>}
          </button>
          <button 
            onClick={() => setActiveTab('transactions')}
            className={`pb-3 px-1 font-medium text-sm transition-colors relative ${activeTab === 'transactions' ? 'text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
          >
            Transactions
            {transactions.filter(t => t.status === TransactionStatus.PENDING || t.status === TransactionStatus.RETURN_REQUESTED).length > 0 && (
              <span className="ml-2 bg-red-500 text-white text-[10px] px-1.5 py-0.5 rounded-full">
                {transactions.filter(t => t.status === TransactionStatus.PENDING || t.status === TransactionStatus.RETURN_REQUESTED).length}
              </span>
            )}
            {activeTab === 'transactions' && <span className="absolute bottom-0 left-0 w-full h-0.5 bg-blue-600"></span>}
          </button>
        </div>

        {/* --- BOOKS TAB --- */}
        {activeTab === 'books' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center bg-blue-50 p-4 rounded-lg border border-blue-100">
              <div>
                <h3 className="text-blue-900 font-semibold">Import Books</h3>
                <p className="text-sm text-blue-700">Upload books.xlsx to bulk update</p>
              </div>
              <div className="flex items-center gap-2">
                <input 
                  type="file" 
                  accept=".xlsx, .xls" 
                  className="hidden" 
                  id="books-upload"
                  onChange={(e) => handleFileUpload(e, 'books')}
                />
                <label htmlFor="books-upload" className="cursor-pointer bg-white text-blue-600 border border-blue-200 hover:bg-blue-50 px-3 py-2 rounded-md text-sm font-medium flex items-center gap-2 transition-colors">
                  <Upload size={16} /> Upload Excel
                </label>
                <Button onClick={() => { setEditingBook(null); setBookForm({}); setIsBookModalOpen(true); }} className="flex items-center gap-2">
                  <Plus size={16} /> Add Book
                </Button>
              </div>
            </div>

            <Card className="overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="bg-gray-50 text-gray-700 font-medium">
                    <tr>
                      <th className="px-4 py-3">ID</th>
                      <th className="px-4 py-3">Title</th>
                      <th className="px-4 py-3">Author</th>
                      <th className="px-4 py-3">Category</th>
                      <th className="px-4 py-3">Total</th>
                      <th className="px-4 py-3">Available</th>
                      <th className="px-4 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {books.map(book => (
                      <tr key={book.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3 text-gray-500">#{book.id}</td>
                        <td className="px-4 py-3 font-medium text-gray-900">{book.title}</td>
                        <td className="px-4 py-3 text-gray-600">{book.author}</td>
                        <td className="px-4 py-3 text-gray-600">{book.category}</td>
                        <td className="px-4 py-3 text-gray-600">{book.total_copies}</td>
                        <td className="px-4 py-3">
                          <span className={book.available_copies > 0 ? "text-green-600 font-medium" : "text-red-500 font-medium"}>
                            {book.available_copies}
                          </span>
                        </td>
                        <td className="px-4 py-3 flex justify-end gap-2">
                          <button 
                            onClick={() => { setEditingBook(book); setBookForm(book); setIsBookModalOpen(true); }}
                            className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                          >
                            <Edit2 size={16} />
                          </button>
                          <button 
                            onClick={() => handleDeleteBook(book.id)}
                            className="p-1.5 text-red-600 hover:bg-red-50 rounded-md transition-colors"
                          >
                            <Trash2 size={16} />
                          </button>
                        </td>
                      </tr>
                    ))}
                    {books.length === 0 && (
                      <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-500">No books found. Import or add some.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>
        )}

        {/* --- STUDENTS TAB --- */}
        {activeTab === 'students' && (
           <div className="space-y-4">
             <div className="flex justify-between items-center bg-gray-50 p-4 rounded-lg border border-gray-200">
              <div>
                <h3 className="text-gray-900 font-semibold">Import Students</h3>
                <p className="text-sm text-gray-500">Update student database from Excel</p>
              </div>
              <div className="flex items-center gap-2">
                 <input 
                  type="file" 
                  accept=".xlsx, .xls" 
                  className="hidden" 
                  id="students-upload"
                  onChange={(e) => handleFileUpload(e, 'students')}
                />
                <label htmlFor="students-upload" className="cursor-pointer bg-white text-gray-700 border border-gray-300 hover:bg-gray-50 px-3 py-2 rounded-md text-sm font-medium flex items-center gap-2 transition-colors">
                  <Upload size={16} /> Upload Excel
                </label>
              </div>
            </div>
            
            <Card className="overflow-hidden">
               <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="bg-gray-50 text-gray-700 font-medium">
                    <tr>
                      <th className="px-4 py-3">ID</th>
                      <th className="px-4 py-3">Name</th>
                      <th className="px-4 py-3">Email</th>
                      <th className="px-4 py-3">Phone</th>
                      <th className="px-4 py-3">Active Borrows</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {students.map(s => {
                      let borrowedCount = 0;
                      try { borrowedCount = JSON.parse(s.borrowed_books || '[]').length; } catch(e) {}
                      return (
                        <tr key={s.id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-4 py-3 text-gray-500">#{s.id}</td>
                          <td className="px-4 py-3 font-medium text-gray-900">{s.name}</td>
                          <td className="px-4 py-3 text-gray-600">{s.email}</td>
                          <td className="px-4 py-3 text-gray-600">{s.phone}</td>
                          <td className="px-4 py-3">
                            <Badge color={borrowedCount > 0 ? 'blue' : 'gray'}>{borrowedCount} Books</Badge>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </Card>
           </div>
        )}

        {/* --- TRANSACTIONS TAB --- */}
        {activeTab === 'transactions' && (
          <div className="space-y-6">
            <h3 className="font-semibold text-lg text-gray-800">Pending Requests</h3>
            {/* Pending Requests */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {transactions
                .filter(t => t.status === TransactionStatus.PENDING || t.status === TransactionStatus.RETURN_REQUESTED)
                .map(t => {
                  const student = students.find(s => s.id === t.student_id);
                  const book = books.find(b => b.id === t.book_id);
                  const isReturn = t.status === TransactionStatus.RETURN_REQUESTED;

                  return (
                    <Card key={t.id} className="border-l-4 border-l-yellow-400">
                      <div className="flex justify-between items-start mb-2">
                        <Badge color={isReturn ? 'yellow' : 'blue'}>{isReturn ? 'Return Request' : 'Issue Request'}</Badge>
                        <span className="text-xs text-gray-400">{t.issue_date}</span>
                      </div>
                      <h4 className="font-semibold text-gray-900 truncate" title={book?.title}>{book?.title || 'Unknown Book'}</h4>
                      <p className="text-sm text-gray-600 mb-4">{student?.name || 'Unknown Student'} ({student?.id})</p>
                      <div className="flex gap-2">
                        <Button onClick={() => handleTransaction(t.id, 'approve')} className="flex-1 bg-green-600 hover:bg-green-700 py-1.5 text-sm">
                          Approve
                        </Button>
                        <Button onClick={() => handleTransaction(t.id, 'reject')} variant="danger" className="flex-1 py-1.5 text-sm">
                          Reject
                        </Button>
                      </div>
                    </Card>
                  )
              })}
              {transactions.filter(t => t.status === TransactionStatus.PENDING || t.status === TransactionStatus.RETURN_REQUESTED).length === 0 && (
                <div className="col-span-full text-center py-10 bg-gray-50 rounded-lg border border-dashed border-gray-300 text-gray-500">
                  No pending requests at the moment.
                </div>
              )}
            </div>

            <h3 className="font-semibold text-lg text-gray-800 pt-4">Transaction History</h3>
            <Card className="overflow-hidden">
               <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="bg-gray-50 text-gray-700 font-medium">
                    <tr>
                      <th className="px-4 py-3">ID</th>
                      <th className="px-4 py-3">Book</th>
                      <th className="px-4 py-3">Student</th>
                      <th className="px-4 py-3">Issue Date</th>
                      <th className="px-4 py-3">Return Date</th>
                      <th className="px-4 py-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {transactions
                      .filter(t => t.status !== TransactionStatus.PENDING && t.status !== TransactionStatus.RETURN_REQUESTED)
                      .sort((a, b) => b.issue_date.localeCompare(a.issue_date))
                      .map(t => (
                      <tr key={t.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-gray-500">#{t.id.slice(-4)}</td>
                         <td className="px-4 py-3">{books.find(b => b.id === t.book_id)?.title || t.book_id}</td>
                        <td className="px-4 py-3">{students.find(s => s.id === t.student_id)?.name || t.student_id}</td>
                        <td className="px-4 py-3">{t.issue_date}</td>
                        <td className="px-4 py-3">{t.return_date || '-'}</td>
                        <td className="px-4 py-3">
                          <Badge color={
                            t.status === TransactionStatus.ISSUED ? 'blue' :
                            t.status === TransactionStatus.RETURNED ? 'green' : 'red'
                          }>
                            {t.status.toUpperCase()}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>
        )}
      </main>

      {/* --- ADD/EDIT BOOK MODAL --- */}
      {isBookModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <Card className="w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">{editingBook ? 'Edit Book' : 'Add New Book'}</h2>
            <form onSubmit={handleSaveBook} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                <Input value={bookForm.title || ''} onChange={e => setBookForm({...bookForm, title: e.target.value})} required />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Author</label>
                <Input value={bookForm.author || ''} onChange={e => setBookForm({...bookForm, author: e.target.value})} required />
              </div>
              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                  <Input value={bookForm.category || ''} onChange={e => setBookForm({...bookForm, category: e.target.value})} placeholder="General" />
                </div>
                <div className="w-24">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Copies</label>
                  <Input type="number" value={bookForm.total_copies || ''} onChange={e => setBookForm({...bookForm, total_copies: Number(e.target.value)})} required min="1" />
                </div>
              </div>
              <div className="flex justify-end gap-2 mt-6">
                <Button type="button" variant="outline" onClick={() => setIsBookModalOpen(false)}>Cancel</Button>
                <Button type="submit">Save Book</Button>
              </div>
            </form>
          </Card>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;