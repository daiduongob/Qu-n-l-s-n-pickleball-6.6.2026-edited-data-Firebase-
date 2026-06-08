import React, { useState } from 'react';
import { useAppContext } from '../context';
import { callApi } from '../api';
import { User } from '../types';

export default function AdminTab() {
  const { currentUser, users, matches, courts, refreshState, showAlert, showConfirm, setSelectedUserForProfile, setActiveTab } = useAppContext();
  
  const [editingUser, setEditingUser] = useState<User | null>(null);
  
  // For edit form
  const [editName, setEditName] = useState('');
  const [editUsername, setEditUsername] = useState('');
  const [editPassword, setEditPassword] = useState('');
  const [editSkill, setEditSkill] = useState(0);
  const [editIsReady, setEditIsReady] = useState(false);
  const [editStatus, setEditStatus] = useState<'free' | 'playing'>('free');
  const [searchQuery, setSearchQuery] = useState('');

  // Match counts for sorting
  const userMatchCounts: Record<string, number> = {};
  users.forEach(u => userMatchCounts[u.id] = 0);
  matches.forEach(m => {
    m.teamA.forEach(id => userMatchCounts[id] = (userMatchCounts[id] || 0) + 1);
    m.teamB.forEach(id => userMatchCounts[id] = (userMatchCounts[id] || 0) + 1);
  });

  // Sort alphabetically by name (Vietnamese locale)
  const sortedUsers = [...users].sort((a, b) => a.name.localeCompare(b.name, 'vi', { sensitivity: 'base' }));

  const normalizeStr = (str: string) => {
    return str
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/đ/g, "d");
  };

  const filteredUsers = sortedUsers.filter(u => {
    if (!searchQuery.trim()) return true;
    return normalizeStr(u.name).includes(normalizeStr(searchQuery));
  });

  const getCourtName = (id: string | null) => {
    if (!id) return '-';
    return courts.find(c => c.id === id)?.name || id;
  };

  const handleEditClick = (u: User) => {
    if (currentUser?.username === 'adminThuNghiem1h') {
      showAlert('Tài khoản adminThuNghiem1h không có quyền sửa đổi thông tin người chơi!');
      return;
    }
    setEditingUser(u);
    setEditName(u.name);
    setEditUsername(u.username);
    setEditPassword('');
    setEditSkill(u.skillRating);
    setEditIsReady(u.isReady);
    setEditStatus(u.status);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    await callApi(`/api/users/${editingUser.id}`, 'POST', {
      name: editName,
      username: editUsername,
      password: editPassword || undefined,
      skillRating: editSkill,
      isReady: editIsReady,
      status: editStatus
    });
    setEditingUser(null);
    refreshState();
  };

  const handleDelete = async (id: string) => {
    if (currentUser?.username === 'adminThuNghiem1h') {
      showAlert('Tài khoản adminThuNghiem1h không có quyền xóa người chơi!');
      return;
    }
    if (id === 'admin') {
      showAlert('Không thể xóa admin');
      return;
    }
    showConfirm('Chắc chắn xóa người chơi này? Toàn bộ dữ liệu sẽ bị mất.', async () => {
      await callApi(`/api/users/${id}`, 'DELETE');
      refreshState();
    });
  };

  const handleRowClick = (u: User) => {
    setSelectedUserForProfile(u);
    setActiveTab('Trang cá nhân');
  };

  return (
    <div className="p-4 rounded-xl border border-white/10 bg-white/5 backdrop-blur-md text-white animate-fade-in">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-4">
        <div>
          <h2 className="text-sm font-bold uppercase tracking-wider text-emerald-400">Admin - Quản lý Người Chơi</h2>
          <p className="text-[10px] text-white/40 mt-1 uppercase tracking-tight">Mẹo: Bấm vào một dòng để mở xem nhanh trang cá nhân & thống kê chi tiết</p>
        </div>
        <div className="relative w-full md:w-64 shrink-0">
          <input 
            type="text" 
            placeholder="Tìm theo tên..." 
            className="w-full bg-white/5 border border-white/10 rounded-lg py-2 pl-8 pr-12 text-xs text-white focus:outline-none focus:border-emerald-500 placeholder-white/30"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
          <svg className="w-3.5 h-3.5 text-white/40 absolute left-2.5 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          {searchQuery && (
            <button 
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] text-white/40 hover:text-white uppercase font-bold active:scale-90"
            >
              xóa
            </button>
          )}
        </div>
      </div>
      
      <div className="overflow-auto max-h-[555px] border border-white/10 rounded-lg bg-slate-900/50 relative">
        <table className="w-full text-xs text-left whitespace-nowrap table-fixed min-w-[1050px]">
          <thead className="bg-[#0f172a] text-white/40 uppercase text-[10px] tracking-widest border-b border-white/10 sticky top-0 z-10">
            <tr>
              <th className="p-3 text-center w-[60px]">STT</th>
              <th className="p-3 w-[240px]">Tên</th>
              <th className="p-3 w-[140px]">Username</th>
              <th className="p-3 text-center w-[80px]">Trình</th>
              <th className="p-3 text-center w-[80px]">Trận</th>
              <th className="p-3 text-center w-[110px]">SS Thi đấu</th>
              <th className="p-3 text-center w-[110px]">Trạng thái</th>
              <th className="p-3 text-center w-[100px]">Sân</th>
              <th className="p-3 text-right w-[130px]">Thao tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {filteredUsers.map((u, i) => (
              <tr 
                key={u.id} 
                onClick={() => handleRowClick(u)}
                className="hover:bg-white/10 transition-all cursor-pointer group"
              >
                <td className="p-3 text-center text-white/40 font-bold group-hover:text-emerald-400 w-[60px] truncate">{i + 1}</td>
                <td className="p-3 font-bold text-white group-hover:text-emerald-400 transition-colors w-[240px] truncate">
                  <div className="flex items-center gap-1.5 truncate">
                    <span className="truncate">{u.name}</span>
                    <span className="text-[9px] text-white/20 font-normal px-1.5 py-0.5 border border-white/5 rounded hidden group-hover:inline-block shrink-0">Profile</span>
                  </div>
                </td>
                <td className="p-3 text-white/60 w-[140px] truncate">{u.username}</td>
                <td className="p-3 text-center font-black text-emerald-400 w-[80px] truncate">{u.skillRating.toFixed(1)}</td>
                <td className="p-3 text-center font-mono text-white/80 w-[80px] truncate">{userMatchCounts[u.id]}</td>
                <td className="p-3 text-center w-[110px] truncate">
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-widest ${u.isReady ? 'bg-emerald-500/20 text-emerald-300' : 'bg-white/10 text-white/40'}`}>
                    {u.isReady ? 'SS' : 'Không'}
                  </span>
                </td>
                <td className="p-3 text-center w-[110px] truncate">
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-widest ${u.status === 'playing' ? 'bg-rose-500/20 text-rose-300' : 'bg-blue-500/20 text-blue-300'}`}>
                    {u.status === 'playing' ? 'Đang đánh' : 'Rảnh'}
                  </span>
                </td>
                <td className="p-3 text-center text-white/60 w-[100px] truncate">{getCourtName(u.courtId)}</td>
                <td className="p-3 text-right space-x-2 w-[130px] truncate" onClick={(e) => e.stopPropagation()}>
                  <button onClick={() => handleEditClick(u)} className="bg-blue-500/10 hover:bg-blue-500/20 active:bg-blue-500/30 text-blue-400 px-2 py-1 rounded text-[10px] uppercase font-bold tracking-widest active:scale-90 active:translate-y-[1px] transition-all duration-75">Sửa</button>
                  <button onClick={() => handleDelete(u.id)} className="bg-rose-500/10 hover:bg-rose-500/20 active:bg-rose-500/30 text-rose-400 px-2 py-1 rounded text-[10px] uppercase font-bold tracking-widest active:scale-90 active:translate-y-[1px] transition-all duration-75">Xóa</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Edit Modal */}
      {editingUser && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="p-6 rounded-xl border border-white/10 bg-slate-900/90 max-w-sm w-full text-white">
            <h3 className="font-bold mb-4 text-emerald-400 uppercase tracking-widest text-sm">Sửa thông tin: <span className="text-white">{editingUser.name}</span></h3>
            <form onSubmit={handleSaveEdit} className="space-y-4 text-sm">
              <div>
                <label className="block font-medium mb-1 text-white/80 text-xs uppercase tracking-widest">Họ Tên</label>
                <input required type="text" className="w-full bg-white/5 border border-white/10 rounded p-2 text-white focus:outline-none focus:border-emerald-500" value={editName} onChange={e=>setEditName(e.target.value)} />
              </div>
              <div>
                <label className="block font-medium mb-1 text-white/80 text-xs uppercase tracking-widest">Username</label>
                <input required type="text" className="w-full bg-white/5 border border-white/10 rounded p-2 text-white focus:outline-none focus:border-emerald-500" value={editUsername} onChange={e=>setEditUsername(e.target.value)} />
              </div>
              <div>
                <label className="block font-medium mb-1 text-white/80 text-xs uppercase tracking-widest">Pass mới (bỏ trống = giữ)</label>
                <input type="text" className="w-full bg-white/5 border border-white/10 rounded p-2 text-white focus:outline-none focus:border-emerald-500" value={editPassword} onChange={e=>setEditPassword(e.target.value)} />
              </div>
              <div>
                <label className="block font-medium mb-1 text-white/80 text-xs uppercase tracking-widest">Trình</label>
                <input required type="number" step="0.1" min="1.0" max="6.0" className="w-full bg-white/5 border border-white/10 rounded p-2 text-white font-bold focus:outline-none focus:border-emerald-500" value={editSkill} onChange={e=>setEditSkill(Number(e.target.value))} />
              </div>
              
              <div className="grid grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="block font-medium mb-1 text-white/80 text-[10px] uppercase tracking-widest">Sẵn sàng thi đấu</label>
                  <select 
                    className="w-full bg-slate-800 border border-white/10 rounded p-2 text-white text-xs font-bold focus:outline-none focus:border-emerald-500"
                    value={editIsReady ? 'true' : 'false'}
                    onChange={e => setEditIsReady(e.target.value === 'true')}
                  >
                    <option value="true">Sẵn sàng (SS)</option>
                    <option value="false">Không (Tắt)</option>
                  </select>
                </div>
                <div>
                  <label className="block font-medium mb-1 text-white/80 text-[10px] uppercase tracking-widest">Trạng thái rảnh/đánh</label>
                  <select 
                    className="w-full bg-slate-800 border border-white/10 rounded p-2 text-white text-xs font-bold focus:outline-none focus:border-emerald-500"
                    value={editStatus}
                    onChange={e => setEditStatus(e.target.value as 'free' | 'playing')}
                  >
                    <option value="free">Đang rảnh</option>
                    <option value="playing">Đang thi đấu</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-2 mt-6">
                <button type="button" onClick={()=>setEditingUser(null)} className="px-4 py-2 bg-white/5 text-white/80 rounded-lg hover:bg-white/10 active:bg-white/20 uppercase tracking-widest text-xs font-bold active:scale-95 active:translate-y-[1px] transition-all duration-75">Hủy</button>
                <button type="submit" className="px-5 py-2 bg-emerald-500 text-slate-950 font-black rounded-lg hover:bg-emerald-400 active:bg-emerald-600 active:text-white uppercase tracking-tight text-xs active:scale-95 active:translate-y-[1px] transition-all duration-75">Lưu thay đổi</button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
