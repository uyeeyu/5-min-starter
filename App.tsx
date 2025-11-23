import React, { useState, useEffect, useRef, useCallback } from 'react';
import { RecordType, HistoryRecord, AppState, LotteryRule } from './types';
import { Trash2, Info, Star, Timer, Gift, X, Save, Download } from 'lucide-react';

// --- Constants ---
const TARGET_AMOUNT = 1000;
const SESSION_DURATION = 5 * 60; // 5 minutes in seconds

// Logic: 
// Start: +10 Fund (Pledge/Invest) -> No History Log yet
// Stop: -20 Fund (Revert 10 + Penalty 10) -> History Log shows -10
// Success: +0 Fund (Keep the 10) -> History Log shows +10
const PLEDGE_AMOUNT = 10; 
const PENALTY_TOTAL = 20; 
const RECORD_FAIL_AMOUNT = -10;
const RECORD_SUCCESS_AMOUNT = 10;
const SPINS_THRESHOLD = 5; // Every 5 successes = 1 spin

const LOTTERY_RULES: LotteryRule[] = [
  { label: 'Minor Encouragement', amount: 10, probability: 0.4, color: 'text-blue-500' },
  { label: 'Medium Surprise', amount: 20, probability: 0.3, color: 'text-green-500' },
  { label: 'Big Explosion', amount: 40, probability: 0.2, color: 'text-purple-500' },
  { label: 'Super Jackpot', amount: 60, probability: 0.1, color: 'text-red-500' },
];

// --- Helper Components ---

const PixelCard: React.FC<{ children: React.ReactNode; className?: string; title?: string; icon?: React.ReactNode }> = ({ children, className = "", title, icon }) => (
  <div className={`bg-white border-4 border-gray-900 shadow-[6px_6px_0px_0px_rgba(0,0,0,0.2)] rounded-xl p-4 ${className}`}>
    {(title || icon) && (
      <div className="flex items-center gap-2 mb-3 border-b-2 border-gray-100 pb-2">
        {icon && <span className="text-pink-500">{icon}</span>}
        {title && <h2 className="text-xl font-bold text-gray-800">{title}</h2>}
      </div>
    )}
    {children}
  </div>
);

const PixelButton: React.FC<React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'danger' | 'success' | 'warning' }> = ({ children, variant = 'primary', className = "", ...props }) => {
  const baseStyle = "border-2 border-gray-900 font-bold px-4 py-2 rounded-lg active:translate-y-1 active:shadow-none transition-all uppercase tracking-wider font-['VT323'] text-xl";
  
  const variants = {
    primary: "bg-pink-300 hover:bg-pink-400 text-gray-900 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]",
    danger: "bg-red-300 hover:bg-red-400 text-gray-900 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]",
    success: "bg-green-300 hover:bg-green-400 text-gray-900 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]",
    warning: "bg-yellow-200 hover:bg-yellow-300 text-gray-900 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]",
  };

  return (
    <button className={`${baseStyle} ${variants[variant]} ${className}`} {...props}>
      {children}
    </button>
  );
};

// --- Main App ---

