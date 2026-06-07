import React, { useState, useEffect } from 'react';
import { callApi } from '../api';
import { useAppContext } from '../context';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { format } from 'date-fns';

export default function ProfileTab() {
  const { currentUser, matches, refreshState, setCurrentUser, showAlert, showConfirm, selectedUserForProfile, setSelectedUserForProfile, setActiveTab } = useAppContext();
  const [isEditing, setIsEditing] = useState(false);

  const displayUser = selectedUserForProfile || currentUser;

  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [skillRating, setSkillRating] = useState(1.0);

  useEffect(() => {
    if (displayUser) {
      setName(displayUser.name);
      setPassword('');
      setSkillRating(displayUser.skillRating);
      setIsEditing(false);
    }
  }, [displayUser]);

  if (!currentUser || !displayUser) return null;

  const isAdmin = currentUser.username === 'admin';

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    await callApi(`/api/users/${displayUser.id}`, 'POST', { name, password: password || undefined, skillRating: isAdmin ? skillRating : undefined });
    showAlert('Cập nhật thành công');
    setIsEditing(false);
    refreshState();
  };

  const handleToggleReady = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const checked = e.target.checked;
    if (checked) {
      showConfirm('Bạn có chắc chắn muốn chuyển trạng thái sẵn sàng thi đấu không?', async () => {
        await callApi(`/api/users/${displayUser.id}`, 'POST', { isReady: checked });
        refreshState();
      });
    } else {
      await callApi(`/api/users/${displayUser.id}`, 'POST', { isReady: checked });
      refreshState();
    }
  };

  // Find user match history
  const userMatches = matches.filter(m => m.teamA.includes(displayUser.id) || m.teamB.includes(displayUser.id));
  
  // Dummy chart data from current skill if history isn't full, otherwise mock progression
  const chartData = [
     { date: 'Khởi đầu', skill: Math.max(1.0, Number((displayUser.skillRating - (userMatches.length * 0.1)).toFixed(1))) }
  ];
  userMatches.forEach((m, i) => {
     chartData.push({ date: `Match ${i+1}`, skill: displayUser.skillRating }); // Simplified. In reality we'd track history.
  });

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {/* Admin view banner */}
      {selectedUserForProfile && (
        <div className="md:col-span-2 flex items-center justify-between p-3 rounded-lg border border-yellow-500/30 bg-yellow-500/10 text-yellow-200 text-xs font-bold uppercase tracking-wide">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 bg-yellow-500 rounded-full animate-ping"></span>
            <span>Chế độ Admin: Đang quản lý trang cá nhân của {selectedUserForProfile.name} ({selectedUserForProfile.username})</span>
          </div>
          <button 
            onClick={() => { setSelectedUserForProfile(null); setActiveTab('Admin'); }}
            className="px-3 py-1 bg-yellow-500 text-slate-950 rounded hover:bg-yellow-400 font-black tracking-widest text-[9px] uppercase transition-colors"
          >
            Quay lại Admin
          </button>
        </div>
      )}

      {/* Profile Card */}
      <div className="p-6 rounded-xl border border-white/10 bg-white/5 backdrop-blur-md">
        <h2 className="text-xl font-bold mb-4 text-emerald-400">Thông tin cá nhân</h2>
        
        {isEditing ? (
          <form onSubmit={handleUpdate} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-white/80">Họ tên</label>
              <input type="text" className="w-full bg-white/5 border border-white/10 rounded p-2 text-white focus:outline-none focus:border-emerald-500" value={name} onChange={e=>setName(e.target.value)} />
            </div>
            <div>
              <label className="block text-sm font-medium text-white/80">Username (Không thể đổi)</label>
              <input disabled type="text" className="w-full bg-white/5 opacity-50 border border-white/10 rounded p-2 text-white" value={displayUser.username} />
            </div>
            <div>
              <label className="block text-sm font-medium text-white/80">Mật khẩu mới (bỏ trống nếu không đổi)</label>
              <input type="password" className="w-full bg-white/5 border border-white/10 rounded p-2 text-white focus:outline-none focus:border-emerald-500" value={password} onChange={e=>setPassword(e.target.value)} />
            </div>
            {isAdmin && (
              <div>
                <label className="block text-sm font-medium text-white/80">Điểm trình</label>
                <input type="number" step="0.1" min="1.0" max="6.0" className="w-full bg-white/5 border border-white/10 rounded p-2 text-white focus:outline-none focus:border-emerald-500" value={skillRating} onChange={e=>setSkillRating(Number(e.target.value))} />
              </div>
            )}
            <div className="flex gap-2">
              <button type="submit" className="bg-emerald-500 text-slate-950 px-4 py-2 rounded-lg font-bold">Lưu</button>
              <button type="button" onClick={() => setIsEditing(false)} className="bg-white/10 text-white/80 px-4 py-2 rounded-lg hover:bg-white/20">Hủy</button>
            </div>
          </form>
        ) : (
          <div className="space-y-4 text-sm">
            <div className="grid grid-cols-2">
              <span className="text-white/50 uppercase tracking-widest text-[10px] mt-1">Họ tên:</span>
              <span className="font-medium text-white/90">{displayUser.name}</span>
            </div>
            <div className="grid grid-cols-2">
              <span className="text-white/50 uppercase tracking-widest text-[10px] mt-1">Username:</span>
              <span className="font-medium text-white/90">{displayUser.username}</span>
            </div>
            <div className="grid grid-cols-2 mt-2">
              <span className="text-white/50 uppercase tracking-widest text-[10px] mt-1">Điểm trình:</span>
              <span className="font-bold text-emerald-400 text-lg">{displayUser.skillRating.toFixed(1)}</span>
            </div>
            <div className="pt-4 flex flex-wrap gap-4 items-center border-t border-white/10 mt-2">
              <button onClick={() => setIsEditing(true)} className="bg-white/5 text-white/80 border border-white/10 px-4 py-2 rounded-lg text-xs font-medium hover:bg-white/10">Sửa thông tin</button>
              
              <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 px-4 py-2 rounded-lg">
                <input 
                  type="checkbox" 
                  id="readySwitch" 
                  className="w-4 h-4 accent-emerald-500"
                  checked={displayUser.isReady} 
                  onChange={handleToggleReady} 
                />
                <label htmlFor="readySwitch" className="text-xs font-bold text-emerald-400 uppercase tracking-tighter cursor-pointer">Sẵn sàng thi đấu</label>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Stats Card */}
      <div className="p-6 rounded-xl border border-white/10 bg-white/5 backdrop-blur-md">
        <h2 className="text-xl font-bold mb-4 text-emerald-400">Thống kê cá nhân</h2>
        <div className="space-y-6">
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wider text-white/50 mb-2">Biểu đồ Điểm trình</h3>
            <div className="h-48 w-full p-2 bg-white/5 border border-white/10 rounded-lg">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <XAxis dataKey="date" stroke="#ffffff40" fontSize={10} />
                  <YAxis domain={['auto', 'auto']} stroke="#ffffff40" fontSize={10} />
                  <Tooltip contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #ffffff20', borderRadius: '8px' }} />
                  <Line type="monotone" dataKey="skill" stroke="#10b981" strokeWidth={2} dot={{ fill: '#0f172a', stroke: '#10b981', strokeWidth: 2 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wider text-white/50 mb-2">Lịch sử trận đấu ({userMatches.length} trận)</h3>
            <div className="max-h-48 overflow-y-auto border border-white/10 rounded-lg divide-y divide-white/5 bg-white/5">
              {userMatches.length === 0 ? <p className="p-4 text-white/40 text-xs">Chưa có trận đấu nào.</p> : null}
              {userMatches.map(m => (
                <div key={m.id} className="p-3 text-sm hover:bg-white/5">
                  <div className="flex justify-between font-bold text-emerald-400 text-xs uppercase tracking-tighter">
                     <span>{m.courtName}</span>
                     <span className="text-[10px] text-white/40 font-mono tracking-widest">{format(new Date(m.date), 'dd/MM/yyyy HH:mm')}</span>
                  </div>
                  <div className="mt-2 text-white/80">
                    Đội A <span className="font-bold text-white">{m.scoreA}</span> - <span className="font-bold text-white">{m.scoreB}</span> Đội B
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
