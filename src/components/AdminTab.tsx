import React, { useState } from 'react';
import { useAppContext } from '../context';
import { callApi } from '../api';
import { User } from '../types';

export default function AdminTab() {
  const { users, matches, courts, refreshState, showAlert, showConfirm } = useAppContext();
  
  const [editingUser, setEditingUser] = useState<User | null>(null);
  
  // For edit form
  const [editName, setEditName] = useState('');
  const [editUsername, setEditUsername] = useState('');
  const [editPassword, setEditPassword] = useState('');
  const [editSkill, setEditSkill] = useState(0);

  // Match counts for sorting
  const userMatchCounts: Record<string, number> = {};
  users.forEach(u => userMatchCounts[u.id] = 0);
  matches.forEach(m => {
    m.teamA.forEach(id => userMatchCounts[id] = (userMatchCounts[id] || 0) + 1);
    m.teamB.forEach(id => userMatchCounts[id] = (userMatchCounts[id] || 0) + 1);
  });

  const sortedUsers = [...users].sort((a, b) => (userMatchCounts[b.id] || 0) - (userMatchCounts[a.id] || 0));

  const getCourtName = (id: string | null) => {
    if (!id) return '-';
    return courts.find(c => c.id === id)?.name || id;
  };

  const handleEditClick = (u: User) => {
    setEditingUser(u);
    setEditName(u.name);
    setEditUsername(u.username);
    setEditPassword('');
    setEditSkill(u.skillRating);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    await callApi(`/api/users/${editingUser.id}`, 'POST', {
      name: editName,
      username: editUsername,
      password: editPassword || undefined,
      skillRating: editSkill
    });
    setEditingUser(null);
    refreshState();
  };

  const handleDelete = async (id: string) => {
    if (id === 'admin') {
      showAlert('Không thể xóa admin');
      return;
    }
    showConfirm('Chắc chắn xóa người chơi này? Toàn bộ dữ liệu sẽ bị mất.', async () => {
      await callApi(`/api/users/${id}`, 'DELETE');
      refreshState();
    });
  };

  return (
    <div className="p-4 rounded-xl border border-white/10 bg-white/5 backdrop-blur-md text-white">
      <h2 className="text-sm font-bold uppercase tracking-wider text-emerald-400 mb-4">Admin - Quản lý Người Chơi</h2>
      
      <div className="overflow-x-auto border border-white/10 rounded-lg bg-slate-900/50">
        <table className="w-full text-xs text-left whitespace-nowrap">
          <thead className="bg-white/5 text-white/40 uppercase text-[10px] tracking-widest border-b border-white/10">
            <tr>
              <th className="p-3 text-center">STT</th>
              <th className="p-3">Tên</th>
              <th className="p-3">Username</th>
              <th className="p-3 text-center">Trình</th>
              <th className="p-3 text-center">Trận</th>
              <th className="p-3 text-center">SS Thi đấu</th>
              <th className="p-3 text-center">Trạng thái</th>
              <th className="p-3 text-center">Sân</th>
              <th className="p-3 text-right">Thao tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {sortedUsers.map((u, i) => (
              <tr key={u.id} className="hover:bg-white/5 transition-colors">
                <td className="p-3 text-center text-white/40 font-bold">{i + 1}</td>
                <td className="p-3 font-bold text-white">{u.name}</td>
                <td className="p-3 text-white/60">{u.username}</td>
                <td className="p-3 text-center font-black text-emerald-400">{u.skillRating.toFixed(1)}</td>
                <td className="p-3 text-center font-mono text-white/80">{userMatchCounts[u.id]}</td>
                <td className="p-3 text-center">
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-widest ${u.isReady ? 'bg-emerald-500/20 text-emerald-300' : 'bg-white/10 text-white/40'}`}>
                    {u.isReady ? 'SS' : 'Không'}
                  </span>
                </td>
                <td className="p-3 text-center">
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-widest ${u.status === 'playing' ? 'bg-rose-500/20 text-rose-300' : 'bg-blue-500/20 text-blue-300'}`}>
                    {u.status === 'playing' ? 'Đang đánh' : 'Rảnh'}
                  </span>
                </td>
                <td className="p-3 text-center text-white/60">{getCourtName(u.courtId)}</td>
                <td className="p-3 text-right space-x-2">
                  <button onClick={() => handleEditClick(u)} className="text-blue-400 hover:text-blue-300 text-[10px] uppercase font-bold tracking-widest">Sửa</button>
                  <button onClick={() => handleDelete(u.id)} className="text-rose-400 hover:text-rose-300 text-[10px] uppercase font-bold tracking-widest">Xóa</button>
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
              <div className="flex justify-end gap-2 mt-6">
                <button type="button" onClick={()=>setEditingUser(null)} className="px-4 py-2 bg-white/5 text-white/80 rounded-lg hover:bg-white/10 uppercase tracking-widest text-xs font-bold">Hủy</button>
                <button type="submit" className="px-4 py-2 bg-emerald-500 text-slate-950 font-black rounded-lg hover:bg-emerald-400 uppercase tracking-tight text-xs">Lưu</button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
