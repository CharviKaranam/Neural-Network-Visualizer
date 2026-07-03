import React, { useState, useEffect } from 'react';
import { 
  Play, 
  RotateCcw, 
  Info, 
  Zap, 
  ArrowRightLeft,
  Eye,
  Settings,
  HelpCircle,
  EyeOff,
  Maximize2,
  ZoomIn,
  ZoomOut,
  Move,
  Pause
} from 'lucide-react';
import { LayerConfig, NetworkState, NeuronState, ConnectionState } from '../types/network';

interface VisualArchitecturePanelProps {
  layers: LayerConfig[];
  network: NetworkState;
  customInputs: number[];
  handleSliderValueChange: (index: number, val: number) => void;
  networkOutputs: number[];
  activation: string;
  onResetWeights: () => void;
  onTriggerForward: () => void;
  onTriggerBackward: () => void;
  isAnimating: boolean;
  animatingLayer: number | null;
  animationProgress: number;
  hideHeader?: boolean;
  onUpdateWeight?: (connId: string, value: number) => void;
  onUpdateBias?: (layerIndex: number, nodeIndex: number, value: number) => void;
  onInjectPerturbation?: () => void;
}

export default function VisualArchitecturePanel({
  layers,
  network,
  customInputs,
  handleSliderValueChange,
  networkOutputs,
  activation,
  onResetWeights,
  onTriggerForward,
  onTriggerBackward,
  isAnimating,
  animatingLayer,
  animationProgress,
  hideHeader = false,
  onUpdateWeight,
  onUpdateBias,
  onInjectPerturbation
}: VisualArchitecturePanelProps) {
  
  const [viewMode, setViewMode] = useState<'2D' | '3D'>('3D');
  const [showValues, setShowValues] = useState<boolean>(true);
  const [showWeights, setShowWeights] = useState<boolean>(true);
  const [displayMetric, setDisplayMetric] = useState<'activation' | 'gradient'>('activation');
  const [isPaused, setIsPaused] = useState<boolean>(false);

  const formatGradient = (val: number) => {
    const absVal = Math.abs(val);
    if (absVal === 0) return '0.00';
    if (absVal < 0.001) {
      return absVal.toExponential(1); // e.g. 1.2e-4
    }
    return absVal.toFixed(3);
  };
  
  // Selected Node or Connection for detailed display in the "Neuron Info" sidebar
  const [selectedNode, setSelectedNode] = useState<NeuronState | null>(null);
  const [selectedConn, setSelectedConn] = useState<ConnectionState | null>(null);

  const [activeStepMsg, setActiveStepMsg] = useState<string>("Ready to transmit voltages.");
  const [activePropagationType, setActivePropagationType] = useState<'forward' | 'backward' | 'idle'>('idle');
  const [simSpeed, setSimSpeed] = useState<number>(2.5); // Flow speed multiplier
  const [particleOffset, setParticleOffset] = useState<number>(0);

  // Professional 3D Camera & Viewport interactive states
  const [rotX, setRotX] = useState<number>(24);
  const [rotY, setRotY] = useState<number>(-24);
  const [zoom, setZoom] = useState<number>(0.92);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  const canvasRef = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    const canvasEl = canvasRef.current;
    if (!canvasEl) return;

    const onWheelHandler = (e: WheelEvent) => {
      if (viewMode !== '3D') return;
      e.preventDefault();
      const factor = e.deltaY < 0 ? 1.05 : 0.95;
      setZoom(prev => Math.max(0.4, Math.min(2.5, prev * factor)));
    };

    canvasEl.addEventListener('wheel', onWheelHandler, { passive: false });
    return () => {
      canvasEl.removeEventListener('wheel', onWheelHandler);
    };
  }, [viewMode]);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (viewMode !== '3D') return;
    setIsDragging(true);
    setDragStart({ x: e.clientX, y: e.clientY });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || viewMode !== '3D') return;
    const dx = e.clientX - dragStart.x;
    const dy = e.clientY - dragStart.y;
    
    setRotY(prev => prev + dx * 0.4);
    setRotX(prev => Math.max(-75, Math.min(75, prev - dy * 0.4)));
    setDragStart({ x: e.clientX, y: e.clientY });
  };

  const handleMouseUpOrLeave = () => {
    setIsDragging(false);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (viewMode !== '3D') return;
    if (e.touches.length === 1) {
      setIsDragging(true);
      setDragStart({ x: e.touches[0].clientX, y: e.touches[0].clientY });
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging || viewMode !== '3D') return;
    if (e.touches.length === 1) {
      const dx = e.touches[0].clientX - dragStart.x;
      const dy = e.touches[0].clientY - dragStart.y;
      setRotY(prev => prev + dx * 0.4);
      setRotX(prev => Math.max(-75, Math.min(75, prev - dy * 0.4)));
      setDragStart({ x: e.touches[0].clientX, y: e.touches[0].clientY });
    }
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
  };

  const handleResetCamera = () => {
    setRotX(24);
    setRotY(-24);
    setZoom(0.92);
  };

  const handleZoomIn = () => {
    setZoom(prev => Math.min(2.5, prev * 1.15));
  };

  const handleZoomOut = () => {
    setZoom(prev => Math.max(0.4, prev * 0.85));
  };

  // Default selection to first hidden node if none is selected
  useEffect(() => {
    if (!selectedNode && network.neurons[1]?.[0]) {
      setSelectedNode(network.neurons[1][0]);
    }
  }, [network, selectedNode]);

  // Particle flowing effect loop
  useEffect(() => {
    let animationId: number;
    const animate = () => {
      if (!isPaused) {
        setParticleOffset(prev => (prev + 0.012 * simSpeed) % 1);
      }
      animationId = requestAnimationFrame(animate);
    };
    animationId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationId);
  }, [simSpeed, isPaused]);

  // Handle active step explanations
  useEffect(() => {
    if (isAnimating) {
      if (animatingLayer === 0) {
        setActiveStepMsg("Capturing input metrics. Injecting values into Input Layer.");
        setActivePropagationType('forward');
      } else if (animatingLayer === 1) {
        setActiveStepMsg("First Hidden Layer combining signals with connection weights.");
        setActivePropagationType('forward');
      } else if (animatingLayer === 2) {
        setActiveStepMsg("Transmitting activations through second hidden processor nodes.");
        setActivePropagationType('forward');
      } else if (animatingLayer === layers.length - 1) {
        setActiveStepMsg("Output Layer activated. Matching probabilities computed via SoftMax.");
        setActivePropagationType('forward');
      }
    } else {
      setActiveStepMsg("Voltages static. Adjust input sliders below or click Forward Pass to trigger.");
    }
  }, [isAnimating, animatingLayer, layers, activation]);

  // Coordinate math for rendering nodes in SVG
  const getLayerX = (layerIndex: number, totalLayers: number, containerWidth: number) => {
    const padding = 70;
    return padding + (layerIndex / (totalLayers - 1)) * (containerWidth - 2 * padding);
  };

  const getNodeY = (nodeIndex: number, layerSize: number, containerHeight: number) => {
    const centerY = containerHeight / 2;
    if (layerSize === 1) return centerY;
    const spacing = Math.min(52, (containerHeight - 40) / (layerSize - 1));
    const totalHeight = (layerSize - 1) * spacing;
    const startY = centerY - totalHeight / 2;
    return startY + nodeIndex * spacing;
  };

  const getNodePosition = (lIdx: number, nIdx: number, layerSize: number, totalLayers: number) => {
    if (viewMode === '2D') {
      const x = getLayerX(lIdx, totalLayers, 680);
      const y = getNodeY(nIdx, layerSize, 340);
      return { x, y, z: 0, radius: 17, opacity: 1 };
    }

    // 3D perspective projection
    const cx = 340;
    const cy = 170; // centered in landscape height
    const xSpan = 440; // wider horizontal span for landscape view
    const x = -xSpan / 2 + (lIdx / (totalLayers - 1)) * xSpan;

    // Distribute nodes in Y-Z plane circle
    let y = 0;
    let z = 0;
    const radius = lIdx === 0 ? 55 : lIdx === totalLayers - 1 ? 50 : 70;

    if (layerSize > 1) {
      // Helix spiral angle twist to make connections overlap gracefully in 3D
      const angle = (nIdx / layerSize) * 2 * Math.PI + (lIdx * 0.45);
      y = Math.cos(angle) * radius;
      z = Math.sin(angle) * radius;
    }

    // Rotations (Yaw / Pitch)
    const radY = (rotY * Math.PI) / 180;
    const radX = (rotX * Math.PI) / 180;

    // Y-rotation (Yaw)
    const cosY = Math.cos(radY);
    const sinY = Math.sin(radY);
    const x1 = x * cosY - z * sinY;
    const z1 = x * sinY + z * cosY;

    // X-rotation (Pitch)
    const cosX = Math.cos(radX);
    const sinX = Math.sin(radX);
    const y2 = y * cosX - z1 * sinX;
    const z2 = y * sinX + z1 * cosX;

    // Perspective projection
    const cameraDist = 380;
    const scaleFactor = cameraDist / (cameraDist - z2);

    const px = cx + x1 * scaleFactor * zoom;
    const py = cy + y2 * scaleFactor * zoom;

    // Node sizing based on perspective
    const nodeRadius = 15 * scaleFactor;

    // Depth opacity scaling: from 0.45 to 1.0
    const minZ = -220;
    const maxZ = 220;
    const t = Math.max(0, Math.min(1, (z2 - minZ) / (maxZ - minZ)));
    const opacity = 0.45 + t * 0.55;

    return { x: px, y: py, z: z2, radius: nodeRadius, opacity };
  };

  const getNeuronName = (lIdx: number, nIdx: number) => {
    if (lIdx === 0) return `Input x${nIdx + 1}`;
    if (lIdx === layers.length - 1) return `Output y${nIdx + 1}`;
    return `Hidden H${lIdx}_${nIdx + 1}`;
  };

  const handleLocalForward = () => {
    setIsPaused(false);
    setActivePropagationType('forward');
    onTriggerForward();
  };

  const handleLocalBackward = () => {
    setIsPaused(false);
    setActivePropagationType('backward');
    onTriggerBackward();
    setTimeout(() => {
      setActiveStepMsg("Backpropagation complete. Synaptic weight errors adjusted slightly!");
    }, 1500);
  };

  return (
    <div id="visual-architecture-panel" className="flex-1 flex flex-col p-6 overflow-y-auto text-slate-100 font-sans gap-6 select-none bg-gradient-to-br from-[#040815] via-[#080d1a] to-[#02050e]">
      
      {/* Upper Jumbotron Title bar */}
      {!hideHeader && (
        <div className="bg-[#060a18]/70 border border-[#141d35]/75 rounded-2xl p-5 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shadow-xl shrink-0 text-left relative overflow-hidden backdrop-blur-md">
          <div className="absolute top-0 right-0 w-80 h-80 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none" />
          <div className="space-y-1.5 z-10">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono font-bold tracking-widest text-indigo-400 uppercase bg-indigo-950/45 border border-indigo-800/25 px-2.5 py-0.5 rounded shadow-[0_0_12px_rgba(99,102,241,0.1)]">
                Active Simulation Canvas
              </span>
            </div>
            <h2 className="text-lg font-black tracking-tight text-white uppercase font-display">Neural Synapse Map (Interactive View)</h2>
            <p className="text-xs text-slate-400 font-medium">Observe signal voltages, synaptic weights, and error backpropagation in real-time.</p>
          </div>
        </div>
      )}

      {/* Top Controls Bar containing Simulation Control, Display Configuration, and 3D Camera Inspector */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 shrink-0 z-10">
        
        {/* Simulation Control card */}
        <div className="bg-[#060a18]/70 border border-[#141d35]/75 rounded-2xl p-4.5 space-y-4 shadow-xl backdrop-blur-md hover:border-indigo-500/20 transition-all duration-300 relative group flex flex-col justify-between text-left">
          <div className="absolute top-0 right-0 w-12 h-12 bg-indigo-500/5 rounded-full blur-xl opacity-0 group-hover:opacity-100 transition-opacity" />
          <div>
            <span className="text-[10px] font-mono font-black tracking-wider uppercase text-slate-500 block border-b border-[#141d35]/50 pb-1.5 mb-3.5">
              Simulation Control
            </span>
            <div className="grid grid-cols-2 gap-2.5">
              <button
                onClick={handleLocalForward}
                disabled={isAnimating}
                className="flex items-center justify-center gap-1.5 px-3 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 disabled:opacity-30 text-white rounded-xl font-bold text-xs tracking-wide cursor-pointer transition active:scale-95 shadow-md shadow-indigo-500/10"
              >
                <Zap size={12} className="fill-white" />
                <span>Forward</span>
              </button>

              <button
                onClick={handleLocalBackward}
                disabled={isAnimating}
                className="flex items-center justify-center gap-1.5 px-3 py-2.5 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 disabled:opacity-30 text-white rounded-xl font-bold text-xs tracking-wide cursor-pointer transition active:scale-95 shadow-md shadow-purple-500/10"
              >
                <ArrowRightLeft size={11} />
                <span>Backward</span>
              </button>

              <button
                onClick={() => setIsPaused(!isPaused)}
                className={`flex items-center justify-center gap-1.5 px-3 py-2.5 border rounded-xl font-bold text-xs cursor-pointer transition active:scale-95 ${
                  isPaused 
                    ? 'bg-amber-600/10 border-amber-500/30 text-amber-400' 
                    : 'bg-[#030611] border-[#141d35] text-slate-400 hover:text-white hover:bg-[#0c1225]'
                }`}
              >
                <Pause size={12} />
                <span>{isPaused ? "Resume" : "Pause"}</span>
              </button>

              <button
                onClick={() => { onResetWeights(); setIsPaused(false); }}
                className="flex items-center justify-center gap-1.5 px-3 py-2.5 bg-[#030611] hover:bg-[#0c1225] border border-[#141d35] text-slate-400 hover:text-white rounded-xl font-bold text-xs cursor-pointer transition active:scale-95"
              >
                <RotateCcw size={12} />
                <span>Reset</span>
              </button>

              <button
                onClick={() => {
                  if (onInjectPerturbation) {
                    onInjectPerturbation();
                  }
                }}
                className="col-span-2 flex items-center justify-center gap-1.5 px-3 py-2 bg-rose-950/20 hover:bg-rose-900/20 border border-rose-500/20 text-rose-300 hover:text-rose-100 rounded-xl font-bold text-xs cursor-pointer transition active:scale-95 shadow-md shadow-rose-500/5"
                title="Inject randomized weight perturbation chaos to simulate model robustness regularizer."
              >
                <Zap size={12} className="text-rose-400" />
                <span>Chaos Jitter</span>
              </button>
            </div>
          </div>
          {/* Quick instructions integrated here */}
          <div className="bg-slate-950/60 border border-slate-850/40 p-2 rounded-xl text-[10px] text-slate-400 leading-snug font-sans flex items-center gap-2 mt-2">
            <Info size={12} className="text-cyan-400 shrink-0" />
            <span>Click any neuron or connection cable to inspect variables.</span>
          </div>
        </div>

        {/* View Options card (Display Configuration) */}
        <div className="bg-[#060a18]/70 border border-[#141d35]/75 rounded-2xl p-4.5 space-y-4 shadow-xl backdrop-blur-md hover:border-indigo-500/20 transition-all duration-300 relative group text-left">
          <span className="text-[10px] font-mono font-black tracking-wider uppercase text-slate-500 block border-b border-[#141d35]/50 pb-1.5">
            Display Configuration
          </span>

          {/* 2D/3D Buttons */}
          <div className="grid grid-cols-2 gap-2.5">
            <button
              onClick={() => setViewMode('2D')}
              className={`flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition cursor-pointer active:scale-95 ${
                viewMode === '2D' 
                  ? 'bg-indigo-950/40 border border-indigo-500 text-indigo-400' 
                  : 'bg-slate-950 border border-slate-850 text-slate-500 hover:text-slate-350'
              }`}
            >
              <Eye size={12} />
              <span>2D View</span>
            </button>

            <button
              onClick={() => setViewMode('3D')}
              className={`flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition cursor-pointer active:scale-95 ${
                viewMode === '3D' 
                  ? 'bg-indigo-950/40 border border-indigo-500 text-indigo-400' 
                  : 'bg-slate-950 border border-slate-850 text-slate-500 hover:text-slate-350'
              }`}
            >
              <Maximize2 size={12} />
              <span>3D View</span>
            </button>
          </div>

          {/* Toggle Switches */}
          <div className="space-y-2.5 pt-1">
            <label className="flex items-center justify-between text-xs cursor-pointer group">
              <span className="text-slate-400 font-semibold group-hover:text-slate-200 transition-colors">Show Neuron Values</span>
              <input 
                type="checkbox" 
                checked={showValues}
                onChange={(e) => setShowValues(e.target.checked)}
                className="w-4 h-4 rounded border-slate-800 text-indigo-600 focus:ring-indigo-500"
              />
            </label>

            <label className="flex items-center justify-between text-xs cursor-pointer group">
              <span className="text-slate-400 font-semibold group-hover:text-slate-200 transition-colors">Show Synapse Weights</span>
              <input 
                type="checkbox" 
                checked={showWeights}
                onChange={(e) => setShowWeights(e.target.checked)}
                className="w-4 h-4 rounded border-slate-800 text-indigo-600 focus:ring-indigo-500"
              />
            </label>

            {/* Node Display Metric Selector toggle */}
            <div className="flex items-center justify-between text-xs group pt-1">
              <span className="text-slate-400 font-semibold">Node Metric</span>
              <div className="flex bg-slate-950 border border-slate-850 p-0.5 rounded-lg">
                <button
                  onClick={() => setDisplayMetric('activation')}
                  className={`px-2 py-0.5 text-[10px] font-bold rounded transition-all cursor-pointer ${
                    displayMetric === 'activation'
                      ? 'bg-indigo-950 border border-indigo-500/30 text-indigo-400 shadow-[0_0_8px_rgba(99,102,241,0.15)]'
                      : 'text-slate-500 hover:text-slate-350'
                  }`}
                >
                  Signal
                </button>
                <button
                  onClick={() => setDisplayMetric('gradient')}
                  className={`px-2 py-0.5 text-[10px] font-bold rounded transition-all cursor-pointer ${
                    displayMetric === 'gradient'
                      ? 'bg-rose-950 border border-rose-500/30 text-rose-400 shadow-[0_0_8px_rgba(244,63,94,0.15)]'
                      : 'text-slate-500 hover:text-slate-350'
                  }`}
                >
                  Gradient
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* 3D Camera Controls Card */}
        {viewMode === '3D' ? (
          <div className="bg-[#060a18]/70 border border-[#141d35]/75 rounded-2xl p-4.5 space-y-3 shadow-xl text-left backdrop-blur-md hover:border-cyan-500/10 transition-all duration-300 relative group flex flex-col justify-between">
            <div>
              <span className="text-[10px] font-mono font-black tracking-wider uppercase text-slate-500 block border-b border-[#141d35]/50 pb-1.5 mb-2.5">
                3D Camera Inspector
              </span>

              {/* Sliders for RotX and RotY and Zoom */}
              <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                {/* RotY Slider */}
                <div className="space-y-0.5">
                  <div className="flex justify-between text-[9px] font-mono">
                    <span className="text-slate-400 font-bold">Yaw (Y-Rot)</span>
                    <span className="text-cyan-400 font-bold">{Math.round(rotY)}°</span>
                  </div>
                  <input
                    type="range"
                    min="-180"
                    max="180"
                    value={rotY}
                    onChange={(e) => setRotY(parseFloat(e.target.value))}
                    className="w-full h-1 bg-slate-950 rounded appearance-none cursor-pointer accent-cyan-400"
                  />
                </div>

                {/* RotX Slider */}
                <div className="space-y-0.5">
                  <div className="flex justify-between text-[9px] font-mono">
                    <span className="text-slate-400 font-bold">Pitch (X-Rot)</span>
                    <span className="text-cyan-400 font-bold">{Math.round(rotX)}°</span>
                  </div>
                  <input
                    type="range"
                    min="-75"
                    max="75"
                    value={rotX}
                    onChange={(e) => setRotX(parseFloat(e.target.value))}
                    className="w-full h-1 bg-slate-950 rounded appearance-none cursor-pointer accent-cyan-400"
                  />
                </div>

                {/* Zoom Slider */}
                <div className="col-span-2 space-y-0.5">
                  <div className="flex justify-between text-[9px] font-mono">
                    <span className="text-slate-400 font-bold">Scale (Zoom)</span>
                    <span className="text-cyan-400 font-bold">{zoom.toFixed(2)}x</span>
                  </div>
                  <input
                    type="range"
                    min="0.4"
                    max="2.5"
                    step="0.05"
                    value={zoom}
                    onChange={(e) => setZoom(parseFloat(e.target.value))}
                    className="w-full h-1 bg-slate-950 rounded appearance-none cursor-pointer accent-cyan-400"
                  />
                </div>
              </div>
            </div>

            {/* Preset buttons */}
            <div className="pt-1.5 space-y-1">
              <span className="text-[9px] font-mono font-bold uppercase text-slate-500 block">Angle Presets</span>
              <div className="flex gap-1.5 overflow-x-auto">
                {[
                  { label: 'Front', rotX: 0, rotY: 0, zoom: 0.92 },
                  { label: 'Isometric', rotX: 24, rotY: -24, zoom: 0.92 },
                  { label: 'Top Down', rotX: 70, rotY: 0, zoom: 0.92 },
                  { label: 'Orbit', rotX: 12, rotY: -72, zoom: 0.92 }
                ].map((preset, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      setRotX(preset.rotX);
                      setRotY(preset.rotY);
                      setZoom(preset.zoom);
                    }}
                    className="px-1.5 py-1 bg-slate-950 hover:bg-slate-800 border border-slate-850/80 hover:border-slate-700 text-[9px] font-semibold text-slate-300 rounded text-center transition cursor-pointer whitespace-nowrap"
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-[#060a18]/70 border border-[#141d35]/75 rounded-2xl p-4.5 shadow-xl text-left backdrop-blur-md relative group flex flex-col justify-center">
            <div className="flex items-center gap-2 text-indigo-400 font-bold uppercase tracking-wider text-[10px] mb-2 border-b border-[#141d35]/30 pb-1.5">
              <Info size={14} />
              <span>3D Workspace Locked</span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              3D camera controls are only active in 3D perspective mode. Switch to <b className="text-indigo-400">3D View</b> in the display configuration to rotate or zoom.
            </p>
          </div>
        )}

      </div>

      {/* Main Row layout for Simulator Canvas and right Inspector */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch flex-1 relative z-10">
        
        {/* Center Canvas container (9 Columns instead of 6, giving a wide landscape view) */}
        <div id="tour-architecture-map" className="lg:col-span-9 bg-[#060a18]/40 border border-[#141d35]/75 rounded-2xl relative overflow-hidden flex flex-col justify-between shadow-xl min-h-[440px] backdrop-blur-md hover:border-indigo-500/20 transition-all duration-300">
          
          {/* Main SVG workspace supporting tilting rotations on 3D View */}
          <div 
            ref={canvasRef}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUpOrLeave}
            onMouseLeave={handleMouseUpOrLeave}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            className={`flex-1 w-full h-full p-4 relative select-none ${
              viewMode === '3D' ? (isDragging ? 'cursor-grabbing' : 'cursor-grab') : ''
            }`}
            style={{
              perspective: '1200px',
              transformStyle: 'preserve-3d'
            }}
          >
            {/* 3D Interactive Floating controls */}
            {viewMode === '3D' && (
              <div className="absolute top-3 right-3 z-20 flex flex-col gap-1.5 bg-slate-950/70 border border-slate-800/80 p-1.5 rounded-xl backdrop-blur-md shadow-lg">
                <button
                  onClick={handleZoomIn}
                  className="p-1.5 hover:bg-slate-800/80 text-slate-300 hover:text-cyan-400 rounded-lg transition-colors cursor-pointer"
                  title="Zoom In"
                >
                  <ZoomIn size={15} />
                </button>
                <button
                  onClick={handleZoomOut}
                  className="p-1.5 hover:bg-slate-800/80 text-slate-300 hover:text-cyan-400 rounded-lg transition-colors cursor-pointer"
                  title="Zoom Out"
                >
                  <ZoomOut size={15} />
                </button>
                <button
                  onClick={handleResetCamera}
                  className="p-1.5 hover:bg-slate-800/80 text-slate-300 hover:text-cyan-400 rounded-lg transition-colors cursor-pointer"
                  title="Reset Camera View"
                >
                  <RotateCcw size={15} />
                </button>
              </div>
            )}

            {/* Drag to Rotate status text */}
            {viewMode === '3D' && (
              <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-20 bg-slate-950/70 border border-slate-800/60 px-3 py-1 rounded-full backdrop-blur-md shadow-lg text-[10px] text-slate-400 font-mono tracking-wider flex items-center gap-1.5 pointer-events-none whitespace-nowrap">
                <Move size={11} className="text-indigo-400 animate-pulse" />
                <span>Drag to Rotate • Scroll to Zoom</span>
              </div>
            )}

            <div
              className="w-full h-full relative"
              style={{
                transform: 'none',
                transformStyle: 'flat',
              }}
            >
              <svg className="w-full h-full min-h-[340px]" viewBox="0 0 680 340" preserveAspectRatio="xMidYMid meet" style={{ overflow: 'visible' }}>
                <style>{`
                  @keyframes neuronAmbientPulse {
                    0%, 100% {
                      transform: scale(1);
                      filter: drop-shadow(0 0 3px var(--pulse-color, #a855f7));
                      opacity: 0.95;
                    }
                    50% {
                      transform: scale(1.04);
                      filter: drop-shadow(0 0 7px var(--pulse-color, #a855f7)) brightness(1.1);
                      opacity: 1;
                    }
                  }
                  @keyframes neuronActivePulse {
                    0%, 100% {
                      transform: scale(1);
                      filter: drop-shadow(0 0 5px var(--pulse-color, #a855f7));
                    }
                    50% {
                      transform: scale(1.22);
                      filter: drop-shadow(0 0 20px var(--pulse-color, #a855f7)) brightness(1.4);
                    }
                  }
                  .neuron-ambient {
                    transform-origin: 0px 0px;
                    transition: all 0.3s ease-in-out;
                  }
                  .neuron-firing {
                    animation: neuronActivePulse 0.8s cubic-bezier(0.25, 1, 0.5, 1) infinite;
                    transform-origin: 0px 0px;
                  }
                `}</style>
                {/* 3D Depth Projected elements */}
                {(() => {
                  // 1. Compute positions and metadata for all nodes
                  const computedNodes = network.neurons.flatMap((layer, lIdx) => {
                    return layer.map((node, nIdx) => {
                      const pos = getNodePosition(lIdx, nIdx, layer.length, layers.length);
                      const isInput = lIdx === 0;
                      const isOutput = lIdx === layers.length - 1;
                      
                      let strokeColor = '#8b5cf6'; // Hidden Layer purple
                      if (isInput) {
                        strokeColor = '#10b981'; // Input Layer green
                      } else if (isOutput) {
                        strokeColor = '#f59e0b'; // Output Layer orange
                      }

                      const isCurrentlyFiring = isAnimating && animatingLayer === lIdx;

                      return {
                        ...node,
                        pos,
                        lIdx,
                        nIdx,
                        isInput,
                        isOutput,
                        strokeColor,
                        isCurrentlyFiring
                      };
                    });
                  });

                  // 2. Compute positions and metadata for all connections
                  const computedConnections = Object.values(network.connections).map((conn) => {
                    const fromParts = conn.fromNodeId.split('_');
                    const toParts = conn.toNodeId.split('_');
                    const fromLIdx = parseInt(fromParts[1], 10);
                    const fromNIdx = parseInt(fromParts[3], 10);
                    const toLIdx = parseInt(toParts[1], 10);
                    const toNIdx = parseInt(toParts[3], 10);

                    const pos1 = getNodePosition(fromLIdx, fromNIdx, layers[fromLIdx].size, layers.length);
                    const pos2 = getNodePosition(toLIdx, toNIdx, layers[toLIdx].size, layers.length);

                    const avgZ = (pos1.z + pos2.z) / 2;
                    const avgOpacity = (pos1.opacity + pos2.opacity) / 2;

                    const isLayerActive = isAnimating && (
                      activePropagationType === 'forward' 
                        ? animatingLayer === fromLIdx 
                        : animatingLayer === toLIdx
                    );

                    const isPositive = conn.weight >= 0;
                    const absWeight = Math.abs(conn.weight);
                    
                    let strokeColor = isPositive
                      ? (isLayerActive ? '#10b981' : 'rgba(16,185,129,0.45)')
                      : (isLayerActive ? '#ef4444' : 'rgba(239,68,68,0.45)');

                    const strokeWidth = Math.max(0.8, Math.min(6, absWeight * 3.5)) * (viewMode === '3D' ? (pos1.opacity + pos2.opacity) / 2 : 1);

                    const px = pos1.x + (pos2.x - pos1.x) * particleOffset;
                    const py = pos1.y + (pos2.y - pos1.y) * particleOffset;

                    return {
                      ...conn,
                      pos1,
                      pos2,
                      avgZ,
                      avgOpacity,
                      isLayerActive,
                      isPositive,
                      strokeColor,
                      strokeWidth,
                      px,
                      py,
                      fromLIdx,
                      toLIdx
                    };
                  });

                  // Sort connections and nodes back-to-front by Z depth for perfect 3D occlusion layering
                  const sortedConnections = [...computedConnections].sort((a, b) => a.avgZ - b.avgZ);
                  const sortedNodes = [...computedNodes].sort((a, b) => a.pos.z - b.pos.z);

                  return (
                    <>
                      {/* 1. Connections rendering */}
                      {sortedConnections.map((conn) => (
                        <g key={conn.id} className="group">
                          {/* Wide interactive invisible line for easier hover selection */}
                          <line
                            x1={conn.pos1.x} y1={conn.pos1.y} x2={conn.pos2.x} y2={conn.pos2.y}
                            stroke="transparent"
                            strokeWidth="14"
                            className="cursor-pointer"
                            onClick={() => { setSelectedConn(conn); setSelectedNode(null); }}
                          />

                          {/* Glow background pipeline */}
                          <line
                            x1={conn.pos1.x} y1={conn.pos1.y} x2={conn.pos2.x} y2={conn.pos2.y}
                            stroke={conn.strokeColor}
                            strokeWidth={conn.strokeWidth + 4.5}
                            strokeLinecap="round"
                            opacity={conn.avgOpacity * 0.3}
                            className="transition-all duration-300"
                          />

                          {/* Secondary thick outer neon atmospheric glow */}
                          <line
                            x1={conn.pos1.x} y1={conn.pos1.y} x2={conn.pos2.x} y2={conn.pos2.y}
                            stroke={conn.strokeColor}
                            strokeWidth={conn.strokeWidth + 8}
                            strokeLinecap="round"
                            opacity={conn.avgOpacity * 0.08}
                            className="transition-all duration-300"
                          />

                          {/* Core connection cable line */}
                          <line
                            x1={conn.pos1.x} y1={conn.pos1.y} x2={conn.pos2.x} y2={conn.pos2.y}
                            stroke={conn.strokeColor}
                            strokeWidth={conn.weight === 0 ? 0.5 : conn.strokeWidth}
                            strokeLinecap="round"
                            opacity={conn.avgOpacity}
                            className="transition-all duration-300 hover:stroke-indigo-400"
                          />



                          {/* Text label showing synapse weight printed on line if enabled */}
                          {showWeights && (
                            <g transform={`translate(${(conn.pos1.x + conn.pos2.x) / 2}, ${(conn.pos1.y + conn.pos2.y) / 2 - 4})`} opacity={conn.avgOpacity} className="pointer-events-none">
                              <rect
                                x="-14" y="-5" width="28" height="9" rx="2"
                                fill="#040815" fillOpacity="0.82"
                                stroke="rgba(20, 29, 53, 0.45)" strokeWidth="0.5"
                              />
                              <text
                                x="0" y="2"
                                fill="#94a3b8"
                                fontSize="6.5"
                                fontWeight="bold"
                                textAnchor="middle"
                                className="font-mono"
                              >
                                {conn.weight.toFixed(2)}
                              </text>
                            </g>
                          )}

                          {/* Flowing electric voltage particles/sparks */}
                          {(conn.isLayerActive || !isAnimating) && (
                            <g>
                              {/* Outer glow aura of the active particle */}
                              <circle
                                cx={conn.px}
                                cy={conn.py}
                                r={conn.isLayerActive ? "6.5" : "4.5"}
                                fill={activePropagationType === 'backward' ? '#f43f5e' : '#3b82f6'}
                                opacity={conn.avgOpacity * 0.45}
                                className="animate-pulse"
                                pointerEvents="none"
                              />
                              {/* Hot core node of particle */}
                              <circle
                                cx={conn.px}
                                cy={conn.py}
                                r={conn.isLayerActive ? "3" : "1.8"}
                                fill="#fff"
                                opacity={conn.avgOpacity}
                                pointerEvents="none"
                              />
                            </g>
                          )}
                        </g>
                      ))}

                      {/* 2. Nodes rendering */}
                      {sortedNodes.map((node) => {
                        const isCurrentlyFiring = node.isCurrentlyFiring;
                        const pos = node.pos;
                        const strokeColor = node.strokeColor;
                        const isInput = node.isInput;
                        const isOutput = node.isOutput;
                        const pulseClass = isCurrentlyFiring ? 'neuron-firing' : 'neuron-ambient';

                        return (
                          <g
                            key={node.id}
                            transform={`translate(${pos.x}, ${pos.y})`}
                            onClick={() => { setSelectedNode(node); setSelectedConn(null); }}
                            className="cursor-pointer"
                            style={{ '--pulse-color': strokeColor } as React.CSSProperties}
                          >
                            <g className={pulseClass}>
                              {/* Outer concentric neon halo (glowing indicator) */}
                              <circle
                                cx="0" cy="0" r={pos.radius + 7.5}
                                fill="transparent"
                                stroke={strokeColor}
                                strokeWidth={isCurrentlyFiring ? "2.2" : "1"}
                                strokeOpacity={isCurrentlyFiring ? 0.75 * pos.opacity : 0.28 * pos.opacity}
                                className={isCurrentlyFiring ? "animate-ping opacity-60" : ""}
                              />

                              {/* Atmospheric glow backdrop */}
                              <circle
                                cx="0" cy="0" r={pos.radius + 4}
                                fill={strokeColor}
                                fillOpacity={isCurrentlyFiring ? 0.28 * pos.opacity : 0.08 * pos.opacity}
                                stroke={strokeColor}
                                strokeWidth="0.8"
                                strokeOpacity={isCurrentlyFiring ? 0.5 * pos.opacity : 0.15 * pos.opacity}
                              />

                              {/* Main solid node circular background */}
                              <circle
                                cx="0" cy="0" r={pos.radius}
                                fill="#0c1328"
                                stroke={strokeColor}
                                strokeWidth={isCurrentlyFiring ? "3" : "1.8"}
                                strokeOpacity={pos.opacity}
                                className="transition-all duration-300 hover:scale-110"
                              />

                              {/* Innermost gradient shine spot */}
                              <circle
                                cx="0" cy="0" r={pos.radius - 3.5}
                                fill={strokeColor}
                                fillOpacity={0.12 * pos.opacity}
                                pointerEvents="none"
                              />

                              {/* Node Value text inside circle */}
                              {showValues && (
                                <text
                                  x="0"
                                  y="3"
                                  textAnchor="middle"
                                  fill="#ffffff"
                                  fillOpacity={pos.opacity}
                                  fontSize={displayMetric === 'gradient' && !isInput && Math.abs(node.biasGradient) < 0.001 ? Math.max(5, Math.min(7, pos.radius * 0.42)) : Math.max(6, Math.min(9, pos.radius * 0.5))}
                                  fontWeight="bold"
                                  className="pointer-events-none font-mono"
                                >
                                  {displayMetric === 'gradient'
                                    ? (isInput ? '--' : formatGradient(node.biasGradient))
                                    : (isInput ? node.activation.toFixed(1) : isOutput ? node.activation.toFixed(2) : node.activation.toFixed(1))
                                  }
                                </text>
                              )}

                              {/* Floating text label directly above circle */}
                              <text
                                x="0"
                                y={-(pos.radius + 9)}
                                textAnchor="middle"
                                fill="#94a3b8"
                                fillOpacity={pos.opacity * 0.95}
                                fontSize="7.5"
                                fontWeight="bold"
                                className="pointer-events-none font-sans uppercase tracking-tight"
                              >
                                {isInput ? `x${node.nIdx + 1}` : isOutput ? `y${node.nIdx + 1}` : `h${node.lIdx}_${node.nIdx + 1}`}
                              </text>
                            </g>
                          </g>
                        );
                      })}
                    </>
                  );
                })()}
              </svg>
            </div>
          </div>

          {/* Footer step indicators (Forward Propagation / Backpropagation timeline) */}
          <div className="bg-slate-950 border-t border-slate-850 p-4.5 text-left flex justify-between items-center gap-4">
            <div className="flex flex-col gap-1.5 flex-1">
              <span className="text-[10px] font-mono font-bold tracking-widest text-slate-500 uppercase">
                {activePropagationType === 'backward' ? 'Backpropagation Feed' : 'Forward Propagation Feed'}
              </span>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-blue-500 inline-block animate-pulse" />
                <span className="text-xs text-slate-350 font-semibold">{activeStepMsg}</span>
              </div>
            </div>

            {/* Micro horizontal timeline steps */}
            <div className="flex gap-1">
              {Array.from({ length: 4 }).map((_, idx) => (
                <div
                  key={idx}
                  className={`h-1.5 w-6 rounded-full transition-all duration-300 ${
                    isAnimating && animatingLayer === idx ? 'bg-blue-400 shadow-[0_0_4px_rgba(96,165,250,0.8)]' : 'bg-slate-800'
                  }`}
                />
              ))}
            </div>
          </div>

        </div>

        {/* Right column: Detailed "Neuron Info" Inspector (3 Columns) */}
        <div className="lg:col-span-3 bg-[#060a18]/70 border border-[#141d35]/75 rounded-2xl p-5 flex flex-col justify-between shadow-xl backdrop-blur-md text-left hover:border-cyan-500/15 transition-all duration-300 relative group">
          
          <div className="space-y-4">
            <div className="border-b border-slate-850 pb-2">
              <span className="text-[10px] font-mono font-bold tracking-wider uppercase text-slate-500 block">
                Neuron & Synapse Inspector
              </span>
            </div>

            {/* Resolve current active node & connection states from the live network props */}
            {(() => {
              const liveNode = selectedNode 
                ? (network.neurons[selectedNode.layerIndex]?.[selectedNode.nodeIndex] || selectedNode)
                : null;

              const liveConn = selectedConn
                ? (network.connections[selectedConn.id] || selectedConn)
                : null;

              if (liveNode) {
                return (
                  <div className="space-y-4 font-mono text-[11px] text-slate-400">
                    <div className="flex items-center gap-2">
                      <div className={`w-2.5 h-2.5 rounded-full ${liveNode.layerIndex === 0 ? 'bg-emerald-400' : liveNode.layerIndex === layers.length - 1 ? 'bg-amber-400' : 'bg-purple-400'}`} />
                      <span className="text-[10.5px] font-bold text-white uppercase">
                        {getNeuronName(liveNode.layerIndex, liveNode.nodeIndex)}
                      </span>
                    </div>

                    <div className="space-y-2 border-t border-slate-900 pt-3">
                      <div className="flex justify-between">
                        <span className="text-slate-500">Node ID:</span>
                        <span className="text-white font-bold">{liveNode.id}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Output signal (a):</span>
                        <span className="text-cyan-400 font-bold">{liveNode.activation.toFixed(4)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Net weighted sum (z):</span>
                        <span className="text-purple-400 font-bold">{liveNode.preAct.toFixed(4)}</span>
                      </div>
                      {liveNode.layerIndex > 0 && (
                        <>
                          <div className="flex justify-between">
                            <span className="text-slate-500">Bias Offset Value:</span>
                            <span className="text-pink-400 font-bold">{liveNode.bias.toFixed(4)}</span>
                          </div>
                          <div className="flex justify-between border-t border-slate-900/60 pt-1.5">
                            <span className="text-slate-500">Error term (δ):</span>
                            <span className="text-rose-400 font-bold">{liveNode.delta.toExponential(4)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-500">Gradient (dL/db):</span>
                            <span className="text-rose-400 font-bold">{liveNode.biasGradient.toExponential(4)}</span>
                          </div>
                        </>
                      )}
                    </div>

                    {/* Interactive BIAS Editor Slider */}
                    {liveNode.layerIndex > 0 && onUpdateBias && (
                      <div className="bg-[#030611] p-3.5 rounded-xl border border-[#141d35] space-y-2 text-left">
                        <div className="flex justify-between items-center">
                          <span className="text-[9.5px] text-pink-400 font-bold uppercase tracking-wide">Adjust Bias Offset</span>
                          <span className="text-[10px] text-white font-bold bg-pink-950/40 border border-pink-900/30 px-1.5 py-0.5 rounded font-mono">
                            {liveNode.bias >= 0 ? '+' : ''}{liveNode.bias.toFixed(2)}
                          </span>
                        </div>
                        <input 
                          type="range"
                          min="-2.0"
                          max="2.0"
                          step="0.05"
                          value={liveNode.bias}
                          onChange={(e) => onUpdateBias(liveNode.layerIndex, liveNode.nodeIndex, parseFloat(e.target.value))}
                          className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-pink-500"
                        />
                        <span className="text-[8.5px] text-slate-500 block leading-normal font-sans">
                          Tweak bias threshold to see downstream outputs adjust instantly!
                        </span>
                      </div>
                    )}

                    {/* Computation Formula breakdown block */}
                    <div className="bg-slate-950 p-3 rounded-xl border border-slate-850 space-y-1.5 text-left text-[10px]">
                      <span className="text-slate-500 block uppercase font-bold tracking-wider">Computation Formula:</span>
                      <code className="text-indigo-300 block font-bold">
                        {liveNode.layerIndex === 0 
                          ? 'Input = a' 
                          : `a = ${activation.toUpperCase()}(z)`}
                      </code>
                      <p className="text-slate-400 leading-normal font-sans">
                        {liveNode.layerIndex === 0 
                          ? "This is the initial feature voltage signal." 
                          : `Multiplies inputs by connection weights, adds bias (${liveNode.bias.toFixed(2)}), then applies ${activation.toUpperCase()} filter.`}
                      </p>
                    </div>
                  </div>
                );
              }

              if (liveConn) {
                return (
                  <div className="space-y-4 font-mono text-[11px] text-slate-400">
                    <div className="flex items-center gap-2">
                      <span className="text-[10.5px] font-bold text-white uppercase">
                        Synaptic Connection
                      </span>
                    </div>

                    <div className="space-y-2 border-t border-slate-900 pt-3">
                      <div className="flex justify-between">
                        <span className="text-slate-500">From Node:</span>
                        <span className="text-white">{liveConn.fromNodeId.replace('layer_0_node_','x').replace('layer_1_node_','h1_').replace('layer_2_node_','h2_')}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">To Node:</span>
                        <span className="text-white">{liveConn.toNodeId.replace('layer_1_node_','h1_').replace('layer_2_node_','h2_').replace('layer_3_node_','y')}</span>
                      </div>
                      <div className="flex justify-between border-t border-slate-900 pt-2">
                        <span className="text-slate-500">Weight value:</span>
                        <span className={`font-black ${liveConn.weight >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {liveConn.weight.toFixed(5)}
                        </span>
                      </div>
                    </div>

                    {/* Interactive WEIGHT Editor Slider */}
                    {onUpdateWeight && (
                      <div className="bg-[#030611] p-3.5 rounded-xl border border-[#141d35] space-y-2 text-left">
                        <div className="flex justify-between items-center">
                          <span className="text-[9.5px] text-emerald-400 font-bold uppercase tracking-wide">Adjust weight</span>
                          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded font-mono ${liveConn.weight >= 0 ? 'text-emerald-400 bg-emerald-950/45 border border-emerald-900/30' : 'text-rose-400 bg-rose-950/45 border border-rose-900/30'}`}>
                            {liveConn.weight >= 0 ? '+' : ''}{liveConn.weight.toFixed(2)}
                          </span>
                        </div>
                        <input 
                          type="range"
                          min="-3.0"
                          max="3.0"
                          step="0.05"
                          value={liveConn.weight}
                          onChange={(e) => onUpdateWeight(liveConn.id, parseFloat(e.target.value))}
                          className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                        />
                        <div className="w-full h-1.5 rounded-full overflow-hidden flex bg-slate-900 mt-1">
                          <div 
                            className="bg-rose-500 h-full"
                            style={{ 
                              width: liveConn.weight < 0 ? `${Math.min(100, (Math.abs(liveConn.weight) / 3) * 100)}%` : '0%',
                              marginLeft: 'auto'
                            }}
                          />
                          <div className="w-0.5 h-full bg-slate-700" />
                          <div 
                            className="bg-emerald-500 h-full"
                            style={{ 
                              width: liveConn.weight >= 0 ? `${Math.min(100, (liveConn.weight / 3) * 100)}%` : '0%'
                            }}
                          />
                        </div>
                        <span className="text-[8.5px] text-slate-500 block leading-normal font-sans">
                          Slide weight to strengthen or invert the signal pathway. Watch output nodes respond instantly!
                        </span>
                      </div>
                    )}

                    <div className="bg-slate-950 p-3 rounded-xl border border-slate-850 space-y-1.5 text-left text-[10px] font-sans leading-normal text-slate-400">
                      <span className="text-slate-500 font-bold font-mono tracking-wider block uppercase">WEIGHT INFLUENCE:</span>
                      This value scale defines how much signal voltage transfers across this connection. Positive weights excite the target node, negative weights suppress it!
                    </div>
                  </div>
                );
              }

              return (
                <div className="text-xs text-slate-500 text-center font-sans py-10 italic">
                  Hover or click any node or connection pathway to explore and edit values live.
                </div>
              );
            })()}
          </div>

          <div className="text-[9.5px] text-slate-500 font-mono bg-slate-950/40 p-2 rounded-xl border border-slate-900/40 leading-normal">
            <span className="font-bold text-white block mb-0.5">LEGEND DETAILS</span>
            <div className="flex flex-col gap-1 text-slate-400">
              <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" /> Positive Synapse Weight</span>
              <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-rose-500 inline-block" /> Negative Synapse Weight</span>
              <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-blue-500 inline-block" /> Synaptic Voltage Flow</span>
            </div>
          </div>

        </div>

      </div>

    </div>
  );
}