export default function App() {
  // --- State ---
  const [fund, setFund] = useState<number>(0);
  const [records, setRecords] = useState<HistoryRecord[]>([]);
  const [successCount, setSuccessCount] = useState<number>(0);
  const [spinsAvailable, setSpinsAvailable] = useState<number>(0);
  const [sessionStartTime, setSessionStartTime] = useState<number | null>(null);

  // Timer State
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [timeLeft, setTimeLeft] = useState(SESSION_DURATION);
  const timerRef = useRef<number | null>(null);

  // Modals
  const [activeModal, setActiveModal] = useState<'start' | 'stop' | 'delete' | 'lottery' | 'lotteryRules' | 'lotteryResult' | 'data' | null>(null);
  const [selectedRecordId, setSelectedRecordId] = useState<string | null>(null);
  const [lotteryResult, setLotteryResult] = useState<{ amount: number; label: string } | null>(null);

  // --- Logic Functions ---

  // Standard record adder (updates fund AND records) - used for Lottery
  const addStandardRecord = (type: RecordType, amount: number, description: string) => {
    const newRecord: HistoryRecord = {
      id: Date.now().toString(),
      type,
      amount,
      timestamp: Date.now(),
      description,
    };
    setRecords(prev => [newRecord, ...prev]);
    setFund(prev => prev + amount);
  };

  const finishTimer = useCallback(() => {
    setIsTimerRunning(false);
    setSessionStartTime(null);
    setTimeLeft(SESSION_DURATION);
    
    // SUCCESS LOGIC:
    // 1. Fund: No change (The +10 was added at Start)
    // 2. Record: Show +10 (To represent the successful session gain)
    
    setRecords(prev => [{
      id: Date.now().toString(),
      type: RecordType.SUCCESS,
      amount: RECORD_SUCCESS_AMOUNT,
      timestamp: Date.now(),
      description: 'Focus Success',
    }, ...prev]);
    
    // Check for lottery spin
    setSuccessCount(prev => {
      const newCount = prev + 1;
      if (newCount % SPINS_THRESHOLD === 0) {
        setSpinsAvailable(s => s + 1);
      }
      return newCount;
    });
  }, []);

  // --- Persistence & Initialization ---
  
  useEffect(() => {
    const storedData = localStorage.getItem('kawaii-starter-data');
    if (storedData) {
      try {
        const parsed = JSON.parse(storedData);
        setFund(parsed.fund ?? 0);
        setRecords(parsed.records ?? []);
        setSuccessCount(parsed.successCount ?? 0);
        setSpinsAvailable(parsed.spinsAvailable ?? 0);
        
        if (parsed.sessionStartTime) {
          const now = Date.now();
          const elapsedSeconds = Math.floor((now - parsed.sessionStartTime) / 1000);
          const remaining = SESSION_DURATION - elapsedSeconds;

          if (remaining > 0) {
            setSessionStartTime(parsed.sessionStartTime);
            setTimeLeft(remaining);
            setIsTimerRunning(true);
          } else {
            setSessionStartTime(null);
          }
        }
      } catch (e) {
        console.error("Failed to load data", e);
      }
    }
  }, []);

  useEffect(() => {
    const data: AppState = { 
      fund, 
      target: TARGET_AMOUNT, 
      successCount, 
      spinsAvailable, 
      records,
      sessionStartTime
    };
    localStorage.setItem('kawaii-starter-data', JSON.stringify(data));
  }, [fund, successCount, spinsAvailable, records, sessionStartTime]);

  // --- Timer Operations ---

  const deleteRecord = () => {
    if (!selectedRecordId) return;
    const record = records.find(r => r.id === selectedRecordId);
    if (record) {
      // Revert the money change
      setFund(prev => prev - record.amount);
      setRecords(prev => prev.filter(r => r.id !== selectedRecordId));
    }
    setActiveModal(null);
    setSelectedRecordId(null);
  };

  const startTimer = () => {
    setActiveModal(null);
    setIsTimerRunning(true);
    const now = Date.now();
    setSessionStartTime(now);
    setTimeLeft(SESSION_DURATION);
    
    // START LOGIC:
    // 1. Fund: +10 (Pledge/Invest immediately)
    // 2. Record: NONE (We only record the outcome)
    setFund(prev => prev + PLEDGE_AMOUNT);
  };

  const stopTimer = () => {
    setActiveModal(null);
    setIsTimerRunning(false);
    setSessionStartTime(null);
    setTimeLeft(SESSION_DURATION);
    
    // FAILURE LOGIC:
    // 1. Fund: -20 (Revert the +10 pledge, and subtract 10 penalty)
    // 2. Record: -10 (The net result of the session)
    
    setFund(prev => prev - PENALTY_TOTAL); 
    setRecords(prev => [{
      id: Date.now().toString(),
      type: RecordType.FAILURE,
      amount: RECORD_FAIL_AMOUNT,
      timestamp: Date.now(),
      description: 'Given Up',
    }, ...prev]);
  };

  // Timer Tick
  useEffect(() => {
    if (isTimerRunning) {
      timerRef.current = window.setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            if (timerRef.current) clearInterval(timerRef.current);
            finishTimer();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isTimerRunning, finishTimer]);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  // Lottery Logic
  const playLottery = () => {
    if (spinsAvailable <= 0) return;

    setActiveModal(null);
    setSpinsAvailable(prev => prev - 1);

    const rand = Math.random();
    let cumulative = 0;
    let selectedRule = LOTTERY_RULES[0];

    for (const rule of LOTTERY_RULES) {
      cumulative += rule.probability;
      if (rand <= cumulative) {
        selectedRule = rule;
        break;
      }
    }

    setLotteryResult({ amount: selectedRule.amount, label: selectedRule.label });
    addStandardRecord(RecordType.LOTTERY, selectedRule.amount, `Lottery: ${selectedRule.label}`);
    setActiveModal('lotteryResult');
  };

  // Data Export Logic
  const exportData = () => {
    const dataStr = localStorage.getItem('kawaii-starter-data');
    if (!dataStr) return;
    const blob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `travel-fund-backup-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setActiveModal(null);
  };

  // --- Formatting for UI ---
  const distanceToTarget = TARGET_AMOUNT - fund;
  const distanceText = `￥${distanceToTarget.toFixed(2)}`;

  // --- Render ---

  return (
    <div className="min-h-screen p-4 md:p-8 max-w-lg mx-auto flex flex-col gap-6 text-lg relative pb-24 font-['VT323']">
      
      {/* Settings / Backup Button */}
      <div className="absolute top-4 right-4 z-20">
        <button 
          onClick={() => setActiveModal('data')}
          className="bg-white border-2 border-gray-900 p-2 rounded-lg shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:bg-gray-100 active:translate-y-1 active:shadow-none transition-all"
        >
          <Save className="w-6 h-6 text-gray-700" />
        </button>
      </div>

      {/* Header / Fund Status */}
      <PixelCard className="text-center bg-pink-50 relative overflow-hidden mt-8 md:mt-0">
        <div className="absolute -top-4 -right-4 text-9xl opacity-10 rotate-12">✈️</div>
        <h1 className="text-2xl text-gray-600 mb-1 font-bold">Travel Fund 🎀</h1>
        
        <div className={`text-6xl font-bold mb-4 ${fund < 0 ? 'text-red-500' : 'text-pink-600'} drop-shadow-md`}>
          {fund} <span className="text-3xl text-gray-500">RMB</span>
        </div>

        {/* Progress Bar */}
        <div className="relative w-full h-12 bg-gray-200 rounded-full border-4 border-gray-800 overflow-hidden mb-2">
          <div 
            className={`h-full transition-all duration-500 flex items-center justify-end px-2 ${fund < 0 ? 'bg-red-400' : 'bg-gradient-to-r from-pink-300 to-purple-400'}`}
            style={{ width: `${Math.max(0, Math.min(100, (fund / TARGET_AMOUNT) * 100))}%` }}
          >
            {fund > 0 && <span className="text-white text-xl animate-pulse">✨</span>}
          </div>
          
          {/* Label inside/over progress bar */}
          <div className="absolute inset-0 flex items-center justify-center text-lg font-bold text-gray-800 mix-blend-multiply z-10 whitespace-nowrap px-2 uppercase">
             Target: ￥{TARGET_AMOUNT} | Remaining: {distanceText}
          </div>
        </div>
      </PixelCard>

      {/* Timer Section */}
      <PixelCard className="text-center py-8 relative">
        <div className="text-[9rem] leading-none text-gray-800 mb-8 drop-shadow-[4px_4px_0px_rgba(244,114,182,0.4)]">
          {formatTime(timeLeft)}
        </div>

        {!isTimerRunning ? (
          <PixelButton 
            className="text-2xl px-12 py-6 w-full md:w-auto animate-bounce" 
            onClick={() => setActiveModal('start')}
          >
            Start 5 Min 🚀
          </PixelButton>
        ) : (
          <div className="flex flex-col items-center gap-4">
            <p className="text-pink-600 animate-pulse font-bold text-2xl">✨ Focus Mode On ✨</p>
            <PixelButton 
              variant="danger" 
              onClick={() => setActiveModal('stop')}
            >
              Give Up... 🥲
            </PixelButton>
          </div>
        )}
      </PixelCard>

      {/* Lottery Section */}
      <PixelCard className="bg-gradient-to-br from-yellow-50 to-orange-50 border-orange-200">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h3 className="text-2xl font-bold text-orange-600 flex items-center gap-2">
              <Gift className="w-6 h-6" /> Gacha Station
            </h3>
            <p className="text-lg text-gray-600">Every 5 successes = 1 Spin!</p>
          </div>
          <button onClick={() => setActiveModal('lotteryRules')} className="text-orange-400 hover:text-orange-600">
            <Info className="w-8 h-8" />
          </button>
        </div>

        <div className="flex items-center justify-between bg-white/50 p-3 rounded-lg border-2 border-orange-100">
          <div className="flex items-center gap-2">
            <Star className={`w-6 h-6 ${spinsAvailable > 0 ? 'fill-yellow-400 text-yellow-500' : 'text-gray-300'}`} />
            <span className="font-bold text-gray-700 text-xl">Spins: {spinsAvailable}</span>
          </div>
          <PixelButton 
            variant="warning" 
            disabled={spinsAvailable === 0}
            className={spinsAvailable === 0 ? 'opacity-50 cursor-not-allowed shadow-none' : ''}
            onClick={() => setActiveModal('lottery')}
          >
            SPIN! 🎰
          </PixelButton>
        </div>
        
        {/* Progress to next spin */}
        <div className="mt-3 flex gap-2 justify-center">
          {[...Array(5)].map((_, i) => (
             <div 
               key={i} 
               className={`w-4 h-4 rounded-sm border-2 border-gray-400 ${i < (successCount % 5) ? 'bg-green-400 border-gray-900' : 'bg-gray-200'}`} 
             />
          ))}
        </div>
      </PixelCard>

      {/* History Section */}
      <div className="flex-1">
        <h3 className="text-2xl font-bold text-gray-700 mb-4 flex items-center gap-2 border-b-2 border-pink-200 pb-2">
          <Timer className="w-6 h-6" /> History Log
        </h3>
        
        <div className="space-y-3">
          {records.length === 0 ? (
            <div className="text-center text-gray-400 py-8 italic border-4 border-dashed border-gray-300 rounded-lg text-xl">
              No records yet. Let's start!
            </div>
          ) : (
            records.map((record) => (
              <div 
                key={record.id} 
                className="bg-white border-b-4 border-r-4 border-gray-200 p-4 rounded-lg flex justify-between items-center group hover:border-pink-300 transition-colors"
              >
                <div>
                  <div className="text-sm text-gray-400">
                    {new Date(record.timestamp).toLocaleString()}
                  </div>
                  <div className="font-bold text-gray-700 text-xl">{record.description}</div>
                </div>
                <div className="flex items-center gap-4">
                  {record.amount !== 0 && (
                    <span className={`font-bold text-2xl ${record.amount > 0 ? 'text-green-500' : 'text-red-500'}`}>
                      {record.amount > 0 ? '+' : ''}{record.amount}
                    </span>
                  )}
                  {record.amount === 0 && (
                    <span className="font-bold text-gray-400 text-sm">--</span>
                  )}
                  <button 
                    onClick={() => { setSelectedRecordId(record.id); setActiveModal('delete'); }}
                    className="text-gray-300 hover:text-red-400 transition-colors"
                  >
                    <Trash2 className="w-6 h-6" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* --- Modals --- */}
      
      {activeModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border-4 border-gray-900 shadow-[8px_8px_0px_0px_rgba(255,255,255,0.5)] rounded-2xl p-6 w-full max-w-sm animate-bounce-in font-['VT323']">
            
            {/* Start Timer Confirmation */}
            {activeModal === 'start' && (
              <div className="text-center">
                <div className="text-6xl mb-4">😤</div>
                <h3 className="text-3xl font-bold mb-2">Ready?</h3>
                <p className="text-gray-600 mb-6 text-xl">
                  We invest <strong>{PLEDGE_AMOUNT} RMB</strong> now.<br/>
                  Finish to keep it. Quit to lose it!
                </p>
                <div className="flex gap-4 justify-center">
                  <PixelButton variant="primary" onClick={() => setActiveModal(null)} className="bg-gray-200 border-gray-400 shadow-none">Cancel</PixelButton>
                  <PixelButton variant="success" onClick={startTimer}>I'm Ready!</PixelButton>
                </div>
              </div>
            )}

            {/* Stop Timer Confirmation */}
            {activeModal === 'stop' && (
              <div className="text-center">
                <div className="text-6xl mb-4">😱</div>
                <h3 className="text-3xl font-bold mb-2 text-red-500">Wait!!</h3>
                <p className="text-gray-600 mb-6 text-xl">
                  You will lose your pledge and pay a penalty.<br/>
                  <strong className="text-red-500 block mt-2">Net Loss: {RECORD_FAIL_AMOUNT} RMB</strong>
                </p>
                <div className="flex gap-4 justify-center">
                  <PixelButton variant="success" onClick={() => setActiveModal(null)}>Continue</PixelButton>
                  <PixelButton variant="danger" onClick={stopTimer}>Give Up</PixelButton>
                </div>
              </div>
            )}

            {/* Delete Record Confirmation */}
            {activeModal === 'delete' && (
              <div className="text-center">
                <div className="text-6xl mb-4">🗑️</div>
                <h3 className="text-3xl font-bold mb-2">Delete Record?</h3>
                <p className="text-gray-600 mb-6 text-xl">This will reverse the money change.</p>
                <div className="flex gap-4 justify-center">
                  <PixelButton onClick={() => { setActiveModal(null); setSelectedRecordId(null); }} className="bg-gray-200 border-gray-400 shadow-none">Cancel</PixelButton>
                  <PixelButton variant="danger" onClick={deleteRecord}>Delete</PixelButton>
                </div>
              </div>
            )}

            {/* Lottery Rules */}
            {activeModal === 'lotteryRules' && (
              <div>
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-2xl font-bold">🎰 Gacha Rates</h3>
                  <button onClick={() => setActiveModal(null)}><X /></button>
                </div>
                <div className="space-y-3">
                  {LOTTERY_RULES.map((rule, idx) => (
                    <div key={idx} className="flex justify-between items-center border-b border-gray-100 pb-2 text-xl">
                      <div>
                        <div className={`font-bold ${rule.color}`}>{rule.label}</div>
                        <div className="text-sm text-gray-500">Reward: {rule.amount} RMB</div>
                      </div>
                      <div className="font-mono bg-gray-100 px-2 py-1 rounded">{(rule.probability * 100).toFixed(0)}%</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Confirm Spin */}
            {activeModal === 'lottery' && (
              <div className="text-center">
                <div className="text-6xl mb-4 animate-spin-slow">🎡</div>
                <h3 className="text-3xl font-bold mb-2">Use 1 Spin?</h3>
                <p className="text-gray-600 mb-6 text-xl">Good luck!</p>
                <div className="flex gap-4 justify-center">
                  <PixelButton onClick={() => setActiveModal(null)} className="bg-gray-200 border-gray-400 shadow-none">Cancel</PixelButton>
                  <PixelButton variant="warning" onClick={playLottery}>SPIN!</PixelButton>
                </div>
              </div>
            )}

            {/* Spin Result */}
            {activeModal === 'lotteryResult' && lotteryResult && (
              <div className="text-center">
                <div className="text-6xl mb-4 animate-bounce">🎉</div>
                <h3 className="text-2xl text-gray-500 mb-1">You won...</h3>
                <div className="text-4xl font-bold text-pink-500 mb-2">{lotteryResult.label}!</div>
                <div className="text-6xl font-bold text-green-500 mb-6">+{lotteryResult.amount} RMB</div>
                <PixelButton variant="primary" onClick={() => setActiveModal(null)}>Awesome!</PixelButton>
              </div>
            )}

            {/* Data Management */}
            {activeModal === 'data' && (
              <div className="text-center">
                <div className="text-6xl mb-4">💾</div>
                <h3 className="text-3xl font-bold mb-2">Data Backup</h3>
                <p className="text-gray-600 mb-6 text-xl">
                  Download your progress as a file to keep it safe.
                </p>
                <div className="flex gap-4 justify-center">
                  <PixelButton onClick={() => setActiveModal(null)} className="bg-gray-200 border-gray-400 shadow-none">Close</PixelButton>
                  <PixelButton variant="primary" onClick={exportData} className="flex items-center gap-2">
                    <Download className="w-5 h-5" /> Export
                  </PixelButton>
                </div>
              </div>
            )}

          </div>
        </div>
      )}

    </div>
  );
}