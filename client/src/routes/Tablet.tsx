import React, { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { io, Socket } from 'socket.io-client';
import InputMask from 'react-input-mask';

export default function Tablet() {
  const { playerId } = useParams();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [consent, setConsent] = useState<boolean>(false);
  const [registered, setRegistered] = useState<{ playerId: string; playerName: string } | null>(null);
  const [status, setStatus] = useState<string>('waiting');
  const [timer, setTimer] = useState<number>(0);
  const [question, setQuestion] = useState<any>(null);
  const [selected, setSelected] = useState<number | null>(null);
  const [locked, setLocked] = useState<boolean>(false);
  const [lastSubmitted, setLastSubmitted] = useState<any>(null);
  const [result, setResult] = useState<{ correct: number; yourAnswer: any; yourPoints: number } | null>(null);
  const [finalSelf, setFinalSelf] = useState<{ rank: number; score: number } | null>(null);
  const [finalTop, setFinalTop] = useState<any[]>([]);
  const [lastResults, setLastResults] = useState<any>(null);
  const [duration, setDuration] = useState<number>(30);
  const [currentQuestionIdx, setCurrentQuestionIdx] = useState<number>(0);
  const [totalQuestions, setTotalQuestions] = useState<number>(8);
  const [connected, setConnected] = useState<boolean>(false);
  const [serverSession, setServerSession] = useState<number | null>(null);
  const [clientSession, setClientSession] = useState<number | null>(() => {
    const v = localStorage.getItem('freedomBroker_sessionId');
    return v ? Number(v) : null;
  });
  const registeredRef = useRef(registered);
  useEffect(() => { registeredRef.current = registered; }, [registered]);

  useEffect(() => {
    const s = io({ transports: ['websocket'] });
    s.on('connect', () => {
      setConnected(true);
      const savedId = localStorage.getItem('freedomBroker_playerId');
      if (savedId) s.emit('reconnectPlayer', { playerId: savedId });
      // на всякий случай запросим подтверждение, кто мы сейчас
      s.emit('whoami');
    });
    s.on('disconnect', () => {
      setConnected(false);
    });
    s.io.on('error', () => {
      setConnected(false);
      setError('Нет соединения с сервером. Повторите попытку позже.');
    });
    s.on('registered', (payload) => {
      setRegistered(payload);
      localStorage.setItem('freedomBroker_playerId', payload.playerId);
      localStorage.setItem('freedomBroker_playerName', payload.playerName);
      const sid = typeof payload?.sessionId === 'number' ? payload.sessionId : serverSession;
      if (sid != null) {
        localStorage.setItem('freedomBroker_sessionId', String(sid));
        setClientSession(sid);
      }
      setError(null);
    });
    s.on('gameError', (e: { message: string }) => setError(e.message));
    s.on('gameState', (st: any) => {
      setStatus(st.status);
      setTimer(st.timer || 0);
      setQuestion(st.question || null);
      setLastResults(st.lastResults || null);
      setDuration(st.timerDuration || 30);
      // После завершения игры сразу открыть форму новой регистрации
      if (st.status === 'final') {
        setRegistered(null);
        localStorage.removeItem('freedomBroker_playerId');
        localStorage.removeItem('freedomBroker_playerName');
        localStorage.removeItem('freedomBroker_sessionId');
        setClientSession(null);
        setSelected(null);
        setLocked(false);
        setLastSubmitted(null);
        setResult(null);
        setFinalSelf(null);
        // Очистка формы для следующего игрока
        setFirstName('');
        setLastName('');
        setPhone('');
        setConsent(false);
        setError(null);
      }
      if (typeof st.sessionId === 'number') {
        setServerSession(st.sessionId);
        if (clientSession === null) {
          setClientSession(st.sessionId);
        }
      }
      // Показываем форму регистрации при статусе waiting после сброса игры (используем актуальное значение через ref)
      if (st.status === 'waiting' && registeredRef.current) {
        setRegistered(null);
        localStorage.removeItem('freedomBroker_playerId');
        localStorage.removeItem('freedomBroker_playerName');
        localStorage.removeItem('freedomBroker_sessionId');
        setSelected(null);
        setLocked(false);
        setLastSubmitted(null);
        // Очистка формы
        setFirstName('');
        setLastName('');
        setPhone('');
        setConsent(false);
        setError(null);
      }
      if (typeof st.currentQuestion === 'number') {
        // сбрасываем выбор только при переходе к новому вопросу
        setCurrentQuestionIdx((prev) => {
          if (prev !== st.currentQuestion) {
            setSelected(null);
            setLocked(false);
            setLastSubmitted(null);
          }
          return st.currentQuestion;
        });
      }
    });
    s.on('timerUpdate', ({ timer, duration: d }) => { setTimer(timer); if (d) setDuration(d); });
    s.on('resultsSelf', (r: any) => { setResult(r); setLastSubmitted(r?.yourAnswer); });
    s.on('finalSelf', (f: any) => setFinalSelf(f));
    s.on('final', (f: any) => setFinalTop(Array.isArray(f?.leaderboard) ? f.leaderboard : []));
    setSocket(s);
    return () => { s.disconnect(); };
  }, []);

  useEffect(() => {
    fetch(`/api/companies`)
      .then(r => r.json())
      .then((data) => {
        if (data && Array.isArray(data.companies)) setTotalQuestions(data.companies.length);
      })
      .catch(() => {});
  }, []);

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!socket) return;
    if (!connected) { setError('Нет соединения с сервером.'); return; }
    setError(null);
    socket.emit('registerPlayer', { firstName, lastName, phone, consent });
  };

  return (
    <div className="min-h-dvh p-6 flex items-center justify-center relative overflow-hidden">
      {/* Видео-фон только на регистрации */}
      {(!registered) && (
        <video ref={(el)=>{ if(el) { try { el.playbackRate = 0.9; } catch {} } }} className="absolute inset-0 w-full h-full object-cover -z-10 opacity-20" src="/bg.mp4?rev=2" autoPlay muted loop playsInline />
      )}
      <div className="w-full max-w-md">
        <header className="flex items-start justify-between gap-3">
          <div className="text-left">
            <img src="/logo.svg" alt="Logo" className="h-10" />
            <div className="mt-1 text-white/80 text-sm min-h-[1.25rem]">{registered?.playerName || ''}</div>
          </div>
          <div>
            {registered && (status === 'question' || status === 'rules' || status === 'results') && (
              <div className="relative w-[72px] h-[72px]">
                {(() => {
                  const radius = 30;
                  const cx = 36, cy = 36;
                  const circumference = 2 * Math.PI * radius;
                  const prog = Math.max(0, Math.min(1, (timer ?? 0) / (duration || 30)));
                  return (
                    <svg width="72" height="72" className="-rotate-90">
                      <circle cx={cx} cy={cy} r={radius} fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="8" />
                      <circle cx={cx} cy={cy} r={radius} fill="none" stroke="#51AF3D" strokeWidth="8" strokeDasharray={`${circumference} ${circumference}`} strokeDashoffset={`${circumference * (1-prog)}`} strokeLinecap="round" style={{ transition: 'stroke-dashoffset 0.2s linear' }} />
                    </svg>
                  );
                })()}
                <div className="absolute inset-0 flex items-center justify-center text-lg">{timer}s</div>
              </div>
            )}
          </div>
        </header>
        <div className="mt-8 text-left">
          {registered ? (
            status === 'question' && question ? (
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <span className="inline-flex items-center px-3 py-1 rounded-full bg-white/10 text-white/80 text-sm">Раунд {question.round}</span>
                  <span className="text-white/60">Вопрос {currentQuestionIdx + 1} из {totalQuestions}</span>
                </div>
                <div className="text-xl leading-snug">
                  <div>{question.question?.ru}</div>
                  <div className="text-sm text-white/60 mt-1">{question.question?.en}</div>
                </div>
                {Array.isArray(question.options) ? (
                  <div className="grid grid-cols-2 gap-4">
                    {question.options.map((opt: number) => (
                      <button
                        key={opt}
                        disabled={locked}
                        className={`btn w-full ${selected===opt ? 'bg-brand-dark' : 'btn-primary'} ${locked ? 'opacity-60 cursor-not-allowed' : ''}`}
                        onClick={()=>{ if(locked) return; setSelected(opt); setLocked(true); setLastSubmitted(opt); socket?.emit('submitAnswer', { playerId: localStorage.getItem('freedomBroker_playerId'), value: opt }); }}
                      >{Number(opt).toFixed(2)}</button>
                    ))}
                  </div>
                ) : (
                  <div className="space-y-3">
                    <input
                      className="w-full px-4 py-3 rounded-lg bg-white/5 outline-none"
                      inputMode="decimal"
                      placeholder="Введите цену"
                      disabled={locked}
                      onChange={(e)=> setSelected(Number(String(e.target.value).replace(',', '.')))}
                    />
                    <button className={`btn btn-primary w-full ${locked ? 'opacity-60 cursor-not-allowed' : ''}`} disabled={locked || selected===null || Number.isNaN(selected as any)} onClick={()=>{ if(selected===null) return; setLocked(true); setLastSubmitted(selected); socket?.emit('submitAnswer', { playerId: localStorage.getItem('freedomBroker_playerId'), value: selected }); }}>Отправить</button>
                  </div>
                )}
              </div>
            ) : status === 'results' && (result || lastResults) ? (
              <div className="space-y-3 p-5 rounded-2xl border border-white/10 bg-black/40 backdrop-blur-xl">
                <div className="text-xl font-semibold">Результаты</div>
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full" style={{ backgroundColor: 'rgba(81,175,61,0.15)', border: '1px solid rgba(81,175,61,0.5)' }}>
                  <span className="text-white/80">Правильный ответ:</span>
                  <span className="font-semibold" style={{ color: '#51AF3D' }}>{(result?.correct ?? lastResults?.correct) ?? '—'}</span>
                </div>
                {(() => {
                  const your = result?.yourAnswer;
                  const correct = result?.correct ?? lastResults?.correct;
                  const isOk = typeof your === 'number' && typeof correct === 'number' ? Math.abs(Number(your) - Number(correct)) <= 0.005 : String(your) === String(correct);
                  const color = isOk ? '#51AF3D' : '#E24A4A';
                  return (
                    <div>
                      Ваш ответ: <span className="font-semibold" style={{ color }}>{your ?? '—'}</span>
                    </div>
                  );
                })()}
                <div>Вы заработали: <span className="font-semibold">{result?.yourPoints ?? (lastResults?.awarded?.[localStorage.getItem('freedomBroker_playerId') || ''] ?? 0)}</span> баллов</div>
              </div>
            ) : status === 'rules' ? (
              <div className="space-y-4 p-5 rounded-2xl border border-white/10 bg-black/40 backdrop-blur-xl">
                <div className="text-xl font-semibold">Правила</div>
                <div className="text-white/60 text-xs">Русский</div>
                <ul className="space-y-3 text-white/90">
                  <li className="flex items-start gap-3">
                    <span className="inline-flex items-center px-3 py-1.5 rounded-full border border-white/10 bg-white/5 text-white/80 text-sm shrink-0">Раунд 1</span>
                    <span>За правильный ответ — 3 балла; за ближайший — 2; за второй по близости — 1; иначе — 0.</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="inline-flex items-center px-3 py-1.5 rounded-full border border-white/10 bg-white/5 text-white/80 text-sm shrink-0">Раунд 2</span>
                    <span>Введите цену вручную; чем ближе — тем больше баллов.</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="inline-flex items-center px-3 py-1.5 rounded-full border border-white/10 bg-white/5 text-white/80 text-sm shrink-0">Важно</span>
                    <span>Время на ответ ограничено, следите за таймером.</span>
                  </li>
                </ul>
                <div className="text-white/60 text-xs mt-1">English</div>
                <div className="space-y-2 text-sm text-white/60">
                  <div>1 point for the correct option only.</div>
                  <div>Enter the price manually; closer guesses earn more points.</div>
                  <div>Answers are timed; watch the timer.</div>
                </div>
              </div>
            ) : status === 'round-transition' ? (
              <div className="p-4 rounded-lg bg-white/5">Переходим ко второму раунду: вводим цену вручную.</div>
            ) : status === 'final' ? (
              <div className="space-y-5 p-4 rounded-lg bg-white/5 text-left">
                <div className="text-xl font-semibold">Игра завершена</div>
                {finalTop && finalTop.length > 0 ? (
                  (() => {
                    const maxScore = Math.max(...finalTop.map((x:any) => Number(x?.score) || 0));
                    if (maxScore <= 0) {
                      return (
                        <div className="text-white">
                          В этой игре нет победителя, вы заработали{' '}
                          <span className="font-semibold">{finalSelf?.score ?? 0}</span> баллов
                        </div>
                      );
                    }
                    return (
                      <div className="space-y-1">
                        <div className="text-white/90">В этой игре победил</div>
                        <div className="text-white">
                          <span className="font-semibold">{finalTop[0].playerName}</span>
                          <span className="ml-2">— заработал {finalTop[0].score} баллов</span>
                        </div>
                      </div>
                    );
                  })()
                ) : (
                  <div className="text-white/70">Определяем победителя…</div>
                )}
              </div>
            ) : (
              <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-black/40 backdrop-blur-xl p-6">
                <div className="flex items-center gap-2 text-white/60 text-xs uppercase tracking-wide">
                  <span className="w-2.5 h-2.5 rounded-full animate-pulse" style={{ backgroundColor: '#51AF3D' }} />
                  <span>Ожидание старта</span>
                </div>
                <div className="mt-2 text-xl font-semibold">Готово, {registered.playerName}</div>
                <div className="mt-1 text-white/70">Ожидайте начала. Ведущий запустит игру в ближайшее время.</div>
                <div className="pointer-events-none absolute -right-20 -top-20 w-64 h-64 rounded-full bg-white/10 blur-3xl opacity-10" />
              </div>
            )
          ) : (
            <form onSubmit={onSubmit} className="space-y-5 max-w-md mx-auto p-5 rounded-2xl border border-white/10 bg-black/40 backdrop-blur-xl">
              <div className="text-xl font-semibold text-white">Регистрация игрока</div>
              <div className="space-y-1">
                <label className="block text-sm text-white/70">Имя</label>
                <input value={firstName} onChange={(e)=>setFirstName(e.target.value)} className="w-full px-4 py-3 rounded-lg bg-white/5 outline-none border border-white/10 focus:border-white/20" required minLength={2} maxLength={30} />
              </div>
              <div className="space-y-1">
                <label className="block text-sm text-white/70">Фамилия</label>
                <input value={lastName} onChange={(e)=>setLastName(e.target.value)} className="w-full px-4 py-3 rounded-lg bg-white/5 outline-none border border-white/10 focus:border-white/20" required minLength={2} maxLength={30} />
              </div>
              <div className="space-y-1">
                <label className="block text-sm text-white/70">Телефон</label>
                <InputMask
                  mask={'+7 (999) 999-99-99'}
                  value={phone}
                  onChange={(e)=>setPhone(e.target.value)}
                >
                  {(inputProps: any) => (
                    <input {...inputProps} className="w-full px-4 py-3 rounded-lg bg-white/5 outline-none border border-white/10 focus:border-white/20" required inputMode="tel" />
                  )}
                </InputMask>
              </div>
              <label className="flex items-start gap-3 text-sm text-white/80">
                <input type="checkbox" checked={consent} onChange={(e)=>setConsent(e.target.checked)} className="mt-1" required />
                <span>
                  Я соглашаюсь на обработку персональных данных и подтверждаю, что ознакомлен с правилами игры
                </span>
              </label>
              {error && <div className="text-red-400 text-sm text-center">{error}</div>}
              <button className={`btn btn-primary w-full py-3 text-lg ${!connected ? 'opacity-60 cursor-not-allowed' : ''}`} type="submit" disabled={!consent || !connected}>Готов</button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}


