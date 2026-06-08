import React, { useState, useRef, useEffect } from 'react';
import { callApi } from '../api';
import { useAppContext } from '../context';

export default function LoginTab() {
  const { users, setCurrentUser, refreshState, showAlert, setActiveTab } = useAppContext();
  const [isRegistering, setIsRegistering] = useState(false);

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const [regName, setRegName] = useState('');
  const [regUsername, setRegUsername] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regSkill, setRegSkill] = useState(2.0);
  const [regReady, setRegReady] = useState(true);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [dropdownRef]);

  const filteredUsers = users.filter(u => u.username.toLowerCase().includes(username.toLowerCase()));

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await callApi('/api/login', 'POST', { username, password });
      if (res.success) {
        setCurrentUser(res.user);
        if (res.user.username === 'admin') {
          setActiveTab('Danh sách chờ');
        } else {
          setActiveTab('Trang cá nhân');
        }
      } else {
        showAlert(res.message);
      }
    } catch (err) {
      showAlert('Lỗi đăng nhập');
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await callApi('/api/register', 'POST', {
        name: regName,
        username: regUsername,
        password: regPassword,
        skillRating: regSkill,
        isReady: regReady
      });
      if (res.success) {
        showAlert('Đăng ký thành công!');
        setIsRegistering(false);
        setUsername(regUsername);
        setPassword(regPassword);
        refreshState(); // Refresh user list
      } else {
        showAlert(res.message);
      }
    } catch (err) {
      showAlert('Lỗi đăng ký');
    }
  };

  if (isRegistering) {
    return (
      <div className="max-w-md mx-auto p-8 rounded-xl border border-white/10 bg-white/5 backdrop-blur-md">
        <h2 className="text-2xl font-bold mb-6 text-emerald-400">Đăng ký tài khoản</h2>
        <form onSubmit={handleRegister} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1 text-white/80">Họ tên</label>
            <input required type="text" className="w-full bg-white/5 border border-white/10 rounded p-2 text-white focus:outline-none focus:border-emerald-500" value={regName} onChange={e => setRegName(e.target.value)} />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1 text-white/80">Username</label>
            <input required type="text" className="w-full bg-white/5 border border-white/10 rounded p-2 text-white focus:outline-none focus:border-emerald-500" value={regUsername} onChange={e => setRegUsername(e.target.value)} />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1 text-white/80">Password</label>
            <input required type="password" className="w-full bg-white/5 border border-white/10 rounded p-2 text-white focus:outline-none focus:border-emerald-500" value={regPassword} onChange={e => setRegPassword(e.target.value)} />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1 text-white/80">Điểm trình ban đầu</label>
            <input required type="number" step="0.1" min="1.0" max="6.0" className="w-full bg-white/5 border border-white/10 rounded p-2 text-white focus:outline-none focus:border-emerald-500" value={regSkill} onChange={e => setRegSkill(Number(e.target.value))} />
          </div>
          <div className="flex items-center gap-2 mt-4">
            <input type="checkbox" id="regReady" className="accent-emerald-500" checked={regReady} onChange={e => setRegReady(e.target.checked)} />
            <label htmlFor="regReady" className="text-sm font-medium text-white/80">Sẵn sàng thi đấu</label>
          </div>
          <button type="submit" className="w-full bg-emerald-500 text-slate-950 font-bold py-2 rounded-lg hover:bg-emerald-400 active:bg-emerald-600 active:text-white uppercase tracking-tight active:scale-[0.98] active:translate-y-[1px] transition-all duration-75">Đăng ký</button>
          <button type="button" onClick={() => setIsRegistering(false)} className="w-full text-emerald-400 font-medium py-2 hover:text-emerald-300 hover:underline active:scale-95 transition-all duration-75">Quay lại Đăng nhập</button>
        </form>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto p-8 rounded-xl border border-white/10 bg-white/5 backdrop-blur-md">
      <h2 className="text-2xl font-bold mb-6 text-emerald-400">Đăng nhập</h2>
      <form onSubmit={handleLogin} className="space-y-4">
        <div className="relative" ref={dropdownRef}>
          <label className="block text-sm font-medium mb-1 text-white/80">Username</label>
          <input 
            required
            type="text" 
            className="w-full bg-white/5 border border-white/10 rounded p-2 text-white placeholder-white/30 focus:outline-none focus:border-emerald-500" 
            placeholder="Tìm kiếm hoặc nhập username"
            value={username} 
            onChange={e => {
              setUsername(e.target.value);
              setShowDropdown(true);
            }} 
            onFocus={() => setShowDropdown(true)}
          />
          {showDropdown && filteredUsers.length > 0 && (
             <ul className="absolute z-10 w-full mt-1 bg-slate-800 border border-white/20 rounded shadow-xl max-h-48 overflow-y-auto">
               {filteredUsers.map(u => (
                 <li 
                   key={u.id}
                   className="px-4 py-2 hover:bg-emerald-500/20 cursor-pointer text-sm text-white"
                   onClick={() => {
                     setUsername(u.username);
                     setShowDropdown(false);
                   }}
                 >
                   <span className="font-bold text-emerald-400">{u.username}</span> <span className="text-white/60 ml-2">- {u.name}</span>
                 </li>
               ))}
             </ul>
          )}
        </div>
        <div>
          <label className="block text-sm font-medium mb-1 text-white/80">Password</label>
          <input required type="password" className="w-full bg-white/5 border border-white/10 rounded p-2 text-white focus:outline-none focus:border-emerald-500" value={password} onChange={e => setPassword(e.target.value)} />
        </div>
        <button type="submit" className="w-full bg-emerald-500 text-slate-950 font-bold py-2 rounded-lg hover:bg-emerald-400 active:bg-emerald-600 active:text-white uppercase tracking-tight active:scale-[0.98] active:translate-y-[1px] transition-all duration-75">Đăng nhập</button>
        <button type="button" onClick={() => setIsRegistering(true)} className="w-full text-emerald-400 font-medium py-2 hover:text-emerald-300 hover:underline active:scale-95 transition-all duration-75">Đăng ký tài khoản mới</button>
      </form>
    </div>
  );
}
