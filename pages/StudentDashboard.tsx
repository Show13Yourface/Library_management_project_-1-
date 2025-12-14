import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../App';
import { db } from '../services/db';
import { Book, Transaction, TransactionStatus } from '../types';
import { Button, Input, Card, Badge } from '../components/ui';
import { LogOut, BookOpen, Search, Clock, CheckCircle } from 'lucide-react';
import toast from 'react-hot-toast';

const StudentDashboard: React.FC = () => {
  const { user, logout } = useContext(AuthContext);
  const [activeTab, setActiveTab] = useState<'catalog' | 'my-books'>('catalog');
  
  const [books, setBooks] = useState<Book[]>([]);
  const [myTransactions, setMyTransactions] = useState<Transaction[]>([]);
  const [search, setSearch] = useState('');
  const [refresh, setRefresh] = useState(0);

  useEffect(() => {
    setBooks(db.getBooks());
    if (user) {
      const allTx = db.getTransactions();
      setMyTransactions(allTx.filter(t => t.student_id === user.id));
    }
  }, [user, refresh]);

  const triggerRefresh = () => setRefresh(p => p + 1);

  const handleBorrow = (bookId: string) => {
    if (!user) return;
    try {
      db.createTransaction(user.id, bookId, 'issue');
      toast.success('Request sent to admin');
      triggerRefresh();
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const handleReturn = (bookId: string) => {
    if (!user) return;
    try {
      db.createTransaction(user.id, bookId, 'return');
      toast.success('Return requested. Return book to desk.');
      triggerRefresh();
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const filteredBooks = books.filter(b => 
    b.title.toLowerCase().includes(search.toLowerCase()) || 
    b.author.toLowerCase().includes(search.toLowerCase()) ||
    b.category.toLowerCase().includes(search.toLowerCase())
  );

  // Helper to check book status for current user
  const getBookStatus = (bookId: string) => {
    const activeTx = myTransactions.find(t => 
      t.book_id === bookId && 
      (t.status === TransactionStatus.ISSUED || t.status === TransactionStatus.PENDING || t.status === TransactionStatus.RETURN_REQUESTED)
    );
    return activeTx?.status;
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center sticky top-0 z-10 shadow-sm">
        <div className="flex items-center gap-2">
          <div className="bg-blue-600 p-2 rounded-lg text-white">
            <BookOpen size={20} />
          </div>
          <div>
            <h1 className="font-bold text-xl text-gray-800">Library</h1>
            <p className="text-xs text-gray-500">Welcome, {user?.name}</p>
          </div>
        </div>
        <Button variant="secondary" onClick={logout} className="flex items-center gap-2 text-sm">
          <LogOut size={16} /> Logout
        </Button>
      </header>

      <main className="flex-1 container mx-auto p-6 max-w-5xl">
        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setActiveTab('catalog')}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${activeTab === 'catalog' ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-100'}`}
          >
            Browse Books
          </button>
          <button
            onClick={() => setActiveTab('my-books')}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${activeTab === 'my-books' ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-100'}`}
          >
            My Books
          </button>
        </div>

        {activeTab === 'catalog' && (
          <div className="space-y-6">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
              <Input 
                placeholder="Search by title, author, or category..." 
                className="pl-12 py-3 shadow-sm border-gray-200"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredBooks.map(book => {
                const status = getBookStatus(book.id);
                return (
                  <Card key={book.id} className="flex flex-col h-full hover:shadow-md transition-shadow">
                    <div className="flex-1">
                      <div className="flex justify-between items-start mb-2">
                        <Badge color="gray">{book.category}</Badge>
                        <span className={`text-xs font-semibold ${book.available_copies > 0 ? 'text-green-600' : 'text-red-500'}`}>
                          {book.available_copies} Available
                        </span>
                      </div>
                      <h3 className="font-bold text-gray-900 mb-1">{book.title}</h3>
                      <p className="text-sm text-gray-600 mb-4">by {book.author}</p>
                    </div>
                    
                    <div className="pt-4 border-t border-gray-100 mt-4">
                      {status === TransactionStatus.ISSUED ? (
                        <Button disabled className="w-full bg-green-100 text-green-800 hover:bg-green-200">Currently Borrowed</Button>
                      ) : status === TransactionStatus.PENDING ? (
                        <Button disabled className="w-full bg-yellow-100 text-yellow-800 hover:bg-yellow-200">Pending Approval</Button>
                      ) : status === TransactionStatus.RETURN_REQUESTED ? (
                         <Button disabled className="w-full bg-orange-100 text-orange-800 hover:bg-orange-200">Return Pending</Button>
                      ) : book.available_copies === 0 ? (
                        <Button disabled variant="outline" className="w-full">Out of Stock</Button>
                      ) : (
                        <Button onClick={() => handleBorrow(book.id)} className="w-full">Borrow Book</Button>
                      )}
                    </div>
                  </Card>
                );
              })}
              {filteredBooks.length === 0 && (
                <div className="col-span-full text-center py-12 text-gray-500">No books found matching your search.</div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'my-books' && (
          <div className="space-y-6">
            <h2 className="font-bold text-lg text-gray-800">My Borrowing History</h2>
            <div className="space-y-4">
              {myTransactions.sort((a,b) => b.issue_date.localeCompare(a.issue_date)).map(t => {
                const book = books.find(b => b.id === t.book_id);
                if (!book) return null;

                return (
                  <Card key={t.id} className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5">
                    <div>
                      <h3 className="font-bold text-gray-900">{book.title}</h3>
                      <div className="flex items-center gap-4 mt-1 text-sm text-gray-500">
                        <span>Issued: {t.issue_date}</span>
                        {t.return_date && <span>Returned: {t.return_date}</span>}
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-4">
                      {t.status === TransactionStatus.PENDING && (
                        <Badge color="yellow"><Clock size={12} className="mr-1" /> Request Pending</Badge>
                      )}
                      {t.status === TransactionStatus.ISSUED && (
                        <>
                          <Badge color="blue"><CheckCircle size={12} className="mr-1" /> Issued</Badge>
                          <Button onClick={() => handleReturn(book.id)} variant="outline" className="text-sm py-1">Return Book</Button>
                        </>
                      )}
                      {t.status === TransactionStatus.RETURN_REQUESTED && (
                        <Badge color="yellow">Return Approval Pending</Badge>
                      )}
                      {t.status === TransactionStatus.RETURNED && (
                        <Badge color="green">Returned</Badge>
                      )}
                      {t.status === TransactionStatus.REJECTED && (
                        <Badge color="red">Request Rejected</Badge>
                      )}
                    </div>
                  </Card>
                );
              })}
              {myTransactions.length === 0 && (
                <div className="text-center py-10 bg-white rounded-lg border border-gray-200 text-gray-500">
                  You haven't borrowed any books yet.
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default StudentDashboard;