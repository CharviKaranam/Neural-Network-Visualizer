import React, { useState, useEffect } from 'react';
import { 
  Activity, 
  TrendingDown, 
  TrendingUp,
  Info, 
  Play,
  RotateCcw,
  Sparkles,
  Award,
  Zap,
  CheckCircle,
  Sliders,
  Clock,
  Target,
  ChevronDown,
  LineChart,
  Sun,
  CloudRain,
  Cloud,
  HelpCircle
} from 'lucide-react';

interface GraphsPanelProps {
  currentAccuracy: number;
  currentLoss: number;
  history: any[];
  onTrainEpoch: () => void;
  isTraining: boolean;
  hideHeader?: boolean;
}

// Deterministic noise generator to make charts feel organic yet stable on re-renders
const getDeterministicNoise = (epoch: number, amplitude: number, frequency: number = 15.23) => {
  return Math.sin(epoch * frequency) * amplitude;
};

// 3D projection mathematical helpers for dynamic decision boundary surfaces
function project3D(x: number, y: number, z: number) {
  // Center is around (250, 190) on the 500x380 SVG viewport
  const cx = 250;
  const cy = 190;
  const scale = 140;
  const theta = 30 * Math.PI / 180;
  const phi = 45 * Math.PI / 180;
  
  const xc = x - 0.5;
  const yc = y - 0.5;
  const zc = z * 0.22;
  
  const rotX = xc * Math.cos(phi) - yc * Math.sin(phi);
  const rotY = xc * Math.sin(phi) + yc * Math.cos(phi);
  
  const screenX = cx + (rotX * Math.cos(theta) - rotY * Math.cos(theta)) * scale;
  const screenY = cy - (zc + (rotX * Math.sin(theta) + rotY * Math.sin(theta)) * 0.5) * scale;
  
  return { x: screenX, y: screenY };
}

function getSunnyLogit(temperature: number, humidity: number) {
  return 2.5 - 5.0 * temperature + 1.2 * humidity;
}

function getRainyLogit(temperature: number, humidity: number) {
  return -1.5 + 4.5 * temperature - 3.0 * humidity;
}

function getCloudyLogit(temperature: number, humidity: number) {
  return -0.5 + 2.0 * temperature + 2.5 * humidity - 4.5 * temperature * humidity;
}

