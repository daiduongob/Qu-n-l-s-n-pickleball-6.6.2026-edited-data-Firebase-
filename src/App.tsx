import { useEffect, useState, useRef } from 'react';
import { AppContext } from './context';
import { AppState, User } from './types';
import { fetchState } from './api';

import LoginTab from './components/LoginTab';
import ProfileTab from './components/ProfileTab';
import CourtsTab from './components/CourtsTab';
import WaitingListTab from './components/WaitingListTab';
import StatsTab from './components/StatsTab';
import AdminTab from './components/AdminTab';

// Main App Component
export default function App() {
  const [state, setState] = useState<AppState>({ users: [], courts: [], matches: [] });
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState('Đăng nhập');
  const [alertMessage, setAlertMessage] = useState<string | null>(null);
  const [confirmData, setConfirmData] = useState<{ message: string, onConfirm: () => void } | null>(null);

  const currentUserRef = useRef<User | null>(currentUser);

  useEffect(() => {
    currentUserRef.current = currentUser;
  }, [currentUser]);

  const showAlert = (message: string) => setAlertMessage(message);
  const showConfirm = (message: string, onConfirm: () => void) => setConfirmData({ message, onConfirm });

  const refreshState = async () => {
    try {
      const data = await fetchState();
      setState(data);
      
      const latestUser = currentUserRef.current;
      if (latestUser) {
        const upUser = data.users.find((u: User) => u.id === latestUser.id);
        if (upUser) {
           if (currentUserRef.current && currentUserRef.current.id === latestUser.id) {
              setCurrentUser(upUser);
           }
        } else {
           if (currentUserRef.current && currentUserRef.current.id === latestUser.id) {
              setCurrentUser(null);
              setActiveTab('Đăng nhập');
           }
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    refreshState();
    const interval = setInterval(refreshState, 1500); // UI poll interval
    return () => clearInterval(interval);
  }, [currentUser?.id]);

  const handleLogout = () => {
    showConfirm('Bạn có chắc chắn muốn thoát hay không?', () => {
      setCurrentUser(null);
      setActiveTab('Đăng nhập');
    });
  };

  // derived status bar text
  const emptyCourtsCount = state.courts.filter(c => c.status === 'empty').length;

  const isAdmin = currentUser?.username === 'admin';

  const tabs = [
    { name: 'Đăng nhập', show: !currentUser || isAdmin },
    { name: 'Trang cá nhân', show: !!currentUser },
    { name: 'Quản lý sân & Trận đấu', show: isAdmin },
    { name: 'Danh sách chờ', show: !!currentUser },
    { name: 'Thống kê báo cáo', show: isAdmin },
    { name: 'Admin', show: isAdmin },
    { name: 'Đăng xuất', show: !!currentUser },
  ];

  const handleTabClick = (t: string) => {
    if (t === 'Đăng xuất') {
      handleLogout();
    } else {
      setActiveTab(t);
    }
  };

  return (
    <AppContext.Provider value={{ ...state, currentUser, setCurrentUser, refreshState, showAlert, showConfirm, setActiveTab }}>
      <div className="min-h-screen bg-slate-950 text-white font-sans flex flex-col relative overflow-hidden">
        {/* Background Gradients */}
        <div className="absolute inset-0 z-0 opacity-40 pointer-events-none">
          <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-emerald-600/30 rounded-full blur-[120px]"></div>
          <div className="absolute bottom-[-10%] right-[-10%] w-[600px] h-[600px] bg-blue-600/20 rounded-full blur-[120px]"></div>
        </div>

        {/* Header */}
        <header className="relative z-10 p-4 border-b border-white/10 backdrop-blur-xl bg-white/5">
          <div className="max-w-7xl mx-auto flex flex-col">
            <div className="flex justify-between items-center mb-4">
              <h1 className="text-2xl font-black tracking-tighter text-emerald-400">
                QUẢN LÝ SÂN PICKLEBALL
              </h1>
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
                <span className="text-[10px] uppercase tracking-widest text-emerald-500 font-bold">Hệ thống thời gian thực</span>
              </div>
            </div>
            {/* Nav Tabs */}
            <nav className="flex space-x-1 overflow-x-auto pb-1">
              {tabs.filter(t => t.show).map(t => (
                <button
                  key={t.name}
                  onClick={() => handleTabClick(t.name)}
                  className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors whitespace-nowrap ${
                    activeTab === t.name 
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 shadow-lg shadow-emerald-500/10' 
                    : t.name === 'Đăng xuất' ? 'text-rose-400 hover:bg-rose-500/10' : 'text-white/80 hover:bg-white/10'
                  }`}
                >
                  {t.name}
                </button>
              ))}
            </nav>
          </div>
        </header>

        {/* Main Content */}
        <main className="relative z-10 flex-1 max-w-7xl mx-auto w-full p-4 overflow-y-auto">
          {activeTab === 'Đăng nhập' && <LoginTab />}
          {activeTab === 'Trang cá nhân' && currentUser && <ProfileTab />}
          {activeTab === 'Quản lý sân & Trận đấu' && isAdmin && <CourtsTab />}
          {activeTab === 'Danh sách chờ' && currentUser && <WaitingListTab />}
          {activeTab === 'Thống kê báo cáo' && <StatsTab />}
          {activeTab === 'Admin' && isAdmin && <AdminTab />}
        </main>

        {/* Status Bar */}
        <footer className="relative z-10 p-3 bg-emerald-500/10 border-t border-emerald-500/20 backdrop-blur-xl flex justify-between items-center mt-auto">
          <div className="flex items-center space-x-4 max-w-7xl mx-auto w-full">
            <div className="text-[10px]">
              <span className="text-white/40 uppercase tracking-widest">Đăng nhập: </span>
              <span className="ml-1 text-emerald-400 font-bold">{currentUser ? currentUser.username : 'Chưa đăng nhập'}</span>
            </div>
            <div className="flex items-center text-[10px] space-x-1 px-2 py-1 bg-white/5 rounded border border-white/10 uppercase tracking-widest ml-auto">
              <span className="text-white/40">Sân trống: </span>
              <span className="font-bold text-emerald-400">{emptyCourtsCount} / {state.courts.length}</span>
            </div>
          </div>
        </footer>

        {/* Modals for Alert and Confirm */}
        {alertMessage && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
            <div className="bg-slate-900 border border-white/10 p-6 rounded-xl max-w-sm w-full shadow-2xl">
              <h3 className="text-emerald-400 font-bold mb-4 uppercase tracking-widest text-sm">Thông báo</h3>
              <p className="text-white/80 mb-6 font-medium leading-relaxed">{alertMessage}</p>
              <div className="flex justify-end">
                <button onClick={() => setAlertMessage(null)} className="px-6 py-2 bg-emerald-500 text-slate-950 font-black rounded-lg uppercase tracking-tight text-xs hover:bg-emerald-400 transition-colors">Đóng</button>
              </div>
            </div>
          </div>
        )}

        {confirmData && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
            <div className="bg-slate-900 border border-white/10 p-6 rounded-xl max-w-sm w-full shadow-2xl">
              <h3 className="text-amber-400 font-bold mb-4 uppercase tracking-widest text-sm">Xác nhận</h3>
              <p className="text-white/80 mb-6 font-medium leading-relaxed">{confirmData.message}</p>
              <div className="flex justify-end gap-3">
                <button onClick={() => setConfirmData(null)} className="px-4 py-2 bg-white/5 text-white/80 rounded-lg hover:bg-white/10 uppercase tracking-widest text-xs font-bold transition-colors">Hủy</button>
                <button onClick={() => { confirmData.onConfirm(); setConfirmData(null); }} className="px-6 py-2 bg-amber-500 text-slate-950 font-black rounded-lg uppercase tracking-tight text-xs hover:bg-amber-400 transition-colors">Đồng ý</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppContext.Provider>
  );
}
