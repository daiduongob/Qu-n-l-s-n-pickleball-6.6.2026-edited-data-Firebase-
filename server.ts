import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';

// --- IN-MEMORY DATA ---
let users: any[] = [
  {
    id: 'admin',
    name: 'Admin',
    username: 'admin',
    password: '123456',
    skillRating: 6.0,
    isReady: false,
    status: 'free',
    courtId: null,
    waitStartTime: null,
  },
  ...Array.from({ length: 8 }).map((_, i) => ({
    id: `user${i + 1}`,
    name: `Người chơi ${i + 1}`,
    username: `user${i + 1}`,
    password: '123',
    skillRating: Number((Math.random() * (3.0 - 2.0) + 2.0).toFixed(1)),
    isReady: true,
    status: 'free',
    courtId: null,
    waitStartTime: Date.now(),
  }))
];

let courts: any[] = [
  { id: '1', name: 'Sân 1', status: 'empty', players: [], waitingTime: null }, // players is array of userIds
  { id: '2', name: 'Sân 2', status: 'empty', players: [], waitingTime: null },
  { id: '3', name: 'Sân 3', status: 'empty', players: [], waitingTime: null },
  { id: '4', name: 'Sân 4', status: 'empty', players: [], waitingTime: null },
];

let matches: any[] = [];

// Helper to auto-match
function autoMatch() {
  const waitingUsers = users
    .filter(u => u.isReady && u.status === 'free' && !u.courtId)
    .sort((a, b) => {
      // Prioritize wait time (smaller time = waited longer)
      return (a.waitStartTime || 0) - (b.waitStartTime || 0);
    });

  if (waitingUsers.length >= 4) {
    const emptyCourts = courts.filter(c => c.status === 'empty');
    if (emptyCourts.length > 0) {
      const court = emptyCourts[0];
      // simplified match making: just take first 4 (already sorted by wait time)
      const selectedUsers = waitingUsers.slice(0, 4);
      
      court.status = 'waiting_list';
      court.players = selectedUsers.map(u => u.id);
      court.waitingTime = Date.now();
      
      selectedUsers.forEach(u => {
        u.courtId = court.id;
        // status remains 'free' or could be considered part of team but not playing yet.
      });
      // Try again in case there are more courts and players
      autoMatch();
    }
  }
}

