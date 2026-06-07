import { useAppContext } from '../context';
import { format } from 'date-fns';
import { Trophy, Star } from 'lucide-react';

export default function StatsTab() {
  const { users, matches, courts } = useAppContext();

  // 1. Leaderboard
  const rankedUsers = [...users].sort((a, b) => b.skillRating - a.skillRating);

  // 2. Court stats
  const courtNames = courts.map(c => c.name);
  
  // 3. Most active
  const userMatchCounts: Record<string, number> = {};
  users.forEach(u => userMatchCounts[u.id] = 0);
  matches.forEach(m => {
    m.teamA.forEach(id => userMatchCounts[id] = (userMatchCounts[id] || 0) + 1);
    m.teamB.forEach(id => userMatchCounts[id] = (userMatchCounts[id] || 0) + 1);
  });
  
  const mostActiveUsers = [...users].sort((a, b) => (userMatchCounts[b.id] || 0) - (userMatchCounts[a.id] || 0));

  const getUserName = (id: string) => users.find(u => u.id === id)?.name || id;

  const totalPossibleSlots = courts.length * 4;
  const currentUsedSlots = courts.reduce((sum, c) => sum + (c.status === 'playing' ? 4 : 0), 0);
  const occupancyRate = totalPossibleSlots === 0 ? 0 : Math.round((currentUsedSlots / totalPossibleSlots) * 100);

  return (
    <div className="space-y-6 text-white">
      
      {/* Overview System Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="p-6 rounded-xl border border-white/10 bg-white/5 backdrop-blur-md flex flex-col items-center justify-center">
          <h3 className="text-white/50 text-xs font-bold uppercase tracking-wider mb-2">Tỷ lệ lấp đầy hiện tại</h3>
          <p className="text-4xl font-black text-emerald-400 mb-1">{occupancyRate}%</p>
          <p className="text-[10px] text-white/40 uppercase tracking-widest">({currentUsedSlots} / {totalPossibleSlots} TRÊN SÂN)</p>
        </div>
        <div className="p-6 rounded-xl border border-white/10 bg-white/5 backdrop-blur-md max-h-64 overflow-y-auto">
          <h3 className="text-emerald-400 font-bold uppercase tracking-widest text-xs mb-4">Chăm chỉ nhất (Số trận)</h3>
          <ul className="text-sm space-y-2">
             {mostActiveUsers.map((u, i) => (
                <li key={u.id} className={`flex justify-between items-center text-white/80 p-2 rounded ${i < 5 ? 'bg-amber-500/10 border border-amber-500/20' : 'hover:bg-white/5'}`}>
                   <span className="flex items-center gap-2">
                     <span className={`font-bold w-5 inline-block ${i < 5 ? 'text-amber-400' : 'text-emerald-400'}`}>{i+1}.</span> 
                     <span className={`font-bold ${i < 5 ? 'text-amber-100' : 'text-white'}`}>{u.name}</span>
                     {i < 5 && <Star className="w-3 h-3 text-amber-400 fill-amber-400" />}
                   </span>
                   <span className="font-bold bg-white/10 px-2 py-1 rounded text-[10px] uppercase text-white/50 tracking-wider">{userMatchCounts[u.id]} TRẬN</span>
                </li>
             ))}
          </ul>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* LEADERBOARD */}
        <div className="p-6 rounded-xl border border-white/10 bg-white/5 backdrop-blur-md overflow-hidden flex flex-col h-[600px]">
          <h3 className="text-emerald-400 font-bold text-sm uppercase tracking-widest mb-4 flex items-center gap-2 shrink-0">
             <Trophy className="text-yellow-500 w-4 h-4" />
             Bảng xếp hạng 
          </h3>
          <div className="overflow-y-auto flex-1 pr-2">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-900/90 text-white/40 uppercase text-[10px] tracking-widest sticky top-0 z-10">
                <tr>
                  <th className="p-3 w-12 text-center">#</th>
                  <th className="p-3">Người chơi</th>
                  <th className="p-3 text-right">Trình</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {rankedUsers.map((u, i) => (
                  <tr key={u.id} className={`transition-colors ${i < 10 ? 'bg-amber-500/10' : 'hover:bg-white/5'}`}>
                    <td className="p-3 text-center font-bold text-white/40">
                      {i === 0 ? <Trophy className="w-4 h-4 mx-auto text-amber-400" /> : i + 1}
                    </td>
                    <td className="p-3">
                      <div className="flex flex-col">
                        <span className="font-bold text-white flex items-center gap-1">
                          {u.name} {i < 10 && <Star className="w-3 h-3 text-amber-400 fill-amber-400" />}
                        </span>
                        <span className="text-[10px] text-white/40 uppercase tracking-widest mt-0.5">{u.username}</span>
                      </div>
                    </td>
                    <td className="p-3 text-right font-black text-emerald-400 text-sm">{u.skillRating.toFixed(1)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* COURT STATS */}
        <div className="p-6 rounded-xl border border-white/10 bg-white/5 backdrop-blur-md h-[600px] flex flex-col">
          <h3 className="text-emerald-400 font-bold text-sm uppercase tracking-widest mb-4">Lịch sử trận đấu</h3>
          <div className="flex-1 overflow-y-auto space-y-3 pr-2">
             {matches.length === 0 && <p className="text-white/40 text-sm italic">Chưa có trận đấu nào ghi nhận.</p>}
             {[...matches].reverse().map(m => (
               <div key={m.id} className="border border-white/5 bg-slate-900/50 rounded-lg p-3 text-xs">
                 <div className="flex justify-between items-center mb-2">
                    <span className="font-bold text-emerald-400 uppercase tracking-wider">{m.courtName}</span>
                    <span className="text-[10px] text-white/40 font-mono tracking-widest">{format(new Date(m.date), 'dd/MM/yyyy HH:mm')}</span>
                 </div>
                 <div className="grid grid-cols-3 gap-2 items-center bg-white/5 p-2 rounded border border-white/10">
                    <div className="text-right flex flex-col space-y-1">
                      <span className="truncate text-white/80 font-medium">{getUserName(m.teamA[0])}</span>
                      <span className="truncate text-white/80 font-medium">{getUserName(m.teamA[1])}</span>
                    </div>
                    <div className="text-center font-black text-lg">
                      <span className={m.scoreA > m.scoreB ? 'text-emerald-400' : 'text-white/30'}>{m.scoreA}</span>
                      <span className="mx-2 text-white/20">-</span>
                      <span className={m.scoreB > m.scoreA ? 'text-emerald-400' : 'text-white/30'}>{m.scoreB}</span>
                    </div>
                    <div className="text-left flex flex-col space-y-1">
                      <span className="truncate text-white/80 font-medium">{getUserName(m.teamB[0])}</span>
                      <span className="truncate text-white/80 font-medium">{getUserName(m.teamB[1])}</span>
                    </div>
                 </div>
               </div>
             ))}
          </div>
        </div>
      </div>
    </div>
  );
}
