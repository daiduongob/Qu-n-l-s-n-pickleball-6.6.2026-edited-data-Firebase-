import { useState } from 'react';
import { useAppContext } from '../context';
import { callApi } from '../api';

export default function CourtsTab() {
  const { courts, users, refreshState, showConfirm, showAlert } = useAppContext();
  const [newCourtName, setNewCourtName] = useState('');

  const getUserName = (id: string) => users.find(u => u.id === id)?.name || id;

  const handleCreateCourt = async () => {
    if (!newCourtName) return;
    await callApi('/api/courts', 'POST', { name: newCourtName, status: 'empty' });
    setNewCourtName('');
    refreshState();
  };

  const handleDeleteCourt = async (id: string) => {
    showConfirm('Xóa sân này?', async () => {
      const res = await callApi(`/api/courts/${id}`, 'DELETE');
      if (!res.success) {
        showAlert(res.message || 'Lỗi khi xóa sân');
      } else {
        refreshState();
      }
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center p-4 rounded-xl border border-white/10 bg-white/5 backdrop-blur-md">
        <h2 className="text-lg font-bold text-emerald-400 uppercase tracking-widest">Quản lý Sân</h2>
        <div className="flex gap-2">
          <input 
            type="text" 
            placeholder="Tên sân mới" 
            className="bg-white/5 border border-white/10 rounded p-2 text-white placeholder-white/30 text-sm focus:outline-none focus:border-emerald-500" 
            value={newCourtName} 
            onChange={e=>setNewCourtName(e.target.value)} 
          />
          <button onClick={handleCreateCourt} className="bg-emerald-500 text-slate-950 font-bold px-4 py-2 rounded text-xs uppercase tracking-tighter">Tạo mới Sân</button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {courts.map(c => (
          <div key={c.id} className="p-4 rounded-xl border border-white/10 bg-white/5 backdrop-blur-md flex flex-col">
            <div className="flex justify-between items-start mb-4">
              <h3 className="font-bold text-lg text-emerald-400">{c.name}</h3>
              <span className={`px-2 py-0.5 text-[10px] font-bold rounded uppercase tracking-widest ${c.status === 'empty' ? 'bg-white/10 text-white/50' : c.status === 'playing' ? 'bg-rose-500/20 text-rose-300' : 'bg-amber-500/20 text-amber-300'}`}>
                {c.status === 'empty' ? 'Đang trống' : c.status === 'playing' ? 'Đang thi đấu' : 'Danh sách chờ'}
              </span>
            </div>
            
            <div className="flex-1">
               {c.status !== 'empty' && c.players.length > 0 ? (
                 <div className="grid grid-cols-2 gap-2 text-[11px] mt-2">
                   {c.players.map((pid: string) => (
                     <div key={pid} className="bg-white/5 p-2 rounded border border-white/5 truncate">
                        {getUserName(pid)}
                     </div>
                   ))}
                 </div>
               ) : (
                 <p className="text-xs text-white/30 italic mt-2">Chưa có người chơi</p>
               )}
            </div>

            <div className="mt-4 pt-4 border-t border-white/10 flex justify-end gap-2 text-sm">
              <button onClick={() => handleDeleteCourt(c.id)} className="text-rose-400 hover:bg-rose-500/10 px-2 py-1 rounded text-xs uppercase tracking-widest font-bold">Xóa sân</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