export default function GraphsPanel({
  currentAccuracy,
  currentLoss,
  history,
  onTrainEpoch,
  isTraining,
  hideHeader = false
}: GraphsPanelProps) {
  
  // Selection States
  const [selectedRun, setSelectedRun] = useState<string>('run1');
  const [epochRange, setEpochRange] = useState<string>('all');
  const [hoveredEpoch, setHoveredEpoch] = useState<number | null>(null);
  
  // Tab control inside Graphs panel
  const [activeSubTab, setActiveSubTab] = useState<'analytics' | 'boundary' | 'weather'>('analytics');
  
  // Interactive Overlapped Outputs 3D Boundary states (Image 2)
  const [boundaryTemperature, setBoundaryTemperature] = useState<number>(0.6);
  const [boundaryHumidity, setBoundaryHumidity] = useState<number>(0.4);

  // Interactive Weather Prediction Workflow states (Image 1)
  const [weatherTemperature, setWeatherTemperature] = useState<number>(0.90);
  const [weatherHumidity, setWeatherHumidity] = useState<number>(0.20);
  const [dosage, setDosage] = useState<number>(0.0);
  
  // Track training elapsed time for live runs
  const [liveTrainingTime, setLiveTrainingTime] = useState<number>(4); // default 4 seconds for preloaded 2 epochs
  
  useEffect(() => {
    if (isTraining) {
      const interval = setInterval(() => {
        setLiveTrainingTime(prev => prev + 1);
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [isTraining]);

  // If the user starts training in the Sandbox, automatically switch active run to 'live'
  useEffect(() => {
    if (history.length > 2 && selectedRun !== 'live') {
      setSelectedRun('live');
    }
  }, [history.length]);

  // Format seconds to MM:SS
  const formatTime = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // -------------------------------------------------------------
  // SEED GENERATION FOR PRESET RUNS
  // -------------------------------------------------------------
  
  // Generate Run 1: Baseline SGD (Exactly matches screenshot metrics)
  // Epochs: 100, Final Loss: 0.1385, Final Acc: 87.03%, Best: 88.12% at Epoch 92
  const run1History = Array.from({ length: 100 }).map((_, idx) => {
    const epoch = idx + 1;
    // Decays exponentially from ~1.15 to ~0.1385
    const lossBase = 1.05 * Math.exp(-0.038 * epoch) + 0.132;
    const noiseAmt = epoch > 80 ? 0.003 : (epoch > 40 ? 0.008 : 0.02);
    const loss = Math.max(0.002, lossBase + getDeterministicNoise(epoch, noiseAmt));
    
    // Rises from ~12.45% to ~87.03%, peaking near Epoch 92
    const accBase = 0.1245 + 0.748 * (1 - Math.exp(-0.045 * epoch));
    let accNoise = getDeterministicNoise(epoch, epoch > 80 ? 0.004 : 0.012, 8.45);
    // Force Peak around Epoch 92 to hit 88.12%
    if (epoch === 92) accNoise = 0.0125; 
    let accuracy = Math.min(0.99, Math.max(0.05, accBase + accNoise));
    if (epoch === 100) accuracy = 0.8703; // force exact final screenshot value

    // Gradient magnitude: decays from 0.65 to ~0.0022
    const gradBase = 0.62 * Math.exp(-0.042 * epoch) + 0.0022;
    const gradientMagnitude = Math.max(0.0001, gradBase + getDeterministicNoise(epoch, gradBase * 0.1, 23.4));

    // Learning rate: Step decay
    let lr = 0.1;
    if (epoch > 20) lr = 0.01;
    if (epoch > 40) lr = 0.001;
    if (epoch > 80) lr = 0.0001;

    return { epoch, loss, accuracy, gradientMagnitude, lr };
  });

  // Generate Run 2: Adaptive Adam
  // Epochs: 100, Final Loss: 0.0412, Final Acc: 96.15%, Best: 96.85% at Epoch 77
  const run2History = Array.from({ length: 100 }).map((_, idx) => {
    const epoch = idx + 1;
    // Decays extremely fast
    const lossBase = 1.35 * Math.exp(-0.075 * epoch) + 0.040;
    const loss = Math.max(0.001, lossBase + getDeterministicNoise(epoch, epoch > 30 ? 0.0015 : 0.015, 11.2));
    
    const accBase = 0.085 + 0.88 * (1 - Math.exp(-0.08 * epoch));
    const accuracy = Math.min(0.985, accBase + getDeterministicNoise(epoch, epoch > 40 ? 0.002 : 0.008, 5.12));
    
    const gradBase = 0.85 * Math.exp(-0.078 * epoch) + 0.0005;
    const gradientMagnitude = Math.max(0.0001, gradBase + getDeterministicNoise(epoch, gradBase * 0.08, 30.1));

    let lr = 0.01;
    if (epoch > 40) lr = 0.001;

    return { epoch, loss, accuracy, gradientMagnitude, lr };
  });

  // Generate Run 3: High Learning Rate (Unstable bounce)
  // Epochs: 100, Final Loss: 0.5240, Final Acc: 68.10%, Best: 72.40% at Epoch 45
  const run3History = Array.from({ length: 100 }).map((_, idx) => {
    const epoch = idx + 1;
    // Vibrates wildly
    const loss = Math.max(0.12, 0.55 + 0.22 * Math.sin(epoch * 0.4) * Math.exp(-0.01 * epoch) + getDeterministicNoise(epoch, 0.08, 44.5));
    
    const accBase = 0.33 + 0.35 * (1 - Math.exp(-0.025 * epoch));
    const accuracy = Math.min(0.85, Math.max(0.2, accBase + 0.09 * Math.cos(epoch * 0.5) + getDeterministicNoise(epoch, 0.04, 3.14)));
    
    const gradientMagnitude = Math.max(0.01, 0.45 + 0.25 * Math.sin(epoch * 0.95) + getDeterministicNoise(epoch, 0.05, 12.1));
    const lr = 0.5; // Constant high learning rate

    return { epoch, loss, accuracy, gradientMagnitude, lr };
  });

  // Generate Live Run from custom history
  const liveHistory = history.map((pt, idx) => ({
    epoch: pt.epoch ?? (idx + 1),
    loss: pt.loss ?? 0.5,
    accuracy: pt.accuracy ?? pt.acc ?? 0.33,
    gradientMagnitude: pt.gradientMagnitude ?? 0.08,
    lr: pt.lr ?? 0.01
  }));

  // Helper to resolve active run data array
  const getActiveHistory = () => {
    switch (selectedRun) {
      case 'run2': return run2History;
      case 'run3': return run3History;
      case 'live': return liveHistory;
      case 'run1':
      default:
        return run1History;
    }
  };

  const activePoints = getActiveHistory();

  // Filter based on Epoch Range selection
  const getFilteredPoints = () => {
    if (epochRange === 'all') return activePoints;
    const maxVal = activePoints.length;
    if (epochRange === '1-50') {
      return activePoints.filter(p => p.epoch <= 50);
    } else if (epochRange === '50-100') {
      return activePoints.filter(p => p.epoch >= 50 && p.epoch <= 100);
    }
    return activePoints;
  };

  const filteredPoints = getFilteredPoints();

  // -------------------------------------------------------------
  // CALCULATE BULK STATS
  // -------------------------------------------------------------
  const totalEpochs = activePoints.length;
  
  // Final state readings
  const finalLoss = activePoints.length > 0 ? activePoints[activePoints.length - 1].loss : 0.0;
  const finalAccuracy = activePoints.length > 0 ? activePoints[activePoints.length - 1].accuracy : 0.0;
  
  // Search best accuracy in run
  let bestAccuracy = 0;
  let bestEpoch = 1;
  activePoints.forEach(p => {
    if (p.accuracy > bestAccuracy) {
      bestAccuracy = p.accuracy;
      bestEpoch = p.epoch;
    }
  });

  // Starting readings
  const startLoss = activePoints.length > 0 ? activePoints[0].loss : 1.0;
  const startAccuracy = activePoints.length > 0 ? activePoints[0].accuracy : 0.1;
  const improvement = finalAccuracy - startAccuracy;

  // Resolve training time
  const getTrainingTime = () => {
    if (selectedRun === 'run1') return '00:02:45';
    if (selectedRun === 'run2') return '00:01:50';
    if (selectedRun === 'run3') return '00:02:15';
    return formatTime(liveTrainingTime);
  };

  // -------------------------------------------------------------
  // COORDINATE MAPPING FUNCTIONS FOR CUSTOM SVGS
  // -------------------------------------------------------------
  const getSvgX = (epoch: number, width: number) => {
    if (filteredPoints.length <= 1) return 25;
    const minE = filteredPoints[0].epoch;
    const maxE = filteredPoints[filteredPoints.length - 1].epoch;
    return 30 + ((epoch - minE) / (maxE - minE)) * (width - 45);
  };

  const getSvgY = (val: number, height: number, minVal: number, maxVal: number, logScale: boolean = false) => {
    const bottomY = height - 20;
    const topY = 15;
    const plotHeight = bottomY - topY;

    if (logScale) {
      const safeVal = Math.max(1e-5, val);
      const safeMin = Math.max(1e-5, minVal);
      const safeMax = Math.max(1e-5, maxVal);
      const logVal = Math.log10(safeVal);
      const logMin = Math.log10(safeMin);
      const logMax = Math.log10(safeMax);
      
      const ratio = (logVal - logMin) / (logMax - logMin);
      return bottomY - ratio * plotHeight;
    } else {
      const ratio = (val - minVal) / (maxVal - minVal);
      return bottomY - ratio * plotHeight;
    }
  };

  // -------------------------------------------------------------
  // DYNAMIC COMPONENT STATE FOR CONFUSION MATRIX & ACCURACIES
  // -------------------------------------------------------------
  const getConfusionMatrix = () => {
    // Highly realistic confusion matrices corresponding to accuracies
    if (selectedRun === 'run1') return { tn: 85, fp: 15, fn: 10, tp: 90 };
    if (selectedRun === 'run2') return { tn: 96, fp: 4, fn: 3, tp: 97 };
    if (selectedRun === 'run3') return { tn: 65, fp: 35, fn: 28, tp: 72 };
    
    // Live: Calculate dynamically matching live accuracy
    const accFactor = finalAccuracy;
    const tn = Math.round(accFactor * 93 + (1 - accFactor) * 20);
    const tp = Math.round(accFactor * 97 + (1 - accFactor) * 10);
    return {
      tn: Math.min(100, Math.max(0, tn)),
      fp: Math.min(100, Math.max(0, 100 - tn)),
      fn: Math.min(100, Math.max(0, 100 - tp)),
      tp: Math.min(100, Math.max(0, tp))
    };
  };

  const matrix = getConfusionMatrix();

  const getClassAccuracies = () => {
    if (selectedRun === 'run1') return { c0: 90.12, c1: 83.95 };
    if (selectedRun === 'run2') return { c0: 95.80, c1: 96.50 };
    if (selectedRun === 'run3') return { c0: 65.10, c1: 71.10 };
    
    return {
      c0: Math.min(100, finalAccuracy * 103.5 * 100),
      c1: Math.min(100, finalAccuracy * 96.5 * 100)
    };
  };

  const classAcc = getClassAccuracies();

  // Histograms & distributions mapping
  const getWeightHistogram = () => {
    // Pink bars centered around 0
    const mu = selectedRun === 'run3' ? 0.08 : (selectedRun === 'run2' ? 0.02 : 0.0);
    const sigma = selectedRun === 'run3' ? 0.42 : (selectedRun === 'run2' ? 0.23 : 0.28);
    const scale = selectedRun === 'live' ? (140 + finalAccuracy * 50) : 180;
    
    return Array.from({ length: 19 }).map((_, idx) => {
      const x = -0.9 + idx * 0.1;
      const height = scale * Math.exp(-Math.pow(x - mu, 2) / (2 * Math.pow(sigma, 2)));
      const jitter = getDeterministicNoise(idx, 8, 4.8);
      return { x, height: Math.max(6, height + jitter) };
    });
  };

  const weightBins = getWeightHistogram();

  const getActivationDensity = () => {
    // Continuous purple bell curve density
    const mu = selectedRun === 'run3' ? -0.15 : 0.0;
    const sigma = selectedRun === 'run3' ? 0.42 : (selectedRun === 'run2' ? 0.21 : 0.25);
    const scale = selectedRun === 'live' ? (1.5 + finalAccuracy * 0.4) : 1.82;
    
    return Array.from({ length: 41 }).map((_, idx) => {
      const x = -1.0 + (idx / 40) * 2.0;
      const density = scale * Math.exp(-Math.pow(x - mu, 2) / (2 * Math.pow(sigma, 2)));
      const noise = getDeterministicNoise(idx, 0.03, 12.3);
      return { x, density: Math.max(0.04, density + noise) };
    });
  };

  const densityPoints = getActivationDensity();

  // Weather predictions pre-computation
  const w_temp = -2.50;
  const w_humid = -2.50;
  const b_system = 0.10;

  // Input weights products
  const prodTemp = weatherTemperature * w_temp;
  const prodHumid = weatherHumidity * w_humid;

  // Hidden Node 1
  const node1Bias = 1.42 + prodTemp;
  const node1PreAct = dosage * (-34.40) + node1Bias;
  const squiggle1 = 1 / (1 + Math.exp(-node1PreAct));
  const node1Val = squiggle1 * (-1.30);

  // Hidden Node 2
  const node2Bias = 1.39 + prodHumid;
  const node2PreAct = dosage * (-2.52) + node2Bias;
  const squiggle2 = 1 / (1 + Math.exp(-node2PreAct));
  const node2Val = squiggle2 * 2.28;

  // Combined
  const rawSum = node1Val + node2Val;
  const combinedSum = rawSum + b_system;
  const softplus = Math.log(1 + Math.exp(combinedSum));

  return (
    <div id="graphs-panel" className="flex-1 flex flex-col p-6 overflow-y-auto text-slate-100 font-sans gap-6 select-none bg-gradient-to-br from-[#040815] via-[#080d1a] to-[#02050e]">
      
      {/* Glow path filters */}
      <svg className="absolute w-0 h-0" width="0" height="0">
        <defs>
          <filter id="glow-rose" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="2.5" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <filter id="glow-emerald" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="2.5" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <filter id="glow-cyan" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="2" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <filter id="glow-amber" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="2.5" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
      </svg>

      {/* 1. HEADER CONTROL RAIL */}
      {!hideHeader && (
        <div className="bg-[#060a18]/70 border border-[#141d35]/75 rounded-2xl p-5 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 shadow-xl shrink-0 text-left relative overflow-hidden backdrop-blur-md">
          {/* Subtle back ambient light */}
          <div className="absolute top-0 right-0 w-80 h-80 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />
          
          <div className="space-y-1.5 z-10">
            <h1 className="text-xl font-black tracking-tight text-white uppercase font-display flex items-center gap-2">
              <Activity className="text-emerald-400" size={20} />
              Graphs & <span className="text-emerald-400 font-extrabold">Charts</span>
            </h1>
            <p className="text-xs text-slate-400 font-medium">
              Visualize and analyze your neural network training performance
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 z-10 w-full lg:w-auto">
            {/* Run selector */}
            <div className="flex items-center gap-2 bg-[#030611] border border-[#141d35] rounded-xl px-3 py-2 text-xs">
              <span className="text-slate-500 font-mono font-bold uppercase text-[10px]">Select Run</span>
              <select 
                value={selectedRun} 
                onChange={(e) => setSelectedRun(e.target.value)}
                className="bg-transparent text-emerald-400 font-semibold font-mono border-none outline-none cursor-pointer pr-1"
              >
                <option value="run1">Run 1 (Baseline SGD)</option>
                <option value="run2">Run 2 (Adaptive Adam)</option>
                <option value="run3">Run 3 (High LR Oscillation)</option>
                <option value="live">Live Sandbox Session ({liveHistory.length} epochs)</option>
              </select>
            </div>

            {/* Epoch range selector */}
            <div className="flex items-center gap-2 bg-[#030611] border border-[#141d35] rounded-xl px-3 py-2 text-xs">
              <span className="text-slate-500 font-mono font-bold uppercase text-[10px]">Epoch Range</span>
              <select 
                value={epochRange} 
                onChange={(e) => setEpochRange(e.target.value)}
                className="bg-transparent text-slate-300 font-semibold font-mono border-none outline-none cursor-pointer pr-1"
              >
                <option value="all">1 - {totalEpochs || 100}</option>
                <option value="1-50">1 - 50</option>
                <option value="50-100">50 - 100</option>
              </select>
            </div>

            {/* Train cycle trigger button */}
            <button
              onClick={onTrainEpoch}
              disabled={isTraining}
              className="px-5 py-2.5 bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 hover:from-emerald-400 hover:to-teal-400 disabled:opacity-50 text-slate-950 rounded-xl font-black text-xs tracking-wider shadow-lg shadow-emerald-500/10 cursor-pointer active:scale-95 transition-all flex items-center gap-2 uppercase shrink-0 font-mono"
            >
              {isTraining ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                  <span>Optimizing...</span>
                </>
              ) : (
                <>
                  <Play size={11} className="fill-slate-950 text-slate-950" />
                  <span>Train Epoch Cycle</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Dynamic Simulation & Analytics Tabs */}
      <div className="flex flex-wrap bg-[#030611]/80 p-1.5 rounded-2xl border border-[#141d35]/60 self-start gap-1 backdrop-blur-sm z-15 shrink-0">
        <button
          onClick={() => setActiveSubTab('analytics')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 uppercase tracking-wide cursor-pointer ${
            activeSubTab === 'analytics'
              ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 shadow-md shadow-emerald-500/10 font-extrabold'
              : 'text-slate-400 hover:text-white hover:bg-[#060c1c]'
          }`}
        >
          <LineChart size={13} />
          Training Performance Curves
        </button>
        <button
          onClick={() => setActiveSubTab('boundary')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 uppercase tracking-wide cursor-pointer ${
            activeSubTab === 'boundary'
              ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md shadow-purple-600/10 font-extrabold'
              : 'text-slate-400 hover:text-white hover:bg-[#060c1c]'
          }`}
        >
          <Activity size={13} />
          3D Decision Boundary Sheet
        </button>
        <button
          onClick={() => setActiveSubTab('weather')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 uppercase tracking-wide cursor-pointer ${
            activeSubTab === 'weather'
              ? 'bg-gradient-to-r from-amber-500 to-yellow-500 text-slate-950 shadow-md shadow-amber-500/10 font-extrabold'
              : 'text-slate-400 hover:text-white hover:bg-[#060c1c]'
          }`}
        >
          <Sun size={13} />
          Weather Predictor Flow
        </button>
      </div>

      {activeSubTab === 'analytics' && (
        <>
          {/* 2. STATS OVERVIEW BAR (5 Cards) */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {/* Total Epochs */}
        <div className="bg-[#060a18]/60 border border-[#141d35]/65 rounded-2xl p-4 flex items-center gap-3.5 backdrop-blur-sm shadow-md">
          <div className="w-10 h-10 rounded-xl bg-indigo-950/40 border border-indigo-800/30 flex items-center justify-center text-indigo-400">
            <RotateCcw size={18} className="animate-spin" style={{ animationDuration: isTraining ? '2s' : '0s' }} />
          </div>
          <div className="text-left">
            <span className="text-[10px] font-mono font-bold text-slate-500 uppercase tracking-wider block">Total Epochs</span>
            <span className="text-lg font-black font-mono text-white leading-tight">{totalEpochs}</span>
          </div>
        </div>

        {/* Final Loss */}
        <div className="bg-[#060a18]/60 border border-[#141d35]/65 rounded-2xl p-4 flex items-center gap-3.5 backdrop-blur-sm shadow-md">
          <div className="w-10 h-10 rounded-xl bg-rose-950/40 border border-rose-800/30 flex items-center justify-center text-rose-400">
            <TrendingDown size={18} />
          </div>
          <div className="text-left">
            <span className="text-[10px] font-mono font-bold text-slate-500 uppercase tracking-wider block">Final Loss</span>
            <span className="text-lg font-black font-mono text-white leading-tight">{finalLoss.toFixed(4)}</span>
          </div>
        </div>

        {/* Final Accuracy */}
        <div className="bg-[#060a18]/60 border border-[#141d35]/65 rounded-2xl p-4 flex items-center gap-3.5 backdrop-blur-sm shadow-md">
          <div className="w-10 h-10 rounded-xl bg-emerald-950/40 border border-emerald-800/30 flex items-center justify-center text-emerald-400">
            <Target size={18} />
          </div>
          <div className="text-left">
            <span className="text-[10px] font-mono font-bold text-slate-500 uppercase tracking-wider block">Final Accuracy</span>
            <span className="text-lg font-black font-mono text-white leading-tight">{(finalAccuracy * 100).toFixed(2)}%</span>
          </div>
        </div>

        {/* Best Accuracy */}
        <div className="bg-[#060a18]/60 border border-[#141d35]/65 rounded-2xl p-4 flex items-center gap-3.5 backdrop-blur-sm shadow-md">
          <div className="w-10 h-10 rounded-xl bg-amber-950/40 border border-amber-800/30 flex items-center justify-center text-amber-400">
            <Award size={18} />
          </div>
          <div className="text-left">
            <span className="text-[10px] font-mono font-bold text-slate-500 uppercase tracking-wider block">Best Accuracy</span>
            <span className="text-lg font-black font-mono text-white leading-tight">{(bestAccuracy * 100).toFixed(2)}%</span>
            <span className="text-[8px] text-slate-500 font-mono block">at Epoch {bestEpoch}</span>
          </div>
        </div>

        {/* Training Time */}
        <div className="bg-[#060a18]/60 border border-[#141d35]/65 rounded-2xl p-4 flex items-center gap-3.5 backdrop-blur-sm shadow-md col-span-2 md:col-span-1">
          <div className="w-10 h-10 rounded-xl bg-cyan-950/40 border border-cyan-800/30 flex items-center justify-center text-cyan-400">
            <Clock size={18} />
          </div>
          <div className="text-left">
            <span className="text-[10px] font-mono font-bold text-slate-500 uppercase tracking-wider block">Training Time</span>
            <span className="text-lg font-black font-mono text-white leading-tight">{getTrainingTime()}</span>
          </div>
        </div>
      </div>

      {/* 3. CHART GRID: UPPER ROW (Loss vs Epoch, Accuracy vs Epoch, Loss vs Accuracy) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Chart 1: Loss vs Epoch */}
        <div id="training-performance-chart" className="bg-[#060a18]/70 border border-[#141d35]/75 rounded-2xl p-4 flex flex-col justify-between shadow-xl text-left gap-3.5 relative hover:border-rose-500/10 transition-all backdrop-blur-md">
          <div>
            <span className="text-xs font-bold font-mono text-slate-400 uppercase tracking-wider flex items-center gap-1.5 border-b border-[#141d35]/40 pb-2">
              <TrendingDown size={14} className="text-rose-400" />
              Loss vs Epoch
            </span>
          </div>
          
          <div className="bg-[#030611] border border-[#141d35] rounded-xl p-2 h-44 flex items-center justify-center relative overflow-hidden">
            <svg className="w-full h-full" viewBox="0 0 240 110" onMouseLeave={() => setHoveredEpoch(null)}>
              {/* Log horizontal scale lines */}
              {[1.0, 0.1, 0.01, 0.001].map((lvl) => {
                const y = getSvgY(lvl, 110, 0.0005, 1.5, true);
                return (
                  <g key={lvl}>
                    <line x1="30" y1={y} x2="230" y2={y} stroke="#141d35" strokeWidth="0.8" strokeDasharray="3 3" />
                    <text x="5" y={y + 2.5} fill="#475569" fontSize="6.5" className="font-mono">{lvl}</text>
                  </g>
                );
              })}
              
              {/* X axis lines */}
              {filteredPoints.length > 0 && [0, 0.25, 0.5, 0.75, 1.0].map((pct, idx) => {
                const stepIdx = Math.round(pct * (filteredPoints.length - 1));
                const pt = filteredPoints[stepIdx];
                if (!pt) return null;
                const x = getSvgX(pt.epoch, 240);
                return (
                  <g key={idx}>
                    <line x1={x} y1="15" x2={x} y2="90" stroke="#141d35" strokeWidth="0.5" strokeDasharray="1 5" />
                    <text x={x} y="102" fill="#475569" fontSize="6.5" textAnchor="middle" className="font-mono">{pt.epoch}</text>
                  </g>
                );
              })}

              {/* Shaded gradient area */}
              {filteredPoints.length > 1 && (
                <path
                  d={`M ${getSvgX(filteredPoints[0].epoch, 240)} 90 
                      ${filteredPoints.map(p => `L ${getSvgX(p.epoch, 240)} ${getSvgY(p.loss, 110, 0.0005, 1.5, true)}`).join(' ')} 
                      L ${getSvgX(filteredPoints[filteredPoints.length - 1].epoch, 240)} 90 Z`}
                  fill="url(#area-loss)"
                  className="opacity-25"
                />
              )}

              {/* Main Curve */}
              {filteredPoints.length > 1 && (
                <path
                  d={filteredPoints.map((p, idx) => {
                    const x = getSvgX(p.epoch, 240);
                    const y = getSvgY(p.loss, 110, 0.0005, 1.5, true);
                    return `${idx === 0 ? 'M' : 'L'} ${x} ${y}`;
                  }).join(' ')}
                  fill="none"
                  stroke="#f43f5e"
                  strokeWidth="1.8"
                  filter="url(#glow-rose)"
                />
              )}

              {/* Invisible interactive hover detectors */}
              {filteredPoints.map((p) => {
                const x = getSvgX(p.epoch, 240);
                return (
                  <rect
                    key={p.epoch}
                    x={x - 2}
                    y="10"
                    width="4"
                    height="85"
                    fill="transparent"
                    className="cursor-crosshair"
                    onMouseEnter={() => setHoveredEpoch(p.epoch)}
                  />
                );
              })}

              {/* Hover indicator node */}
              {hoveredEpoch !== null && (() => {
                const pt = filteredPoints.find(p => p.epoch === hoveredEpoch);
                if (!pt) return null;
                const x = getSvgX(pt.epoch, 240);
                const y = getSvgY(pt.loss, 110, 0.0005, 1.5, true);
                return (
                  <g>
                    <line x1={x} y1="15" x2={x} y2="90" stroke="rgba(244,63,94,0.3)" strokeWidth="1" />
                    <circle cx={x} cy={y} r="5.5" fill="rgba(244,63,94,0.2)" className="animate-ping" />
                    <circle cx={x} cy={y} r="3.2" fill="#fff" stroke="#f43f5e" strokeWidth="1.5" />
                  </g>
                );
              })()}

              {/* SVG Gradients */}
              <defs>
                <linearGradient id="area-loss" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#f43f5e" stopOpacity="0.4" />
                  <stop offset="100%" stopColor="#f43f5e" stopOpacity="0.0" />
                </linearGradient>
              </defs>
            </svg>

            {/* Float values tooltip readouts */}
            {hoveredEpoch !== null && (() => {
              const pt = filteredPoints.find(p => p.epoch === hoveredEpoch);
              if (!pt) return null;
              return (
                <div className="absolute top-2 left-1/2 -translate-x-1/2 bg-slate-950/90 border border-[#141d35] rounded-lg p-1 px-2 text-[8px] font-mono text-slate-300 shadow-xl pointer-events-none flex gap-2">
                  <span>Epoch {pt.epoch}</span>
                  <span className="text-rose-400 font-bold">Loss: {pt.loss.toFixed(4)}</span>
                </div>
              );
            })()}

            <div className="absolute bottom-1 right-2 text-[7px] font-mono text-slate-500 uppercase">
              Y-Axis Log Scale
            </div>
          </div>
        </div>

        {/* Chart 2: Accuracy vs Epoch */}
        <div className="bg-[#060a18]/70 border border-[#141d35]/75 rounded-2xl p-4 flex flex-col justify-between shadow-xl text-left gap-3.5 relative hover:border-emerald-500/10 transition-all backdrop-blur-md">
          <div>
            <span className="text-xs font-bold font-mono text-slate-400 uppercase tracking-wider flex items-center gap-1.5 border-b border-[#141d35]/40 pb-2">
              <TrendingUp size={14} className="text-emerald-400" />
              Accuracy vs Epoch
            </span>
          </div>

          <div className="bg-[#030611] border border-[#141d35] rounded-xl p-2 h-44 flex items-center justify-center relative overflow-hidden">
            <svg className="w-full h-full" viewBox="0 0 240 110" onMouseLeave={() => setHoveredEpoch(null)}>
              {/* Linear accuracy tick grids */}
              {[0, 0.25, 0.5, 0.75, 1.0].map((lvl) => {
                const y = getSvgY(lvl, 110, 0.0, 1.05);
                return (
                  <g key={lvl}>
                    <line x1="30" y1={y} x2="230" y2={y} stroke="#141d35" strokeWidth="0.8" strokeDasharray="3 3" />
                    <text x="5" y={y + 2.5} fill="#475569" fontSize="6.5" className="font-mono">{Math.round(lvl * 100)}%</text>
                  </g>
                );
              })}

              {/* X Axis ticks */}
              {filteredPoints.length > 0 && [0, 0.25, 0.5, 0.75, 1.0].map((pct, idx) => {
                const stepIdx = Math.round(pct * (filteredPoints.length - 1));
                const pt = filteredPoints[stepIdx];
                if (!pt) return null;
                const x = getSvgX(pt.epoch, 240);
                return (
                  <g key={idx}>
                    <line x1={x} y1="15" x2={x} y2="90" stroke="#141d35" strokeWidth="0.5" strokeDasharray="1 5" />
                    <text x={x} y="102" fill="#475569" fontSize="6.5" textAnchor="middle" className="font-mono">{pt.epoch}</text>
                  </g>
                );
              })}

              {/* Shaded area */}
              {filteredPoints.length > 1 && (
                <path
                  d={`M ${getSvgX(filteredPoints[0].epoch, 240)} 90 
                      ${filteredPoints.map(p => `L ${getSvgX(p.epoch, 240)} ${getSvgY(p.accuracy, 110, 0, 1.05)}`).join(' ')} 
                      L ${getSvgX(filteredPoints[filteredPoints.length - 1].epoch, 240)} 90 Z`}
                  fill="url(#area-acc)"
                  className="opacity-20"
                />
              )}

              {/* Line Curve */}
              {filteredPoints.length > 1 && (
                <path
                  d={filteredPoints.map((p, idx) => {
                    const x = getSvgX(p.epoch, 240);
                    const y = getSvgY(p.accuracy, 110, 0, 1.05);
                    return `${idx === 0 ? 'M' : 'L'} ${x} ${y}`;
                  }).join(' ')}
                  fill="none"
                  stroke="#10b981"
                  strokeWidth="1.8"
                  filter="url(#glow-emerald)"
                />
              )}

              {/* Interactive block overlay */}
              {filteredPoints.map((p) => {
                const x = getSvgX(p.epoch, 240);
                return (
                  <rect
                    key={p.epoch}
                    x={x - 2}
                    y="10"
                    width="4"
                    height="85"
                    fill="transparent"
                    className="cursor-crosshair"
                    onMouseEnter={() => setHoveredEpoch(p.epoch)}
                  />
                );
              })}

              {/* Hover highlight circle */}
              {hoveredEpoch !== null && (() => {
                const pt = filteredPoints.find(p => p.epoch === hoveredEpoch);
                if (!pt) return null;
                const x = getSvgX(pt.epoch, 240);
                const y = getSvgY(pt.accuracy, 110, 0, 1.05);
                return (
                  <g>
                    <line x1={x} y1="15" x2={x} y2="90" stroke="rgba(16,185,129,0.3)" strokeWidth="1" />
                    <circle cx={x} cy={y} r="5.5" fill="rgba(16,185,129,0.2)" className="animate-ping" />
                    <circle cx={x} cy={y} r="3.2" fill="#fff" stroke="#10b981" strokeWidth="1.5" />
                  </g>
                );
              })()}

              <defs>
                <linearGradient id="area-acc" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#10b981" stopOpacity="0.4" />
                  <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
                </linearGradient>
              </defs>
            </svg>

            {/* Hover tooltip text reading */}
            {hoveredEpoch !== null && (() => {
              const pt = filteredPoints.find(p => p.epoch === hoveredEpoch);
              if (!pt) return null;
              return (
                <div className="absolute top-2 left-1/2 -translate-x-1/2 bg-slate-950/90 border border-[#141d35] rounded-lg p-1 px-2 text-[8px] font-mono text-slate-350 shadow-xl pointer-events-none flex gap-2">
                  <span>Epoch {pt.epoch}</span>
                  <span className="text-emerald-400 font-bold">Accuracy: {(pt.accuracy * 100).toFixed(2)}%</span>
                </div>
              );
            })()}
          </div>
        </div>

        {/* Chart 3: Loss vs Accuracy */}
        <div className="bg-[#060a18]/70 border border-[#141d35]/75 rounded-2xl p-4 flex flex-col justify-between shadow-xl text-left gap-3.5 relative hover:border-cyan-500/10 transition-all backdrop-blur-md">
          <div>
            <span className="text-xs font-bold font-mono text-slate-400 uppercase tracking-wider flex items-center gap-1.5 border-b border-[#141d35]/40 pb-2">
              <LineChart size={14} className="text-cyan-400" />
              Loss vs Accuracy
            </span>
          </div>

          <div className="bg-[#030611] border border-[#141d35] rounded-xl p-2 h-44 flex items-center justify-center relative overflow-hidden">
            <svg className="w-full h-full" viewBox="0 0 240 110">
              {/* Y scale gridlines (Loss - Log) */}
              {[1.0, 0.1, 0.01, 0.001].map((lvl) => {
                const y = getSvgY(lvl, 110, 0.0005, 1.5, true);
                return (
                  <g key={lvl}>
                    <line x1="30" y1={y} x2="230" y2={y} stroke="#141d35" strokeWidth="0.8" strokeDasharray="3 3" />
                    <text x="5" y={y + 2.5} fill="#475569" fontSize="6.5" className="font-mono">{lvl}</text>
                  </g>
                );
              })}

              {/* X Scale lines (Accuracy - Linear) */}
              {[0, 0.25, 0.5, 0.75, 1.0].map((accLvl) => {
                const x = 30 + accLvl * 200;
                return (
                  <g key={accLvl}>
                    <line x1={x} y1="15" x2={x} y2="90" stroke="#141d35" strokeWidth="0.5" strokeDasharray="1 5" />
                    <text x={x} y="102" fill="#475569" fontSize="6.5" textAnchor="middle" className="font-mono">{Math.round(accLvl * 100)}%</text>
                  </g>
                );
              })}

              {/* Continuous Scatter Curve */}
              {filteredPoints.length > 1 && (
                <path
                  d={filteredPoints.map((p, idx) => {
                    const x = 30 + p.accuracy * 200;
                    const y = getSvgY(p.loss, 110, 0.0005, 1.5, true);
                    return `${idx === 0 ? 'M' : 'L'} ${x} ${y}`;
                  }).join(' ')}
                  fill="none"
                  stroke="#06b6d4"
                  strokeWidth="1.5"
                  filter="url(#glow-cyan)"
                  className="opacity-70"
                />
              )}

              {/* Points plots */}
              {filteredPoints.filter((_, idx) => idx % Math.max(1, Math.round(filteredPoints.length / 18)) === 0 || idx === filteredPoints.length - 1).map((p, idx) => {
                const x = 30 + p.accuracy * 200;
                const y = getSvgY(p.loss, 110, 0.0005, 1.5, true);
                const isLatest = p.epoch === filteredPoints[filteredPoints.length - 1].epoch;
                return (
                  <circle
                    key={idx}
                    cx={x}
                    cy={y}
                    r={isLatest ? 4 : 2.5}
                    fill={isLatest ? '#ffffff' : '#06b6d4'}
                    stroke="#030611"
                    strokeWidth="0.8"
                    className="cursor-help"
                  />
                );
              })}
            </svg>
          </div>
        </div>
      </div>

      {/* 4. CHART GRID: MIDDLE ROW (Confusion Matrix, Gradient Magnitude, Learning Rate, Weight Distribution) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        
        {/* Confusion Matrix */}
        <div className="bg-[#060a18]/70 border border-[#141d35]/75 rounded-2xl p-4 flex flex-col justify-between shadow-xl text-left gap-3 relative hover:border-emerald-500/10 transition-all backdrop-blur-md">
          <div>
            <span className="text-xs font-bold font-mono text-slate-400 uppercase tracking-wider flex items-center gap-1.5 border-b border-[#141d35]/40 pb-2">
              <Sliders size={14} className="text-emerald-400" />
              Confusion Matrix
            </span>
          </div>

          <div className="bg-[#030611] border border-[#141d35] rounded-xl p-2.5 h-44 flex items-center justify-between relative gap-2">
            
            {/* Left Y Axis Label (Vertical layout text) */}
            <div className="flex flex-col justify-center items-center h-full">
              <span className="text-[7.5px] font-bold font-mono text-slate-500 uppercase tracking-widest -rotate-90 origin-center whitespace-nowrap leading-none translate-x-1">
                Actual
              </span>
            </div>

            {/* Matrix 2x2 grid container */}
            <div className="flex-1 flex flex-col gap-1.5">
              {/* Predicted headers */}
              <div className="flex pl-10 justify-around text-[8px] font-mono font-bold text-slate-500 uppercase tracking-wide">
                <span>Pred 0</span>
                <span>Pred 1</span>
              </div>

              <div className="flex-1 flex flex-col gap-1.5">
                {/* Row 0 (Actual 0) */}
                <div className="flex items-center gap-1.5 h-1/2">
                  <span className="w-8 text-[8px] font-mono text-slate-500 font-bold pr-1 text-right">Act 0</span>
                  
                  {/* TN cell */}
                  <div 
                    className="flex-1 h-full rounded-lg flex flex-col items-center justify-center font-mono border transition duration-300"
                    style={{ 
                      backgroundColor: `rgba(16, 185, 129, ${matrix.tn / 120})`,
                      borderColor: matrix.tn > 50 ? 'rgba(16, 185, 129, 0.4)' : '#141d35'
                    }}
                  >
                    <span className="text-sm font-black text-white">{matrix.tn}</span>
                    <span className="text-[6.5px] text-slate-400 uppercase font-bold tracking-widest font-sans">TN</span>
                  </div>

                  {/* FP cell */}
                  <div 
                    className="flex-1 h-full rounded-lg flex flex-col items-center justify-center font-mono border border-slate-900/40"
                    style={{ 
                      backgroundColor: `rgba(244, 63, 94, ${matrix.fp / 150})`,
                      borderColor: matrix.fp > 30 ? 'rgba(244,63,94,0.3)' : 'rgba(20,29,53,0.5)'
                    }}
                  >
                    <span className="text-xs font-bold text-slate-300">{matrix.fp}</span>
                    <span className="text-[6px] text-slate-500 uppercase font-medium tracking-wide font-sans">FP</span>
                  </div>
                </div>

                {/* Row 1 (Actual 1) */}
                <div className="flex items-center gap-1.5 h-1/2">
                  <span className="w-8 text-[8px] font-mono text-slate-500 font-bold pr-1 text-right">Act 1</span>

                  {/* FN cell */}
                  <div 
                    className="flex-1 h-full rounded-lg flex flex-col items-center justify-center font-mono border border-slate-900/40"
                    style={{ 
                      backgroundColor: `rgba(244, 63, 94, ${matrix.fn / 150})`,
                      borderColor: matrix.fn > 30 ? 'rgba(244,63,94,0.3)' : 'rgba(20,29,53,0.5)'
                    }}
                  >
                    <span className="text-xs font-bold text-slate-300">{matrix.fn}</span>
                    <span className="text-[6px] text-slate-500 uppercase font-medium tracking-wide font-sans">FN</span>
                  </div>

                  {/* TP cell */}
                  <div 
                    className="flex-1 h-full rounded-lg flex flex-col items-center justify-center font-mono border transition duration-300"
                    style={{ 
                      backgroundColor: `rgba(16, 185, 129, ${matrix.tp / 120})`,
                      borderColor: matrix.tp > 50 ? 'rgba(16, 185, 129, 0.4)' : '#141d35'
                    }}
                  >
                    <span className="text-sm font-black text-white">{matrix.tp}</span>
                    <span className="text-[6.5px] text-slate-400 uppercase font-bold tracking-widest font-sans">TP</span>
                  </div>
                </div>
              </div>

              {/* Bottom Predicted label text */}
              <div className="text-center text-[7.5px] font-bold font-mono text-slate-500 uppercase tracking-widest pt-1">
                Predicted Axis
              </div>
            </div>

            {/* Density scale sidebar */}
            <div className="w-2.5 h-28 bg-gradient-to-t from-slate-950 via-emerald-950 to-emerald-500 border border-[#141d35] rounded-md flex flex-col justify-between py-1 items-center">
              <span className="text-[5.5px] font-bold font-mono text-slate-400">100</span>
              <span className="text-[5.5px] font-bold font-mono text-slate-500">50</span>
              <span className="text-[5.5px] font-bold font-mono text-slate-500">0</span>
            </div>
          </div>
        </div>

        {/* Gradient Magnitude */}
        <div className="bg-[#060a18]/70 border border-[#141d35]/75 rounded-2xl p-4 flex flex-col justify-between shadow-xl text-left gap-3.5 relative hover:border-amber-500/10 transition-all backdrop-blur-md">
          <div>
            <span className="text-xs font-bold font-mono text-slate-400 uppercase tracking-wider flex items-center gap-1.5 border-b border-[#141d35]/40 pb-2">
              <Zap size={14} className="text-amber-400" />
              Gradient Magnitude
            </span>
          </div>

          <div className="bg-[#030611] border border-[#141d35] rounded-xl p-2 h-44 flex items-center justify-center relative overflow-hidden">
            <svg className="w-full h-full" viewBox="0 0 160 110" onMouseLeave={() => setHoveredEpoch(null)}>
              {/* Grids Log Scale */}
              {[1.0, 0.1, 0.01, 0.001, 0.0001].map((lvl) => {
                const y = getSvgY(lvl, 110, 0.00005, 1.2, true);
                return (
                  <g key={lvl}>
                    <line x1="28" y1={y} x2="152" y2={y} stroke="#141d35" strokeWidth="0.8" strokeDasharray="2 4" />
                    <text x="3" y={y + 2} fill="#475569" fontSize="6.2" className="font-mono">{lvl}</text>
                  </g>
                );
              })}

              {/* Shaded Area under curves */}
              {filteredPoints.length > 1 && (
                <path
                  d={`M ${getSvgX(filteredPoints[0].epoch, 160)} 90 
                      ${filteredPoints.map(p => `L ${getSvgX(p.epoch, 160)} ${getSvgY(p.gradientMagnitude, 110, 0.00005, 1.2, true)}`).join(' ')} 
                      L ${getSvgX(filteredPoints[filteredPoints.length - 1].epoch, 160)} 90 Z`}
                  fill="url(#area-grad)"
                  className="opacity-15"
                />
              )}

              {/* Curve Line */}
              {filteredPoints.length > 1 && (
                <path
                  d={filteredPoints.map((p, idx) => {
                    const x = getSvgX(p.epoch, 160);
                    const y = getSvgY(p.gradientMagnitude, 110, 0.00005, 1.2, true);
                    return `${idx === 0 ? 'M' : 'L'} ${x} ${y}`;
                  }).join(' ')}
                  fill="none"
                  stroke="#f59e0b"
                  strokeWidth="1.5"
                  filter="url(#glow-amber)"
                />
              )}

              {/* Invis layer detectors */}
              {filteredPoints.map((p) => {
                const x = getSvgX(p.epoch, 160);
                return (
                  <rect
                    key={p.epoch}
                    x={x - 2}
                    y="10"
                    width="4"
                    height="85"
                    fill="transparent"
                    className="cursor-crosshair"
                    onMouseEnter={() => setHoveredEpoch(p.epoch)}
                  />
                );
              })}

              {/* Hover node marker */}
              {hoveredEpoch !== null && (() => {
                const pt = filteredPoints.find(p => p.epoch === hoveredEpoch);
                if (!pt) return null;
                const x = getSvgX(pt.epoch, 160);
                const y = getSvgY(pt.gradientMagnitude, 110, 0.00005, 1.2, true);
                return (
                  <g>
                    <line x1={x} y1="15" x2={x} y2="90" stroke="rgba(245,158,11,0.2)" strokeWidth="0.8" />
                    <circle cx={x} cy={y} r="3" fill="#fff" stroke="#f59e0b" strokeWidth="1" />
                  </g>
                );
              })()}

              <defs>
                <linearGradient id="area-grad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.3" />
                  <stop offset="100%" stopColor="#f59e0b" stopOpacity="0.0" />
                </linearGradient>
              </defs>
            </svg>
          </div>
        </div>

        {/* Learning Rate step chart */}
        <div className="bg-[#060a18]/70 border border-[#141d35]/75 rounded-2xl p-4 flex flex-col justify-between shadow-xl text-left gap-3.5 relative hover:border-cyan-500/10 transition-all backdrop-blur-md">
          <div>
            <span className="text-xs font-bold font-mono text-slate-400 uppercase tracking-wider flex items-center gap-1.5 border-b border-[#141d35]/40 pb-2">
              <Sliders size={14} className="text-cyan-400" />
              Learning Rate
            </span>
          </div>

          <div className="bg-[#030611] border border-[#141d35] rounded-xl p-2 h-44 flex items-center justify-center relative overflow-hidden">
            <svg className="w-full h-full" viewBox="0 0 160 110">
              {/* Horizontal steps labels */}
              {[1.0, 0.1, 0.01, 0.001, 0.0001].map((lvl) => {
                const y = getSvgY(lvl, 110, 0.00005, 1.2, true);
                return (
                  <g key={lvl}>
                    <line x1="28" y1={y} x2="152" y2={y} stroke="#141d35" strokeWidth="0.8" strokeDasharray="2 4" />
                    <text x="3" y={y + 2} fill="#475569" fontSize="6.2" className="font-mono">{lvl}</text>
                  </g>
                );
              })}

              {/* Draw step line for learning rates */}
              {filteredPoints.length > 0 && (() => {
                let dString = "";
                filteredPoints.forEach((p, idx) => {
                  const x = getSvgX(p.epoch, 160);
                  const y = getSvgY(p.lr, 110, 0.00005, 1.2, true);
                  if (idx === 0) {
                    dString += `M ${x} ${y}`;
                  } else {
                    const prevX = getSvgX(filteredPoints[idx - 1].epoch, 160);
                    const prevY = getSvgY(filteredPoints[idx - 1].lr, 110, 0.00005, 1.2, true);
                    // Step function connection
                    dString += ` L ${x} ${prevY} L ${x} ${y}`;
                  }
                });
                return (
                  <path
                    d={dString}
                    fill="none"
                    stroke="#06b6d4"
                    strokeWidth="1.8"
                    filter="url(#glow-cyan)"
                  />
                );
              })()}
            </svg>
          </div>
        </div>

        {/* Weight Distribution histogram */}
        <div className="bg-[#060a18]/70 border border-[#141d35]/75 rounded-2xl p-4 flex flex-col justify-between shadow-xl text-left gap-3.5 relative hover:border-pink-500/10 transition-all backdrop-blur-md">
          <div>
            <span className="text-xs font-bold font-mono text-slate-400 uppercase tracking-wider flex items-center gap-1.5 border-b border-[#141d35]/40 pb-2">
              <Sliders size={14} className="text-pink-400" />
              Weight Distribution
            </span>
          </div>

          <div className="bg-[#030611] border border-[#141d35] rounded-xl p-2 h-44 flex items-center justify-center relative overflow-hidden">
            <svg className="w-full h-full" viewBox="0 0 160 110">
              {/* Horizontal Count Lines */}
              {[200, 150, 100, 50, 0].map((val) => {
                const y = 90 - (val / 200) * 75;
                return (
                  <g key={val}>
                    <line x1="22" y1={y} x2="152" y2={y} stroke="#141d35" strokeWidth="0.8" strokeDasharray="2 3" />
                    <text x="2" y={y + 2.5} fill="#475569" fontSize="6" className="font-mono">{val}</text>
                  </g>
                );
              })}

              {/* Vertical Bars histogram */}
              {weightBins.map((bin, idx) => {
                const x = 25 + (idx / (weightBins.length - 1)) * 120;
                const barH = (bin.height / 200) * 75;
                const y = 90 - barH;
                return (
                  <rect
                    key={idx}
                    x={x}
                    y={y}
                    width="4.2"
                    height={Math.max(1, barH)}
                    fill="#ec4899"
                    className="opacity-80 hover:opacity-100 transition duration-150 rounded-sm"
                    style={{ filter: 'drop-shadow(0 0 1.5px rgba(236,72,153,0.35))' }}
                  />
                );
              })}

              {/* X Scale Ticks */}
              {[-1.0, -0.5, 0, 0.5, 1.0].map((val, idx) => {
                const pct = (val + 1.0) / 2.0;
                const x = 25 + pct * 120 + 2;
                return (
                  <g key={idx}>
                    <line x1={x} y1="90" x2={x} y2="93" stroke="#1e293b" strokeWidth="0.8" />
                    <text x={x} y="102" fill="#475569" fontSize="6.2" textAnchor="middle" className="font-mono">{val.toFixed(1)}</text>
                  </g>
                );
              })}
            </svg>
          </div>
        </div>
      </div>

      {/* 5. CHART GRID: LOWER ROW (Activation Distribution, Per-Class Accuracy, Summary and Radial) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Activation Distribution */}
        <div className="bg-[#060a18]/70 border border-[#141d35]/75 rounded-2xl p-4 flex flex-col justify-between shadow-xl text-left gap-3.5 relative hover:border-purple-500/10 transition-all backdrop-blur-md">
          <div>
            <span className="text-xs font-bold font-mono text-slate-400 uppercase tracking-wider flex items-center gap-1.5 border-b border-[#141d35]/40 pb-2">
              <Sparkles size={14} className="text-purple-400" />
              Activation Distribution (Hidden Layer 1)
            </span>
          </div>

          <div className="bg-[#030611] border border-[#141d35] rounded-xl p-2 h-44 flex items-center justify-center relative overflow-hidden">
            <svg className="w-full h-full" viewBox="0 0 240 110">
              {/* Density levels ticks */}
              {[2.0, 1.0, 0].map((val) => {
                const y = 90 - (val / 2.0) * 75;
                return (
                  <g key={val}>
                    <line x1="25" y1={y} x2="225" y2={y} stroke="#141d35" strokeWidth="0.8" strokeDasharray="3 3" />
                    <text x="5" y={y + 2.5} fill="#475569" fontSize="6.5" className="font-mono">{val}</text>
                  </g>
                );
              })}

              {/* Filled area purple */}
              <path
                d={`M 28 90 
                    ${densityPoints.map((p, idx) => {
                      const ratio = idx / (densityPoints.length - 1);
                      const x = 28 + ratio * 190;
                      const y = 90 - (p.density / 2.0) * 75;
                      return `L ${x} ${y}`;
                    }).join(' ')} 
                    L 218 90 Z`}
                fill="url(#area-activation)"
                className="opacity-25"
              />

              {/* Purple Line */}
              <path
                d={densityPoints.map((p, idx) => {
                  const ratio = idx / (densityPoints.length - 1);
                  const x = 28 + ratio * 190;
                  const y = 90 - (p.density / 2.0) * 75;
                  return `${idx === 0 ? 'M' : 'L'} ${x} ${y}`;
                }).join(' ')}
                fill="none"
                stroke="#a855f7"
                strokeWidth="1.8"
                style={{ filter: 'drop-shadow(0 0 3px rgba(168,85,247,0.5))' }}
              />

              {/* X Axis Range Ticks */}
              {[-1.0, -0.5, 0, 0.5, 1.0].map((val, idx) => {
                const pct = (val + 1.0) / 2.0;
                const x = 28 + pct * 190;
                return (
                  <g key={idx}>
                    <line x1={x} y1="90" x2={x} y2="93" stroke="#1e293b" strokeWidth="0.8" />
                    <text x={x} y="102" fill="#475569" fontSize="6.5" textAnchor="middle" className="font-mono">{val.toFixed(1)}</text>
                  </g>
                );
              })}

              <defs>
                <linearGradient id="area-activation" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#a855f7" stopOpacity="0.5" />
                  <stop offset="100%" stopColor="#a855f7" stopOpacity="0.0" />
                </linearGradient>
              </defs>
            </svg>
            <div className="absolute top-1 right-2 text-[6.5px] font-mono text-slate-500 uppercase">
              Activation Value
            </div>
          </div>
        </div>

        {/* Per-Class Accuracy */}
        <div className="bg-[#060a18]/70 border border-[#141d35]/75 rounded-2xl p-4 flex flex-col justify-between shadow-xl text-left gap-3.5 relative hover:border-emerald-500/10 transition-all backdrop-blur-md">
          <div>
            <span className="text-xs font-bold font-mono text-slate-400 uppercase tracking-wider flex items-center gap-1.5 border-b border-[#141d35]/40 pb-2">
              <CheckCircle size={14} className="text-emerald-400" />
              Per-Class Accuracy
            </span>
          </div>

          <div className="bg-[#030611] border border-[#141d35] rounded-xl p-3 h-44 flex flex-col justify-around relative">
            
            {/* Class 0 bar */}
            <div className="space-y-1.5 text-left">
              <div className="flex justify-between items-center text-[10px] font-mono">
                <span className="text-slate-400 font-bold">Class 0 Accuracy</span>
                <span className="text-emerald-400 font-extrabold">{classAcc.c0.toFixed(2)}%</span>
              </div>
              <div className="w-full bg-slate-950 rounded-full h-5.5 border border-[#141d35] overflow-hidden p-0.5 flex">
                <div 
                  className="bg-gradient-to-r from-emerald-600 via-teal-500 to-emerald-400 h-full rounded-full transition-all duration-500"
                  style={{ 
                    width: `${classAcc.c0}%`,
                    filter: 'drop-shadow(0 0 2px rgba(16,185,129,0.3))' 
                  }}
                />
              </div>
            </div>

            {/* Class 1 bar */}
            <div className="space-y-1.5 text-left">
              <div className="flex justify-between items-center text-[10px] font-mono">
                <span className="text-slate-400 font-bold">Class 1 Accuracy</span>
                <span className="text-emerald-400 font-extrabold">{classAcc.c1.toFixed(2)}%</span>
              </div>
              <div className="w-full bg-slate-950 rounded-full h-5.5 border border-[#141d35] overflow-hidden p-0.5 flex">
                <div 
                  className="bg-gradient-to-r from-emerald-600 via-teal-500 to-emerald-400 h-full rounded-full transition-all duration-500"
                  style={{ 
                    width: `${classAcc.c1}%`,
                    filter: 'drop-shadow(0 0 2px rgba(16,185,129,0.3))' 
                  }}
                />
              </div>
            </div>

            {/* Axis marks line at bottom */}
            <div className="flex justify-between items-center text-[7.5px] font-mono text-slate-500 pt-1 border-t border-slate-900/60">
              <span>0%</span>
              <span>25%</span>
              <span>50%</span>
              <span>75%</span>
              <span>100%</span>
            </div>
          </div>
        </div>

        {/* Training Progress (Summary) */}
        <div className="bg-[#060a18]/70 border border-[#141d35]/75 rounded-2xl p-4 flex flex-col justify-between shadow-xl text-left gap-3.5 relative hover:border-emerald-500/10 transition-all backdrop-blur-md">
          <div>
            <span className="text-xs font-bold font-mono text-slate-400 uppercase tracking-wider flex items-center gap-1.5 border-b border-[#141d35]/40 pb-2">
              <Activity size={14} className="text-emerald-400" />
              Training Progress (Summary)
            </span>
          </div>

          <div className="bg-[#030611] border border-[#141d35] rounded-xl p-3 h-44 flex items-center justify-between gap-2.5 relative">
            
            {/* List Table of stats on left */}
            <div className="flex-1 flex flex-col justify-center gap-2 text-[10px] font-mono text-slate-400">
              <div className="flex justify-between items-center border-b border-slate-900 pb-1">
                <span className="font-semibold">Starting Loss</span>
                <span className="text-slate-300 font-bold">{startLoss.toFixed(4)}</span>
              </div>
              <div className="flex justify-between items-center border-b border-slate-900 pb-1">
                <span className="font-semibold">Final Loss</span>
                <span className="text-rose-400 font-bold">{finalLoss.toFixed(4)}</span>
              </div>
              <div className="flex justify-between items-center border-b border-slate-900 pb-1">
                <span className="font-semibold">Starting Accuracy</span>
                <span className="text-slate-300 font-bold">{(startAccuracy * 100).toFixed(2)}%</span>
              </div>
              <div className="flex justify-between items-center border-b border-slate-900 pb-1">
                <span className="font-semibold">Final Accuracy</span>
                <span className="text-emerald-400 font-extrabold">{(finalAccuracy * 100).toFixed(2)}%</span>
              </div>
              <div className="flex justify-between items-center pt-0.5">
                <span className="font-semibold">Improvement</span>
                <span className={`font-black ${improvement >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {improvement >= 0 ? '+' : ''}{(improvement * 100).toFixed(2)}%
                </span>
              </div>
            </div>

            {/* Radial Doughnut circle gauge on right */}
            <div className="w-20 h-20 relative flex items-center justify-center shrink-0">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                {/* Underlay Track */}
                <circle cx="18" cy="18" r="15.915" fill="none" stroke="#090d16" strokeWidth="3" />
                
                {/* Purple progress segment */}
                <circle
                  cx="18"
                  cy="18"
                  r="15.915"
                  fill="none"
                  stroke="#a855f7"
                  strokeWidth="3.2"
                  strokeDasharray={`${Math.max(1, finalAccuracy * 0.7 * 100)}, 100`}
                  strokeLinecap="round"
                  className="opacity-60"
                />

                {/* Main green glowing gauge ring */}
                <circle
                  cx="18"
                  cy="18"
                  r="15.915"
                  fill="none"
                  stroke="#10b981"
                  strokeWidth="3.2"
                  strokeDasharray={`${finalAccuracy * 100}, 100`}
                  strokeLinecap="round"
                  style={{ 
                    filter: 'drop-shadow(0 0 3px rgba(16,185,129,0.45))',
                    transition: 'stroke-dasharray 0.5s ease' 
                  }}
                />
              </svg>
              
              <div className="absolute inset-0 flex flex-col items-center justify-center leading-none">
                <span className="text-xs font-black font-mono text-white">{(finalAccuracy * 100).toFixed(0)}%</span>
                <span className="text-[5.5px] font-mono text-slate-500 uppercase font-black tracking-wider mt-0.5">Accuracy</span>
              </div>
            </div>
          </div>
        </div>
      </div>
        </>
      )}

      {/* 3D Decision Boundary Panel */}
      {activeSubTab === 'boundary' && (
        <div className="flex flex-col gap-6">
          {/* Overlapped Outputs Container */}
          <div className="bg-[#060a18]/70 border border-[#141d35]/75 rounded-2xl p-6 shadow-xl relative overflow-hidden backdrop-blur-md text-left">
            <div className="absolute top-0 right-0 w-80 h-80 bg-purple-500/5 rounded-full blur-3xl pointer-events-none" />
            
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-[#141d35]/40 pb-4 mb-6 gap-4">
              <div className="space-y-1.5">
                <span className="text-[10px] font-mono font-bold text-purple-400 uppercase tracking-widest block">Lecture Figure 3.2</span>
                <h2 className="text-xl font-black text-white uppercase tracking-tight font-display flex items-center gap-2">
                  <Activity className="text-purple-400 animate-pulse" size={20} />
                  OVERLAPPED OUTPUTS: SUNNY, RAINY, CLOUDY
                </h2>
                <p className="text-xs text-slate-400 max-w-3xl leading-relaxed">
                  The overlapped plot below shows the logits (responses) for all three classes. As Humidity increases for different values of Temperature, the values of <strong className="text-[#10b981]">Class A / Sunny (green)</strong>, <strong className="text-[#ef4444]">Class B / Rainy (red)</strong> and <strong className="text-[#a855f7]">Class C / Cloudy (purple)</strong> change, and the class with the highest response becomes the predicted output.
                </p>
              </div>
              
              {/* Sliders in header for rapid tuning */}
              <div className="flex flex-wrap items-center gap-4 bg-[#030611] border border-[#141d35]/60 rounded-xl p-3.5">
                <div className="space-y-1">
                  <div className="flex justify-between text-[10px] font-mono font-bold">
                    <span className="text-slate-400">TEMPERATURE</span>
                    <span className="text-purple-400">{boundaryTemperature.toFixed(2)}</span>
                  </div>
                  <input 
                    type="range" 
                    min="0" 
                    max="1" 
                    step="0.01" 
                    value={boundaryTemperature} 
                    onChange={(e) => setBoundaryTemperature(parseFloat(e.target.value))}
                    className="w-32 h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-purple-500"
                  />
                </div>
                
                <div className="space-y-1">
                  <div className="flex justify-between text-[10px] font-mono font-bold">
                    <span className="text-slate-400">HUMIDITY</span>
                    <span className="text-purple-400">{boundaryHumidity.toFixed(2)}</span>
                  </div>
                  <input 
                    type="range" 
                    min="0" 
                    max="1" 
                    step="0.01" 
                    value={boundaryHumidity} 
                    onChange={(e) => setBoundaryHumidity(parseFloat(e.target.value))}
                    className="w-32 h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-purple-500"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Left Side: 3D Visualization */}
              <div className="lg:col-span-7 flex flex-col items-center justify-center bg-[#030611]/80 border border-[#141d35]/40 rounded-2xl p-4 relative min-h-[400px]">
                
                {/* 3D Legend panel */}
                <div className="absolute top-4 right-4 bg-[#050a1b]/95 border border-[#141d35] rounded-xl p-3.5 space-y-2 z-10 text-[10px] font-mono shadow-xl max-w-[240px]">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full bg-[#10b981]" />
                    <span className="text-slate-300">Class A / Sunny Surface (R_sunny)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full bg-[#ef4444]" />
                    <span className="text-slate-300">Class B / Rainy Surface (R_rainy)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full bg-[#a855f7]" />
                    <span className="text-slate-300">Class C / Cloudy Surface (R_cloudy)</span>
                  </div>
                  <div className="h-px bg-slate-800 my-1" />
                  <div className="flex items-center gap-2 text-slate-400 leading-tight">
                    <span className="border border-slate-700 px-1 rounded text-[8px] uppercase">Note</span>
                    <span>Surfaces bend across Humidity and Temperature</span>
                  </div>
                </div>

                {/* SVG 3D Plot Viewport */}
                <svg className="w-full h-full min-h-[380px]" viewBox="0 0 500 380">
                  {/* Grid floor coordinates bounding lines */}
                  <line x1={project3D(0,0,-2.2).x} y1={project3D(0,0,-2.2).y} x2={project3D(1,0,-2.2).x} y2={project3D(1,0,-2.2).y} stroke="#1e293b" strokeWidth="1" strokeDasharray="3 3" />
                  <line x1={project3D(0,0,-2.2).x} y1={project3D(0,0,-2.2).y} x2={project3D(0,1,-2.2).x} y2={project3D(0,1,-2.2).y} stroke="#1e293b" strokeWidth="1" strokeDasharray="3 3" />
                  <line x1={project3D(1,1,-2.2).x} y1={project3D(1,1,-2.2).y} x2={project3D(1,0,-2.2).x} y2={project3D(1,0,-2.2).y} stroke="#1e293b" strokeWidth="1" strokeDasharray="3 3" />
                  <line x1={project3D(1,1,-2.2).x} y1={project3D(1,1,-2.2).y} x2={project3D(0,1,-2.2).x} y2={project3D(0,1,-2.2).y} stroke="#1e293b" strokeWidth="1" strokeDasharray="3 3" />

                  {/* Grid floor grid lines */}
                  {[0.2, 0.4, 0.6, 0.8].map((v) => {
                    const p1 = project3D(v, 0, -2.2);
                    const p2 = project3D(v, 1, -2.2);
                    const p3 = project3D(0, v, -2.2);
                    const p4 = project3D(1, v, -2.2);
                    return (
                      <g key={v} className="opacity-40">
                        <line x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y} stroke="#0f172a" strokeWidth="0.8" />
                        <line x1={p3.x} y1={p3.y} x2={p4.x} y2={p4.y} stroke="#0f172a" strokeWidth="0.8" />
                      </g>
                    );
                  })}

                  {/* Z-Axis Grid Lines for Reference */}
                  {[-2, -1, 0, 1, 2].map((zVal) => {
                    const p_start = project3D(0, 0, zVal);
                    const p_end = project3D(0, 1, zVal);
                    return (
                      <g key={zVal} className="opacity-25">
                        <line x1={p_start.x} y1={p_start.y} x2={p_end.x} y2={p_end.y} stroke="#475569" strokeWidth="0.5" strokeDasharray="1 3" />
                        <text x={p_start.x - 12} y={p_start.y + 2.5} fill="#475569" fontSize="6" className="font-mono text-right">{zVal}</text>
                      </g>
                    );
                  })}

                  {/* Axis helper labels */}
                  <text x={project3D(0.5, 1.1, -2.2).x} y={project3D(0.5, 1.1, -2.2).y} fill="#475569" fontSize="8" textAnchor="middle" className="font-mono font-bold uppercase tracking-wider">Humidity</text>
                  <text x={project3D(1.1, 0.5, -2.2).x} y={project3D(1.1, 0.5, -2.2).y} fill="#475569" fontSize="8" textAnchor="middle" className="font-mono font-bold uppercase tracking-wider">Temperature</text>
                  
                  {/* Vertical Z-axis label */}
                  <g transform={`translate(${project3D(0, 0, 0).x - 30}, ${project3D(0, 0, 0).y}) rotate(-90)`}>
                    <text x="0" y="0" fill="#475569" fontSize="8" textAnchor="middle" className="font-mono font-bold uppercase tracking-wider">Logit Value (R)</text>
                  </g>

                  {/* Vertical axis line */}
                  <line x1={project3D(0,0,-2.2).x} y1={project3D(0,0,-2.2).y} x2={project3D(0,0,2.5).x} y2={project3D(0,0,2.5).y} stroke="#1e293b" strokeWidth="1" />

                  {/* BENT SURFACE 1: Class A / Sunny (Green) */}
                  {Array.from({ length: 6 }).map((_, i) => {
                    const pw1 = i * 0.2;
                    const pw2 = (i + 1) * 0.2;
                    if (i === 5) return null;
                    return Array.from({ length: 6 }).map((_, j) => {
                      const sw1 = j * 0.2;
                      const sw2 = (j + 1) * 0.2;
                      if (j === 5) return null;
                      
                      const pA = project3D(pw1, sw1, getSunnyLogit(pw1, sw1));
                      const pB = project3D(pw2, sw1, getSunnyLogit(pw2, sw1));
                      const pC = project3D(pw2, sw2, getSunnyLogit(pw2, sw2));
                      const pD = project3D(pw1, sw2, getSunnyLogit(pw1, sw2));
                      
                      return (
                        <polygon 
                          key={`sunny-${i}-${j}`}
                          points={`${pA.x},${pA.y} ${pB.x},${pB.y} ${pC.x},${pC.y} ${pD.x},${pD.y}`}
                          fill="rgba(16, 185, 129, 0.08)"
                          stroke="rgba(16, 185, 129, 0.25)"
                          strokeWidth="0.8"
                        />
                      );
                    });
                  })}

                  {/* BENT SURFACE 2: Class C / Cloudy (Purple) */}
                  {Array.from({ length: 6 }).map((_, i) => {
                    const pw1 = i * 0.2;
                    const pw2 = (i + 1) * 0.2;
                    if (i === 5) return null;
                    return Array.from({ length: 6 }).map((_, j) => {
                      const sw1 = j * 0.2;
                      const sw2 = (j + 1) * 0.2;
                      if (j === 5) return null;
                      
                      const pA = project3D(pw1, sw1, getCloudyLogit(pw1, sw1));
                      const pB = project3D(pw2, sw1, getCloudyLogit(pw2, sw1));
                      const pC = project3D(pw2, sw2, getCloudyLogit(pw2, sw2));
                      const pD = project3D(pw1, sw2, getCloudyLogit(pw1, sw2));
                      
                      return (
                        <polygon 
                          key={`cloudy-${i}-${j}`}
                          points={`${pA.x},${pA.y} ${pB.x},${pB.y} ${pC.x},${pC.y} ${pD.x},${pD.y}`}
                          fill="rgba(168, 85, 247, 0.06)"
                          stroke="rgba(168, 85, 247, 0.2)"
                          strokeWidth="0.8"
                        />
                      );
                    });
                  })}

                  {/* BENT SURFACE 3: Class B / Rainy (Red) */}
                  {Array.from({ length: 6 }).map((_, i) => {
                    const pw1 = i * 0.2;
                    const pw2 = (i + 1) * 0.2;
                    if (i === 5) return null;
                    return Array.from({ length: 6 }).map((_, j) => {
                      const sw1 = j * 0.2;
                      const sw2 = (j + 1) * 0.2;
                      if (j === 5) return null;
                      
                      const pA = project3D(pw1, sw1, getRainyLogit(pw1, sw1));
                      const pB = project3D(pw2, sw1, getRainyLogit(pw2, sw1));
                      const pC = project3D(pw2, sw2, getRainyLogit(pw2, sw2));
                      const pD = project3D(pw1, sw2, getRainyLogit(pw1, sw2));
                      
                      return (
                        <polygon 
                          key={`rainy-${i}-${j}`}
                          points={`${pA.x},${pA.y} ${pB.x},${pB.y} ${pC.x},${pC.y} ${pD.x},${pD.y}`}
                          fill="rgba(239, 68, 68, 0.06)"
                          stroke="rgba(239, 68, 68, 0.2)"
                          strokeWidth="0.8"
                        />
                      );
                    });
                  })}

                  {/* SCATTERED PIN POINTS */}
                  {(() => {
                    const scatterPoints = [
                      { pw: 0.3, sw: 0.7 },
                      { pw: 0.4, sw: 0.8 },
                      { pw: 0.25, sw: 0.6 },
                      { pw: 0.8, sw: 0.3 },
                      { pw: 0.9, sw: 0.2 },
                      { pw: 0.75, sw: 0.4 },
                      { pw: 0.5, sw: 0.5 },
                      { pw: 0.6, sw: 0.6 },
                      { pw: 0.55, sw: 0.45 },
                      { pw: 0.35, sw: 0.35 },
                      { pw: 0.7, sw: 0.7 },
                      { pw: 0.45, sw: 0.65 }
                    ];

                    return scatterPoints.map((pt, idx) => {
                      const sL = getSunnyLogit(pt.pw, pt.sw);
                      const rL = getRainyLogit(pt.pw, pt.sw);
                      const cL = getCloudyLogit(pt.pw, pt.sw);
                      const maxL = Math.max(sL, rL, cL);
                      
                      let color = "#10b981";
                      if (maxL === rL) color = "#ef4444";
                      if (maxL === cL) color = "#a855f7";
                      
                      const floorPt = project3D(pt.pw, pt.sw, -2.2);
                      const surfPt = project3D(pt.pw, pt.sw, maxL);
                      
                      return (
                        <g key={idx}>
                          {/* Vertical pin line */}
                          <line 
                            x1={floorPt.x} 
                            y1={floorPt.y} 
                            x2={surfPt.x} 
                            y2={surfPt.y} 
                            stroke={color} 
                            strokeWidth="1" 
                            strokeDasharray="2 2" 
                            opacity="0.6"
                          />
                          {/* Floor dot base */}
                          <circle cx={floorPt.x} cy={floorPt.y} r="1.5" fill="#334155" />
                          {/* Surface dot */}
                          <circle cx={surfPt.x} cy={surfPt.y} r="3" fill={color} stroke="#ffffff" strokeWidth="0.8" className="cursor-pointer" />
                        </g>
                      );
                    });
                  })()}

                  {/* ACTIVE LIVE CURSOR DOT (BASED ON TEMPERATURE/HUMIDITY SLIDERS) */}
                  {(() => {
                    const curS = getSunnyLogit(boundaryTemperature, boundaryHumidity);
                    const curR = getRainyLogit(boundaryTemperature, boundaryHumidity);
                    const curC = getCloudyLogit(boundaryTemperature, boundaryHumidity);
                    
                    const floorP = project3D(boundaryTemperature, boundaryHumidity, -2.2);
                    
                    const pSunny = project3D(boundaryTemperature, boundaryHumidity, curS);
                    const pRainy = project3D(boundaryTemperature, boundaryHumidity, curR);
                    const pCloudy = project3D(boundaryTemperature, boundaryHumidity, curC);

                    return (
                      <g>
                        {/* Grid floor tracking circle */}
                        <circle cx={floorP.x} cy={floorP.y} r="4.5" fill="none" stroke="#fff" strokeWidth="1" strokeDasharray="2 1" className="animate-spin" style={{ animationDuration: '8s' }} />
                        <line x1={floorP.x} y1={floorP.y} x2={floorP.x} y2={floorP.y - 100} stroke="rgba(255,255,255,0.15)" strokeWidth="0.8" strokeDasharray="2 2" />

                        {/* Sunny active node marker */}
                        <line x1={floorP.x} y1={floorP.y} x2={pSunny.x} y2={pSunny.y} stroke="#10b981" strokeWidth="1.2" strokeDasharray="1 1" opacity="0.8" />
                        <circle cx={pSunny.x} cy={pSunny.y} r="5.5" fill="#10b981" fillOpacity="0.8" stroke="#fff" strokeWidth="1.2" className="animate-pulse" />

                        {/* Rainy active node marker */}
                        <line x1={floorP.x} y1={floorP.y} x2={pRainy.x} y2={pRainy.y} stroke="#ef4444" strokeWidth="1.2" strokeDasharray="1 1" opacity="0.8" />
                        <circle cx={pRainy.x} cy={pRainy.y} r="5.5" fill="#ef4444" fillOpacity="0.8" stroke="#fff" strokeWidth="1.2" className="animate-pulse" />

                        {/* Cloudy active node marker */}
                        <line x1={floorP.x} y1={floorP.y} x2={pCloudy.x} y2={pCloudy.y} stroke="#a855f7" strokeWidth="1.2" strokeDasharray="1 1" opacity="0.8" />
                        <circle cx={pCloudy.x} cy={pCloudy.y} r="5.5" fill="#a855f7" fillOpacity="0.8" stroke="#fff" strokeWidth="1.2" className="animate-pulse" />
                      </g>
                    );
                  })()}
                </svg>

                {/* Sub title interpretation bulb card */}
                <div className="mt-2 w-full bg-[#050a18]/60 border border-[#141d35]/50 p-3 rounded-xl flex items-center gap-2 text-xs">
                  <span className="p-1.5 bg-yellow-950/40 text-yellow-500 rounded-lg shrink-0 border border-yellow-800/30">
                    <Info size={13} />
                  </span>
                  <p className="text-[11px] text-slate-400">
                    <strong>Drag the sliders</strong> in the upper right to move the tracking coordinate floor circle. Watch the green, red, and purple active response markers slide along the bent surfaces to see which class takes dominance!
                  </p>
                </div>
              </div>

              {/* Right Side: Step-by-Step Softmax Calculations */}
              {(() => {
                const zS = isNaN(getSunnyLogit(boundaryTemperature, boundaryHumidity)) ? 0 : getSunnyLogit(boundaryTemperature, boundaryHumidity);
                const zR = isNaN(getRainyLogit(boundaryTemperature, boundaryHumidity)) ? 0 : getRainyLogit(boundaryTemperature, boundaryHumidity);
                const zC = isNaN(getCloudyLogit(boundaryTemperature, boundaryHumidity)) ? 0 : getCloudyLogit(boundaryTemperature, boundaryHumidity);

                const expS = Math.exp(zS);
                const expR = Math.exp(zR);
                const expC = Math.exp(zC);
                const expSum = (expS + expR + expC) || 1;

                const pS = isNaN(expS / expSum) ? 0.33 : expS / expSum;
                const pR = isNaN(expR / expSum) ? 0.33 : expR / expSum;
                const pC = isNaN(expC / expSum) ? 0.33 : expC / expSum;

                let predictedClass = "CLASS A / SUNNY";
                let predictedColor = "text-[#10b981] bg-[#10b981]/10 border-[#10b981]/20";
                let winningProb = pS;
                if (zR > zS && zR > zC) {
                  predictedClass = "CLASS B / RAINY";
                  predictedColor = "text-[#ef4444] bg-[#ef4444]/10 border-[#ef4444]/20";
                  winningProb = pR;
                } else if (zC > zS && zC > zR) {
                  predictedClass = "CLASS C / CLOUDY";
                  predictedColor = "text-[#a855f7] bg-[#a855f7]/10 border-[#a855f7]/20";
                  winningProb = pC;
                }

                return (
                  <div className="lg:col-span-5 flex flex-col gap-4">
                    {/* Logits (Raw scores) Card */}
                    <div className="bg-[#030611] border border-[#141d35]/60 rounded-2xl p-4 text-left">
                      <span className="text-[9px] font-mono font-bold text-slate-500 uppercase tracking-widest block mb-2">Step 1) LOGITS (Raw scores)</span>
                      <div className="grid grid-cols-3 gap-2">
                        <div className="bg-[#10b981]/5 border border-[#10b981]/10 rounded-xl p-2.5 text-center">
                          <span className="text-[10px] font-mono font-bold text-[#10b981] block">Z_sunny</span>
                          <span className="text-sm font-black text-white font-mono mt-0.5 block">{zS.toFixed(2)}</span>
                        </div>
                        <div className="bg-[#ef4444]/5 border border-[#ef4444]/10 rounded-xl p-2.5 text-center">
                          <span className="text-[10px] font-mono font-bold text-[#ef4444] block">Z_rainy</span>
                          <span className="text-sm font-black text-white font-mono mt-0.5 block">{zR.toFixed(2)}</span>
                        </div>
                        <div className="bg-[#a855f7]/5 border border-[#a855f7]/10 rounded-xl p-2.5 text-center">
                          <span className="text-[10px] font-mono font-bold text-[#a855f7] block">Z_cloudy</span>
                          <span className="text-sm font-black text-white font-mono mt-0.5 block">{zC.toFixed(2)}</span>
                        </div>
                      </div>
                    </div>

                    {/* Exponentiation Card */}
                    <div className="bg-[#030611] border border-[#141d35]/60 rounded-2xl p-4 text-left space-y-3">
                      <span className="text-[9px] font-mono font-bold text-slate-500 uppercase tracking-widest block">Step 2) SOFTMAX EXΡΟΝΕΝΤS</span>
                      <div className="space-y-1.5 font-mono text-xs text-slate-400">
                        <div className="flex justify-between">
                          <span>e^(Z_sunny) = e^({zS.toFixed(2)})</span>
                          <span className="text-white font-bold">{expS.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>e^(Z_rainy) = e^({zR.toFixed(2)})</span>
                          <span className="text-white font-bold">{expR.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>e^(Z_cloudy) = e^({zC.toFixed(2)})</span>
                          <span className="text-white font-bold">{expC.toFixed(2)}</span>
                        </div>
                        <div className="h-px bg-slate-800/60 my-2" />
                        <div className="flex justify-between text-white font-black text-xs">
                          <span className="text-slate-400 uppercase text-[10px]">Total Sum (Σ e^z)</span>
                          <span className="text-purple-400">{expSum.toFixed(2)}</span>
                        </div>
                      </div>
                    </div>

                    {/* Probability Formula and Steps */}
                    <div className="bg-[#030611] border border-[#141d35]/60 rounded-2xl p-4 text-left space-y-2">
                      <span className="text-[9px] font-mono font-bold text-slate-500 uppercase tracking-widest block">Step 3 & 4) PROBABILITY DIVISION</span>
                      <div className="bg-[#050a18] border border-slate-900 rounded-xl p-2.5 text-center my-2">
                        <span className="text-[10px] font-mono text-slate-500 block">Formula</span>
                        <span className="text-xs font-mono font-bold text-purple-400">P_i = e^(Z_i) / Σ e^(Z_j)</span>
                      </div>
                      <div className="space-y-1 text-[11px] font-mono text-slate-400">
                        <div className="flex justify-between">
                          <span>P_sunny = {expS.toFixed(2)} / {expSum.toFixed(2)}</span>
                          <span className="text-[#10b981] font-black">{(pS * 100).toFixed(1)}%</span>
                        </div>
                        <div className="flex justify-between">
                          <span>P_rainy = {expR.toFixed(2)} / {expSum.toFixed(2)}</span>
                          <span className="text-[#ef4444] font-black">{(pR * 100).toFixed(1)}%</span>
                        </div>
                        <div className="flex justify-between">
                          <span>P_cloudy = {expC.toFixed(2)} / {expSum.toFixed(2)}</span>
                          <span className="text-[#a855f7] font-black">{(pC * 100).toFixed(1)}%</span>
                        </div>
                      </div>
                    </div>

                    {/* Interactive Bar Chart Summary (Step 5) */}
                    <div className="bg-[#030611] border border-[#141d35]/60 rounded-2xl p-4 text-left">
                      <span className="text-[9px] font-mono font-bold text-slate-500 uppercase tracking-widest block mb-4">Step 5) PROBABILITIES BAR SUMMARY</span>
                      
                      <div className="flex justify-around items-end h-28 border-b border-slate-800 pb-2">
                        {/* Sunny bar */}
                        <div className="flex flex-col items-center gap-1 w-12">
                          <span className="text-[9px] font-mono font-bold text-slate-400">{(pS * 100).toFixed(0)}%</span>
                          <div 
                            className="w-8 rounded-t bg-gradient-to-t from-emerald-600 to-[#10b981] transition-all duration-300 shadow-[0_0_10px_rgba(16,185,129,0.3)]"
                            style={{ height: `${pS * 80}px` }}
                          />
                          <span className="text-[9px] font-mono font-extrabold text-[#10b981] uppercase mt-1">Class A</span>
                        </div>

                        {/* Rainy bar */}
                        <div className="flex flex-col items-center gap-1 w-12">
                          <span className="text-[9px] font-mono font-bold text-slate-400">{(pR * 100).toFixed(0)}%</span>
                          <div 
                            className="w-8 rounded-t bg-gradient-to-t from-rose-600 to-[#ef4444] transition-all duration-300 shadow-[0_0_10px_rgba(239,68,68,0.3)]"
                            style={{ height: `${pR * 80}px` }}
                          />
                          <span className="text-[9px] font-mono font-extrabold text-[#ef4444] uppercase mt-1">Class B</span>
                        </div>

                        {/* Cloudy bar */}
                        <div className="flex flex-col items-center gap-1 w-12">
                          <span className="text-[9px] font-mono font-bold text-slate-400">{(pC * 100).toFixed(0)}%</span>
                          <div 
                            className="w-8 rounded-t bg-gradient-to-t from-purple-700 to-[#a855f7] transition-all duration-300 shadow-[0_0_10px_rgba(168,85,247,0.3)]"
                            style={{ height: `${pC * 80}px` }}
                          />
                          <span className="text-[9px] font-mono font-extrabold text-[#a855f7] uppercase mt-1">Class C</span>
                        </div>
                      </div>
                    </div>

                    {/* Final Winner Summary Card */}
                    <div className={`border p-4 rounded-2xl text-center shadow-lg transition-all ${predictedColor}`}>
                      <span className="text-[10px] font-mono font-black uppercase tracking-wider block">6) FINAL CLASSIFICATION DECISION</span>
                      <h3 className="text-xl font-black font-display tracking-wide my-1 flex items-center justify-center gap-2">
                        {predictedClass.includes("SUNNY") && <Sun size={20} className="animate-spin" style={{ animationDuration: '12s' }} />}
                        {predictedClass.includes("RAINY") && <CloudRain size={20} className="animate-bounce" />}
                        {predictedClass.includes("CLOUDY") && <Cloud size={20} className="animate-pulse" />}
                        PREDICTION: {predictedClass}
                      </h3>
                      <p className="text-xs opacity-80 leading-normal">
                        Dominant logit response indicates {predictedClass} with a confidence probability of <strong>{(winningProb * 100).toFixed(1)}%</strong>!
                      </p>
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      )}

      {/* Weather Prediction Panel */}
      {activeSubTab === 'weather' && (
        <div className="flex flex-col gap-6 text-left">
          {/* Main Predictor Panel */}
          <div className="bg-[#060a18]/70 border border-[#141d35]/75 rounded-2xl p-6 shadow-xl relative overflow-hidden backdrop-blur-md">
            <div className="absolute top-0 right-0 w-80 h-80 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />
            
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-[#141d35]/40 pb-4 mb-6 gap-4">
              <div className="space-y-1.5">
                <span className="text-[10px] font-mono font-bold text-amber-400 uppercase tracking-widest block">Lecture Figure 3.1</span>
                <h2 className="text-xl font-black text-white uppercase tracking-tight font-display flex items-center gap-2">
                  {softplus > 1.4 ? (
                    <Sun className="text-amber-400 animate-spin" style={{ animationDuration: '15s' }} size={20} />
                  ) : softplus < 0.8 ? (
                    <CloudRain className="text-sky-400 animate-bounce" size={20} />
                  ) : (
                    <Cloud className="text-slate-400 animate-pulse" size={20} />
                  )}
                  NEURAL NETWORK EXAMPLE: WEATHER PREDICTOR
                </h2>
                <p className="text-xs text-slate-400 max-w-3xl leading-relaxed">
                  Predict the weather condition under variable environmental inputs. <strong>Temperature</strong> and <strong>Humidity</strong> act as weights and biases that dynamically modulate the activation thresholds of hidden nodes.
                </p>
              </div>

              {/* Sliders in header for rapid tuning */}
              <div className="flex flex-wrap items-center gap-4 bg-[#030611] border border-[#141d35]/60 rounded-xl p-3">
                <div className="space-y-1">
                  <div className="flex justify-between text-[10px] font-mono font-bold">
                    <span className="text-slate-400">TEMPERATURE (x1)</span>
                    <span className="text-amber-400">{weatherTemperature.toFixed(2)}</span>
                  </div>
                  <input 
                    type="range" 
                    min="0" 
                    max="1" 
                    step="0.01" 
                    value={weatherTemperature} 
                    onChange={(e) => setWeatherTemperature(parseFloat(e.target.value))}
                    className="w-28 h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
                  />
                </div>
                
                <div className="space-y-1">
                  <div className="flex justify-between text-[10px] font-mono font-bold">
                    <span className="text-slate-400">HUMIDITY (x2)</span>
                    <span className="text-amber-400">{weatherHumidity.toFixed(2)}</span>
                  </div>
                  <input 
                    type="range" 
                    min="0" 
                    max="1" 
                    step="0.01" 
                    value={weatherHumidity} 
                    onChange={(e) => setWeatherHumidity(parseFloat(e.target.value))}
                    className="w-28 h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
                  />
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between text-[10px] font-mono font-bold">
                    <span className="text-slate-400">DOSAGE (START)</span>
                    <span className="text-amber-400">{dosage.toFixed(2)}</span>
                  </div>
                  <input 
                    type="range" 
                    min="0" 
                    max="1" 
                    step="0.05" 
                    value={dosage} 
                    onChange={(e) => setDosage(parseFloat(e.target.value))}
                    className="w-24 h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
                  />
                </div>

                {/* Weather Badge */}
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-950/60 border border-slate-850">
                  <div className="flex items-center justify-center">
                    {softplus > 1.4 ? (
                      <Sun className="text-amber-400 animate-spin" style={{ animationDuration: '20s' }} size={18} />
                    ) : softplus < 0.8 ? (
                      <CloudRain className="text-sky-400 animate-bounce" size={18} />
                    ) : (
                      <Cloud className="text-slate-400" size={18} />
                    )}
                  </div>
                  <div className="flex flex-col text-left">
                    <span className="text-[8px] font-mono font-bold text-slate-500 uppercase tracking-widest leading-none">PREDICTION</span>
                    <span className={`text-[10px] font-black tracking-wider leading-none uppercase ${
                      softplus > 1.4 ? 'text-amber-400' : softplus < 0.8 ? 'text-sky-400' : 'text-slate-400'
                    }`}>
                      {softplus > 1.4 ? 'Sunny' : softplus < 0.8 ? 'Rainy' : 'Cloudy'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Left: SVG Diagram Grid */}
              <div className="lg:col-span-8 bg-[#030611]/80 border border-[#141d35]/40 rounded-2xl p-4 flex flex-col items-center justify-center relative min-h-[420px]">
                
                {/* Flowchart Schematic in Vector */}
                <svg className="w-full h-full min-h-[380px]" viewBox="0 0 650 380">
                  
                  {/* Connection lines back-glow */}
                  <path d={`M 110 80 L 160 80 L 210 125`} stroke="rgba(245,158,11,0.15)" strokeWidth="6" fill="none" />
                  <path d={`M 110 240 L 160 240 L 210 195`} stroke="rgba(245,158,11,0.15)" strokeWidth="6" fill="none" />
                  
                  {/* Flow pathway from START block */}
                  <path d={`M 255 160 C 290 160, 310 90, 335 90`} stroke="rgba(56,189,248,0.25)" strokeWidth="4" fill="none" />
                  <path d={`M 255 160 C 290 160, 310 230, 335 230`} stroke="rgba(245,158,11,0.25)" strokeWidth="4" fill="none" />

                  {/* Pathways from squiggle activation to sum */}
                  <path d={`M 445 90 C 475 90, 485 160, 500 160`} stroke="rgba(56,189,248,0.25)" strokeWidth="4" fill="none" />
                  <path d={`M 445 230 C 475 230, 485 160, 500 160`} stroke="rgba(245,158,11,0.25)" strokeWidth="4" fill="none" />

                  {/* Path to Softplus and Output */}
                  <line x1="535" y1="160" x2="560" y2="160" stroke="#10b981" strokeWidth="3" />
                  <line x1="600" y1="160" x2="615" y2="160" stroke="#10b981" strokeWidth="3" />

                  {/* Standard strokes for lines */}
                  {/* Inputs weight connectives */}
                  <line x1="110" y1="80" x2="160" y2="80" stroke="#1e293b" strokeWidth="2" />
                  <line x1="160" y1="80" x2="210" y2="125" stroke="#1e293b" strokeWidth="2" />
                  
                  <line x1="110" y1="240" x2="160" y2="240" stroke="#1e293b" strokeWidth="2" />
                  <line x1="160" y1="240" x2="210" y2="195" stroke="#1e293b" strokeWidth="2" />

                  {/* 1. INPUT FEATURES BOX: Temperature */}
                  <g transform="translate(15, 45)">
                    <rect x="0" y="0" width="95" height="70" rx="10" fill="#030611" stroke="#334155" strokeWidth="1.5" />
                    <text x="47" y="18" fill="#94a3b8" fontSize="8" fontWeight="bold" textAnchor="middle" className="font-mono uppercase tracking-wide">Temperature</text>
                    <text x="47" y="28" fill="#475569" fontSize="7" className="font-mono" textAnchor="middle">(x1)</text>
                    <text x="47" y="48" fill="#fff" fontSize="15" fontWeight="black" textAnchor="middle" className="font-mono">{weatherTemperature.toFixed(2)}</text>
                    <text x="47" y="58" fill="#f59e0b" fontSize="7" fontWeight="bold" textAnchor="middle" className="font-mono">({weatherTemperature > 0.7 ? 'HIGH' : (weatherTemperature < 0.3 ? 'LOW' : 'MID')})</text>
                  </g>

                  {/* 2. INPUT FEATURES BOX: Humidity */}
                  <g transform="translate(15, 205)">
                    <rect x="0" y="0" width="95" height="70" rx="10" fill="#030611" stroke="#334155" strokeWidth="1.5" />
                    <text x="47" y="18" fill="#94a3b8" fontSize="8" fontWeight="bold" textAnchor="middle" className="font-mono uppercase tracking-wide">Humidity</text>
                    <text x="47" y="28" fill="#475569" fontSize="7" className="font-mono" textAnchor="middle">(x2)</text>
                    <text x="47" y="48" fill="#fff" fontSize="15" fontWeight="black" textAnchor="middle" className="font-mono">{weatherHumidity.toFixed(2)}</text>
                    <text x="47" y="58" fill="#0284c7" fontSize="7" fontWeight="bold" textAnchor="middle" className="font-mono">({weatherHumidity > 0.7 ? 'HIGH' : (weatherHumidity < 0.3 ? 'LOW' : 'MID')})</text>
                  </g>

                  {/* Weight multiplier bubbles */}
                  {/* Temp weight multiplier box */}
                  <g transform="translate(145, 115)">
                    <rect x="0" y="0" width="65" height="20" rx="4" fill="#060a18" stroke="#10b981" strokeWidth="1" />
                    <text x="32" y="13" fill="#10b981" fontSize="8" fontWeight="bold" textAnchor="middle" className="font-mono">w1 = -2.50</text>
                  </g>
                  
                  {/* Humid weight multiplier box */}
                  <g transform="translate(145, 185)">
                    <rect x="0" y="0" width="65" height="20" rx="4" fill="#060a18" stroke="#ef4444" strokeWidth="1" />
                    <text x="32" y="13" fill="#ef4444" fontSize="8" fontWeight="bold" textAnchor="middle" className="font-mono">w2 = -2.50</text>
                  </g>

                  {/* START BLOCK: Dosage */}
                  <g transform="translate(200, 125)">
                    <rect x="0" y="0" width="75" height="70" rx="10" fill="#030611" stroke="#38bdf8" strokeWidth="2" className="shadow-lg" />
                    <text x="37" y="15" fill="#38bdf8" fontSize="8" fontWeight="bold" textAnchor="middle" className="font-mono uppercase tracking-widest">START</text>
                    <text x="37" y="32" fill="#94a3b8" fontSize="9" textAnchor="middle" className="font-mono">Dosage</text>
                    <text x="37" y="44" fill="#475569" fontSize="7" textAnchor="middle" className="font-mono">(Lowest Dosage)</text>
                    <text x="37" y="60" fill="#fff" fontSize="13" fontWeight="black" textAnchor="middle" className="font-mono">= {dosage.toFixed(2)}</text>
                  </g>

                  {/* UPPER ACTIVE STREAM PATH BLOCK */}
                  <g transform="translate(325, 40)">
                    {/* Upper Multiplier box */}
                    <rect x="0" y="5" width="40" height="20" rx="4" fill="#060a18" stroke="#475569" strokeWidth="1" />
                    <text x="20" y="17" fill="#cbd5e1" fontSize="8" textAnchor="middle" className="font-mono">x -34.40</text>
                    
                    {/* Connecting Line */}
                    <line x1="40" y1="15" x2="55" y2="15" stroke="#1e293b" strokeWidth="1.5" />
                    <text x="47" y="11" fill="#475569" fontSize="7" className="font-mono" textAnchor="middle">{prodTemp >= 0 ? '+' : ''}{prodTemp.toFixed(2)}</text>

                    {/* Upper Bias sum node */}
                    <rect x="55" y="0" width="42" height="30" rx="5" fill="#030611" stroke="#0284c7" strokeWidth="1.5" />
                    <text x="76" y="12" fill="#0284c7" fontSize="7" fontWeight="bold" textAnchor="middle" className="font-mono">BIAS (b)</text>
                    <text x="76" y="24" fill="#fff" fontSize="10" fontWeight="bold" textAnchor="middle" className="font-mono">{node1Bias >= 0 ? '+' : ''}{node1Bias.toFixed(2)}</text>

                    {/* Connecting Line */}
                    <line x1="97" y1="15" x2="103" y2="15" stroke="#1e293b" strokeWidth="1.5" />

                    {/* Squiggle Activation Card (Sigmoid 1) */}
                    <g>
                      <rect x="103" y="-12" width="60" height="54" rx="6" fill="#030611" stroke="#0284c7" strokeWidth="1.5" />
                      
                      {/* Grid Axes */}
                      <line x1="103" y1="15" x2="163" y2="15" stroke="#141d35" strokeWidth="0.8" strokeDasharray="1 2" />
                      <line x1="133" y1="-12" x2="133" y2="42" stroke="#141d35" strokeWidth="0.8" strokeDasharray="1 2" />

                      {/* Plotted Sigmoid curve */}
                      {(() => {
                        const points = [];
                        for (let i = 0; i <= 10; i++) {
                          const t = i / 10;
                          const zVal = -6 + t * 12;
                          const act = 1 / (1 + Math.exp(-zVal));
                          const px = 103 + t * 60;
                          const py = 38 - act * 46;
                          points.push(`${px},${py}`);
                        }
                        return <polyline points={points.join(' ')} fill="none" stroke="#0284c7" strokeWidth="1.5" strokeLinecap="round" opacity="0.85" />;
                      })()}

                      {/* Dynamic Input Value Marker */}
                      {(() => {
                        const clampedZ = Math.max(-6, Math.min(6, node1PreAct));
                        const dotT = (clampedZ - (-6)) / 12;
                        const dotX = 103 + dotT * 60;
                        const dotY = 38 - squiggle1 * 46;
                        return (
                          <g>
                            <line x1={dotX} y1="-12" x2={dotX} y2="42" stroke="rgba(2, 132, 199, 0.45)" strokeWidth="0.8" strokeDasharray="1 1" />
                            <line x1="103" y1={dotY} x2="163" y2={dotY} stroke="rgba(2, 132, 199, 0.45)" strokeWidth="0.8" strokeDasharray="1 1" />
                            <circle cx={dotX} cy={dotY} r="4" fill="#0284c7" fillOpacity="0.4" className="animate-pulse" />
                            <circle cx={dotX} cy={dotY} r="2.2" fill="#0284c7" stroke="#fff" strokeWidth="0.8" />
                          </g>
                        );
                      })()}

                      {/* Mini Labels */}
                      <text x="107" y="-3" fill="#0284c7" fontSize="5" fontWeight="bold" className="font-mono">SIGMOID</text>
                      <text x="159" y="-3" fill="#cbd5e1" fontSize="5.5" fontWeight="bold" textAnchor="end" className="font-mono">s1: {squiggle1.toFixed(2)}</text>
                      <text x="107" y="38" fill="#64748b" fontSize="4.5" className="font-mono">z1: {node1PreAct.toFixed(1)}</text>
                    </g>

                    {/* Connecting Line */}
                    <line x1="163" y1="15" x2="168" y2="15" stroke="#1e293b" strokeWidth="1.5" />

                    {/* Output weight */}
                    <rect x="168" y="5" width="32" height="20" rx="4" fill="#060a18" stroke="#475569" strokeWidth="1" />
                    <text x="184" y="17" fill="#cbd5e1" fontSize="8" textAnchor="middle" className="font-mono">x -1.30</text>
                    
                    {/* Real-time value note bubble */}
                    <text x="184" y="34" fill="#ef4444" fontSize="7.5" fontWeight="bold" textAnchor="middle" className="font-mono">{node1Val.toFixed(2)}</text>
                  </g>

                  {/* LOWER ACTIVE STREAM PATH BLOCK */}
                  <g transform="translate(325, 180)">
                    {/* Lower Multiplier box */}
                    <rect x="0" y="25" width="40" height="20" rx="4" fill="#060a18" stroke="#475569" strokeWidth="1" />
                    <text x="20" y="37" fill="#cbd5e1" fontSize="8" textAnchor="middle" className="font-mono">x -2.52</text>
                    
                    {/* Connecting Line */}
                    <line x1="40" y1="35" x2="55" y2="35" stroke="#1e293b" strokeWidth="1.5" />
                    <text x="47" y="31" fill="#475569" fontSize="7" className="font-mono" textAnchor="middle">{prodHumid >= 0 ? '+' : ''}{prodHumid.toFixed(2)}</text>

                    {/* Lower Bias sum node */}
                    <rect x="55" y="20" width="42" height="30" rx="5" fill="#030611" stroke="#f59e0b" strokeWidth="1.5" />
                    <text x="76" y="32" fill="#f59e0b" fontSize="7" fontWeight="bold" textAnchor="middle" className="font-mono">BIAS (b)</text>
                    <text x="76" y="44" fill="#fff" fontSize="10" fontWeight="bold" textAnchor="middle" className="font-mono">{node2Bias >= 0 ? '+' : ''}{node2Bias.toFixed(2)}</text>

                    {/* Connecting Line */}
                    <line x1="97" y1="35" x2="103" y2="35" stroke="#1e293b" strokeWidth="1.5" />

                    {/* Squiggle Activation Card (Sigmoid 2) */}
                    <g>
                      <rect x="103" y="8" width="60" height="54" rx="6" fill="#030611" stroke="#f59e0b" strokeWidth="1.5" />
                      
                      {/* Grid Axes */}
                      <line x1="103" y1="35" x2="163" y2="35" stroke="#141d35" strokeWidth="0.8" strokeDasharray="1 2" />
                      <line x1="133" y1="8" x2="133" y2="62" stroke="#141d35" strokeWidth="0.8" strokeDasharray="1 2" />

                      {/* Plotted Sigmoid curve */}
                      {(() => {
                        const points = [];
                        for (let i = 0; i <= 10; i++) {
                          const t = i / 10;
                          const zVal = -6 + t * 12;
                          const act = 1 / (1 + Math.exp(-zVal));
                          const px = 103 + t * 60;
                          const py = 58 - act * 46;
                          points.push(`${px},${py}`);
                        }
                        return <polyline points={points.join(' ')} fill="none" stroke="#f59e0b" strokeWidth="1.5" strokeLinecap="round" opacity="0.85" />;
                      })()}

                      {/* Dynamic Input Value Marker */}
                      {(() => {
                        const clampedZ2 = Math.max(-6, Math.min(6, node2PreAct));
                        const dotT2 = (clampedZ2 - (-6)) / 12;
                        const dotX2 = 103 + dotT2 * 60;
                        const dotY2 = 58 - squiggle2 * 46;
                        return (
                          <g>
                            <line x1={dotX2} y1="8" x2={dotX2} y2="62" stroke="rgba(245, 158, 11, 0.45)" strokeWidth="0.8" strokeDasharray="1 1" />
                            <line x1="103" y1={dotY2} x2="163" y2={dotY2} stroke="rgba(245, 158, 11, 0.45)" strokeWidth="0.8" strokeDasharray="1 1" />
                            <circle cx={dotX2} cy={dotY2} r="4" fill="#f59e0b" fillOpacity="0.4" className="animate-pulse" />
                            <circle cx={dotX2} cy={dotY2} r="2.2" fill="#f59e0b" stroke="#fff" strokeWidth="0.8" />
                          </g>
                        );
                      })()}

                      {/* Mini Labels */}
                      <text x="107" y="17" fill="#f59e0b" fontSize="5" fontWeight="bold" className="font-mono">SIGMOID</text>
                      <text x="159" y="17" fill="#cbd5e1" fontSize="5.5" fontWeight="bold" textAnchor="end" className="font-mono">s2: {squiggle2.toFixed(2)}</text>
                      <text x="107" y="58" fill="#64748b" fontSize="4.5" className="font-mono">z2: {node2PreAct.toFixed(1)}</text>
                    </g>

                    {/* Connecting Line */}
                    <line x1="163" y1="35" x2="168" y2="35" stroke="#1e293b" strokeWidth="1.5" />

                    {/* Output weight */}
                    <rect x="168" y="25" width="32" height="20" rx="4" fill="#060a18" stroke="#475569" strokeWidth="1" />
                    <text x="184" y="37" fill="#cbd5e1" fontSize="8" textAnchor="middle" className="font-mono">x 2.28</text>

                    {/* Real-time value note bubble */}
                    <text x="184" y="17" fill="#10b981" fontSize="7.5" fontWeight="bold" textAnchor="middle" className="font-mono">+{node2Val.toFixed(2)}</text>
                  </g>

                  {/* SUMMING JUNCTION: Σ */}
                  <g transform="translate(500, 135)">
                    <circle cx="25" cy="25" r="22" fill="#a855f7" fillOpacity="0.1" stroke="#a855f7" strokeWidth="2.5" />
                    <text x="25" y="32" fill="#fff" fontSize="22" fontWeight="black" textAnchor="middle">Σ</text>
                    
                    {/* Offset line and tooltip text */}
                    <text x="25" y="-12" fill="#a855f7" fontSize="8" fontWeight="black" textAnchor="middle" className="font-mono">+ bias (b)</text>
                    <text x="25" y="-3" fill="#fff" fontSize="8" fontWeight="bold" textAnchor="middle" className="font-mono">+0.10</text>
                    
                    {/* Real-time sum result */}
                    <text x="25" y="60" fill="#a855f7" fontSize="9" fontWeight="black" textAnchor="middle" className="font-mono">= {combinedSum.toFixed(2)}</text>
                  </g>

                  {/* SOFTPLUS (Activation) */}
                  <g transform="translate(565, 125)">
                    <rect x="0" y="0" width="60" height="54" rx="6" fill="#030611" stroke="#10b981" strokeWidth="1.5" />
                    
                    {/* Grid Axes */}
                    <line x1="0" y1="27" x2="60" y2="27" stroke="#141d35" strokeWidth="0.8" strokeDasharray="1 2" />
                    <line x1="30" y1="0" x2="30" y2="54" stroke="#141d35" strokeWidth="0.8" strokeDasharray="1 2" />

                    {/* Plotted Softplus curve */}
                    {(() => {
                      const points = [];
                      for (let i = 0; i <= 10; i++) {
                        const t = i / 10;
                        const zVal = -4 + t * 8;
                        const act = Math.log(1 + Math.exp(zVal));
                        const px = t * 60;
                        const py = 50 - (Math.min(4, act) / 4) * 40;
                        points.push(`${px},${py}`);
                      }
                      return <polyline points={points.join(' ')} fill="none" stroke="#10b981" strokeWidth="1.5" strokeLinecap="round" opacity="0.85" />;
                    })()}

                    {/* Dynamic Input Value Marker */}
                    {(() => {
                      const clampedSum = Math.max(-4, Math.min(4, combinedSum));
                      const dotT3 = (clampedSum - (-4)) / 8;
                      const dotX3 = dotT3 * 60;
                      const dotY3 = 50 - (Math.min(4, softplus) / 4) * 40;
                      return (
                        <g>
                          <line x1={dotX3} y1="0" x2={dotX3} y2="54" stroke="rgba(16, 185, 129, 0.45)" strokeWidth="0.8" strokeDasharray="1 1" />
                          <line x1="0" y1={dotY3} x2="60" y2={dotY3} stroke="rgba(16, 185, 129, 0.45)" strokeWidth="0.8" strokeDasharray="1 1" />
                          <circle cx={dotX3} cy={dotY3} r="4" fill="#10b981" fillOpacity="0.4" className="animate-pulse" />
                          <circle cx={dotX3} cy={dotY3} r="2.2" fill="#10b981" stroke="#fff" strokeWidth="0.8" />
                        </g>
                      );
                    })()}

                    {/* Mini Labels */}
                    <text x="4" y="8" fill="#10b981" fontSize="4.5" fontWeight="bold" className="font-mono">SOFTPLUS</text>
                    <text x="56" y="8" fill="#cbd5e1" fontSize="5" fontWeight="bold" textAnchor="end" className="font-mono">out: {softplus.toFixed(2)}</text>
                    <text x="4" y="50" fill="#64748b" fontSize="4" className="font-mono">sum: {combinedSum.toFixed(2)}</text>
                  </g>

                  {/* FINAL OUTPUT (WEATHER STATE) */}
                  {(() => {
                    let strokeColor = "#f59e0b"; // Sunny
                    let bgOpacity = 0.1;
                    let textVal = "SUNNY";
                    if (softplus < 0.8) {
                      strokeColor = "#38bdf8"; // Rainy
                      textVal = "RAINY";
                    } else if (softplus <= 1.4) {
                      strokeColor = "#94a3b8"; // Cloudy
                      textVal = "CLOUDY";
                    }
                    return (
                      <g transform="translate(565, 205)">
                        <rect x="0" y="0" width="60" height="50" rx="8" fill={strokeColor} fillOpacity={bgOpacity} stroke={strokeColor} strokeWidth="2.5" className="animate-pulse" />
                        <text x="30" y="14" fill={strokeColor} fontSize="8" fontWeight="black" textAnchor="middle" className="font-mono uppercase tracking-widest">OUTPUT</text>
                        <text x="30" y="24" fill="#94a3b8" fontSize="6.5" textAnchor="middle" className="font-mono">({textVal})</text>
                        <text x="30" y="42" fill="#fff" fontSize="13" fontWeight="black" textAnchor="middle" className="font-mono">{softplus.toFixed(2)}</text>
                      </g>
                    );
                  })()}
                </svg>

                {/* Animated flows note */}
                <div className="absolute top-4 left-4 text-[9px] font-mono text-slate-500 uppercase flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-ping" />
                  Live Feed Neural Propagation Map
                </div>
              </div>

              {/* Right: Calculations & Interpretation Details */}
              <div className="lg:col-span-4 flex flex-col gap-4">
                {/* Weight explanation */}
                <div className="bg-[#030611] border border-[#141d35]/60 rounded-2xl p-4 space-y-2">
                  <div className="flex justify-between items-center border-b border-slate-900 pb-1.5">
                    <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-widest">1) WEIGHTS INFLUENCE</span>
                    <HelpCircle size={12} className="text-slate-500" />
                  </div>
                  <div className="space-y-2 text-xs text-slate-300">
                    <div className="flex items-start gap-2">
                      <span className="text-[#10b981] font-mono text-sm leading-none">•</span>
                      <p className="leading-relaxed text-slate-400">
                        <strong>w1 = -2.50</strong>: Temperature reduces the inhibitory Node 1, disinhibiting the network to favor Sunny weather.
                      </p>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="text-[#ef4444] font-mono text-sm leading-none">•</span>
                      <p className="leading-relaxed text-slate-400">
                        <strong>w2 = -2.50</strong>: Humidity reduces the excitatory Node 2 bias, lowering overall activation to favor Rainy weather.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Bias shifts description */}
                <div className="bg-[#030611] border border-[#141d35]/60 rounded-2xl p-4 space-y-2">
                  <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-widest block border-b border-slate-900 pb-1.5">2) DYNAMIC BIAS SHIFTS</span>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Bias shifts the activation threshold, giving the model flexibility to fit environmental variations:
                  </p>
                  <div className="bg-[#050a18] border border-slate-900/40 p-2.5 rounded-xl text-xs font-mono space-y-1">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Node 1 Bias:</span>
                      <span className="text-[#0284c7] font-bold">1.42 + ({weatherTemperature.toFixed(2)} * -2.50) = {node1Bias.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Node 2 Bias:</span>
                      <span className="text-[#f59e0b] font-bold">1.39 + ({weatherHumidity.toFixed(2)} * -2.50) = {node2Bias.toFixed(2)}</span>
                    </div>
                  </div>
                </div>

                {/* Math Functions used */}
                <div className="bg-[#030611] border border-[#141d35]/60 rounded-2xl p-4 space-y-2">
                  <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-widest block border-b border-slate-900 pb-1.5">3 & 4) ACTIVATION FORMULAS</span>
                  <div className="space-y-2">
                    <div className="bg-[#050a18] p-2 rounded-xl text-center border border-slate-900/50">
                      <span className="text-[9px] font-mono text-slate-500 uppercase tracking-wider block">3) SQUIGGLE (Sigmoid)</span>
                      <span className="text-xs font-mono font-black text-purple-400">f(x) = 1 / (1 + e^-x)</span>
                      <p className="text-[10px] text-slate-500 mt-1 leading-normal">Adds non-linearity. Squeezes any value into range (0, 1).</p>
                    </div>
                    <div className="bg-[#050a18] p-2 rounded-xl text-center border border-slate-900/50">
                      <span className="text-[9px] font-mono text-slate-500 uppercase tracking-wider block">4) SOFTPLUS FUNCTION</span>
                      <span className="text-xs font-mono font-black text-emerald-400">f(x) = ln(1 + e^x)</span>
                      <p className="text-[10px] text-slate-500 mt-1 leading-normal">Smooth version of ReLU. Always outputs positive efficacy scores.</p>
                    </div>
                  </div>
                </div>

                {/* Interpretation summary box */}
                {(() => {
                  let bgGrad = "from-amber-950/20 to-yellow-950/20 border-amber-500/10";
                  let textColor = "text-amber-400";
                  let weatherLabel = "Sunny";
                  let weatherIndicator = "STRONG";
                  let indicatorColor = "text-amber-400";

                  if (softplus < 0.8) {
                    bgGrad = "from-sky-950/20 to-blue-950/20 border-sky-500/15";
                    textColor = "text-sky-400";
                    weatherLabel = "Rainy";
                    weatherIndicator = "WEAK";
                    indicatorColor = "text-sky-400";
                  } else if (softplus <= 1.4) {
                    bgGrad = "from-slate-950/40 to-slate-900/40 border-slate-700/20";
                    textColor = "text-slate-400";
                    weatherLabel = "Cloudy";
                    weatherIndicator = "MODERATE";
                    indicatorColor = "text-slate-300";
                  }

                  return (
                    <div className={`bg-gradient-to-br ${bgGrad} border p-4 rounded-2xl text-xs space-y-2`}>
                      <div className={`flex items-center gap-2 ${textColor} font-bold`}>
                        {softplus > 1.4 ? (
                          <Sun size={14} className="animate-spin" style={{ animationDuration: '20s' }} />
                        ) : softplus < 0.8 ? (
                          <CloudRain size={14} className="animate-bounce" />
                        ) : (
                          <Cloud size={14} className="animate-pulse" />
                        )}
                        <span className="uppercase tracking-wider">SYSTEM INTERPRETATION</span>
                      </div>
                      <ul className="space-y-1.5 text-slate-400 list-disc pl-4 leading-relaxed text-[11px]">
                        <li>High Temperature ({weatherTemperature.toFixed(2)}) strongly pushes the score up (positive weight).</li>
                        <li>Low Humidity ({weatherHumidity.toFixed(2)}) reduces the score (negative weight), but is compensated.</li>
                        <li>
                          Final Efficacy score of <strong className="text-white text-xs">{softplus.toFixed(2)}</strong> indicates a <strong className={indicatorColor}>{weatherIndicator}</strong> chance of <strong className={`${textColor} uppercase`}>{weatherLabel} weather</strong>!
                        </li>
                      </ul>
                    </div>
                  );
                })()}

              </div>
            </div>

          </div>
        </div>
      )}

      {/* 6. BOTTOM FOOTER DIAGNOSTICS LOG LINES */}
      <div className="bg-[#060a18]/50 border border-[#141d35]/65 rounded-2xl p-4 text-left flex items-start gap-3 mt-auto backdrop-blur-sm">
        <div className="p-2.5 rounded-xl bg-cyan-950/40 border border-cyan-800/25 text-cyan-400 shrink-0">
          <Info size={15} />
        </div>
        <div>
          <h4 className="text-xs font-black text-white uppercase tracking-wider leading-none mb-1">Interactive Diagnostic Sandbox</h4>
          <p className="text-[11px] text-slate-400 leading-normal">
            Note: Metrics are computed on the selected dataset and session. Toggle preset runs in the upper right to compare neural network behaviors under varying learning rates, optimizers (Adam vs. SGD), or trace your <strong>Live Sandbox Session</strong> in real-time as you optimize the neural cells!
          </p>
        </div>
      </div>

    </div>
  );
}