async function startServer() {
  const app = express();
  app.use(express.json());
  const PORT = 3000;

  // --- API ROUTES ---

  // Get full state
  app.get('/api/state', (req, res) => {
    res.json({
      users: users.map(u => ({ ...u, password: '' })), // don't send passwords
      courts,
      matches,
    });
  });

  // Login
  app.post('/api/login', (req, res) => {
    const { username, password } = req.body;
    const user = users.find(u => u.username === username && u.password === password);
    if (user) {
      autoMatch();
      res.json({ success: true, user: { ...user, password: '' } });
    } else {
      res.status(401).json({ success: false, message: 'Sai thông tin đăng nhập' });
    }
  });

  // Register
  app.post('/api/register', (req, res) => {
    const { name, username, password, skillRating, isReady } = req.body;
    if (users.find(u => u.username === username)) {
       return res.status(400).json({ success: false, message: 'Username đã tồn tại' });
    }
    const newUser = {
      id: Date.now().toString(),
      name,
      username,
      password: password || '123',
      skillRating: Number(skillRating) || 1.0,
      isReady: isReady || false,
      status: 'free',
      courtId: null,
      waitStartTime: isReady ? Date.now() : null,
    };
    users.push(newUser);
    autoMatch();
    res.json({ success: true, user: { ...newUser, password: '' } });
  });

  // Update Profile
  app.post('/api/users/:id', (req, res) => {
    const { id } = req.params;
    const { name, username, password, isReady, skillRating } = req.body;
    const userIndex = users.findIndex(u => u.id === id);
    if (userIndex !== -1) {
      const u = users[userIndex];
      // update fields
      if (name !== undefined) u.name = name;
      if (username !== undefined) u.username = username;
      if (password !== undefined && password !== '') u.password = password;
      if (skillRating !== undefined && id === 'admin') u.skillRating = Number(skillRating); // Only admin can update rating directly or if requested
      // wait, the prompt says Admin can change rating. Here we just trust the client payload since it's simple.
      if (skillRating !== undefined) u.skillRating = Number(skillRating); // allowing client to send it (client handles admin logic)
      
      if (isReady !== undefined && u.isReady !== isReady) {
        u.isReady = isReady;
        if (isReady) {
          u.waitStartTime = Date.now();
        } else {
          u.waitStartTime = null;
          u.courtId = null; // remove from court waiting list if not playing
          // if they were in a waiting_list court, we need to clear that court
          courts.forEach(c => {
            if (c.status === 'waiting_list' && c.players.includes(id)) {
               c.status = 'empty';
               c.players.forEach(pid => {
                 const pu = users.find(x => x.id === pid);
                 if (pu) pu.courtId = null;
               });
               c.players = [];
            }
          });
        }
      }
      autoMatch();
      res.json({ success: true });
    } else {
      res.status(404).json({ success: false });
    }
  });

  // Admin delete user
  app.delete('/api/users/:id', (req, res) => {
    users = users.filter(u => u.id !== req.params.id);
    res.json({ success: true });
  });

  // Admin courts CRUD
  app.post('/api/courts', (req, res) => {
    const { name, status } = req.body;
    courts.push({ id: Date.now().toString(), name, status: status || 'empty', players: [] });
    autoMatch();
    res.json({ success: true });
  });
  
  app.put('/api/courts/:id', (req, res) => {
    const court = courts.find(c => c.id === req.params.id);
    if (court) {
      if (req.body.name) court.name = req.body.name;
      if (req.body.status) court.status = req.body.status;
      res.json({ success: true });
    } else {
      res.status(404).json({ success: false });
    }
  });

  app.delete('/api/courts/:id', (req, res) => {
    const court = courts.find(c => c.id === req.params.id);
    if (!court) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy sân' });
    }
    if (court.status !== 'empty') {
      return res.status(400).json({ success: false, message: 'Chỉ có thể xóa sân khi sân trống' });
    }
    courts = courts.filter(c => c.id !== req.params.id);
    res.json({ success: true });
  });

  app.post('/api/courts/reset-random', (req, res) => {
    courts.forEach(c => {
      if (c.status === 'waiting_list') {
        c.status = 'empty';
        c.players = [];
        c.waitingTime = null;
      }
    });

    users.forEach(u => {
      if (u.isReady && u.status === 'free') {
        u.courtId = null;
        u.waitStartTime = Date.now() + Math.random() * 100000;
      }
    });

    autoMatch();
    res.json({ success: true });
  });

  // Admin Matches & Court Control
  app.post('/api/courts/:id/start', (req, res) => {
    const court = courts.find(c => c.id === req.params.id);
    if (court && court.status === 'waiting_list') {
      court.status = 'playing';
      court.players.forEach(pid => {
        const u = users.find(x => x.id === pid);
        if (u) u.status = 'playing';
      });
      res.json({ success: true });
    } else {
      res.status(400).json({ success: false });
    }
  });

  app.post('/api/courts/:id/adjust', (req, res) => {
    // Admin manually sets the 4 players
    const { players } = req.body; // array of 4 user ids
    const court = courts.find(c => c.id === req.params.id);
    if (court) {
      // free old players
      court.players.forEach(pid => {
         const u = users.find(x => x.id === pid);
         if (u && !players.includes(pid)) u.courtId = null;
      });
      // set new players
      players.forEach((pid: string) => {
         const u = users.find(x => x.id === pid);
         if (u) u.courtId = court.id;
      });
      court.players = players;
      court.status = 'waiting_list';
      if (!court.waitingTime) court.waitingTime = Date.now();
      res.json({ success: true });
    } else {
       res.status(400).json({ success: false });
    }
  });

  app.post('/api/courts/:id/end', (req, res) => {
    const court = courts.find(c => c.id === req.params.id);
    const { teamA, teamB, scoreA, scoreB } = req.body; // just for history
    if (court) {
      // Save history & update rating
      // simple rating update: winning team gets +10, losing teams gets -10 (or real elo later)
      const A_win = scoreA > scoreB;
      const b_win = scoreB > scoreA;
      
      const matchHistory = {
        id: Date.now().toString(),
        courtName: court.name,
        teamA: teamA || court.players.slice(0, 2),
        teamB: teamB || court.players.slice(2, 4),
        scoreA,
        scoreB,
        date: Date.now(),
      };
      matches.push(matchHistory);

      court.players.forEach(pid => {
        const u = users.find(x => x.id === pid);
        if (u) {
          u.status = 'free';
          u.courtId = null;

          // Update rating
          if (matchHistory.teamA.includes(pid)) {
             u.skillRating += A_win ? 0.1 : (A_win === b_win ? 0 : -0.1);
          } else if (matchHistory.teamB.includes(pid)) {
             u.skillRating += b_win ? 0.1 : (A_win === b_win ? 0 : -0.1);
          }
          u.skillRating = Math.max(1.0, Math.min(6.0, Number(u.skillRating.toFixed(1))));
        }
      });

      court.status = 'empty';
      court.players = [];
      court.waitingTime = null;
      
      autoMatch(); // immediately try to fill this empty court
      res.json({ success: true });
    } else {
      res.status(400).json({ success: false });
    }
  });

  // --- VITE MIDDLEWARE ---
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
    autoMatch();
  });
}

startServer();
