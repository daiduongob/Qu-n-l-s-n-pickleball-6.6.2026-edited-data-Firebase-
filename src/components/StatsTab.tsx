import React, { useState } from 'react';
import { useAppContext } from '../context';
import { format } from 'date-fns';
import { Trophy, Star, Clock, Calendar, TrendingUp } from 'lucide-react';

export default function StatsTab() {
  const { users, matches, courts } = useAppContext();
  const [avgMatchDuration, setAvgMatchDuration] = useState(30); // average match duration in minutes

  // 1. Leaderboard
  const rankedUsers = [...users].sort((a, b) => b.skillRating - a.skillRating);

  // 2. Most active
  const userMatchCounts: Record<string, number> = {};
  users.forEach(u => userMatchCounts[u.id] = 0);
  matches.forEach(m => {
    m.teamA.forEach(id => userMatchCounts[id] = (userMatchCounts[id] || 0) + 1);
    m.teamB.forEach(id => userMatchCounts[id] = (userMatchCounts[id] || 0) + 1);
  });
  
  const mostActiveUsers = [...users].sort((a, b) => (userMatchCounts[b.id] || 0) - (userMatchCounts[a.id] || 0));

  const getUserName = (id: string) => users.find(u => u.id === id)?.name || id;

  // 3. Occupancy calculation comparing actual court minutes with 12h baseline
  const uniqueDays = Array.from(new Set(matches.map(m => new Date(m.date).toDateString())));
  const totalDays = uniqueDays.length || 1; // default to 1 standard calendar day

  const standardHoursPerDay = 12;
  const standardWorkHoursPerCourt = totalDays * standardHoursPerDay;
  const totalStandardHoursAllCourts = courts.length * standardWorkHoursPerCourt;

  // Computing actual playtime per court
  const courtUsageData = courts.map(c => {
    // Matches played on this court
    const courtMatches = matches.filter(m => m.courtName === c.name || m.courtName === c.id);
    const completedCount = courtMatches.length;
    
    // Total hours: completed matches * duration + ongoing play if any
    let actualPlayHours = (completedCount * avgMatchDuration) / 60;
    if (c.status === 'playing') {
      actualPlayHours += avgMatchDuration / 60; // add live active match
    }

    const occupancyRate = standardWorkHoursPerCourt === 0 
      ? 0 
      : Math.round((actualPlayHours / standardWorkHoursPerCourt) * 100);

    return {
      id: c.id,
      name: c.name,
      status: c.status,
      completedMatches: completedCount,
      actualPlayHours,
      occupancyRate
    };
  });

  const totalActualHoursAllCourts = courtUsageData.reduce((sum, d) => sum + d.actualPlayHours, 0);
  const overallOccupancyRate = totalStandardHoursAllCourts === 0 
    ? 0 
    : Math.min(100, Math.round((totalActualHoursAllCourts / totalStandardHoursAllCourts) * 100));

  return (
    <div className="space-y-6 text-white animate-fade-in">
      
      {/* Overview System Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Occupancy card stats */}
        <div className="p-6 rounded-xl border border-white/10 bg-white/5 backdrop-blur-md flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-start mb-2">
              <h3 className="text-white/50 text-[10px] uppercase font-bold tracking-widest">TỶ LỆ LẤP ĐẦY TOÀN HỆ THỐNG</h3>
              <TrendingUp className="w-4 h-4 text-emerald-400" />
            </div>
            <p className="text-4xl font-black text-emerald-400 mb-1">{overallOccupancyRate}%</p>
            <div className="text-[10px] text-white/40 uppercase tracking-wider space-y-1 mt-3">
              <div className="flex justify-between">
                <span>Tổng giờ thực tế:</span>
                <span className="font-mono text-white font-bold">{totalActualHoursAllCourts.toFixed(1)} giờ</span>
              </div>
              <div className="flex justify-between">
                <span>Giờ tiêu chuẩn (12h/ngày):</span>
                <span className="font-mono text-white font-bold">{totalStandardHoursAllCourts} giờ</span>
              </div>
              <div className="flex justify-between border-t border-white/5 pt-1 mt-1 font-bold">
                <span>Sự kiện diễn ra trong:</span>
                <span className="font-mono text-emerald-400 font-black">{totalDays} ngày hoạt động</span>
              </div>
            </div>
          </div>
        </div>

        {/* Adjust average duration simulation */}
        <div className="p-6 rounded-xl border border-white/10 bg-white/5 backdrop-blur-md flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-start mb-2">
              <h3 className="text-white/50 text-[10px] uppercase font-bold tracking-widest">CẤU HÌNH THỜI LƯỢNG TRẬN</h3>
              <Clock className="w-4 h-4 text-amber-400" />
            </div>
            <div className="py-2">
              <label className="block text-xs font-bold text-white/80 mb-2 uppercase tracking-wide">
                Trung bình: <span className="text-amber-400 font-extrabold text-sm">{avgMatchDuration} phút</span> / trận đấu
              </label>
              <input 
                type="range" 
                min="15" 
                max="60" 
                step="5"
                className="w-full accent-amber-400 cursor-pointer h-1 bg-white/10 rounded-lg appearance-none"
                value={avgMatchDuration} 
                onChange={e => setAvgMatchDuration(Number(e.target.value))} 
              />
              <div className="flex justify-between text-[9px] text-white/30 uppercase font-mono mt-1 pr-1">
                <span>15ph</span>
                <span>30ph</span>
                <span>45ph</span>
                <span>60ph</span>
              </div>
            </div>
          </div>
          <p className="text-[10px] text-white/40 border-t border-white/5 pt-2 mt-2 leading-relaxed">
            * Hệ thống tự động so sánh số giờ sân hoạt động thực tế với chuẩn <span className="text-white/70 font-bold">12 giờ mỗi ngày</span> để tìm ra mức hiệu năng lấp đầy tối ưu.
          </p>
        </div>

        {/* Most active users */}
        <div className="p-6 rounded-xl border border-white/10 bg-white/5 backdrop-blur-md h-64 flex flex-col">
          <h3 className="text-emerald-400 font-bold uppercase tracking-widest text-[10px] mb-3 flex justify-between items-center">
            <span>NGƯỜI CHƠI TÍCH CỰC NHẤT</span>
            <Trophy className="w-3 h-3 text-emerald-400" />
          </h3>
          <div className="flex justify-between items-center text-[9px] text-white/40 uppercase font-black tracking-widest px-2 pb-2 mb-2 border-b border-white/5">
            <span>Xếp hạng / Tên người chơi</span>
            <span>Tổng số trận</span>
          </div>
          <ul className="text-xs space-y-2 flex-1 overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
             {mostActiveUsers.map((u, i) => (
                <li key={u.id} className="flex justify-between items-center text-white/80 p-2 rounded bg-white/5 border border-white/5 hover:bg-white/10 transition-colors">
                   <span className="flex items-center gap-2">
                     <span className="font-bold text-emerald-400">{i+1}.</span> 
                     <span className="font-bold text-white">{u.name}</span>
                     {i === 0 && <Star className="w-3 h-3 text-amber-400 fill-amber-400" />}
                   </span>
                   <span className="font-bold bg-emerald-500/15 text-emerald-400 px-2 py-0.5 rounded text-[10px] uppercase tracking-wider">{userMatchCounts[u.id]} TRẬN</span>
                </li>
             ))}
          </ul>
        </div>
      </div>

      {/* Tỷ lệ lấp đầy chi tiết từng Sân */}
      <div className="p-6 rounded-xl border border-white/10 bg-white/5 backdrop-blur-md">
        <h3 className="text-emerald-400 font-bold text-sm uppercase tracking-widest mb-4 flex items-center gap-2">
          <Calendar className="w-4 h-4 text-emerald-400" />
          Hiệu Suất Lấp Đầy Chi Tiết Từng Sân (Chuẩn {standardHoursPerDay} Tiếng / Ngày)
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {courtUsageData.map(c => (
            <div key={c.id} className="p-4 rounded-xl border border-white/5 bg-slate-900/50 flex flex-col justify-between">
              <div>
                <div className="flex justify-between items-center mb-2 border-b border-white/5 pb-2">
                  <span className="font-extrabold text-white text-sm">{c.name}</span>
                  <span className={`px-2 py-0.5 text-[8px] font-black rounded uppercase tracking-widest ${
                    c.status === 'playing' ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30' :
                    c.status === 'waiting_list' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' :
                    'bg-white/5 text-white/40'
                  }`}>
                    {c.status === 'playing' ? 'Đang đấu' : c.status === 'waiting_list' ? 'Đang chờ' : 'Để trống'}
                  </span>
                </div>
                
                <div className="space-y-2 mt-3 text-xs">
                  <div className="flex justify-between text-white/60">
                    <span>Số trận diễn ra:</span>
                    <span className="font-bold text-white font-mono">{c.completedMatches} trận</span>
                  </div>
                  <div className="flex justify-between text-white/60">
                    <span>Thời lượng thực tế:</span>
                    <span className="font-bold text-emerald-400 font-mono">{c.actualPlayHours.toFixed(1)} giờ</span>
                  </div>
                  <div className="flex justify-between text-white/60">
                    <span>Tiêu chuẩn so sánh:</span>
                    <span className="font-bold text-white/50 font-mono">{standardWorkHoursPerCourt} giờ</span>
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-white/5">
                <div className="flex justify-between items-center text-[10px] mb-1 font-bold">
                  <span className="text-white/40 uppercase tracking-widest">Hiệu suất lấp đầy:</span>
                  <span className="text-emerald-400 font-black">{c.occupancyRate}%</span>
                </div>
                <div className="w-full bg-white/5 rounded-full h-2 overflow-hidden border border-white/10">
                  <div 
                    className={`h-full rounded-full transition-all duration-500 ${
                      c.occupancyRate >= 75 ? 'bg-emerald-500' :
                      c.occupancyRate >= 40 ? 'bg-blue-500' :
                      c.occupancyRate > 0 ? 'bg-amber-500' :
                      'bg-slate-700'
                    }`}
                    style={{ width: `${Math.min(100, c.occupancyRate)}%` }}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* LEADERBOARD */}
        <div className="p-6 rounded-xl border border-white/10 bg-white/5 backdrop-blur-md overflow-hidden flex flex-col h-[500px]">
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
        <div className="p-6 rounded-xl border border-white/10 bg-white/5 backdrop-blur-md h-[500px] flex flex-col">
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
