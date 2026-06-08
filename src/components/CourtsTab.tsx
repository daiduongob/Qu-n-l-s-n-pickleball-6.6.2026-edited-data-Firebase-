import { useState } from 'react';
import { useAppContext } from '../context';
import { callApi } from '../api';

export default function CourtsTab() {
  const { currentUser, courts, users, refreshState, showConfirm, showAlert } = useAppContext();
  const [newCourtName, setNewCourtName] = useState('');

  const getUserName = (id: string) => users.find(u => u.id === id)?.name || id;

  const handleCreateCourt = async () => {
    if (currentUser?.username === 'adminThuNghiem1h') {
      showAlert('Đây là tài khoản admin thử nghiệm, chỉ xem, không có quyền điều chỉnh. Liên hệ người lập trình để có thông tin thêm!');
      return;
    }
    if (!newCourtName) return;
    await callApi('/api/courts', 'POST', { name: newCourtName, status: 'empty' });
    setNewCourtName('');
    refreshState();
  };

  const handleDeleteCourt = async (id: string) => {
    if (currentUser?.username === 'adminThuNghiem1h') {
      showAlert('Đây là tài khoản admin thử nghiệm, chỉ xem, không có quyền điều chỉnh. Liên hệ người lập trình để có thông tin thêm!');
      return;
    }
    const court = courts.find(c => c.id === id);
    if (court && court.status !== 'empty') {
      showAlert('Chỉ có thể xóa sân khi sân trống!');
      return;
    }
    showConfirm('Xóa sân này?', async () => {
      const res = await callApi(`/api/courts/${id}`, 'DELETE');
      if (!res.success) {
        showAlert(res.message || 'Lỗi khi xóa sân');
      } else {
        refreshState();
      }
    });
  };

  const handleReleaseCourt = async (id: string) => {
    if (currentUser?.username === 'adminThuNghiem1h') {
      showAlert('Đây là tài khoản admin thử nghiệm, chỉ xem, không có quyền điều chỉnh. Liên hệ người lập trình để có thông tin thêm!');
      return;
    }
    const court = courts.find(c => c.id === id);
    if (court && court.status === 'playing') {
      showAlert('Sân này đang trong trận đấu! Không thể giải phóng sân khi đang thi đấu.');
      return;
    }
    showConfirm('Giải phóng sân này? (Người chơi sẽ chuyển về danh sách chờ và giữ nguyên thời gian đã chờ)', async () => {
      const res = await callApi(`/api/courts/${id}/release`, 'POST');
      if (!res.success) {
        showAlert(res.message || 'Lỗi khi giải phóng sân');
      } else {
        refreshState();
        showAlert('Đã giải phóng sân thành công.');
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
          <button onClick={handleCreateCourt} className="bg-emerald-500 text-slate-950 hover:bg-emerald-400 active:bg-emerald-600 active:text-white font-bold px-4 py-2 rounded text-xs uppercase tracking-tighter active:scale-95 active:translate-y-[1px] transition-all duration-75">Tạo mới Sân</button>
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
               {c.status === 'playing' && (
                 <div className="mb-3 px-2 py-1.5 rounded bg-rose-500/10 border border-rose-500/30 text-rose-300 text-[10px] font-bold flex items-center justify-between animate-pulse">
                   <span className="flex items-center gap-1.5">
                     <span className="w-1.5 h-1.5 bg-rose-500 rounded-full animate-ping"></span>
                     ⚠️ SÂN ĐANG THI ĐẤU
                   </span>
                   <span className="text-[8px] uppercase tracking-wider text-rose-400 font-extrabold">Không thể giải phóng</span>
                 </div>
               )}
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

            <div className="mt-4 pt-4 border-t border-white/10 flex justify-between items-center gap-2 text-sm">
              {c.status !== 'empty' ? (
                <button 
                  onClick={() => {
                    if (c.status === 'playing') {
                      showAlert('Trận đấu đang diễn ra trên sân này! Không thể giải phóng sân khi đang thi đấu.');
                      return;
                    }
                    handleReleaseCourt(c.id);
                  }} 
                  disabled={c.status === 'playing'}
                  className={`px-2 py-1 rounded text-xs uppercase tracking-widest font-bold transition-all duration-75 ${
                    c.status === 'playing'
                    ? 'text-white/20 bg-white/5 cursor-not-allowed border border-white/5 line-through decoration-rose-500/50'
                    : 'text-amber-400 hover:bg-amber-500/10 hover:text-white active:bg-amber-500/30 active:scale-95 active:translate-y-[1px]'
                  }`}
                >
                  Giải phóng sân
                </button>
              ) : (
                <span className="text-xs text-white/20 italic">Sân đang trống</span>
              )}
              <button onClick={() => handleDeleteCourt(c.id)} className="text-rose-400 hover:bg-rose-500/10 hover:text-white active:bg-rose-500/30 px-2 py-1 rounded text-xs uppercase tracking-widest font-bold active:scale-90 active:translate-y-[1px] transition-all duration-75">Xóa sân</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
