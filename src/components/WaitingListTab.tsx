import React, { useState } from 'react';
import { useAppContext } from '../context';
import { callApi } from '../api';
import { User, Court } from '../types';

export default function WaitingListTab() {
  const { courts, users, currentUser, refreshState, showAlert, showConfirm } = useAppContext();
  const isAdmin = currentUser?.username === 'admin';

  const [endingCourt, setEndingCourt] = useState<Court | null>(null);
  const [scoreA, setScoreA] = useState(0);
  const [scoreB, setScoreB] = useState(0);

  const [adjustingCourt, setAdjustingCourt] = useState<Court | null>(null);
  const [adjustedPlayers, setAdjustedPlayers] = useState<string[]>([]); // 4 player ids

  const getUserName = (id: string) => users.find(u => u.id === id)?.name || id;

  const playingCourts = courts.filter(c => c.status === 'playing');
  const waitingCourts = courts
    .filter(c => c.status === 'waiting_list')
    .sort((a, b) => (a.waitingTime || 0) - (b.waitingTime || 0));
  // Free users who are ready and not in any court
  const waitingUsers = users
    .filter(u => u.isReady && u.status === 'free' && !u.courtId)
    .sort((a, b) => (a.waitStartTime || 0) - (b.waitStartTime || 0));

  const handleEndMatch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!endingCourt) return;
    await callApi(`/api/courts/${endingCourt.id}/end`, 'POST', { scoreA, scoreB });
    setEndingCourt(null);
    setScoreA(0);
    setScoreB(0);
    refreshState();
  };

  const handleStartMatch = async (id: string) => {
    await callApi(`/api/courts/${id}/start`, 'POST');
    refreshState();
  };

  const handleResetRandom = () => {
    showConfirm('Bạn có chắc chắn muốn chọn lại ngẫu nhiên toàn bộ người chơi vào danh sách chờ?', async () => {
      await callApi('/api/courts/reset-random', 'POST');
      refreshState();
    });
  };

  const handleSaveAdjust = async () => {
    if (!adjustingCourt) return;
    if (adjustedPlayers.length !== 4 && adjustedPlayers.length !== 0) {
      showAlert('Vui lòng chọn đủ 4 người chơi (hoặc 0 để clear)');
      // Not strictly enforcing but good for pickleball
    }
    await callApi(`/api/courts/${adjustingCourt.id}/adjust`, 'POST', { players: adjustedPlayers });
    setAdjustingCourt(null);
    refreshState();
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-full text-white">
      {/* Col 1: Sân đang thi đấu */}
      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between mb-1">
          <h2 className="text-sm font-bold uppercase tracking-wider text-blue-400 flex items-center">
             <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>
             Sân Đang Thi Đấu
          </h2>
          <span className="text-[10px] bg-blue-500/20 text-blue-300 px-2 py-0.5 rounded">{playingCourts.length} Sân bận</span>
        </div>
        <div className="flex-1 space-y-3 overflow-y-auto pr-2">
          {playingCourts.length === 0 && <p className="text-white/40 text-sm italic">Không có sân nào đang thi đấu</p>}
          {playingCourts.map(c => (
            <div key={c.id} className="p-4 rounded-xl border border-white/10 bg-white/5 backdrop-blur-md">
              <div className="flex justify-between mb-3">
                <span className="font-bold text-emerald-400">{c.name}</span>
                <span className="text-[10px] text-white/40 uppercase tracking-tighter">ĐANG ĐÁNH</span>
              </div>
              <div className="space-y-3 mb-4">
                <div className="grid grid-cols-2 gap-2 text-[10px]">
                   <div className="space-y-1">
                      <div className="text-[9px] uppercase text-white/30 font-bold tracking-widest">Team A</div>
                      <div className="p-1.5 bg-white/5 border border-white/5 rounded truncate">{c.players[0] ? getUserName(c.players[0]) : '-'}</div>
                      <div className="p-1.5 bg-white/5 border border-white/5 rounded truncate">{c.players[1] ? getUserName(c.players[1]) : '-'}</div>
                   </div>
                   <div className="space-y-1">
                      <div className="text-[9px] uppercase text-white/30 font-bold tracking-widest text-right">Team B</div>
                      <div className="p-1.5 bg-white/5 border border-white/5 rounded truncate text-right">{c.players[2] ? getUserName(c.players[2]) : '-'}</div>
                      <div className="p-1.5 bg-white/5 border border-white/5 rounded truncate text-right">{c.players[3] ? getUserName(c.players[3]) : '-'}</div>
                   </div>
                </div>
              </div>
              {isAdmin && (
                <button onClick={() => setEndingCourt(c)} className="w-full py-2 bg-rose-500/20 text-rose-400 border border-rose-500/40 rounded-lg text-xs font-bold hover:bg-rose-500/30 transition-all uppercase tracking-tight active:scale-[0.97] active:translate-y-[1px] active:bg-rose-500/40 active:text-rose-300">
                  Kết thúc trận đấu
                </button>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Col 2: Danh sách chờ của Sân */}
      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between mb-1">
          <h2 className="text-sm font-bold uppercase tracking-wider text-amber-400 flex items-center">
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
            Chờ Xếp Sân
          </h2>
          <div className="flex items-center gap-2">
            {isAdmin && (
              <button 
                onClick={handleResetRandom}
                title="Chọn lại ngẫu nhiên toàn bộ người chơi vào danh sách chờ"
                className="px-2 py-0.5 text-[10px] font-bold bg-purple-500/20 text-purple-300 hover:bg-purple-500/30 rounded uppercase tracking-widest transition-all flex items-center gap-1 active:scale-95 active:translate-y-[1px] active:bg-purple-500/40 active:text-purple-200 duration-75"
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>
                Reset ngẫu nhiên
              </button>
            )}
            <span className="text-[10px] bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded">{waitingCourts.length} Trận chờ</span>
          </div>
        </div>
        <div className="flex-1 space-y-3 overflow-y-auto pr-2">
          {waitingCourts.length === 0 && <p className="text-white/40 text-sm italic">Không có sân nào đang chờ</p>}
          {waitingCourts.map(c => (
            <div key={c.id} className="p-4 rounded-xl border border-white/20 bg-emerald-500/5 backdrop-blur-lg relative overflow-hidden">
              <div className="absolute top-0 right-0 p-2 text-[8px] bg-emerald-500 text-slate-950 font-bold rounded-bl uppercase tracking-widest">DS CHỜ</div>
              <div className="mb-3">
                <span className="font-bold text-white">{c.name} <span className="text-white/40 font-normal">- Trận Kế Tiếp</span></span>
              </div>
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-2 text-[10px]">
                   <div className="space-y-1">
                      <div className="text-[9px] uppercase text-white/30 font-bold tracking-widest">Team A</div>
                      <div className="p-1.5 bg-white/5 border border-white/5 rounded truncate">{c.players[0] ? getUserName(c.players[0]) : '-'}</div>
                      <div className="p-1.5 bg-white/5 border border-white/5 rounded truncate">{c.players[1] ? getUserName(c.players[1]) : '-'}</div>
                   </div>
                   <div className="space-y-1">
                      <div className="text-[9px] uppercase text-white/30 font-bold tracking-widest">Team B</div>
                      <div className="p-1.5 bg-white/5 border border-white/5 rounded truncate">{c.players[2] ? getUserName(c.players[2]) : '-'}</div>
                      <div className="p-1.5 bg-white/5 border border-white/5 rounded truncate">{c.players[3] ? getUserName(c.players[3]) : '-'}</div>
                   </div>
                </div>
                {isAdmin && (
                  <div className="flex gap-2">
                    <button onClick={() => { setAdjustingCourt(c); setAdjustedPlayers(c.players); }} className="flex-1 py-2 bg-white/5 text-white/80 border border-white/10 rounded-lg text-xs hover:bg-white/10 active:bg-white/25 transition-all uppercase font-bold tracking-tight active:scale-95 active:translate-y-[1px] duration-75">
                      Điều Chỉnh
                    </button>
                    <button onClick={() => handleStartMatch(c.id)} className="flex-[2] py-2 bg-emerald-500 text-slate-950 rounded-lg text-xs font-black uppercase tracking-tighter hover:bg-emerald-400 active:bg-emerald-600 active:text-white transition-all active:scale-[0.98] active:translate-y-[1px] duration-75">
                      BẮT ĐẦU NGAY
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Col 3: Danh sách Người chơi đang chờ */}
      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between mb-1">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-400 flex items-center">
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"/></svg>
            Người Chơi Đang Chờ
          </h2>
          <span className="text-[10px] bg-white/10 text-white/50 px-2 py-0.5 rounded">{waitingUsers.length} Đang rảnh</span>
        </div>
        <div className="flex-1 bg-white/5 border border-white/10 rounded-xl backdrop-blur-md overflow-y-auto">
          {waitingUsers.length === 0 && <p className="text-white/40 text-sm p-4 italic">Không có người chơi nào đang chờ</p>}
          {waitingUsers.length > 0 && (
            <table className="w-full text-xs text-left">
              <thead className="bg-white/5 text-white/40 uppercase text-[10px] tracking-widest sticky top-0 backdrop-blur-md">
                <tr>
                  <th className="p-3">Thứ tự</th>
                  <th className="p-3">Người chơi</th>
                  <th className="p-3 text-center">Trình</th>
                  <th className="p-3 text-right">Chờ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {waitingUsers.map((u, idx) => (
                  <tr key={u.id} className="hover:bg-white/5 transition-colors">
                    <td className={`p-3 font-bold ${idx < 3 ? 'text-emerald-400' : 'text-white/40'}`}>{(idx + 1).toString().padStart(2, '0')}</td>
                    <td className="p-3 font-medium text-white/90">
                       {u.name}
                       <div className="text-[9px] text-white/30 font-normal">{u.username}</div>
                    </td>
                    <td className="p-3 text-center text-emerald-400 font-bold">{u.skillRating.toFixed(1)}</td>
                    <td className="p-3 text-right font-mono text-white/50 text-[10px]">
                      {u.waitStartTime ? Math.floor((Date.now() - u.waitStartTime)/60000) : 0}'
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>

      {/* Modals */}
      {endingCourt && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="p-6 rounded-xl border border-white/10 bg-slate-900/90 max-w-sm w-full text-white">
            <h3 className="font-bold mb-4 text-emerald-400 uppercase tracking-widest text-sm">Kết thúc trận: <span className="text-white">{endingCourt.name}</span></h3>
            <form onSubmit={handleEndMatch}>
              <div className="flex justify-between items-center mb-4 gap-4">
                <div className="text-center">
                  <label className="block text-xs font-bold mb-1 uppercase tracking-widest text-white/50">Team A</label>
                  <input type="number" required className="w-20 bg-white/5 border border-white/10 p-2 text-center text-xl font-bold rounded focus:outline-none focus:border-emerald-500 text-white" value={scoreA} onChange={e=>setScoreA(Number(e.target.value))}/>
                </div>
                <div className="font-bold text-white/20">-</div>
                <div className="text-center">
                  <label className="block text-xs font-bold mb-1 uppercase tracking-widest text-white/50">Team B</label>
                  <input type="number" required className="w-20 bg-white/5 border border-white/10 p-2 text-center text-xl font-bold rounded focus:outline-none focus:border-emerald-500 text-white" value={scoreB} onChange={e=>setScoreB(Number(e.target.value))}/>
                </div>
              </div>
              <div className="flex justify-end gap-2 mt-6">
                <button type="button" onClick={()=>setEndingCourt(null)} className="px-4 py-2 bg-white/5 text-white/80 rounded-lg hover:bg-white/10 active:bg-white/20 uppercase tracking-widest text-xs font-bold active:scale-95 active:translate-y-[1px] transition-all duration-75">Hủy</button>
                <button type="submit" className="px-4 py-2 bg-emerald-500 text-slate-950 font-black rounded-lg hover:bg-emerald-400 active:bg-emerald-600 active:text-white uppercase tracking-tight text-xs active:scale-95 active:translate-y-[1px] transition-all duration-75">Lưu KQ & Rời</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {adjustingCourt && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="p-6 rounded-xl border border-white/10 bg-slate-900/90 max-w-md w-full text-white">
            <h3 className="font-bold mb-4 text-emerald-400 uppercase tracking-widest text-sm">Điều chỉnh trận: <span className="text-white">{adjustingCourt.name}</span></h3>
            <div className="mb-4 text-sm max-h-64 overflow-y-auto pr-2">
               {adjustedPlayers.length === 4 && (
                 <div className="mb-4 space-y-3">
                   <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="space-y-1">
                         <div className="text-[10px] uppercase text-white/40 font-bold tracking-widest bg-white/5 p-1 rounded text-center">Team A</div>
                         <div className="p-2 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded hover:bg-emerald-500/20 transition-colors truncate text-center">{getUserName(adjustedPlayers[0])}</div>
                         <div className="p-2 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded hover:bg-emerald-500/20 transition-colors truncate text-center">{getUserName(adjustedPlayers[1])}</div>
                      </div>
                      <div className="space-y-1">
                         <div className="text-[10px] uppercase text-white/40 font-bold tracking-widest bg-white/5 p-1 rounded text-center">Team B</div>
                         <div className="p-2 bg-amber-500/10 border border-amber-500/20 text-amber-400 rounded hover:bg-amber-500/20 transition-colors truncate text-center">{getUserName(adjustedPlayers[2])}</div>
                         <div className="p-2 bg-amber-500/10 border border-amber-500/20 text-amber-400 rounded hover:bg-amber-500/20 transition-colors truncate text-center">{getUserName(adjustedPlayers[3])}</div>
                      </div>
                   </div>
                 </div>
               )}
               <p className="font-bold text-white/50 mb-2 uppercase tracking-widest text-xs">Chọn 4 người chơi (Đã chọn: {adjustedPlayers.length}/4)</p>
               {/* Show all ready users not in other actively playing courts */}
               {users
                 .filter(u => u.isReady && ((u.status === 'free' && !u.courtId) || u.courtId === adjustingCourt.id))
                 .map(u => (
                 <label key={u.id} className="flex items-center gap-2 p-2 hover:bg-white/5 border-b border-white/10 cursor-pointer transition-colors">
                   <input 
                     type="checkbox" 
                     className="accent-emerald-500 w-4 h-4 cursor-pointer"
                     checked={adjustedPlayers.includes(u.id)}
                     onChange={(e) => {
                       if (e.target.checked) setAdjustedPlayers([...adjustedPlayers, u.id]);
                       else setAdjustedPlayers(adjustedPlayers.filter(id => id !== u.id));
                     }}
                   />
                   <span className="flex-1 font-medium">{u.name} <span className="text-white/40 text-xs">({u.skillRating.toFixed(1)})</span></span>
                 </label>
               ))}
            </div>
            <div className="flex justify-between items-center mt-6">
              <button 
                title="Chọn ngẫu nhiên 4 người chơi khác từ danh sách đang chờ" 
                onClick={() => {
                  const available = users.filter(u => u.isReady && ((u.status === 'free' && !u.courtId) || u.courtId === adjustingCourt.id));
                  const shuffled = [...available].sort(() => 0.5 - Math.random());
                  setAdjustedPlayers(shuffled.slice(0, 4).map(u => u.id));
                }} 
                className="px-4 py-2 bg-blue-500/20 text-blue-400 font-bold rounded-lg hover:bg-blue-500/30 active:bg-blue-500/40 active:text-blue-200 uppercase tracking-tight text-xs active:scale-95 active:translate-y-[1px] transition-all duration-75"
              >
                Chọn Ngẫu Nhiên
              </button>
              <div className="flex gap-2">
                <button onClick={()=>setAdjustingCourt(null)} className="px-4 py-2 bg-white/5 text-white/80 rounded-lg hover:bg-white/10 active:bg-white/20 uppercase tracking-widest text-xs font-bold active:scale-95 active:translate-y-[1px] transition-all duration-75">Hủy</button>
                <button onClick={handleSaveAdjust} className="px-4 py-2 bg-emerald-500 text-slate-950 font-black rounded-lg hover:bg-emerald-400 active:bg-emerald-600 active:text-white uppercase tracking-tight text-xs active:scale-95 active:translate-y-[1px] transition-all duration-75">Lưu danh sách</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
