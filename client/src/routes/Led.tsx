import React, { useEffect, useRef, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { io, Socket } from 'socket.io-client';

export default function Led() {
  const APP_QR_URL = 'https://freedom24.com/app';
  const [playersCount, setPlayersCount] = useState(0);
  const [status, setStatus] = useState<string>('waiting');
  const [timer, setTimer] = useState<number>(0);
  const [question, setQuestion] = useState<any>(null);
  const [lastResults, setLastResults] = useState<any>(null);
  const [finalTop, setFinalTop] = useState<any[]>([]);
  const [globalTop, setGlobalTop] = useState<any[]>([]);
  const [liveTop, setLiveTop] = useState<any[]>([]);
  const [onlinePlayers, setOnlinePlayers] = useState<string[]>([]);
  const [totalQuestions, setTotalQuestions] = useState<number>(8);
  const [showWaitingTop, setShowWaitingTop] = useState<boolean>(false);
  const [showInfoSlide, setShowInfoSlide] = useState<boolean>(false);
  const [showEcoSlide, setShowEcoSlide] = useState<boolean>(false);
  const [forcedSlide, setForcedSlide] = useState<null | 'eco' | 'info' | 'top' | 'other'>(null);
  const [showOtherSlide, setShowOtherSlide] = useState<boolean>(false);
  const [slideLang, setSlideLang] = useState<'ru'|'en'>('ru');
  const bgRef = useRef<HTMLVideoElement | null>(null);
  useEffect(() => {
    const s: Socket = io({ transports: ['websocket'] });
    s.on('gameState', (st: any) => {
      setPlayersCount(st.playersCount || 0);
      setStatus(st.status);
      setTimer(st.timer || 0);
      setQuestion(st.question || null);
      setLastResults(st.lastResults || null);
      if (Array.isArray(st.leaderboard)) setLiveTop(st.leaderboard);
      if (Array.isArray(st.playersList)) setOnlinePlayers(st.playersList.map((p:any)=>`${p.firstName} ${p.lastName}`));
    });
    s.on('timerUpdate', ({ timer }) => setTimer(timer));
    s.on('final', (f: any) => setFinalTop(f.leaderboard || []));
    return () => { s.disconnect(); };
  }, []);

  // Скорость фон-видео в ожидании
  useEffect(() => {
    try {
      if ((status === 'waiting' || forcedSlide) && bgRef.current) {
        bgRef.current.playbackRate = 0.9;
      }
    } catch {}
  }, [status, forcedSlide]);

  // Чтение query-параметра для принудительного показа слайда
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const s = (params.get('slide') || params.get('screen') || params.get('s') || '').toLowerCase();
      if (s === 'eco' || s === 'info' || s === 'top' || s === 'other') {
        setForcedSlide(s as any);
      }
    } catch {}
  }, []);

  // Получаем количество вопросов
  useEffect(() => {
    fetch(`/api/companies`).then(r=>r.json()).then((d)=>{
      if (Array.isArray(d?.companies)) setTotalQuestions(d.companies.length);
    }).catch(()=>{});
  }, []);

  // Загружаем глобальный топ-10 при переходе в финальный статус
  useEffect(() => {
    if (status !== 'final') return;
    fetch(`/api/global-leaderboard`)
      .then((r) => r.json())
      .then((rows: any[]) => {
        const bestByKey = new Map<string, { firstName: string; lastName: string; phone?: string; score: number }>();
        for (const row of rows || []) {
          const firstName = (row.firstName || String(row.playerName || '').split(' ')[0] || '').trim();
          const lastName = (row.lastName || String(row.playerName || '').split(' ').slice(1).join(' ') || '').trim();
          const phone = typeof row.phone === 'string' ? row.phone : undefined;
          const score = Number(row.score) || 0;
          const key = phone && /^\d{11}$/.test(phone) ? phone : `${firstName} ${lastName}`;
          const prev = bestByKey.get(key);
          if (!prev || score > prev.score) bestByKey.set(key, { firstName, lastName, phone, score });
        }
        const top = Array.from(bestByKey.values())
          .sort((a, b) => b.score - a.score)
          .slice(0, 6)
          .map((p, idx) => ({ rank: idx + 1, ...p }));
        setGlobalTop(top);
      })
      .catch(() => setGlobalTop([]));
  }, [status]);

  // Ротация в ожидании: периодически показывать топ-10, эко-слайд и инфо-слайд
  useEffect(() => {
    if (forcedSlide) {
      setShowWaitingTop(forcedSlide === 'top');
      setShowEcoSlide(forcedSlide === 'eco');
      setShowInfoSlide(forcedSlide === 'info');
      setShowOtherSlide(forcedSlide === 'other');
      return;
    }
    if (status !== 'waiting') { setShowWaitingTop(false); setShowInfoSlide(false); setShowEcoSlide(false); setShowOtherSlide(false); return; }
    let mounted = true;
    const fetchTop = () => {
      fetch(`/api/global-leaderboard`)
        .then(r=>r.json())
        .then((rows:any[]) => {
          if (!mounted) return;
          const bestByKey = new Map<string, { firstName: string; lastName: string; phone?: string; score: number }>();
          for (const row of rows || []) {
            const firstName = (row.firstName || String(row.playerName || '').split(' ')[0] || '').trim();
            const lastName = (row.lastName || String(row.playerName || '').split(' ').slice(1).join(' ') || '').trim();
            const phone = typeof row.phone === 'string' ? row.phone : undefined;
            const score = Number(row.score) || 0;
            const key = phone && /^\d{11}$/.test(phone) ? phone : `${firstName} ${lastName}`;
            const prev = bestByKey.get(key);
            if (!prev || score > prev.score) bestByKey.set(key, { firstName, lastName, phone, score });
          }
          const top = Array.from(bestByKey.values()).sort((a,b)=>b.score-a.score).slice(0,6).map((p,idx)=>({ rank: idx+1, ...p }));
          setGlobalTop(top);
        })
        .catch(()=>{});
    };
    fetchTop();
    setShowWaitingTop(false);
    setShowOtherSlide(true);
    setSlideLang('ru');
    setShowEcoSlide(false);
    setShowInfoSlide(false);
    const cycle = setInterval(() => {
      // каждые 5 секунд переключаем RU→EN для текущего слайда и идём к следующему
      if (showOtherSlide) {
        if (slideLang === 'ru') { setSlideLang('en'); }
        else { setShowOtherSlide(false); setShowEcoSlide(true); setSlideLang('ru'); }
      } else if (showEcoSlide) {
        if (slideLang === 'ru') { setSlideLang('en'); }
        else { setShowEcoSlide(false); setShowInfoSlide(true); setSlideLang('ru'); }
      } else if (showInfoSlide) {
        if (slideLang === 'ru') { setSlideLang('en'); }
        else { setShowInfoSlide(false); setShowOtherSlide(true); setSlideLang('ru'); }
      } else {
        setShowOtherSlide(true); setSlideLang('ru');
      }
    }, 5000);
    return () => { mounted = false; clearInterval(cycle); };
  }, [status, forcedSlide]);
  const radius = 80;
  const circumference = 2 * Math.PI * radius;
  const progress = Math.max(0, Math.min(1, (timer ?? 0) / (question?.timerDuration ?? 30)));
  const TabletIcon = ({ active }: { active: boolean }) => (
    <svg
      width="40"
      height="56"
      viewBox="0 0 40 56"
      className={`${active ? 'opacity-100' : 'opacity-60'} transition-opacity`}
      style={active ? ({ animation: 'pulseOpacity 2.6s ease-in-out infinite' } as React.CSSProperties) : undefined}
    >
      <rect x="3" y="2" width="34" height="52" rx="6" ry="6" fill="none" stroke="white" strokeOpacity="0.9" strokeWidth="2" />
      <rect x="7" y="8" width="26" height="38" rx="3" ry="3" fill={active ? '#51AF3D' : 'rgba(255,255,255,0.08)'} stroke="rgba(255,255,255,0.2)" />
      <circle cx="20" cy="50" r="1.8" fill="white" fillOpacity="0.8" />
    </svg>
  );
  const InfoIcon = ({ type }: { type: string }) => {
    switch (type) {
      case 'users':
        return (
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="11" fill="rgba(255,255,255,0.06)" />
            <path d="M12 12a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" fill="#51AF3D"/>
            <path d="M6.5 18c.7-2.4 2.9-4 5.5-4s4.8 1.6 5.5 4" stroke="#51AF3D" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
        );
      case 'employees':
        return (
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="11" fill="rgba(255,255,255,0.06)" />
            <path d="M9 10a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z" fill="#51AF3D"/>
            <path d="M4.5 17c.5-1.8 2.1-3 4-3" stroke="#51AF3D" strokeWidth="1.5"/>
            <path d="M15 12a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z" fill="#51AF3D" opacity=".8"/>
            <path d="M19.5 17c-.5-1.8-2.1-3-4-3" stroke="#51AF3D" strokeWidth="1.5"/>
          </svg>
        );
      case 'countries':
        return (
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="11" fill="rgba(255,255,255,0.06)" />
            <path d="M12 20s6-6.2 6-10a6 6 0 1 0-12 0c0 3.8 6 10 6 10Z" stroke="#51AF3D" strokeWidth="1.6"/>
            <circle cx="12" cy="10" r="1.6" fill="#51AF3D"/>
          </svg>
        );
      case 'offices':
        return (
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="11" fill="rgba(255,255,255,0.06)" />
            <rect x="7.5" y="6" width="9" height="12" rx="1.5" stroke="#51AF3D" strokeWidth="1.6"/>
            <path d="M9.5 9h5M9.5 12h5M9.5 15h5" stroke="#51AF3D" strokeWidth="1.4" strokeLinecap="round"/>
          </svg>
        );
      case 'equity':
        return (
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="11" fill="rgba(255,255,255,0.06)" />
            <path d="M6.5 12.5 11 16l6.5-8" stroke="#51AF3D" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        );
      case 'assets':
        return (
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="11" fill="rgba(255,255,255,0.06)" />
            <rect x="6" y="8" width="12" height="8" rx="2" stroke="#51AF3D" strokeWidth="1.6"/>
            <path d="M9 12h6" stroke="#51AF3D" strokeWidth="1.6"/>
          </svg>
        );
      case 'revenue':
        return (
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="11" fill="rgba(255,255,255,0.06)" />
            <path d="M6 14l3-3 2 2 5-5" stroke="#51AF3D" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        );
      case 'profit':
      default:
        return (
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="11" fill="rgba(255,255,255,0.06)" />
            <path d="M7 15c2.5-5 3.5-6 5-6 1.6 0 2.4 1.2 5 6" stroke="#51AF3D" strokeWidth="1.6"/>
            <path d="M10.5 9.5h3" stroke="#51AF3D" strokeWidth="1.6"/>
          </svg>
        );
    }
  };
  const [pulse, setPulse] = useState(false);
  useEffect(() => {
    setPulse(true);
    const t = setTimeout(() => setPulse(false), 180);
    return () => clearTimeout(t);
  }, [timer]);
  return (
    <div className="min-h-dvh flex flex-col items-center justify-center gap-8 p-8 relative overflow-hidden">
      <style>{`@keyframes pulseOpacity { 0% { opacity: .7 } 50% { opacity: 1 } 100% { opacity: .7 } } @keyframes fadeSlide { 0% { opacity: 0; transform: translateY(10px) } 100% { opacity: 1; transform: translateY(0) } } @keyframes glowPulse { 0%,100% { text-shadow: 0 0 8px rgba(81,175,61,0.25), 0 0 14px rgba(81,175,61,0.15); filter: drop-shadow(0 0 8px rgba(81,175,61,0.2)); } 50% { text-shadow: 0 0 26px rgba(81,175,61,0.6), 0 0 42px rgba(81,175,61,0.28); filter: drop-shadow(0 0 22px rgba(81,175,61,0.5)); } }`}</style>
      {status === 'waiting' && (
        <video
          className="absolute inset-0 w-full h-full object-cover -z-10"
          src="/bg.mp4?rev=2"
          autoPlay
          muted
          loop
          playsInline
          ref={bgRef}
        />
      )}
      {/* верхний логотип скрыт по запросу */}
      {status === 'waiting' && (
        <>
          {!showWaitingTop ? (
            <>
              {!showInfoSlide && !showEcoSlide ? (
                <div className="relative w-full max-w-3xl rounded-2xl border border-white/10 bg-black/40 backdrop-blur-xl overflow-hidden" style={{ animation: 'fadeSlide 260ms ease-out' }}>
                  <div className="p-8 md:p-10 text-center">
                    <img src="/logo.svg" alt="Logo" className="mx-auto h-12 md:h-16 mb-3 opacity-95" />
                    <h1 className="font-semibold tracking-tight text-[clamp(2.4rem,5.2vw,4.2rem)]" style={{ animation: 'glowPulse 3.2s ease-in-out infinite', willChange: 'filter, text-shadow' }}>ГДЕ ТЫ БЫЛ В 2020?</h1>
                    <p className="mt-2 text-[clamp(1.1rem,2vw,1.4rem)] text-white/80">Добро пожаловать на викторину от Freedom Broker!</p>
                    <div className="mt-6 flex items-center justify-center gap-5">
                      {[0,1,2,3].map((i)=> (
                        <TabletIcon key={i} active={i < playersCount} />
                      ))}
                    </div>
                    <div className="mt-6 inline-flex items-center gap-2 px-4 py-2 rounded-full border border-white/10 bg-white/5 text-white/80">
                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: '#51AF3D' }} />
                      <span>Подключено игроков: <span className="font-semibold text-white">{playersCount}</span></span>
                    </div>
                  </div>
                </div>
              ) : (
                (forcedSlide === 'other' || showOtherSlide) ? (
                  <div className="relative w-full max-w-6xl rounded-2xl border border-white/10 bg-black/50 backdrop-blur-2xl overflow-hidden" style={{ animation: 'fadeSlide 260ms ease-out' }}>
                    <div className="p-8 md:p-10">
                      <div className="text-center">
                        <img src="/logo.svg" alt="Logo" className="mx-auto h-12 md:h-14 mb-2 opacity-95" />
                        <div className="text-[clamp(1.8rem,4vw,2.8rem)] font-semibold tracking-tight text-white">{slideLang==='en' ? 'FRHC STOCKS' : 'АКЦИИ FRHC'}</div>
                      </div>
                      {/* Верхний стеклянный блок с двумя строками */}
                      <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 overflow-hidden">
                        <div className="px-5 py-4 flex items-center justify-between gap-4">
                          <div className="inline-flex items-center gap-3">
                            <svg width="28" height="28" viewBox="0 0 24 24" fill="none"><path d="M12 3l2.7 5.5 6.1.9-4.4 4.3 1 6.1L12 17.8 6.6 19.8l1-6.1L3.2 9.4l6.1-.9L12 3z" fill="#7CE0C3"/></svg>
                            <div className="text-[clamp(1.05rem,2vw,1.35rem)] font-semibold" style={{ color:'#51AF3D' }}>{slideLang==='en' ? 'Main Listing Exchange' : 'Основная биржа листинга'}</div>
                          </div>
                          <div className="flex-1 text-center text-white/85">{slideLang==='en' ? 'New York, USA' : 'Нью‑Йорк, США'}</div>
                          <div className="shrink-0">
                            <img src="/other/Nasdaq.svg" alt="Nasdaq" className="h-8 opacity-95" />
                          </div>
                        </div>
                        <div className="border-t border-white/10 px-5 py-4 flex items-center justify-between gap-4">
                          <div className="flex items-start gap-3">
                            <div className="text-white/90 text-[clamp(1.05rem,2.1vw,1.35rem)]">{slideLang==='en' ? 'The stocks are also admitted to the official lists of two Kazakhstan stock exchanges.' : 'Акции также включены в официальные списки двух казахстанских бирж'}</div>
                          </div>
                          <div className="flex items-center gap-4">
                            <img src="/other/Kase.svg" alt="KASE" className="h-8" />
                            <span className="h-6 w-px bg-white/20" />
                            <img src="/other/Aix.svg" alt="AIX" className="h-8" />
                          </div>
                        </div>
                      </div>
                      {/* Средний блок: метрики слева, индексы справа */}
                      <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-5">
                        <div className="space-y-5">
                          <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
                            <div className="text-white/60 text-sm">{slideLang==='en' ? 'Current market capitalization' : 'Текущая рыночная капитализация'}</div>
                            <div className="text-[clamp(1.9rem,3.2vw,2.4rem)] font-extrabold" style={{ color:'#51AF3D' }}>{slideLang==='en' ? '~ USD 11 billion*' : '~11 млрд USD*'}</div>
                          </div>
                          <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
                            <div className="text-white/60 text-sm">{slideLang==='en' ? 'Return since listing on NASDAQ' : 'Доходность с момента листинга на NASDAQ'}</div>
                            <div className="text-[clamp(1.9rem,3.2vw,2.4rem)] font-extrabold" style={{ color:'#51AF3D' }}>&gt;1100%*</div>
                          </div>
                        </div>
                        <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
                          <div className="text-white/85 font-semibold mb-2">{slideLang==='en' ? 'FRHC is part of the following indexes:' : 'FRHC в составе индексов:'}</div>
                          <ul className="list-disc pl-5 space-y-1.5 text-white/80 text-sm">
                            <li>Russell 3000</li>
                            <li>NASDAQ Composite</li>
                            <li>MSCI U.S. Small Cap 1750</li>
                            <li>MSCI U.S. Investable Market 2500</li>
                            <li>AIX Qazaq Index</li>
                          </ul>
                        </div>
                      </div>
                      {/* Нижний блок: реальный svg-график */}
                      <div className="mt-6 rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                        <div className="relative w-full overflow-hidden">
                          <img src="/graph.svg" alt="FRHC graph" className="w-full h-auto" />
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                showEcoSlide ? (
                  <div className="relative w-full max-w-6xl rounded-2xl border border-white/10 bg-black/50 backdrop-blur-2xl overflow-hidden" style={{ animation: 'fadeSlide 260ms ease-out' }}>
                    <div className="p-8 md:p-10">
                      <div className="text-center">
                        <img src="/icon.svg" alt="Icon" className="mx-auto h-12 md:h-16 mb-3 opacity-95" />
                        <div className="text-[clamp(2rem,4.5vw,3.2rem)] font-semibold tracking-tight text-white">{slideLang==='en' ? 'UNIQUE DIGITAL ECOSYSTEM' : 'УНИКАЛЬНАЯ ЦИФРОВАЯ ЭКОСИСТЕМА'}</div>
                        <div className="mt-3 text-[clamp(1.4rem,3vw,2rem)]" style={{ color:'#51AF3D' }}>{slideLang==='en' ? 'Focus Areas' : 'Основные направления'}</div>
                        <div className="mt-5 grid grid-cols-2 gap-4 max-w-4xl mx-auto">
                          {(slideLang==='en' ? [
                            {t:'Brokerage and banking services', icon:'bank'},
                            {t:'Telecom', icon:'wifi'},
                            {t:'Insurance', icon:'shield'},
                            {t:'Lifestyle', icon:'heart'},
                          ] : [
                            {t:'Брокерские и банковские услуги', icon:'bank'},
                            {t:'Телеком', icon:'wifi'},
                            {t:'Страхование', icon:'shield'},
                            {t:'Лайфстайл', icon:'heart'},
                          ]).map((it)=> (
                            <span key={it.t} className="inline-flex items-center gap-3 px-6 py-3.5 rounded-2xl border border-white/10 bg-white/5 text-white/90 text-[clamp(1.15rem,2.2vw,1.45rem)] shadow-[0_0_24px_rgba(0,0,0,.28)]">
                              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                                {it.icon==='bank' && (<path d="M4 9h16M6 11v7m4-7v7m4-7v7m4-7v7M3 9l9-5 9 5v1H3V9Z" stroke="#51AF3D" strokeWidth="1.9" strokeLinecap="round"/>) }
                                {it.icon==='shield' && (<path d="M12 3l7 3v5c0 4.3-3 8.2-7 9-4-0.8-7-4.7-7-9V6l7-3Z" stroke="#51AF3D" strokeWidth="1.9"/>) }
                                {it.icon==='heart' && (<path d="M12 20s-7-4.4-7-9a4.2 4.2 0 0 1 7-3 4.2 4.2 0 0 1 7 3c0 4.6-7 9-7 9Z" stroke="#51AF3D" strokeWidth="1.9"/>) }
                                {it.icon==='wifi' && (<path d="M3 9c5.8-5.3 12.2-5.3 18 0M6 12c4-3.7 8-3.7 12 0M9 15c2.2-2 3.8-2 6 0M12 19.5h.01" stroke="#51AF3D" strokeWidth="1.9" strokeLinecap="round"/>) }
                              </svg>
                              {it.t}
                            </span>
                          ))}
                        </div>
                      </div>
                      <div className="mt-8 flex justify-center">
                        <img src="/circle.svg" alt="Freedom ecosystem circle" className="w-[min(94vw,760px)] h-auto" />
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="relative w-full max-w-5xl rounded-2xl border border-white/10 bg-black/40 backdrop-blur-xl overflow-hidden" style={{ animation: 'fadeSlide 260ms ease-out' }}>
                    <div className="p-8 md:p-10 text-center">
                      <img src="/logo.svg" alt="Logo" className="h-12 mx-auto mb-3 opacity-95" />
                      <div className="text-[clamp(1.6rem,3.4vw,2.4rem)] font-semibold" style={{ color:'#51AF3D' }}>
                        {slideLang==='en' ? (
                          <>Freedom Holding Corp. <span>(FRHC)</span> is an US public holding</>
                        ) : (
                          <>Freedom Holding Corp. <span>(FRHC)</span> — американский публичный холдинг</>
                        )}
                      </div>
                      <div className="mt-7 grid grid-cols-1 md:grid-cols-2 gap-5">
                        {(slideLang==='en' ? [
                          {k:'>11 million', t1:'Users', t2:'in the digital ecosystem', icon:'users'},
                          {k:'>10,000', t1:'Employees', t2:'as of June 30, 2025', icon:'employees'},
                          {k:'22', t1:'countries', t2:'USA, Europe and Central Asia as of June 30, 2025', icon:'countries'},
                          {k:'231', t1:'offices', t2:'as of June 30, 2025', icon:'offices'},
                          {k:'US $1.2 billion', t1:'Equity', t2:'as of June 30, 2025', icon:'equity'},
                          {k:'US $9.7 billion', t1:'Assets', t2:'as of June 30, 2025', icon:'assets'},
                          {k:'US $2.1 billion', t1:'Revenue', t2:'TTM as of June 30, 2025', icon:'revenue'},
                          {k:'US $80.7 million', t1:'Net Profit', t2:'TTM as of June 30, 2025', icon:'profit'},
                        ] : [
                          {k:'>11 млн', t1:'пользователей', t2:'в цифровой экосистеме', icon:'users'},
                          {k:'>10 000', t1:'сотрудников', t2:'на 30.06.2025', icon:'employees'},
                          {k:'22', t1:'страны', t2:'США, страны Европы и Центральной Азии на 30.06.2025', icon:'countries'},
                          {k:'231', t1:'офис', t2:'на 30.06.2025', icon:'offices'},
                          {k:'US $1,2 млрд', t1:'собственный капитал', t2:'на 30.06.2025', icon:'equity'},
                          {k:'US $9,7 млрд', t1:'активы', t2:'на 30.06.2025', icon:'assets'},
                          {k:'US $2,1 млрд', t1:'выручка', t2:'TTM на 30.06.2025', icon:'revenue'},
                          {k:'US $80,7 млн', t1:'чистая прибыль', t2:'TTM на 30.06.2025', icon:'profit'},
                        ]).map((it, idx) => (
                          <div key={idx} className="rounded-2xl border border-white/10 bg-white/5 p-6 text-left">
                            <div className="flex items-center gap-4">
                              <InfoIcon type={it.icon} />
                              <div className="text-[clamp(1.45rem,2.6vw,1.85rem)] font-extrabold text-white">{it.k}</div>
                            </div>
                            <div className="mt-2.5 text-white/90 text-[clamp(1.05rem,1.9vw,1.15rem)]">{it.t1}</div>
                            <div className="mt-1 text-white/70 text-[clamp(0.95rem,1.5vw,1.05rem)]">{it.t2}</div>
                          </div>
                        ))}
                      </div>
                      <div className="mt-7 text-white/50 text-[clamp(0.95rem,1.6vw,1.15rem)]">{slideLang==='en' ? 'Note: All indicators are as of June 30, 2025 or for the last 12 months (TTM) ended June 30, 2025.' : 'Все показатели приведены по состоянию на 30 июня 2025 года или за последние 12 месяцев (TTM), завершившиеся 30 июня 2025 года.'}</div>
                    </div>
                  </div>
                )
              ))}
            </>
          ) : (
            <div className="w-full max-w-4xl">
              <div className="overflow-hidden rounded-2xl border border-white/10 bg-black/40 backdrop-blur-xl">
                <div className="px-6 py-4 text-center">
                  <div className="text-2xl font-semibold">Глобальный топ‑6</div>
                </div>
                <div className="grid grid-cols-12 px-4 py-2 text-white/60 text-sm bg-white/5">
                  <div className="col-span-2 text-left">Место</div>
                  <div className="col-span-8 text-left pl-9">Игрок</div>
                  <div className="col-span-2 text-right">Очки</div>
                </div>
                <div className="divide-y divide-white/10">
                  {globalTop.map((p:any) => {
                    const name = `${p.firstName || ''} ${p.lastName || ''}`.trim();
                    const initials = `${(p.firstName||'').slice(0,1)}${(p.lastName||'').slice(0,1)}`.toUpperCase();
                    const medal = p.rank <= 3;
                    return (
                      <div
                        key={p.rank + (p.firstName||'') + (p.lastName||'')}
                        className={`grid grid-cols-12 items-center px-4 py-2 ${medal ? 'bg-white/[0.04]' : ''}`}
                      >
                        <div className="col-span-2 text-white/80">
                          {p.rank <= 3 ? (
                            <span className="inline-flex items-center gap-2">
                              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                                <circle cx="12" cy="12" r="10" fill={p.rank===1?'#FFD54A':p.rank===2?'#C0C0C0':'#CD7F32'} opacity="0.9" />
                                <text x="12" y="16" textAnchor="middle" fontSize="12" fill="#000" fontWeight="700">{p.rank}</text>
                              </svg>
                              <span className="text-white/80">Топ {p.rank}</span>
                            </span>
                          ) : (
                            <span>#{p.rank}</span>
                          )}
                        </div>
                        <div className="col-span-8 flex items-center gap-3 min-w-0">
                          <div className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center text-xs text-white/80 shrink-0">{initials || '—'}</div>
                          <div className="truncate">{name || 'Без имени'}</div>
                        </div>
                        <div className="col-span-2 text-right font-semibold tabular-nums">{p.score}</div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </>
      )}
      {status !== 'waiting' && (
        <div key={status} className="w-full max-w-5xl text-center" style={{ animation: 'fadeSlide 240ms ease-out' }}>
          {(status === 'question' || status === 'rules' || status === 'results') && (
            <div className="mb-6 flex items-center justify-center">
              <svg width="200" height="200" className="-rotate-90" style={{ transform: `scale(${pulse ? 1.04 : 1})`, transition: 'transform 180ms ease-out' }}>
                <circle cx="100" cy="100" r={radius} fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="12" />
                <circle cx="100" cy="100" r={radius} fill="none" stroke="#51AF3D" strokeWidth="12" strokeDasharray={`${circumference} ${circumference}`} strokeDashoffset={`${circumference * (1-progress)}`} strokeLinecap="round" style={{ transition: 'stroke-dashoffset 0.2s linear'}} />
              </svg>
              <div className="absolute text-[clamp(1.4rem,3vw,2rem)]">{timer}s</div>
            </div>
          )}
          {status === 'question' && question && (
            <div className="space-y-3">
              <div className="flex items-center justify-center">
                <div className="inline-flex items-center gap-3 px-4 py-2 rounded-full border border-white/10 bg-white/5 text-white/80 text-sm">
                  <span>Раунд {question.round}</span>
                  <span className="opacity-50">•</span>
                  <span>Вопрос {Math.max(1, (typeof (question?.id)==='number'? question.id : (typeof (question?.id)==='string'? parseInt(question.id): NaN)) || (0))} из {totalQuestions}</span>
                </div>
              </div>
              <div className="font-semibold text-[clamp(1.8rem,4vw,3rem)]">{question.name} ({question.logo})</div>
              <div className="text-white/70">Цена на сентябрь 2025: {question.currentPrice} {question.currency} • {question.exchange}</div>
              <div className="mt-4 leading-snug">
                <div className="text-[clamp(1.2rem,2.6vw,1.8rem)]">{question.question?.ru}</div>
                <div className="text-white/60 mt-2 text-[clamp(0.95rem,1.6vw,1.2rem)]">{question.question?.en}</div>
              </div>
              {Array.isArray(question.options) && (
                <div className="mt-6 grid grid-cols-2 gap-4">
                  {question.options.map((opt: number, i: number) => (
                    <div key={opt} className="p-4 rounded-lg bg-white/5" style={{ animation: `fadeSlide 220ms ease-out ${i*0.05}s both` }}>{Number(opt).toFixed(2)}</div>
                  ))}
                </div>
              )}
            </div>
          )}
          {status === 'rules' && (
            <div className="w-full flex justify-center">
              <div className="relative w-full max-w-4xl rounded-2xl border border-white/10 bg-black/40 backdrop-blur-xl overflow-hidden">
                <div className="p-8 md:p-10 text-left">
                  <div className="text-3xl font-semibold">Правила игры</div>
                  <div className="mt-6 grid grid-cols-1 gap-6">
                    <div className="text-white/60 text-sm">Русский</div>
                    <ul className="space-y-3 text-lg leading-relaxed">
                      <li className="grid grid-cols-[7rem_1fr] items-start gap-3">
                        <span className="inline-flex items-center justify-center px-4 py-1.5 rounded-full border border-white/10 bg-white/5 text-white/80 text-sm">Раунд 1</span>
                        <span>За правильный ответ — 3 балла; за ближайший — 2; за второй по близости — 1; иначе — 0.</span>
                      </li>
                      <li className="grid grid-cols-[7rem_1fr] items-start gap-3">
                        <span className="inline-flex items-center justify-center px-4 py-1.5 rounded-full border border-white/10 bg-white/5 text-white/80 text-sm">Раунд 2</span>
                        <span>Введите цену вручную; чем ближе — тем больше баллов.</span>
                      </li>
                      <li className="grid grid-cols-[7rem_1fr] items-start gap-3">
                        <span className="inline-flex items-center justify-center px-4 py-1.5 rounded-full border border-white/10 bg-white/5 text-white/80 text-sm">Важно</span>
                        <span>Отвечайте вовремя — следите за круговым таймером.</span>
                      </li>
                    </ul>
                    <div className="text-white/60 text-sm mt-2">English</div>
                    <div className="space-y-2 text-base text-white/70 leading-relaxed">
                      <div>1 point for the correct option only.</div>
                      <div>Enter the price manually; closer guesses earn more points.</div>
                      <div>Answers are timed; watch the circular timer.</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
          {status === 'results' && lastResults && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md-grid-cols-3 md:grid-cols-3 gap-4 text-left">
                <div className="rounded-2xl border border-white/10 bg-black/40 backdrop-blur-xl p-4">
                  <div className="text-white/60 text-sm">Цена в 2020</div>
                  <div className="text-2xl font-semibold">{Number(lastResults.price2020).toFixed(2)} {lastResults.currency}</div>
                </div>
                <div className="rounded-2xl border border-white/10 bg-black/40 backdrop-blur-xl p-4">
                  <div className="text-white/60 text-sm">Цена на сентябрь 2025</div>
                  <div className="text-2xl font-semibold">{Number(lastResults.currentPrice).toFixed(2)} {lastResults.currency}</div>
                </div>
                <div className="rounded-2xl border border-white/10 bg-black/40 backdrop-blur-xl p-4">
                  <div className="text-white/60 text-sm">Рост с 2020</div>
                  <div className="text-2xl font-semibold" style={{ color: Number(lastResults.growth) >= 0 ? '#51AF3D' : '#E24A4A' }}>{(Number(lastResults.growth) >= 0 ? '+' : '') + Number(lastResults.growth).toFixed(0)}%</div>
                </div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-black/40 backdrop-blur-xl p-5 text-left">
                <div className="text-white/70 text-base">Если бы вы вложили $1000 в 2020</div>
                <div className="text-3xl font-extrabold">$ {Number(lastResults.investment1000).toFixed(0)}</div>
              </div>
              {liveTop && liveTop.length > 0 && (
                <div className="overflow-hidden rounded-2xl border border-white/10 bg-black/40 backdrop-blur-xl text-left">
                  <div className="grid grid-cols-12 px-4 py-2 text-white/60 text-sm bg-white/5">
                    <div className="col-span-8">Игрок</div>
                    <div className="col-span-4 text-right">Очки</div>
                  </div>
                  <div className="divide-y divide-white/10">
                    {liveTop.map((row:any, idx:number) => (
                      <div key={row.playerName+idx} className="grid grid-cols-12 items-center px-4 py-2">
                        <div className="col-span-8 truncate">#{idx+1} {row.playerName}</div>
                        <div className="col-span-4 text-right font-semibold tabular-nums">{row.score}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
          {status === 'round-transition' && (
            <div className="space-y-3">
              <div className="text-4xl font-semibold">Переход к Раунду 2</div>
              <div className="text-white/70">Теперь нужно вводить цену вручную. Вариантов не будет.</div>
            </div>
          )}
          {status === 'final' && (
            <div className="space-y-8 text-center">
              <div className="flex justify-center">
                <img src="/logo.svg" alt="Logo" className="h-14 opacity-95" />
              </div>
              
              {finalTop && finalTop.length > 0 && (
                <div className="inline-block px-7 py-5 rounded-2xl" style={{ backgroundColor: 'rgba(81,175,61,0.16)', border: '1px solid rgba(81,175,61,0.5)' }}>
                  <div className="text-[clamp(1.4rem,2.6vw,2.2rem)] font-semibold" style={{ color: '#51AF3D' }}>
                    Победитель игры: <span className="text-white">{finalTop[0].playerName}</span> — {finalTop[0].score} очков
                  </div>
                </div>
              )}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
                <div className="lg:order-2">
                  <div className="text-[clamp(1.2rem,2vw,1.6rem)] mb-4">Топ победителей</div>
                  <div className="overflow-hidden rounded-2xl border border-white/10 bg-black/40 backdrop-blur-xl">
                    <div className="grid grid-cols-12 px-5 py-3 text-white/70 text-sm bg-white/5">
                      <div className="col-span-2 text-left">Место</div>
                      <div className="col-span-8 text-left pl-11">Игрок</div>
                      <div className="col-span-2 text-right">Очки</div>
                    </div>
                    <div className="divide-y divide-white/10">
                      {globalTop.map((p:any) => {
                        const initials = `${(p.firstName||'').slice(0,1)}${(p.lastName||'').slice(0,1)}`.toUpperCase();
                        const name = `${p.firstName || ''} ${p.lastName || ''}`.trim();
                        return (
                          <div key={`${p.rank}-${p.firstName + p.lastName}`} className={`grid grid-cols-12 items-center px-5 py-2.5 ${p.rank<=3 ? 'bg-white/[0.04]' : ''}`}>
                            <div className="col-span-2 text-white/85">
                              {p.rank <= 3 ? (
                                <span className="inline-flex items-center gap-2">
                                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                                    <circle cx="12" cy="12" r="10" fill={p.rank===1?'#FFD54A':p.rank===2?'#C0C0C0':'#CD7F32'} opacity="0.9" />
                                    <text x="12" y="16" textAnchor="middle" fontSize="12" fill="#000" fontWeight="700">{p.rank}</text>
                                  </svg>
                                  <span className="text-white/85">Топ {p.rank}</span>
                                </span>
                              ) : (
                                <span>#{p.rank}</span>
                              )}
                            </div>
                            <div className="col-span-8 flex items-center gap-3 min-w-0">
                              <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-xs text-white/80 shrink-0">{initials || '—'}</div>
                              <div className="truncate text-[clamp(0.95rem,1.6vw,1.05rem)]">{name || 'Без имени'}</div>
                            </div>
                            <div className="col-span-2 text-right font-semibold tabular-nums">{p.score}</div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
                <div className="lg:order-1 rounded-2xl border border-white/10 bg-black/50 backdrop-blur-2xl p-8">
                  <div className="text-[clamp(1.5rem,2.6vw,2rem)] font-semibold mb-5">Скачайте приложение Freedom Broker</div>
                  <div className="flex flex-col items-center gap-6">
                    <div className="bg-white p-4 rounded-2xl shadow-2xl ring-1 ring-black/5">
                      <img src="/qr.png?rev=2" alt="QR" className="w-[240px] h-[240px] object-contain" />
                    </div>
                    <div className="w-full max-w-3xl space-y-5 text-white/90 text-[clamp(1.0rem,1.6vw,1.15rem)] leading-relaxed">
                      <div className="flex items-start gap-3 text-left">
                        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" className="mt-0.5 shrink-0"><path d="M12 3l2.7 5.5 6.1.9-4.4 4.3 1 6.1L12 17.8 6.6 19.8l1-6.1L3.2 9.4l6.1-.9L12 3z" fill="#FFD54A"/></svg>
                        <div>
                          <div className="font-semibold">Топ‑10 победителей получат специальные призы в конце мероприятия.</div>
                          <div className="text-white/75 text-[clamp(0.95rem,1.4vw,1.05rem)] mt-1">Мы свяжемся по указанному номеру телефона.</div>
                        </div>
                      </div>
                      
                      <div className="flex items-start gap-3 text-left">
                        <img src="/Chart.svg" alt="Chart" className="mt-0.5 shrink-0 w-7 h-7" />
                        <div>
                          <div className="font-medium">Хотите глубже погрузиться в инвестиции и заставить деньги работать?</div>
                          <div className="text-white/75 text-[clamp(0.95rem,1.4vw,1.05rem)]">Сканируйте QR‑код и скачайте приложение.</div>
                        </div>
                      </div>
                      <div className="flex items-start gap-3 text-left">
                        <img src="/Rocket.svg" alt="Rocket" className="mt-0.5 shrink-0 w-7 h-7" />
                        <div className="font-medium">В нашей зоне вас ждёт инвестиционный консультант. Он поможет вам сделать первые шаги и ответит на вопросы.</div>
                      </div>
                      <div className="flex items-start gap-3 text-left">
                        <img src="/Fire.svg" alt="Fire" className="mt-0.5 shrink-0 w-7 h-7" />
                        <div className="font-medium">Загляните в фотозону: сделайте тематическое фото у ИИ‑селфи‑станции и получите кофе или чай в подарок.</div>
                      </div>

                      <div className="pt-4 mt-2 border-t border-white/10 text-white/75 text-[clamp(0.95rem,1.4vw,1.05rem)] text-center">
                        <div className="text-white/85 font-medium">English</div>
                        <div className="mt-2 space-y-2.5">
                          <div><span className="font-semibold">Top 10 winners</span> (per day) will receive special prizes at the end of the event. We will contact you using your phone number.</div>
                          <div>Thank you for taking part in our game.</div>
                          <div>Want to dive deeper into investments? Scan the QR code to download our app.</div>
                          <div>An investment consultant is available in our zone to help you get started and answer your questions.</div>
                          <div>Visit our photo zone: take a themed picture at the AI‑powered selfie station and enjoy complimentary coffee or tea.</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}


