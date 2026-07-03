import React, { useState, useEffect, useRef } from 'react';
import { 
  Play, 
  Pause,
  Brain,
  Sparkles,
  HelpCircle,
  Activity,
  X,
  Plus,
  Minus,
  Upload,
  Database,
  Terminal,
  TrendingUp,
  ChevronsRight,
  AlertCircle
} from 'lucide-react';

interface DashboardPanelProps {
  customInputs: number[];
  handleSliderValueChange: (index: number, val: number) => void;
  onSetCustomInputs: (inputs: number[]) => void;
  networkOutputs: number[];
  setActiveTab: (tab: string) => void;
  layers: any[];
  activation: string;
}

type InputMode = 'manual' | 'stream';

export default function DashboardPanel({
  customInputs,
  handleSliderValueChange,
  onSetCustomInputs,
  networkOutputs,
  setActiveTab,
  layers,
  activation
}: DashboardPanelProps) {
  const [pulseTime, setPulseTime] = useState(0);
  const [showStatus, setShowStatus] = useState(true);
  const [isPlayingLiveActivity, setIsPlayingLiveActivity] = useState(true);

  // Streaming State Management
  const [inputMode, setInputMode] = useState<InputMode>('manual');
  const [streamDataset, setStreamDataset] = useState<{
    name: string;
    rows: number[][];
  } | null>(null);
  const [currentStreamIndex, setCurrentStreamIndex] = useState<number>(0);
  const [isStreamingActive, setIsStreamingActive] = useState<boolean>(false);
  const [streamIntervalMs, setStreamIntervalMs] = useState<number>(800);
  const [dragOver, setDragOver] = useState<boolean>(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [showToast, setShowToast] = useState<string | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Pre-loaded streams generators
  const generateSinePoints = () => {
    const points: number[][] = [];
    for (let i = 0; i < 60; i++) {
      const t = (i / 60) * Math.PI * 4;
      points.push([
        parseFloat((Math.sin(t) * 1.5).toFixed(2)),
        parseFloat((Math.cos(t * 1.5) * 1.2).toFixed(2)),
        parseFloat((Math.sin(t * 2) * 1.0).toFixed(2))
      ]);
    }
    return points;
  };

  const generateLorenzPoints = () => {
    let x = 0.1, y = 0, z = 0;
    const a = 10, b = 28, c = 8/3;
    const dt = 0.03;
    const points: number[][] = [];
    for (let i = 0; i < 60; i++) {
      const dx = a * (y - x) * dt;
      const dy = (x * (b - z) - y) * dt;
      const dz = (x * y - c * z) * dt;
      x += dx;
      y += dy;
      z += dz;
      points.push([x, y, z]);
    }
    return normalizeDataset(points);
  };

  const generateClusterPoints = () => {
    const points: number[][] = [];
    const centers = [
      [-1.2, -0.8, 1.0],
      [1.0, 1.2, -0.5],
      [-0.2, 0.5, -1.2]
    ];
    for (let i = 0; i < 60; i++) {
      const classIdx = i % 3;
      const center = centers[classIdx];
      points.push([
        parseFloat((center[0] + (Math.random() - 0.5) * 0.4).toFixed(2)),
        parseFloat((center[1] + (Math.random() - 0.5) * 0.4).toFixed(2)),
        parseFloat((center[2] + (Math.random() - 0.5) * 0.4).toFixed(2))
      ]);
    }
    return points;
  };

  const normalizeDataset = (rows: number[][]): number[][] => {
    if (rows.length === 0) return [];
    const numCols = rows[0].length;
    const mins = Array(numCols).fill(Infinity);
    const maxs = Array(numCols).fill(-Infinity);
    
    rows.forEach(row => {
      row.forEach((val, c) => {
        if (val < mins[c]) mins[c] = val;
        if (val > maxs[c]) maxs[c] = val;
      });
    });

    return rows.map(row => {
      return row.map((val, c) => {
        const range = maxs[c] - mins[c];
        if (range === 0) return 0;
        return parseFloat((-2.0 + ((val - mins[c]) / range) * 4.0).toFixed(2));
      });
    });
  };

  const showToastNotification = (msg: string) => {
    setShowToast(msg);
    setTimeout(() => {
      setShowToast(prev => prev === msg ? null : prev);
    }, 3200);
  };

  const loadPresetStream = (type: 'sine' | 'lorenz' | 'gaussian') => {
    setUploadError(null);
    let name = '';
    let data: number[][] = [];
    if (type === 'sine') {
      name = 'Sine Wave Orbit Feed';
      data = generateSinePoints();
    } else if (type === 'lorenz') {
      name = 'Lorenz Chaotic Attractor Feed';
      data = generateLorenzPoints();
    } else if (type === 'gaussian') {
      name = 'Gaussian Clusters Pulse Feed';
      data = generateClusterPoints();
    }

    setStreamDataset({ name, rows: data });
    setCurrentStreamIndex(0);
    setIsStreamingActive(true);
    if (data.length > 0) {
      onSetCustomInputs(data[0]);
    }
    showToastNotification(`Loaded preset: ${name}`);
  };

  // Drag and drop events
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = () => {
    setDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleFileUpload(file);
    }
  };

  // Parsing CSV / JSON / TXT file upload
  const handleFileUpload = (file: File) => {
    setUploadError(null);
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      if (!text) {
        setUploadError("Could not read empty file.");
        return;
      }

      try {
        let parsedRows: number[][] = [];
        
        // Detect JSON vs CSV/TXT
        if (file.name.endsWith('.json') || text.trim().startsWith('[') || text.trim().startsWith('{')) {
          const json = JSON.parse(text);
          if (Array.isArray(json)) {
            json.forEach((item: any) => {
              if (Array.isArray(item)) {
                const numRow = item.map(v => Number(v)).filter(v => !isNaN(v));
                if (numRow.length > 0) parsedRows.push(numRow);
              } else if (typeof item === 'object' && item !== null) {
                const numRow = Object.values(item).map(v => Number(v)).filter(v => !isNaN(v));
                if (numRow.length > 0) parsedRows.push(numRow);
              }
            });
          } else if (typeof json === 'object' && json !== null) {
            const dataArray = json.items || json.data || json.rows || Object.values(json).find(v => Array.isArray(v));
            if (Array.isArray(dataArray)) {
              dataArray.forEach((item: any) => {
                if (Array.isArray(item)) {
                  const numRow = item.map(v => Number(v)).filter(v => !isNaN(v));
                  if (numRow.length > 0) parsedRows.push(numRow);
                } else if (typeof item === 'object' && item !== null) {
                  const numRow = Object.values(item).map(v => Number(v)).filter(v => !isNaN(v));
                  if (numRow.length > 0) parsedRows.push(numRow);
                }
              });
            }
          }
        } else {
          // Parse CSV / TXT line-by-line
          const lines = text.split(/\r?\n/);
          lines.forEach(line => {
            const cleanLine = line.trim();
            if (!cleanLine) return;
            // skip header columns containing alphabetic labels
            if (/[a-zA-Z]/.test(cleanLine) && !cleanLine.includes('e-') && !cleanLine.includes('e+')) {
              return;
            }
            const parts = cleanLine.split(/[\s,;\t]+/).map(v => Number(v)).filter(v => !isNaN(v));
            if (parts.length > 0) {
              parsedRows.push(parts);
            }
          });
        }

        if (parsedRows.length === 0) {
          setUploadError("No numeric coordinates detected inside file.");
          return;
        }

        // Standardize columns to size of 3 inputs (L0)
        const standardized = parsedRows.map(row => {
          const targetRow = [...row];
          while (targetRow.length < 3) targetRow.push(0);
          return targetRow.slice(0, 3);
        });

        // Normalize to fit beautiful visualization range [-2.0, 2.0]
        const normalized = normalizeDataset(standardized);

        setStreamDataset({
          name: file.name,
          rows: normalized
        });
        setCurrentStreamIndex(0);
        setIsStreamingActive(true);
        if (normalized.length > 0) {
          onSetCustomInputs(normalized[0]);
        }
        showToastNotification(`Uploaded raw dataset: ${file.name} (${normalized.length} rows scaled)`);

      } catch (err: any) {
        setUploadError(`Formatting error: ${err.message || 'Invalid structure'}`);
      }
    };
    reader.onerror = () => {
      setUploadError("Could not complete file transmission.");
    };
    reader.readAsText(file);
  };

  // Stream Clock Tick
  useEffect(() => {
    if (inputMode !== 'stream' || !isStreamingActive || !streamDataset || streamDataset.rows.length === 0) return;

    const interval = setInterval(() => {
      setCurrentStreamIndex(prev => {
        const nextIndex = (prev + 1) % streamDataset.rows.length;
        onSetCustomInputs(streamDataset.rows[nextIndex]);
        return nextIndex;
      });
    }, streamIntervalMs);

    return () => clearInterval(interval);
  }, [inputMode, isStreamingActive, streamDataset, streamIntervalMs, onSetCustomInputs]);

  // Live pulse animation effect for flow visualization
  useEffect(() => {
    let animId: number;
    const tick = () => {
      if (isPlayingLiveActivity) {
        setPulseTime(prev => (prev + 0.015) % 1);
      }
      animId = requestAnimationFrame(tick);
    };
    animId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animId);
  }, [isPlayingLiveActivity]);

  // Safe probability calculations (Softmax)
  const totalOutputs = networkOutputs.length || 3;
  const expOutputs = networkOutputs.map(v => Math.exp(Math.min(10, Math.max(-10, v))));
  const sumExp = expOutputs.reduce((a, b) => a + b, 0) || 1;
  const probabilities = expOutputs.map(v => v / sumExp);

  // If we don't have enough probabilities, pad them
  while (probabilities.length < 3) {
    probabilities.push(0.01);
  }

  // Adjust numeric input with limits [-2.0, 2.0]
  const adjustInputValue = (index: number, delta: number) => {
    const currentVal = customInputs[index] !== undefined ? customInputs[index] : 0;
    const newVal = Math.min(2.0, Math.max(-2.0, parseFloat((currentVal + delta).toFixed(1))));
    handleSliderValueChange(index, newVal);
  };

  const handleDirectInput = (index: number, textVal: string) => {
    const parsed = parseFloat(textVal);
    if (!isNaN(parsed)) {
      const clamped = Math.min(2.0, Math.max(-2.0, parsed));
      handleSliderValueChange(index, clamped);
    }
  };

  // Helper to resolve predicted class text
  const getPredictedClass = (probs: number[]) => {
    const maxProb = Math.max(...probs);
    const maxIndex = probs.indexOf(maxProb);
    const labels = ["Class A", "Class B", "Class C"];
    return {
      label: labels[maxIndex] || `Class ${maxIndex + 1}`,
      confidence: maxProb,
      color: maxIndex === 0 ? 'text-cyan-400' : maxIndex === 1 ? 'text-purple-400' : 'text-rose-400'
    };
  };

  const prediction = getPredictedClass(probabilities);

  // Extract hidden neurons counts
  const hiddenLayersCount = layers.length - 2;
  const hiddenNeuronsCount = layers.slice(1, layers.length - 1).reduce((sum, l) => sum + l.size, 0);

  return (
    <div className="flex-1 overflow-y-auto bg-gradient-to-br from-[#040815] via-[#080d1a] to-[#02050e] text-slate-200 p-6 space-y-6 relative select-none text-left">
      
      {/* SVG GLOW FILTERS FOR AMAZING NEON VISUALS */}
      <svg className="absolute w-0 h-0" width="0" height="0">
        <defs>
          <filter id="neon-glow-cyan" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="3.5" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <filter id="neon-glow-purple" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="3.5" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <filter id="neon-glow-orange" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="3.5" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
      </svg>

      {/* Dynamic Pop up Toast notification */}
      {showToast && (
        <div className="fixed top-6 right-6 z-50 bg-[#08112c] border border-cyan-500/30 rounded-xl px-4 py-3 shadow-2xl flex items-center gap-3 animate-fade-in pointer-events-none backdrop-blur-md">
          <div className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-ping shrink-0" />
          <span className="text-xs font-bold font-mono text-cyan-200">{showToast}</span>
        </div>
      )}

      {/* Top Banner & Status Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 relative z-10">
        <div className="space-y-1.5">
          <span className="text-[10px] font-mono font-bold tracking-widest text-cyan-400 uppercase bg-cyan-950/45 border border-cyan-500/25 px-2.5 py-0.5 rounded flex items-center gap-1.5 w-fit shadow-[0_0_12px_rgba(34,209,244,0.1)]">
            <Brain size={12} className="text-cyan-400 animate-pulse" />
            Active Simulator
          </span>
          <h1 className="text-2xl lg:text-3xl font-black tracking-tight text-white uppercase font-display">
            Welcome to <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-indigo-400 to-purple-500 font-extrabold">Neural Network</span> <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-pink-400 to-orange-400 font-extrabold">Visualizer</span>
          </h1>
          <p className="text-xs text-slate-400 leading-relaxed max-w-xl font-medium">
            Understand how neural networks process complex numbers and signals through live visual workflows.
          </p>
        </div>

        {/* Network Status Widget */}
        {showStatus && (
          <div className="flex items-center gap-3 bg-[#0a0f21]/80 border border-[#1b2647]/50 rounded-xl px-4 py-2.5 shadow-xl relative pr-8 backdrop-blur-md">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
            </span>
            <div className="text-left">
              <div className="text-[10px] font-mono font-bold text-slate-500 uppercase tracking-wider">Engine State</div>
              <div className="text-xs font-black text-white uppercase font-display tracking-wide">Live Feed</div>
            </div>
            <button 
              onClick={() => setShowStatus(false)}
              className="absolute right-2 top-2.5 text-slate-500 hover:text-slate-300 cursor-pointer"
            >
              <X size={11} />
            </button>
          </div>
        )}
      </div>

      {/* Main Panel Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch relative z-10">
        
        {/* Input Signal Node Column (3 Columns) - Dynamic mode tabs */}
        <div id="input-controller-section" className="lg:col-span-3 bg-[#060a18]/70 border border-[#141d35]/75 rounded-2xl p-5 shadow-2xl flex flex-col justify-between backdrop-blur-md hover:border-cyan-500/20 transition-colors duration-300 relative group">
          <div className="absolute top-0 right-0 w-16 h-16 bg-cyan-500/5 rounded-full blur-xl opacity-0 group-hover:opacity-100 transition-opacity" />
          
          <div className="space-y-4">
            {/* Elegant Input Mode Switcher */}
            <div className="border-b border-[#141d35]/65 pb-3 flex flex-col gap-2.5">
              <div className="flex justify-between items-center">
                <h3 className="text-xs font-black tracking-widest uppercase text-slate-300 font-display">Input Controller</h3>
                <HelpCircle size={14} className="text-slate-500 hover:text-slate-350 cursor-help transition-colors" title="Toggle between manually specifying coordinate probe numbers or injecting a flowing continuous real-time dataset." />
              </div>
              <div className="grid grid-cols-2 bg-[#030611] border border-[#141d35] rounded-xl p-1">
                <button
                  onClick={() => {
                    setInputMode('manual');
                    setIsStreamingActive(false);
                  }}
                  className={`py-1.5 rounded-lg text-[9px] font-bold uppercase transition-all duration-200 cursor-pointer select-none ${
                    inputMode === 'manual' 
                      ? 'bg-gradient-to-r from-cyan-950/40 to-indigo-950/40 border border-cyan-500/20 text-cyan-400 font-black shadow-inner' 
                      : 'text-slate-500 hover:text-slate-300'
                  }`}
                >
                  Manual Probe
                </button>
                <button
                  onClick={() => {
                    setInputMode('stream');
                    if (!streamDataset) {
                      loadPresetStream('lorenz');
                    }
                  }}
                  className={`py-1.5 rounded-lg text-[9px] font-bold uppercase transition-all duration-200 cursor-pointer select-none ${
                    inputMode === 'stream' 
                      ? 'bg-gradient-to-r from-cyan-950/40 to-indigo-950/40 border border-cyan-500/20 text-cyan-400 font-black shadow-inner' 
                      : 'text-slate-500 hover:text-slate-300'
                  }`}
                >
                  Real-time Stream
                </button>
              </div>
            </div>

            {/* Manual Controls Panel */}
            {inputMode === 'manual' ? (
              <div className="space-y-4">
                {customInputs.slice(0, 3).map((val, idx) => (
                  <div key={idx} className="space-y-1.5">
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-bold text-slate-300 font-mono flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 shadow-[0_0_6px_#22d3ee]" />
                        x<sub>{idx + 1}</sub>
                      </span>
                      <span className="text-[10px] text-slate-500 font-mono font-bold uppercase tracking-wider">Feature</span>
                    </div>
                    
                    <div className="flex items-center bg-[#030611] border border-[#141d35] rounded-xl p-1.5 justify-between focus-within:border-cyan-500/40 transition-colors">
                      <button 
                        onClick={() => adjustInputValue(idx, -0.1)}
                        className="p-1.5 hover:bg-slate-900 rounded-lg text-slate-400 hover:text-white transition active:scale-95 cursor-pointer border border-transparent hover:border-[#141d35]"
                      >
                        <Minus size={12} />
                      </button>
                      <input 
                        type="text" 
                        value={val !== undefined ? val.toFixed(1) : "0.0"}
                        onChange={(e) => handleDirectInput(idx, e.target.value)}
                        className="bg-transparent text-center text-sm font-black text-white font-mono w-16 focus:outline-none"
                      />
                      <button 
                        onClick={() => adjustInputValue(idx, 0.1)}
                        className="p-1.5 hover:bg-slate-900 rounded-lg text-slate-400 hover:text-white transition active:scale-95 cursor-pointer border border-transparent hover:border-[#141d35]"
                      >
                        <Plus size={12} />
                      </button>
                    </div>
                  </div>
                ))}
                <div className="pt-2 text-[10px] text-slate-500 font-bold leading-relaxed font-mono">
                  Modify the sliders/counters above to probe individual nodes of the model manually.
                </div>
              </div>
            ) : (
              /* Drag-and-Drop Real-Time Stream Panel */
              <div className="space-y-4 text-left">
                
                {/* Active stream info */}
                {streamDataset && (
                  <div className="p-3 bg-cyan-950/20 border border-cyan-800/25 rounded-xl space-y-1.5">
                    <div className="flex justify-between items-center">
                      <span className="text-[9px] font-mono font-black text-cyan-400 uppercase tracking-widest flex items-center gap-1">
                        <Database size={10} />
                        Active Feed
                      </span>
                      <button 
                        onClick={() => {
                          setStreamDataset(null);
                          setIsStreamingActive(false);
                          setUploadError(null);
                        }}
                        className="text-slate-400 hover:text-rose-400 cursor-pointer"
                        title="Unload dataset"
                      >
                        <X size={11} />
                      </button>
                    </div>
                    <div className="text-xs font-bold text-white truncate font-display">
                      {streamDataset.name}
                    </div>
                    <div className="flex justify-between items-center text-[10px] text-slate-400 font-mono">
                      <span>Stream Length:</span>
                      <span className="font-bold text-slate-200">{streamDataset.rows.length} records</span>
                    </div>
                  </div>
                )}

                {/* Drag and drop selection zone */}
                <div
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-xl p-4.5 flex flex-col items-center justify-center gap-2 cursor-pointer transition-all duration-300 ${
                    dragOver 
                      ? 'border-cyan-400 bg-cyan-950/20 shadow-[0_0_15px_rgba(34,211,238,0.15)]' 
                      : 'border-[#141d35] hover:border-cyan-500/30 hover:bg-[#070d1d]/40'
                  }`}
                >
                  <input 
                    type="file" 
                    ref={fileInputRef} 
                    className="hidden" 
                    accept=".csv,.json,.txt" 
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleFileUpload(file);
                    }}
                  />
                  <Upload size={20} className={dragOver ? 'text-cyan-400 animate-bounce' : 'text-slate-500'} />
                  <div className="text-center space-y-0.5">
                    <span className="text-[10px] font-black text-white uppercase block tracking-wider font-display">
                      Upload Custom Dataset
                    </span>
                    <span className="text-[9px] text-slate-500 font-semibold block leading-tight">
                      Drop CSV, JSON, or TXT (3 columns) or Click to select
                    </span>
                  </div>
                </div>

                {/* Parsing error display */}
                {uploadError && (
                  <div className="p-2.5 bg-rose-950/25 border border-rose-500/25 rounded-xl flex gap-2 items-start text-[10px] text-rose-300">
                    <AlertCircle size={13} className="text-rose-400 shrink-0 mt-0.5" />
                    <p className="leading-tight font-medium">{uploadError}</p>
                  </div>
                )}

                {/* Inject Presets Switcher */}
                <div className="space-y-1.5 pt-1.5">
                  <span className="text-[9px] font-mono font-black text-slate-500 uppercase tracking-widest block">
                    Mathematical presets
                  </span>
                  <div className="flex flex-col gap-1.5">
                    {[
                      { id: 'lorenz', label: 'Lorenz Attractor Chaos', color: 'hover:border-purple-500/40' },
                      { id: 'sine', label: 'Sine Wave Orbit', color: 'hover:border-cyan-500/40' },
                      { id: 'gaussian', label: 'Gaussian Cluster Pulses', color: 'hover:border-rose-500/40' }
                    ].map(p => (
                      <button
                        key={p.id}
                        onClick={() => loadPresetStream(p.id as any)}
                        className={`w-full py-2 px-3 bg-[#030611] hover:bg-[#080e22] border border-[#141d35] rounded-xl text-[10px] font-bold text-slate-300 transition-all flex items-center justify-between cursor-pointer group/btn ${p.color}`}
                      >
                        <span className="font-display">{p.label}</span>
                        <ChevronsRight size={12} className="text-slate-500 group-hover/btn:translate-x-1 transition-transform" />
                      </button>
                    ))}
                  </div>
                </div>

              </div>
            )}

          </div>

          <div className="pt-4 border-t border-[#141d35]/40 text-[10px] text-slate-500 font-bold leading-relaxed mt-4 font-mono">
            {inputMode === 'manual' 
              ? "Values represent coordinate positions probed on the Euclidean plane."
              : "Autoscaling clamps inputs cleanly between [-2.0, 2.0] for optimal visual flow."
            }
          </div>
        </div>

        {/* Center Live Network Map (6 Columns) */}
        <div id="network-map-section" className="lg:col-span-6 bg-[#060a18]/70 border border-[#141d35]/75 rounded-2xl p-5 shadow-2xl flex flex-col justify-between relative overflow-hidden backdrop-blur-md hover:border-indigo-500/20 transition-all duration-300 group">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-indigo-500/5 via-transparent to-transparent pointer-events-none" />

          {/* Svg container */}
          <div className="w-full h-[240px] relative flex items-center justify-center">
            <div className="absolute top-0 left-2 text-[9px] font-mono font-black text-cyan-400 tracking-widest uppercase bg-cyan-950/20 px-2 py-0.5 rounded border border-cyan-900/30">Input L0</div>
            <div className="absolute top-0 left-[43%] text-[9px] font-mono font-black text-purple-400 tracking-widest uppercase bg-purple-950/20 px-2 py-0.5 rounded border border-purple-900/30">Hidden L1</div>
            <div className="absolute top-0 right-2 text-[9px] font-mono font-black text-orange-400 tracking-widest uppercase bg-orange-950/20 px-2 py-0.5 rounded border border-orange-900/30">Output L2</div>

            <svg className="w-full h-full" viewBox="0 0 450 200" style={{ overflow: 'visible' }}>
              {[
                // Inputs to Hidden (3x5 connections)
                ...[0, 1, 2].flatMap(inIdx => 
                  [0, 1, 2, 3, 4].map(hidIdx => ({
                    from: [40, 35 + inIdx * 65],
                    to: [225, 20 + hidIdx * 40],
                    color: inIdx === 0 ? "rgba(34, 211, 238, 0.22)" : inIdx === 1 ? "rgba(168, 85, 247, 0.18)" : "rgba(244, 63, 94, 0.18)",
                    particleColor: inIdx === 0 ? "#22d3ee" : inIdx === 1 ? "#c084fc" : "#fb7185",
                    glowFilter: inIdx === 0 ? "url(#neon-glow-cyan)" : inIdx === 1 ? "url(#neon-glow-purple)" : "url(#neon-glow-orange)",
                    speedOffset: (inIdx * 5 + hidIdx) * 0.07
                  }))
                ),
                // Hidden to Outputs (5x3 connections)
                ...[0, 1, 2, 3, 4].flatMap(hidIdx => 
                  [0, 1, 2].map(outIdx => ({
                    from: [225, 20 + hidIdx * 40],
                    to: [410, 35 + outIdx * 65],
                    color: "rgba(249, 115, 22, 0.2)",
                    particleColor: "#fb923c",
                    glowFilter: "url(#neon-glow-orange)",
                    speedOffset: (hidIdx * 3 + outIdx) * 0.06
                  }))
                )
              ].map((link, idx) => (
                <g key={idx}>
                  <line 
                    x1={link.from[0]} y1={link.from[1]} 
                    x2={link.to[0]} y2={link.to[1]} 
                    stroke={link.color} 
                    strokeWidth="1.2" 
                  />
                  {(isPlayingLiveActivity || isStreamingActive) && (
                    <circle
                      cx={link.from[0] + (link.to[0] - link.from[0]) * ((pulseTime + link.speedOffset) % 1)}
                      cy={link.from[1] + (link.to[1] - link.from[1]) * ((pulseTime + link.speedOffset) % 1)}
                      r="3.2"
                      fill={link.particleColor}
                      filter={link.glowFilter}
                    />
                  )}
                </g>
              ))}

              {/* Input Layer Nodes (3) - Styled Green */}
              {[35, 100, 165].map((y, i) => {
                const isActive = Math.abs(customInputs[i] || 0) > 0.5;
                return (
                  <g key={`in-${i}`}>
                    <circle 
                      cx="40" 
                      cy={y} 
                      r="16" 
                      fill="#02050e" 
                      stroke="#10b981" 
                      strokeWidth={isActive ? "3" : "1.8"} 
                      filter="url(#neon-glow-cyan)"
                      className="transition-all duration-300"
                    />
                    <circle 
                      cx="40" 
                      cy={y} 
                      r={isActive ? "8" : "6"} 
                      fill="#10b981" 
                      className="transition-all duration-300"
                    />
                  </g>
                );
              })}

              {/* Hidden Layer Nodes (5) - Styled Purple/Indigo */}
              {[20, 60, 100, 140, 180].map((y, i) => {
                return (
                  <g key={`hid-${i}`}>
                    <circle 
                      cx="225" 
                      cy={y} 
                      r="13" 
                      fill="#02050e" 
                      stroke="#818cf8" 
                      strokeWidth="2" 
                      filter="url(#neon-glow-purple)"
                    />
                    <circle 
                      cx="225" 
                      cy={y} 
                      r="5" 
                      fill="#6366f1" 
                      className="animate-pulse"
                      style={{ animationDuration: `${1.5 + i * 0.3}s` }}
                    />
                  </g>
                );
              })}

              {/* Output Layer Nodes (3) - Styled Orange */}
              {[35, 100, 165].map((y, i) => {
                const prob = probabilities[i] || 0.15;
                const isMax = prob === Math.max(...probabilities);
                return (
                  <g key={`out-${i}`}>
                    <circle 
                      cx="410" 
                      cy={y} 
                      r="16" 
                      fill="#02050e" 
                      stroke="#f97316" 
                      strokeWidth={isMax ? "3" : "1.8"} 
                      filter="url(#neon-glow-orange)"
                    />
                    <circle 
                      cx="410" 
                      cy={y} 
                      r={isMax ? "8" : "5"} 
                      fill="#f97316" 
                    />
                  </g>
                );
              })}
            </svg>
          </div>

          {/* Low/High Activity Labels */}
          <div className="flex items-center justify-between text-[9px] font-mono font-bold text-slate-500 pt-1">
            <span>Positive Activation (Active flow)</span>
            <span className="flex items-center gap-1.5 bg-orange-950/30 border border-orange-850/40 px-2 py-0.5 rounded text-orange-400">
              <span className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-ping" />
              Feedforward Active
            </span>
          </div>
        </div>

        {/* Output Prediction Card (3 Columns) */}
        <div id="output-prediction-section" className="lg:col-span-3 bg-[#060a18]/70 border border-[#141d35]/75 rounded-2xl p-5 shadow-2xl flex flex-col justify-between backdrop-blur-md hover:border-orange-500/20 transition-colors duration-300 relative group">
          <div className="absolute top-0 right-0 w-16 h-16 bg-orange-500/5 rounded-full blur-xl opacity-0 group-hover:opacity-100 transition-opacity" />
          <div className="space-y-4">
            <div className="border-b border-[#141d35]/65 pb-3 flex justify-between items-center">
              <h3 className="text-xs font-black tracking-widest uppercase text-slate-300 font-display">Target Probabilities</h3>
              <HelpCircle size={14} className="text-slate-500 hover:text-slate-350 cursor-help transition-colors" title="Calculated classification probabilities output by Softmax." />
            </div>

            <div className="space-y-4">
              {probabilities.slice(0, 3).map((prob, idx) => {
                const isMax = prob === Math.max(...probabilities);
                return (
                  <div key={idx} className="space-y-1.5">
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-bold text-slate-300 font-mono">
                        y<sub>{idx + 1}</sub>
                      </span>
                      <span className={`text-[10px] font-black font-mono px-2 py-0.5 rounded-md ${
                        isMax 
                          ? 'bg-orange-500/10 text-orange-400 border border-orange-500/20' 
                          : 'bg-[#030611] text-slate-500 border border-[#141d35]'
                      }`}>
                        {prob.toFixed(2)}
                      </span>
                    </div>

                    <div className="w-full h-2 bg-[#030611] rounded-full overflow-hidden border border-[#141d35]">
                      <div 
                        className={`h-full rounded-full transition-all duration-500 ${
                          isMax 
                            ? 'bg-gradient-to-r from-orange-500 to-amber-400 shadow-[0_0_8px_rgba(249,115,22,0.5)]' 
                            : 'bg-slate-800/40'
                        }`}
                        style={{ width: `${prob * 100}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Predicted Class Output */}
            <div className="mt-4 p-3.5 bg-gradient-to-br from-[#0a0f25] to-[#030612] border border-orange-500/25 rounded-xl flex items-center justify-between gap-4 shadow-[0_0_15px_rgba(249,115,22,0.06)] relative overflow-hidden group/pred">
              <div className="absolute inset-y-0 left-0 w-1 bg-gradient-to-b from-orange-500 to-amber-400" />
              <div className="text-left space-y-0.5">
                <span className="text-[8px] font-mono font-black text-orange-400 uppercase tracking-widest block">Predicted Class</span>
                <span className="text-sm font-black text-white uppercase font-display tracking-tight flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-pulse shrink-0" />
                  {prediction.label}
                </span>
              </div>
              <div className="text-right space-y-0.5">
                <span className="text-[8px] font-mono font-black text-slate-500 uppercase tracking-widest block">Confidence</span>
                <span className="text-sm font-black text-emerald-400 font-mono tracking-tighter">
                  {(prediction.confidence * 100).toFixed(1)}%
                </span>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-[#141d35]/40 text-[10px] text-slate-500 font-bold leading-relaxed mt-4 font-mono">
            Outputs are normalized probabilities computed live using the activation function.
          </div>
        </div>

      </div>

      {/* LOWER SECTION: Adaptive Control Strip (Toggles depending on InputMode) */}
      {inputMode === 'manual' ? (
        /* Original Manual Wave simulation row */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center relative z-10">
          <div className="lg:col-span-8 bg-[#060a18]/70 border border-[#141d35]/75 rounded-2xl p-4 flex flex-col md:flex-row items-center justify-between gap-4 backdrop-blur-md">
            <div className="flex items-center gap-3">
              <button 
                onClick={() => setIsPlayingLiveActivity(!isPlayingLiveActivity)}
                className="w-10 h-10 bg-[#030611] border border-[#141d35] hover:border-cyan-500/30 rounded-xl flex items-center justify-center text-cyan-400 hover:text-white transition-all cursor-pointer shrink-0"
              >
                {isPlayingLiveActivity ? <Pause size={14} /> : <Play size={14} className="fill-cyan-400 text-cyan-400 ml-0.5" />}
              </button>
              <div className="text-left shrink-0">
                <span className="text-[9px] font-mono font-black text-slate-500 uppercase tracking-widest">Live Flow</span>
                <h4 className="text-xs font-black text-white uppercase tracking-wider font-display">Live Propagation</h4>
              </div>
            </div>

            <div className="flex-1 h-10 bg-[#030611]/60 border border-[#141d35]/50 rounded-xl overflow-hidden relative flex items-center justify-center">
              <div className="absolute inset-0 flex items-center justify-around px-4">
                {[...Array(24)].map((_, idx) => {
                  const heightVal = Math.sin(pulseTime * 6.28 + idx * 0.4) * 12 + 16;
                  return (
                    <div 
                      key={idx}
                      className="w-1 bg-gradient-to-t from-indigo-500 to-cyan-400 rounded-full transition-all duration-150"
                      style={{ 
                        height: `${heightVal}px`,
                        opacity: isPlayingLiveActivity ? 0.35 + (Math.sin(pulseTime * 3.14 + idx * 0.2) + 1) * 0.35 : 0.2
                      }}
                    />
                  );
                })}
              </div>
              <div className="absolute top-1.5 left-2 text-[8px] font-mono font-black uppercase tracking-wider text-cyan-500/40">Propagation Stream</div>
              <div className="absolute bottom-1.5 right-2 text-[8px] font-mono font-black uppercase tracking-wider text-purple-500/40">Active Cycles</div>
            </div>
          </div>

          <div className="lg:col-span-4 flex w-full">
            <button 
              onClick={() => setActiveTab('architecture')}
              className="w-full py-4 bg-gradient-to-r from-cyan-500 via-indigo-600 to-purple-600 hover:from-cyan-400 hover:via-indigo-500 hover:to-purple-500 rounded-2xl font-black text-xs tracking-wider text-white uppercase shadow-lg shadow-indigo-500/15 hover:shadow-indigo-500/25 cursor-pointer active:scale-95 transition-all duration-300 flex items-center justify-center gap-2.5"
            >
              <Play size={15} className="fill-white text-white" />
              <span className="font-display">Start Interactive Simulation</span>
            </button>
          </div>
        </div>
      ) : (
        /* Real-Time Telemetry Stream Console Control Center (Matches "Show real data flowing live") */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch relative z-10">
          
          {/* Stream Console Live Log (8 Columns) */}
          <div id="simulation-control-strip" className="lg:col-span-8 bg-[#060a18]/70 border border-[#141d35]/75 rounded-2xl p-4.5 flex flex-col justify-between gap-4 backdrop-blur-md hover:border-cyan-500/20 transition-all">
            
            {/* Stream Controller Header & Controls */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-[#141d35]/40 pb-3">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setIsStreamingActive(!isStreamingActive)}
                  disabled={!streamDataset}
                  className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all cursor-pointer ${
                    isStreamingActive 
                      ? 'bg-amber-500/15 border border-amber-500/30 text-amber-400' 
                      : 'bg-cyan-500/15 border border-cyan-500/30 text-cyan-400'
                  }`}
                  title={isStreamingActive ? "Pause Stream" : "Start Stream"}
                >
                  {isStreamingActive ? <Pause size={14} /> : <Play size={14} className="fill-cyan-450 ml-0.5" />}
                </button>
                <div className="text-left">
                  <span className="text-[9px] font-mono font-black text-slate-500 uppercase tracking-widest">Dataset flow</span>
                  <h4 className="text-xs font-black text-white uppercase tracking-wider font-display flex items-center gap-1.5">
                    <span className="relative flex h-2 w-2">
                      <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${isStreamingActive ? 'bg-cyan-400' : 'bg-slate-500'}`}></span>
                      <span className={`relative inline-flex rounded-full h-2 w-2 ${isStreamingActive ? 'bg-cyan-500' : 'bg-slate-600'}`}></span>
                    </span>
                    Streaming Telemetry
                  </h4>
                </div>
              </div>

              {/* Step Navigation & Speed Slider Controls */}
              <div className="flex flex-wrap items-center gap-4 w-full md:w-auto justify-between md:justify-end">
                {/* Step back/forward */}
                <div className="flex bg-[#030611] border border-[#141d35] rounded-xl p-1 gap-1">
                  <button
                    disabled={!streamDataset || isStreamingActive}
                    onClick={() => {
                      if (!streamDataset) return;
                      const nextIdx = (currentStreamIndex - 1 + streamDataset.rows.length) % streamDataset.rows.length;
                      setCurrentStreamIndex(nextIdx);
                      onSetCustomInputs(streamDataset.rows[nextIdx]);
                    }}
                    className="px-2.5 py-1 text-[10px] font-bold text-slate-400 hover:text-white disabled:opacity-30 transition cursor-pointer select-none"
                    title="Previous data row (Pause stream to step)"
                  >
                    Prev
                  </button>
                  <button
                    disabled={!streamDataset || isStreamingActive}
                    onClick={() => {
                      if (!streamDataset) return;
                      const nextIdx = (currentStreamIndex + 1) % streamDataset.rows.length;
                      setCurrentStreamIndex(nextIdx);
                      onSetCustomInputs(streamDataset.rows[nextIdx]);
                    }}
                    className="px-2.5 py-1 text-[10px] font-bold text-slate-400 hover:text-white disabled:opacity-30 transition cursor-pointer select-none"
                    title="Next data row (Pause stream to step)"
                  >
                    Next
                  </button>
                </div>

                {/* Speed Slider */}
                <div className="flex items-center gap-2 bg-[#030611] border border-[#141d35] rounded-xl p-1.5 px-3">
                  <span className="text-[9px] font-mono font-black text-slate-500 uppercase tracking-wider">Interval:</span>
                  <input
                    type="range"
                    min="150"
                    max="2000"
                    step="50"
                    value={streamIntervalMs}
                    onChange={(e) => setStreamIntervalMs(Number(e.target.value))}
                    className="w-20 md:w-24 h-1 bg-slate-950 rounded appearance-none cursor-pointer accent-cyan-400"
                  />
                  <span className="text-[10px] font-mono font-bold text-cyan-400 w-12 text-right">{streamIntervalMs}ms</span>
                </div>
              </div>
            </div>

            {/* Scrollable Monospace Ticker Terminal rows list */}
            <div className="bg-[#030611]/85 border border-[#141d35]/60 rounded-xl p-3.5 space-y-1.5 relative overflow-hidden min-h-[110px] flex flex-col justify-end">
              <div className="absolute top-1.5 right-2 text-[8px] font-mono font-black text-slate-600 uppercase tracking-widest flex items-center gap-1 pointer-events-none">
                <Terminal size={10} />
                LIVE STREAM CONSOLE LOG
              </div>

              {/* Streaming Ticker Stream rows list (displays adjacent rows) */}
              <div className="font-mono text-[10px] text-slate-400 space-y-1 text-left select-text">
                {(() => {
                  if (!streamDataset || streamDataset.rows.length === 0) {
                    return (
                      <div className="text-center text-slate-600 py-6 uppercase font-black tracking-widest text-[10px]">
                        [WAITING FOR DATASTREAM INJECTION]
                      </div>
                    );
                  }

                  // Render 4 lines around the active index
                  const rowsToDisplay: { idx: number; isCurrent: boolean }[] = [];
                  const len = streamDataset.rows.length;
                  for (let offset = -2; offset <= 1; offset++) {
                    const mappedIdx = (currentStreamIndex + offset + len) % len;
                    rowsToDisplay.push({
                      idx: mappedIdx,
                      isCurrent: offset === 0
                    });
                  }

                  return rowsToDisplay.map(({ idx, isCurrent }) => {
                    const rowVal = streamDataset.rows[idx];
                    // Compute label for this mock row dynamically using current weights
                    const mockProb = idx === currentStreamIndex ? probabilities : [0.33, 0.33, 0.33];
                    const mockPred = getPredictedClass(mockProb);
                    
                    return (
                      <div 
                        key={idx} 
                        className={`flex items-center justify-between py-1 px-2.5 rounded-lg transition-all ${
                          isCurrent 
                            ? 'bg-cyan-950/20 border border-cyan-500/20 text-cyan-200 font-extrabold shadow-[0_0_8px_rgba(6,182,212,0.06)]' 
                            : 'text-slate-500 opacity-60'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <span className={`w-1.5 h-1.5 rounded-full ${isCurrent ? 'bg-cyan-400 animate-ping' : 'bg-transparent'}`} />
                          <span className="font-bold text-slate-400">FRAME #{String(idx + 1).padStart(3, '0')}</span>
                          <span className="tracking-tighter">
                            Inputs: <b className="text-slate-350 font-bold">[{rowVal.map(v => v.toFixed(2)).join(', ')}]</b>
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-right">
                          <span>Output Predicts:</span>
                          <span className={`font-black uppercase tracking-wide ${isCurrent ? mockPred.color : 'text-slate-500'}`}>
                            {isCurrent ? `${mockPred.label} (${(mockPred.confidence * 100).toFixed(0)}%)` : '--'}
                          </span>
                        </div>
                      </div>
                    );
                  });
                })()}
              </div>
            </div>

            {/* Progress indicator bar */}
            {streamDataset && (
              <div className="flex items-center justify-between text-[10px] text-slate-500 font-mono font-bold mt-1">
                <div className="flex items-center gap-2 flex-1 max-w-[85%]">
                  <span>Stream Index:</span>
                  <div className="flex-1 h-1.5 bg-[#030611] border border-[#141d35] rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-cyan-400 to-indigo-500 rounded-full transition-all duration-300" 
                      style={{ width: `${((currentStreamIndex + 1) / streamDataset.rows.length) * 100}%` }}
                    />
                  </div>
                  <span className="text-slate-350">{currentStreamIndex + 1} / {streamDataset.rows.length}</span>
                </div>
                <div className="text-[9px] uppercase font-mono tracking-wider text-slate-600 bg-[#030611] border border-[#141d35] rounded-md px-1.5 py-0.5">
                  CSV Normalizer Active
                </div>
              </div>
            )}

          </div>

          {/* Explanation description / Switch panel block (4 Columns) */}
          <div className="lg:col-span-4 bg-[#060a18]/70 border border-[#141d35]/75 rounded-2xl p-5 flex flex-col justify-between text-left backdrop-blur-md relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-16 h-16 bg-purple-500/5 rounded-full blur-xl opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="space-y-3.5">
              <span className="text-[9px] font-mono font-black text-purple-400 uppercase tracking-widest block border-b border-[#141d35]/40 pb-1.5">
                Stream Telemetry Analyzer
              </span>
              <p className="text-xs text-slate-400 leading-relaxed font-sans font-medium">
                The neural network processes each record from the dataset stream sequentially in real time. 
              </p>
              <div className="p-3 bg-indigo-950/20 border border-indigo-900/30 rounded-xl space-y-2 text-[10px] text-slate-350">
                <div className="flex items-center gap-2">
                  <TrendingUp size={13} className="text-cyan-400 shrink-0" />
                  <span className="font-bold">Dynamic Synaptic Wavefront</span>
                </div>
                <p className="leading-snug font-medium">
                  Switch to the <b className="text-cyan-400 cursor-pointer" onClick={() => setActiveTab('architecture')}>Visual Architecture</b> view to see actual signal flow, voltages, and synapses adjust synchronously with each streamed record!
                </p>
              </div>
            </div>

            <button 
              onClick={() => setActiveTab('architecture')}
              className="w-full mt-4 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white rounded-xl font-black text-xs tracking-wider uppercase cursor-pointer active:scale-95 transition-all duration-300 flex items-center justify-center gap-1.5"
            >
              <Brain size={13} />
              <span>Inspect 3D Synapse Map</span>
            </button>
          </div>

        </div>
      )}

      {/* Bottom Summary Stats Strip */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 relative z-10">
        
        {/* Stat 1: Inputs */}
        <div className="bg-[#060a18]/70 border border-[#141d35]/75 rounded-xl p-3.5 flex items-center gap-3 shadow-lg backdrop-blur-md">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0">
            <span className="text-xs font-black text-emerald-400 font-mono font-bold">IN</span>
          </div>
          <div className="text-left">
            <div className="text-[9px] font-mono font-bold text-slate-500 uppercase tracking-wider">Inputs count</div>
            <div className="text-xs font-black text-white">3 Inputs</div>
          </div>
        </div>

        {/* Stat 2: Hidden Layers */}
        <div className="bg-[#060a18]/70 border border-[#141d35]/75 rounded-xl p-3.5 flex items-center gap-3 shadow-lg backdrop-blur-md">
          <div className="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center shrink-0">
            <span className="text-xs font-black text-cyan-400 font-mono font-bold">HL</span>
          </div>
          <div className="text-left">
            <div className="text-[9px] font-mono font-bold text-slate-500 uppercase tracking-wider">Hidden layers</div>
            <div className="text-xs font-black text-white">{hiddenLayersCount} Hidden Layer</div>
          </div>
        </div>

        {/* Stat 3: Neurons */}
        <div className="bg-[#060a18]/70 border border-[#141d35]/75 rounded-xl p-3.5 flex items-center gap-3 shadow-lg backdrop-blur-md">
          <div className="w-8 h-8 rounded-lg bg-purple-500/10 border border-purple-500/20 flex items-center justify-center shrink-0">
            <span className="text-xs font-black text-purple-400 font-mono font-bold">N</span>
          </div>
          <div className="text-left">
            <div className="text-[9px] font-mono font-bold text-slate-500 uppercase tracking-wider">Hidden Neurons</div>
            <div className="text-xs font-black text-white">{hiddenNeuronsCount} Neurons</div>
          </div>
        </div>

        {/* Stat 4: Outputs */}
        <div className="bg-[#060a18]/70 border border-[#141d35]/75 rounded-xl p-3.5 flex items-center gap-3 shadow-lg backdrop-blur-md">
          <div className="w-8 h-8 rounded-lg bg-orange-500/10 border border-orange-500/20 flex items-center justify-center shrink-0">
            <span className="text-xs font-black text-orange-400 font-mono font-bold">OUT</span>
          </div>
          <div className="text-left">
            <div className="text-[9px] font-mono font-bold text-slate-500 uppercase tracking-wider">Outputs count</div>
            <div className="text-xs font-black text-white">3 Outputs</div>
          </div>
        </div>

        {/* Stat 5: Activation Function */}
        <div className="col-span-2 md:col-span-1 bg-[#060a18]/70 border border-[#141d35]/75 rounded-xl p-3.5 flex items-center gap-3 shadow-lg backdrop-blur-md">
          <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center shrink-0">
            <span className="text-xs font-black text-indigo-400 font-mono font-bold">ACT</span>
          </div>
          <div className="text-left">
            <div className="text-[9px] font-mono font-bold text-slate-500 uppercase tracking-wider">Activation</div>
            <div className="text-xs font-black text-white uppercase">{activation}</div>
          </div>
        </div>

      </div>

    </div>
  );
}
