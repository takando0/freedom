import React, { useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';

export default function Admin() {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [status, setStatus] = useState('waiting');
  const [timer, setTimer] = useState(0);
  const [round, setRound] = useState(1);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [globalTop, setGlobalTop] = useState<any[]>([]);
  const [playersCount, setPlayersCount] = useState(0);
  const [players, setPlayers] = useState<{id:string; firstName:string; lastName:string}[]>([]);
  const [liveTop, setLiveTop] = useState<{ playerName: string; score: number }[]>([]);
  useEffect(() => {
    const s = io({ transports: ['websocket'] });
    s.on('gameState', (st: any) => {
      setStatus(st.status);
      setTimer(st.timer);
      setRound(st.round);
      setCurrentQuestion(st.currentQuestion);
      setPlayersCount(st.playersCount ?? 0);
      setPlayers(Array.isArray(st.playersList) ? st.playersList : []);
      setLiveTop(Array.isArray(st.leaderboard) ? st.leaderboard : []);
    });
    s.on('timerUpdate', ({ timer }) => setTimer(timer));
    setSocket(s);
    return () => s.disconnect();
  }, []);

  useEffect(() => {
    fetch(`/api/global-leaderboard`).then(r => r.json()).then((rows) => {
      if (Array.isArray(rows)) {
        const byName = new Map<string, number>();
        for (const r of rows) {
          const name = r.playerName || '—';
          const score = Number(r.score) || 0;
          if (!byName.has(name) || score > (byName.get(name) as number)) byName.set(name, score);
        }
        const aggregated = Array.from(byName.entries()).map(([playerName, score]) => ({ playerName, score }))
          .sort((a,b)=>b.score-a.score).slice(0,20);
        setGlobalTop(aggregated);
      }
    }).catch(()=>{});
  }, [status]);

  const send = (type: string) => socket?.emit('adminCommand', { type });
  const statusLabel: Record<string, string> = {
    waiting: 'Ожидание (игра не запущена)',
    rules: 'Правила',
    question: 'Вопрос',
    results: 'Результаты',
    'round-transition': 'Переход между раундами',
    final: 'Финал',
  };

  return (
    <div className="min-h-dvh p-6">
      <header className="flex items-center gap-3">
        <img src="/logo.svg" alt="Logo" className="h-8" />
      </header>
      <div className="mt-4 flex items-center gap-3">
        <span className="inline-flex items-center px-3 py-1 rounded-full bg-white/10 text-white/90">
          Статус: {statusLabel[status] || '—'}
        </span>
        {status !== 'waiting' && (
          <span className="text-white/70">Таймер: {timer}s</span>
        )}
      </div>
      {status === 'waiting' ? (
        <div className="text-white/60 mt-2">Игра не запущена. Подключено игроков: {playersCount}</div>
      ) : (
        <div className="text-white/70 mt-2">Раунд: {round} • Вопрос: {currentQuestion + 1}</div>
      )}
      <div className="mt-8 grid grid-cols-2 gap-4 max-w-xl">
        <button className="btn btn-primary" onClick={()=>send('startGame')}>Начать игру</button>
        <button className="btn btn-primary" onClick={()=>send('nextQuestion')}>Следующий вопрос</button>
        <button className="btn btn-primary" onClick={()=>send('showResults')}>Показать результаты</button>
        <button className="btn btn-primary" onClick={()=>send('resetGame')}>Сбросить игру</button>
      </div>

      <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-3 max-w-3xl">
        <button className="btn btn-primary" onClick={() => {
          fetch('/api/leaderboard/clear-view', { method: 'POST' })
            .then(()=>fetch('/api/global-leaderboard').then(r=>r.json()).then((rows)=>{
              if (Array.isArray(rows)) {
                const byName = new Map<string, number>();
                for (const r of rows) {
                  const name = r.playerName || '—';
                  const score = Number(r.score) || 0;
                  if (!byName.has(name) || score > (byName.get(name) as number)) byName.set(name, score);
                }
                const aggregated = Array.from(byName.entries()).map(([playerName, score]) => ({ playerName, score }))
                  .sort((a,b)=>b.score-a.score).slice(0,20);
                setGlobalTop(aggregated);
              }
            }))
            .catch(()=>{});
        }}>Очистить таблицу лидеров (видимую)</button>
        <a className="btn btn-primary text-center" href="/api/export/players.json" target="_blank" rel="noreferrer">Экспорт игроков (JSON)</a>
        <a className="btn btn-primary text-center" href="/api/export/global_leaderboard.json" target="_blank" rel="noreferrer">Экспорт лидерборда (JSON)</a>
      </div>

      <div className="mt-10 max-w-xl">
        <h3 className="text-xl font-semibold mb-3">Глобальный лидерборд (топ‑20)</h3>
        <div className="rounded-lg border border-white/10 divide-y divide-white/10">
          {globalTop.map((row, idx) => (
            <div key={row.playerName+idx} className="flex items-center justify-between px-4 py-2">
              <div className="text-white/80">#{idx+1} {row.playerName}</div>
              <div className="text-white/60">{row.score}</div>
            </div>
          ))}
          {globalTop.length===0 && (
            <div className="px-4 py-3 text-white/60">Пока нет данных</div>
          )}
        </div>
      </div>

      <div className="mt-10 grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl">
        <div>
          <h3 className="text-xl font-semibold mb-3">Подключённые игроки</h3>
          <div className="rounded-lg border border-white/10 divide-y divide-white/10">
            {players.map((p) => (
              <div key={p.id} className="px-4 py-2 flex items-center justify-between">
                <div className="text-white/80">{p.firstName} {p.lastName}</div>
                <span className="inline-flex items-center px-2 py-0.5 rounded bg-white/10 text-white/70 text-xs">онлайн</span>
              </div>
            ))}
            {players.length===0 && (
              <div className="px-4 py-3 text-white/60">Никто не подключен</div>
            )}
          </div>
        </div>
        <div>
          <h3 className="text-xl font-semibold mb-3">Онлайн‑лидерборд текущей игры</h3>
          <div className="rounded-lg border border-white/10 divide-y divide-white/10">
            {liveTop.map((row, idx) => (
              <div key={row.playerName+idx} className="flex items-center justify-between px-4 py-2">
                <div className="text-white/80">#{idx+1} {row.playerName}</div>
                <div className="text-white/60">{row.score}</div>
              </div>
            ))}
            {liveTop.length===0 && (
              <div className="px-4 py-3 text-white/60">Пока нет данных</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}


