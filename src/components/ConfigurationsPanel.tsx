import React, { useState } from 'react';
import { 
  Sliders, 
  Layers, 
  Plus, 
  Minus, 
  Activity, 
  Info, 
  Code2, 
  Settings, 
  HelpCircle,
  TrendingUp,
  X,
  Copy,
  Check
} from 'lucide-react';
import { LayerConfig, NetworkState } from '../types/network';

interface ConfigurationsPanelProps {
  layers: LayerConfig[];
  network?: NetworkState;
  learningRate: number;
  setLearningRate: (lr: number) => void;
  activation: 'relu' | 'sigmoid' | 'tanh' | 'linear';
  setActivation: (act: 'relu' | 'sigmoid' | 'tanh' | 'linear') => void;
  handleAddHiddenLayer: () => void;
  handleRemoveHiddenLayer: () => void;
  handleModifyNeuronCount: (layerIdx: number, increment: boolean) => void;
  hideHeader?: boolean;
}

export default function ConfigurationsPanel({
  layers,
  network,
  learningRate,
  setLearningRate,
  activation,
  setActivation,
  handleAddHiddenLayer,
  handleRemoveHiddenLayer,
  handleModifyNeuronCount,
  hideHeader = false
}: ConfigurationsPanelProps) {
  
  const [lrProbe, setLrProbe] = useState<number>(0.8);
  const [selectedCodeTab, setSelectedCodeTab] = useState<'forward' | 'backward' | 'optimizer'>('forward');
  const [copied, setCopied] = useState(false);

  // Simulation states
  const [isSimulating, setIsSimulating] = useState(false);
  const [simulationStep, setSimulationStep] = useState(0);
  const [simulationLogs, setSimulationLogs] = useState<string[]>([
    "[System] Neural Engine Core version 4.12 loaded successfully.",
    "[System] Ready to start mathematical trace sandbox."
  ]);

  const getActiveCode = () => {
    switch (selectedCodeTab) {
      case 'forward':
        return `// 1. Forward Propagation (z = W.x + b)
export function forwardPropagate(network, inputs) {
  const nextNeurons = network.neurons.map(layer => layer.map(n => ({ ...n })));
  
  // Set inputs for L0
  for (let i = 0; i < inputs.length; i++) {
    nextNeurons[0][i].activation = inputs[i];
  }

  // Cascade forward layer-by-layer
  for (let l = 1; l < network.layers.length; l++) {
    const layer = network.layers[l];
    const prevLayer = nextNeurons[l - 1];
    const currentLayer = nextNeurons[l];

    for (let j = 0; j < currentLayer.length; j++) {
      let weightedSum = currentLayer[j].bias;

      for (let i = 0; i < prevLayer.length; i++) {
        const connId = \`\${prevLayer[i].id}->\${currentLayer[j].id}\`;
        const conn = network.connections[connId];
        weightedSum += prevLayer[i].activation * conn.weight;
      }

      currentLayer[j].preAct = weightedSum;
      currentLayer[j].activation = activate(weightedSum, layer.activation);
    }
  }
  return { ...network, neurons: nextNeurons };
}`;
      case 'backward':
        return `// 2. Backpropagation Gradients (Chain Rule)
export function backpropagate(network, expected) {
  const nextNeurons = network.neurons.map(layer => layer.map(n => ({ ...n })));
  const L = network.layers.length;
  
  // Output delta: dL/dz = (a - y) * f'(z)
  for (let k = 0; k < nextNeurons[L-1].length; k++) {
    const neuron = nextNeurons[L-1][k];
    const errorTerm = neuron.activation - expected[k];
    const derivVal = activationDerivative(neuron.activation, neuron.preAct, activation);
    neuron.delta = errorTerm * derivVal;
    neuron.biasGradient = neuron.delta;
  }

  // Hidden delta: dL/dz = sum(w * delta_next) * f'(z)
  for (let l = L - 2; l >= 1; l--) {
    const currentLayer = nextNeurons[l];
    const nextLayer = nextNeurons[l + 1];

    for (let j = 0; j < currentLayer.length; j++) {
      let sumDeltaWeights = 0;
      for (let k = 0; k < nextLayer.length; k++) {
        const conn = network.connections[\`\${currentLayer[j].id}->\${nextLayer[k].id}\`];
        sumDeltaWeights += conn.weight * nextLayer[k].delta;
      }
      const derivVal = activationDerivative(currentLayer[j].activation, currentLayer[j].preAct, activation);
      currentLayer[j].delta = sumDeltaWeights * derivVal;
      currentLayer[j].biasGradient = currentLayer[j].delta;
    }
  }
}`;
      case 'optimizer':
        return `// 3. SGD Weight Parameters Optimization
export function updateParams(network, lr) {
  const nextConnections = { ...network.connections };

  for (const key in nextConnections) {
    const conn = nextConnections[key];
    const grad = conn.weightGradient;

    // Standard Stochastic Gradient Descent
    conn.weight -= lr * grad;
    
    // Adam adaptive moment scaling support
    if (optimizer === 'adam') {
      conn.m = beta1 * conn.m + (1 - beta1) * grad;
      conn.v = beta2 * conn.v + (1 - beta2) * grad * grad;
      const mHat = conn.m / (1 - Math.pow(beta1, t));
      const vHat = conn.v / (1 - Math.pow(beta2, t));
      conn.weight -= (lr * mHat) / (Math.sqrt(vHat) + eps);
    }
  }
  return { ...network, connections: nextConnections };
}`;
    }
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(getActiveCode());
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const handleStepSimulation = () => {
    const codeLines = getActiveCode().split('\n');
    setSimulationStep((prevStep) => {
      const nextStep = (prevStep + 1) % codeLines.length;
      const lineContent = codeLines[nextStep]?.trim() || '';
      
      if (lineContent && !lineContent.startsWith('//')) {
        let logMsg = `[Step Tracer] Line ${nextStep + 1}: ${lineContent.substring(0, 45)}`;
        setSimulationLogs(prev => {
          const updated = [...prev, logMsg];
          if (updated.length > 25) updated.shift();
          return updated;
        });
      }
      return nextStep;
    });
  };

  const handleClearConsole = () => {
    setSimulationLogs([
      "[System] Console logs cleared by user request.",
      "[System] Ready."
    ]);
  };

  // Real-time trace simulator logger effect
  React.useEffect(() => {
    if (!isSimulating) return;

    const codeLines = getActiveCode().split('\n');
    const interval = setInterval(() => {
      setSimulationStep((prevStep) => {
        const nextStep = (prevStep + 1) % codeLines.length;
        
        // Add a smart log line based on step and code tab
        const lineContent = codeLines[nextStep]?.trim() || '';
        if (lineContent && !lineContent.startsWith('//')) {
          let logMsg = '';
          if (selectedCodeTab === 'forward') {
            if (lineContent.includes('nextNeurons[0]')) {
              logMsg = `[L0 Input Node] Loaded current frame features: [${network?.neurons[0]?.map(n => n.activation.toFixed(2)).join(', ') || '0.90, 0.20'}]`;
            } else if (lineContent.includes('weightedSum =')) {
              logMsg = `[Algebra] Initialized weighted sum z with bias offset: ${network?.neurons[1]?.[0]?.bias.toFixed(4) || '0.1500'}`;
            } else if (lineContent.includes('weightedSum +=') || lineContent.includes('conn.weight')) {
              const connKeys = network ? Object.keys(network.connections) : [];
              const randomKey = connKeys[Math.floor(Math.random() * connKeys.length)] || 'x1->h1_1';
              const randomConn = network?.connections[randomKey];
              if (randomConn) {
                logMsg = `[Synapse Compute] Multiply ${randomKey.split('->')[0]} * Weight(${randomConn.weight.toFixed(3)}) => Add to z`;
              }
            } else if (lineContent.includes('activate(')) {
              logMsg = `[Non-Linearity] Apply ${activation.toUpperCase()} filter: a = active(z) => Output value: ${(network?.neurons[1]?.[0]?.activation || 0.45).toFixed(4)}`;
            } else {
              logMsg = `[Forward Pass] Executed logic step: ${lineContent.substring(0, 35)}...`;
            }
          } else if (selectedCodeTab === 'backward') {
            if (lineContent.includes('errorTerm =')) {
              logMsg = `[Error Compute] Delta difference (a_output - target) => dE/da`;
            } else if (lineContent.includes('derivVal =')) {
              logMsg = `[Chain Rule] Calculate derivative of activation ${activation.toUpperCase()} = ${activation === 'relu' ? 'ReLU\'(z)' : 'Sigmoid\'(z)'}`;
            } else if (lineContent.includes('sumDeltaWeights =')) {
              logMsg = `[Gradient Flow] Accumulating backpropagation weights: Sum(weight * delta_next)`;
            } else if (lineContent.includes('delta =')) {
              logMsg = `[Backprop] Propagated local node gradient threshold (delta)`;
            } else {
              logMsg = `[Backpropagation] Trace register statement: ${lineContent.substring(0, 35)}...`;
            }
          } else {
            if (lineContent.includes('grad =')) {
              logMsg = `[Optimizer] Loaded gradient threshold for weight connection update`;
            } else if (lineContent.includes('conn.weight -=')) {
              logMsg = `[SGD Optimize] Adjust weight -= learning_rate (${learningRate.toFixed(4)}) * weight_gradient`;
            } else if (lineContent.includes('beta1')) {
              logMsg = `[Adam Scaling] Calculate first-moment gradient average (m) with momentum beta1: 0.90`;
            } else if (lineContent.includes('beta2')) {
              logMsg = `[Adam Scaling] Calculate second-moment variance average (v) with momentum beta2: 0.999`;
            } else {
              logMsg = `[Weight Optimizer] Executing parameter updates: ${lineContent.substring(0, 35)}...`;
            }
          }

          if (logMsg) {
            setSimulationLogs((prevLogs) => {
              const updated = [...prevLogs, logMsg];
              if (updated.length > 25) updated.shift();
              return updated;
            });
          }
        }
        
        return nextStep;
      });
    }, 1100);

    return () => clearInterval(interval);
  }, [isSimulating, selectedCodeTab, network, activation, learningRate]);

  const renderSyntaxHighlight = (codeText: string, activeLineIndex?: number) => {
    const keywords = ['function', 'export', 'for', 'let', 'const', 'return', 'if', 'else', 'switch', 'case', 'break'];
    const types = ['NetworkState', 'number', 'LayerConfig', 'NeuronState', 'expected', 'inputs'];
    
    const lines = codeText.split('\n');
    return lines.map((line, lineIdx) => {
      const isActive = lineIdx === activeLineIndex && isSimulating;
      if (line.trim().startsWith('//')) {
        return (
          <div 
            key={lineIdx} 
            className={`text-slate-500 italic font-mono text-[10px] px-2 py-0.5 rounded transition-all duration-150 ${
              isActive ? 'bg-purple-950/30 border-l-2 border-purple-500 font-medium' : ''
            }`}
          >
            {line}
          </div>
        );
      }
      
      const parts = line.split(/(\s+|[{}()\[\];.,:`'"]|=>|===|==|=|\+=|-=|\*=)/);
      return (
        <div 
          key={lineIdx} 
          className={`min-h-[1.2em] font-mono text-[10px] px-2 py-0.5 rounded transition-all duration-150 ${
            isActive ? 'bg-purple-950/35 border-l-2 border-purple-500 text-white font-semibold shadow-[inset_3px_0_0_#a855f7]' : ''
          }`}
        >
          {parts.map((part, partIdx) => {
            if (keywords.includes(part)) {
              return <span key={partIdx} className="text-purple-400 font-bold">{part}</span>;
            }
            if (types.includes(part)) {
              return <span key={partIdx} className="text-cyan-400">{part}</span>;
            }
            if (part.startsWith('`') || part.startsWith("'") || part.startsWith('"') || (part.endsWith('`') || part.endsWith("'") || part.endsWith('"'))) {
              return <span key={partIdx} className="text-amber-400">{part}</span>;
            }
            if (/^\d+(\.\d+)?$/.test(part)) {
              return <span key={partIdx} className="text-orange-400">{part}</span>;
            }
            if (['+', '-', '*', '/', '=', '===', '==', '>', '<', '=>', '+=', '-='].includes(part)) {
              return <span key={partIdx} className="text-pink-500 font-medium">{part}</span>;
            }
            return <span key={partIdx}>{part}</span>;
          })}
        </div>
      );
    });
  };

  const getPseudoCode = () => {
    switch (activation) {
      case 'relu':
        return `for each input:
  z = W.x + b
  a = ReLU(z)
output = Softmax(a)`;
      case 'sigmoid':
        return `for each input:
  z = W.x + b
  a = Sigmoid(z)
output = Softmax(a)`;
      case 'tanh':
        return `for each input:
  z = W.x + b
  a = Tanh(z)
output = Softmax(a)`;
      case 'linear':
      default:
        return `for each input:
  z = W.x + b
  a = Linear(z)
output = Softmax(a)`;
    }
  };

  const getActivationDescription = () => {
    switch (activation) {
      case 'relu':
        return "ReLU keeps positive values and sets negative values strictly to zero. This addresses vanishing gradients and makes the network extremely fast to train!";
      case 'sigmoid':
        return "Sigmoid maps outputs smoothly between 0.0 and 1.0. Perfect for final target probabilities but can stall optimization with large input vectors.";
      case 'tanh':
        return "Tanh maps inputs smoothly between -1.0 and +1.0. Zero-centered activations lead to more balanced, accelerated backpropagation cycles.";
      case 'linear':
        return "Linear outputs the raw sum of weighted signals directly. Ideal for standard regression but limits the network's capacity for non-linear learning.";
    }
  };

  // Get coordinate y-values for drawing the activation function graph
  const getActivationValue = (x: number, type: string) => {
    switch (type) {
      case 'relu': return Math.max(0, x);
      case 'sigmoid': return 1 / (1 + Math.exp(-x));
      case 'tanh': return Math.tanh(x);
      case 'linear': return x;
      default: return x;
    }
  };

  // Coordinates for inline SVG drawing
  const getLayerX = (layerIndex: number, totalLayers: number, containerWidth: number) => {
    const padding = 40;
    return padding + (layerIndex / (totalLayers - 1)) * (containerWidth - 2 * padding);
  };

  const getNodeY = (nodeIndex: number, layerSize: number, containerHeight: number) => {
    const centerY = containerHeight / 2;
    if (layerSize === 1) return centerY;
    const spacing = Math.min(22, (containerHeight - 24) / (layerSize - 1));
    const totalHeight = (layerSize - 1) * spacing;
    const startY = centerY - totalHeight / 2;
    return startY + nodeIndex * spacing;
  };

  return (
    <div id="configuration-panel" className="flex-1 flex flex-col p-6 overflow-y-auto text-slate-100 font-sans gap-6 select-none bg-gradient-to-br from-[#040815] via-[#080d1a] to-[#02050e]">
      
      {/* SVG GLOW FILTERS FOR AMAZING NEON VISUALS */}
      <svg className="absolute w-0 h-0" width="0" height="0">
        <defs>
          <filter id="config-glow-cyan" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="3.5" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <filter id="config-glow-purple" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="3.5" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <filter id="config-glow-orange" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="3.5" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
      </svg>

      {/* 1. Jumbotron Header */}
      {!hideHeader && (
        <div className="bg-[#060a18]/70 border border-[#141d35]/75 rounded-2xl p-5 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shadow-xl shrink-0 text-left relative overflow-hidden backdrop-blur-md">
          <div className="absolute top-0 right-0 w-80 h-80 bg-purple-500/5 rounded-full blur-3xl pointer-events-none" />
          <div className="space-y-1 z-10">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono font-bold tracking-widest text-purple-400 uppercase bg-purple-950/45 border border-purple-800/25 px-2.5 py-0.5 rounded shadow-[0_0_12px_rgba(168,85,247,0.1)]">
                Interactive Settings Lab
              </span>
            </div>
            <h1 className="text-xl font-black tracking-tight text-white uppercase font-display">Configure Your Neural Network</h1>
            <p className="text-xs text-slate-400">Adjust hyperparameters, learning rate, and active layers in real-time.</p>
          </div>
        </div>
      )}

      {/* 2. Main Double Panel Grid split */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch relative z-10">
        
        {/* Left Card Column: Interactive Controls & PseudoCode (5 columns) */}
        <div id="tour-config-controls" className="lg:col-span-5 bg-[#060a18]/70 border border-[#141d35]/75 rounded-2xl p-6 flex flex-col gap-5 shadow-xl backdrop-blur-md text-left hover:border-purple-500/20 transition-all duration-300 relative group">
          <div className="absolute top-0 right-0 w-16 h-16 bg-purple-500/5 rounded-full blur-xl opacity-0 group-hover:opacity-100 transition-opacity" />
          <div className="space-y-4">
            
            {/* Input Layer Neurons Control */}
            <div className="flex flex-col gap-1.5">
              <span className="text-[10px] font-mono text-slate-500 uppercase font-black tracking-wider">Input Neurons (L0)</span>
              <div className="flex items-center justify-between bg-[#030611] border border-[#141d35] p-3 rounded-xl">
                <button
                  onClick={() => handleModifyNeuronCount(0, false)}
                  disabled={layers[0]?.size <= 1}
                  className="w-10 h-10 bg-slate-900/60 border border-[#141d35] rounded-lg flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer disabled:opacity-20 transition active:scale-95"
                >
                  <Minus size={14} />
                </button>
                <div className="text-center">
                  <span className="text-lg font-black font-mono text-white">{layers[0]?.size ?? 3}</span>
                  <span className="text-[9px] text-slate-500 font-mono block">Input Nodes</span>
                </div>
                <button
                  onClick={() => handleModifyNeuronCount(0, true)}
                  disabled={layers[0]?.size >= 8}
                  className="w-10 h-10 bg-slate-900/60 border border-[#141d35] rounded-lg flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer disabled:opacity-20 transition active:scale-95"
                >
                  <Plus size={14} />
                </button>
              </div>
            </div>

            {/* Hidden Layers Setup */}
            <div className="flex flex-col gap-1.5">
              <span className="text-[10px] font-mono text-slate-500 uppercase font-black tracking-wider">Number of Hidden Layers</span>
              <div className="flex items-center justify-between bg-[#030611] border border-[#141d35] p-3 rounded-xl">
                <button
                  onClick={handleRemoveHiddenLayer}
                  disabled={layers.length <= 3}
                  className="w-10 h-10 bg-slate-900/60 border border-[#141d35] rounded-lg flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer disabled:opacity-20 transition active:scale-95"
                >
                  <Minus size={14} />
                </button>
                <div className="text-center">
                  <span className="text-lg font-black font-mono text-white">{layers.length - 2}</span>
                  <span className="text-[9px] text-slate-500 font-mono block">Hidden Layer{layers.length - 2 > 1 ? 's' : ''}</span>
                </div>
                <button
                  onClick={handleAddHiddenLayer}
                  disabled={layers.length >= 7}
                  className="w-10 h-10 bg-slate-900/60 border border-[#141d35] rounded-lg flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer disabled:opacity-20 transition active:scale-95"
                >
                  <Plus size={14} />
                </button>
              </div>
            </div>

            {/* Neurons in Hidden Layers */}
            <div className="flex flex-col gap-1.5">
              <span className="text-[10px] font-mono text-slate-500 uppercase font-black tracking-wider">Neurons in Hidden Layers</span>
              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {layers.slice(1, layers.length - 1).map((layer, idx) => {
                  const layerIdx = idx + 1;
                  return (
                    <div key={layer.id || layerIdx} className="flex items-center justify-between bg-[#030611] border border-[#141d35]/70 p-2.5 rounded-xl">
                      <div className="text-left">
                        <span className="text-xs font-bold text-slate-300 font-sans block">Hidden Layer #{layerIdx}</span>
                        <span className="text-[9.5px] text-slate-500 font-mono">Size: {layer.size} neuron{layer.size > 1 ? 's' : ''}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleModifyNeuronCount(layerIdx, false)}
                          disabled={layer.size <= 1}
                          className="w-8 h-8 bg-slate-900/60 border border-[#141d35] rounded-lg flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer disabled:opacity-20 transition active:scale-90"
                        >
                          <Minus size={12} />
                        </button>
                        <span className="text-sm font-black font-mono text-white w-5 text-center">{layer.size}</span>
                        <button
                          onClick={() => handleModifyNeuronCount(layerIdx, true)}
                          disabled={layer.size >= 8}
                          className="w-8 h-8 bg-slate-900/60 border border-[#141d35] rounded-lg flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer disabled:opacity-20 transition active:scale-90"
                        >
                          <Plus size={12} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Output Layer Neurons Control */}
            <div className="flex flex-col gap-1.5">
              <span className="text-[10px] font-mono text-slate-500 uppercase font-black tracking-wider">Output Neurons (LF)</span>
              <div className="flex items-center justify-between bg-[#030611] border border-[#141d35] p-3 rounded-xl">
                <button
                  onClick={() => handleModifyNeuronCount(layers.length - 1, false)}
                  disabled={layers[layers.length - 1]?.size <= 1}
                  className="w-10 h-10 bg-slate-900/60 border border-[#141d35] rounded-lg flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer disabled:opacity-20 transition active:scale-95"
                >
                  <Minus size={14} />
                </button>
                <div className="text-center">
                  <span className="text-lg font-black font-mono text-white">{layers[layers.length - 1]?.size ?? 3}</span>
                  <span className="text-[9px] text-slate-500 font-mono block">Output Nodes</span>
                </div>
                <button
                  onClick={() => handleModifyNeuronCount(layers.length - 1, true)}
                  disabled={layers[layers.length - 1]?.size >= 8}
                  className="w-10 h-10 bg-slate-900/60 border border-[#141d35] rounded-lg flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer disabled:opacity-20 transition active:scale-95"
                >
                  <Plus size={14} />
                </button>
              </div>
            </div>

            {/* Activation Function Selection Dropdown */}
            <div className="flex flex-col gap-1.5">
              <span className="text-[10px] font-mono text-slate-500 uppercase font-black tracking-wider">Activation Function</span>
              <select
                value={activation}
                onChange={(e) => setActivation(e.target.value as any)}
                className="w-full bg-[#030611] border border-[#141d35] text-xs font-bold text-slate-300 rounded-xl px-4 py-3 outline-none focus:border-purple-500 cursor-pointer transition-colors"
              >
                <option value="relu">ReLU (Rectified Linear)</option>
                <option value="sigmoid">Sigmoid (Logistic probability)</option>
                <option value="tanh">Tanh (Hyperbolic Tangent)</option>
                <option value="linear">Linear (No threshold filter)</option>
              </select>
            </div>

            {/* Learning Rate Slider */}
            <div className="flex flex-col gap-2">
              <div className="flex justify-between items-center text-[10px] font-mono font-black uppercase text-slate-500">
                <span>Learning Rate</span>
                <span className="text-purple-400 font-bold">{learningRate.toFixed(4)}</span>
              </div>
              <div className="relative flex items-center">
                <input
                  type="range"
                  min="0.0001"
                  max="1.0"
                  step="0.005"
                  value={learningRate}
                  onChange={(e) => setLearningRate(parseFloat(e.target.value))}
                  className="w-full h-1.5 bg-[#030611] border border-[#141d35] rounded-lg appearance-none cursor-pointer accent-purple-400"
                />
              </div>
              <div className="flex justify-between text-[9px] text-slate-600 font-mono font-bold">
                <span>0.0001 (Slow)</span>
                <span>1.0000 (Fast)</span>
              </div>
            </div>

          </div>

        </div>

        {/* Right Card Column: Architecture Preview & Active Function Curve (7 columns) */}
        <div id="tour-config-code" className="lg:col-span-7 bg-[#060a18]/70 border border-[#141d35]/75 rounded-2xl p-6 flex flex-col justify-between shadow-xl backdrop-blur-md text-left gap-5 hover:border-[#141d35]/90 transition-all duration-300">
          
          <div className="space-y-4">
            
            {/* Header row */}
            <div className="flex items-center justify-between border-b border-[#141d35]/65 pb-2">
              <span className="text-xs font-black font-mono text-white uppercase tracking-wider font-display">Layer Architecture Outline</span>
              <span className="text-[9px] font-mono font-bold text-cyan-400 bg-cyan-950/20 px-2 py-0.5 rounded border border-cyan-900/30">Dynamic Sizing</span>
            </div>

            {/* SVG Network rendering */}
            <div className="bg-[#030611] border border-[#141d35] rounded-xl p-4 min-h-[190px] flex items-center justify-center relative overflow-hidden">
              <div className="absolute inset-0 bg-[radial-gradient(rgba(168,85,247,0.02)_1px,transparent_1px)] bg-[size:16px_16px] pointer-events-none" />
              
              <svg className="w-full h-40" viewBox="0 0 380 170" preserveAspectRatio="xMidYMid meet" style={{ overflow: 'visible' }}>
                <style>{`
                  @keyframes activeFlowPulse {
                    0% { stroke-dashoffset: 20; }
                    100% { stroke-dashoffset: 0; }
                  }
                  .glow-particle-flow {
                    stroke-dasharray: 5 10;
                    animation: activeFlowPulse 1.4s linear infinite;
                  }
                  .node-pulse-halo {
                    animation: pulseHalo 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
                  }
                  @keyframes pulseHalo {
                    0%, 100% { opacity: 0.25; transform: scale(1); }
                    50% { opacity: 0.55; transform: scale(1.15); }
                  }
                `}</style>
                
                {/* 1. Connections rendering */}
                {layers.map((layer, lIdx) => {
                  if (lIdx === layers.length - 1) return null;
                  const nextLayer = layers[lIdx + 1];
                  return Array.from({ length: layer.size }).map((_, i) => (
                    <g key={`${lIdx}_${i}`}>
                      {Array.from({ length: nextLayer.size }).map((_, j) => {
                        const x1 = getLayerX(lIdx, layers.length, 360);
                        const x2 = getLayerX(lIdx + 1, layers.length, 360);
                        const y1 = getNodeY(i, layer.size, 160);
                        const y2 = getNodeY(j, nextLayer.size, 160);

                        // Look up real weight if network is initialized
                        const fromNodeId = `layer_${lIdx}_node_${i}`;
                        const toNodeId = `layer_${lIdx + 1}_node_${j}`;
                        const connId = `${fromNodeId}->${toNodeId}`;
                        const conn = network?.connections?.[connId];
                        
                        // Determinstic stable fallback if network isn't initialized
                        const weight = conn ? conn.weight : Math.sin(lIdx * 8 + i * 12 + j * 15) * 1.5;
                        const isPositive = weight >= 0;
                        const absWeight = Math.abs(weight);
                        
                        const cableColor = isPositive ? '#10b981' : '#ef4444';
                        const strokeWidth = Math.max(0.6, Math.min(4, absWeight * 1.8));

                        return (
                          <g key={j} className="opacity-80">
                            {/* Ambient background connection wire */}
                            <line
                              x1={x1} y1={y1} x2={x2} y2={y2}
                              stroke={cableColor}
                              strokeWidth={strokeWidth}
                              opacity="0.12"
                            />
                            {/* Inner active neon flow signal dashes */}
                            <line
                              x1={x1} y1={y1} x2={x2} y2={y2}
                              stroke={cableColor}
                              strokeWidth={strokeWidth * 0.7 + 0.4}
                              className="glow-particle-flow"
                              opacity="0.45"
                            />
                          </g>
                        );
                      })}
                    </g>
                  ));
                })}

                {/* 2. Nodes rendering with interactive live values */}
                {layers.map((layer, lIdx) => {
                  const isInput = lIdx === 0;
                  const isOutput = lIdx === layers.length - 1;
                  const nodeColor = isInput ? '#10b981' : isOutput ? '#f59e0b' : '#8b5cf6';
                  const glowFilter = isInput ? 'url(#config-glow-cyan)' : isOutput ? 'url(#config-glow-orange)' : 'url(#config-glow-purple)';

                  return (
                    <g key={lIdx}>
                      {/* Label above each layer group */}
                      <text
                        x={getLayerX(lIdx, layers.length, 360)}
                        y="-4"
                        textAnchor="middle"
                        fill="#475569"
                        fontSize="7"
                        fontWeight="bold"
                        className="font-mono uppercase tracking-widest select-none"
                      >
                        {isInput ? "Input" : isOutput ? "Output" : `Hidden L${lIdx}`}
                      </text>

                      {Array.from({ length: layer.size }).map((_, nIdx) => {
                        const cx = getLayerX(lIdx, layers.length, 360);
                        const cy = getNodeY(nIdx, layer.size, 160);
                        
                        // Extract live neuron activation signal from memory
                        const neuron = network?.neurons?.[lIdx]?.[nIdx];
                        // Generates static, stable fallback if applet isn't initialized
                        const activationValue = neuron 
                          ? neuron.activation 
                          : (isInput ? (nIdx === 0 ? 0.9 : 0.2) : isOutput ? 0.85 : 0.45);

                        return (
                          <g key={nIdx}>
                            {/* Concentric pulsing indicator halo */}
                            <circle
                              cx={cx}
                              cy={cy}
                              r="15"
                              fill="transparent"
                              stroke={nodeColor}
                              strokeWidth="0.8"
                              opacity="0.15"
                              style={{ transformOrigin: `${cx}px ${cy}px` }}
                              className="node-pulse-halo"
                            />

                            {/* Solid neuron backdrop circle */}
                            <circle
                              cx={cx}
                              cy={cy}
                              r="10.5"
                              fill="#02050e"
                              stroke={nodeColor}
                              strokeWidth="1.8"
                              filter={glowFilter}
                              className="transition-all duration-200 hover:scale-110"
                            />

                            {/* Node value label printed on inside core */}
                            <text
                              x={cx}
                              y={cy + 2.5}
                              textAnchor="middle"
                              fill="#ffffff"
                              fontSize="6.5"
                              fontWeight="bold"
                              className="font-mono pointer-events-none select-none"
                            >
                              {isInput ? activationValue.toFixed(1) : activationValue.toFixed(2)}
                            </text>

                            {/* Floating node name index label (e.g. x1, h1_1) */}
                            <text
                              x={cx}
                              y={cy - 14}
                              textAnchor="middle"
                              fill="#64748b"
                              fontSize="6"
                              fontWeight="black"
                              className="font-sans uppercase pointer-events-none select-none"
                            >
                              {isInput ? `x${nIdx + 1}` : isOutput ? `y${nIdx + 1}` : `h${lIdx}_${nIdx + 1}`}
                            </text>
                          </g>
                        );
                      })}
                    </g>
                  );
                })}

              </svg>
            </div>

            {/* Active Threshold graph plot */}
            <div className="space-y-2 pt-2 text-left">
              <span className="text-[10px] font-mono font-black text-purple-400 uppercase tracking-widest block">
                Non-Linear Threshold Curve: {activation.toUpperCase()}
              </span>

              <div className="bg-[#030611] border border-[#141d35] rounded-xl p-4 flex flex-col md:flex-row items-center gap-5 relative overflow-hidden">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_rgba(6,182,212,0.02)_0%,transparent_70%)] pointer-events-none" />
                
                {/* SVG Curve Plot */}
                <div className="w-full md:w-1/3 h-24 bg-slate-950 border border-[#141d35]/60 rounded-lg flex items-center justify-center p-2 relative overflow-hidden">
                  <svg className="w-full h-full" viewBox="0 0 100 60">
                    <line x1="10" y1="30" x2="90" y2="30" stroke="#1e293b" strokeWidth="0.8" /> {/* X axis */}
                    <line x1="50" y1="5" x2="50" y2="55" stroke="#1e293b" strokeWidth="0.8" /> {/* Y axis */}
                    
                    {/* Plot Path */}
                    <path
                      d={Array.from({ length: 31 }).map((_, idx) => {
                        const xVal = -2 + (idx / 30) * 4; // -2 to +2
                        const yVal = getActivationValue(xVal, activation);
                        
                        // Map to SVG coordinates
                        const svgX = 10 + (idx / 30) * 80;
                        let svgY = 30;
                        if (activation === 'relu') {
                          svgY = 30 - (yVal / 2) * 20;
                        } else if (activation === 'sigmoid') {
                          svgY = 50 - yVal * 40;
                        } else {
                          svgY = 30 - yVal * 20;
                        }
                        return `${idx === 0 ? 'M' : 'L'} ${svgX} ${svgY}`;
                      }).join(' ')}
                      fill="none"
                      stroke="#06b6d4"
                      strokeWidth="2.2"
                      filter="url(#config-glow-cyan)"
                    />
                  </svg>
                </div>

                {/* Explanation text */}
                <div className="flex-1 text-xs text-slate-300 leading-relaxed font-sans font-medium">
                  {getActivationDescription()}
                </div>

              </div>
            </div>

          </div>

          <div className="text-[10px] text-slate-500 font-mono font-bold mt-4 pt-3 border-t border-[#141d35]/65 flex items-center gap-1.5">
            <Info size={12} className="text-emerald-500" />
            <span>Layer configuration is automatically hot-reloaded into active browser sandbox memory.</span>
          </div>

        </div>

        {/* Full-width bottom section: Neural Code Studio & Execution Console */}
        <div className="lg:col-span-12 bg-[#060a18]/70 border border-[#141d35]/75 rounded-2xl p-6 flex flex-col shadow-xl backdrop-blur-md text-left gap-6 hover:border-purple-500/10 transition-all duration-300 relative group mt-2">
          {/* Header of Code Studio */}
          <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-[#141d35]/65 pb-4 gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Code2 size={16} className="text-purple-400" />
                <h2 className="text-sm font-black tracking-tight text-white uppercase font-display">
                  Neural Code Studio & Execution Console
                </h2>
              </div>
              <p className="text-[11px] text-slate-400">
                Inspect mathematically synchronized, functional algorithms with simulated live trace registers.
              </p>
            </div>

            {/* Simulation Speed & Controls */}
            <div className="flex items-center gap-3">
              <div className="flex items-center bg-[#030611] border border-[#141d35] p-1 rounded-xl">
                <button
                  onClick={() => setIsSimulating(!isSimulating)}
                  className={`px-3 py-1.5 rounded-lg font-mono font-bold text-[10px] uppercase flex items-center gap-1.5 transition-all cursor-pointer ${
                    isSimulating
                      ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20 shadow-[0_0_8px_rgba(245,158,11,0.08)]'
                      : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shadow-[0_0_8px_rgba(16,185,129,0.08)]'
                  }`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${isSimulating ? 'bg-amber-400 animate-pulse' : 'bg-emerald-400'}`} />
                  {isSimulating ? 'Pause Trace' : 'Play Live Trace'}
                </button>
                <button
                  onClick={handleStepSimulation}
                  disabled={isSimulating}
                  className="px-2.5 py-1.5 text-slate-450 hover:text-white disabled:opacity-20 transition-all font-mono text-[10px] font-bold uppercase rounded-lg cursor-pointer"
                  title="Manually execute next logic statement"
                >
                  Step Line
                </button>
                <button
                  onClick={handleClearConsole}
                  className="px-2.5 py-1.5 text-slate-500 hover:text-slate-350 transition-all font-mono text-[10px] font-bold uppercase rounded-lg cursor-pointer"
                  title="Flush terminal output"
                >
                  Clear Console
                </button>
              </div>

              <button
                onClick={handleCopyCode}
                className="flex items-center gap-1.5 text-[10px] font-mono font-bold text-slate-450 hover:text-white bg-[#030611] hover:bg-slate-900 border border-[#141d35] px-3.5 py-2 rounded-xl cursor-pointer transition-all duration-150"
              >
                {copied ? <Check size={11} className="text-emerald-400" /> : <Copy size={11} />}
                <span>{copied ? 'Copied code!' : 'Copy Module'}</span>
              </button>
            </div>
          </div>

          {/* Double panel grid inside Bottom Section */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
            {/* 1. IDE Code Editor Column (7 columns) */}
            <div className="lg:col-span-7 flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono font-black tracking-widest text-slate-500 uppercase">
                  ACTIVE ALGORITHM FILE: <span className="text-purple-400 font-extrabold">{selectedCodeTab === 'forward' ? 'forwardProp.ts' : selectedCodeTab === 'backward' ? 'backprop.ts' : 'sgdOptimizer.ts'}</span>
                </span>
                
                {/* Code Tabs */}
                <div className="flex bg-[#030611] p-1 rounded-xl border border-[#141d35] gap-1 shrink-0">
                  {[
                    { id: 'forward', label: '1. Forward Pass' },
                    { id: 'backward', label: '2. Backpropagation' },
                    { id: 'optimizer', label: '3. SGD Parameters' }
                  ].map(tab => (
                    <button
                      key={tab.id}
                      onClick={() => {
                        setSelectedCodeTab(tab.id as any);
                        setSimulationStep(0);
                      }}
                      className={`px-3 py-1 text-[9px] font-black font-mono tracking-wide uppercase rounded-lg text-center cursor-pointer transition-all ${
                        selectedCodeTab === tab.id
                          ? 'bg-purple-500/10 border border-purple-500/20 text-purple-400 shadow-[0_0_8px_rgba(168,85,247,0.05)]'
                          : 'border border-transparent text-slate-500 hover:text-slate-350 hover:bg-[#0c1225]/40'
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Advanced IDE Shell mockup */}
              <div className="flex flex-col bg-[#02050e]/95 rounded-2xl border border-[#141d35] overflow-hidden min-h-[380px] lg:min-h-[460px] relative shadow-2xl">
                {/* Mac-style Window Topbar */}
                <div className="bg-[#030612] px-4 py-3 border-b border-[#141d35]/65 flex items-center justify-between select-none">
                  <div className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-full bg-rose-500/80 block" />
                    <span className="w-3 h-3 rounded-full bg-amber-500/80 block" />
                    <span className="w-3 h-3 rounded-full bg-emerald-500/80 block" />
                  </div>
                  <span className="text-[10px] font-mono text-slate-500 font-bold">TypeScript Language Server • ESModule</span>
                  <div className="w-12" />
                </div>

                <div className="flex flex-1 relative overflow-hidden">
                  {/* Line Numbers Sidebar */}
                  <div className="bg-[#030612]/80 text-slate-600 font-mono text-[10px] text-right px-4 py-5 border-r border-[#141d35]/60 select-none leading-relaxed flex flex-col justify-start shrink-0">
                    {getActiveCode().split('\n').map((_, i) => {
                      const isActiveLine = i === simulationStep && isSimulating;
                      return (
                        <span 
                          key={i} 
                          className={`block min-h-[1.2em] px-1 rounded transition-colors duration-150 ${isActiveLine ? 'bg-purple-950/40 text-purple-400 font-black' : ''}`}
                        >
                          {i + 1}
                        </span>
                      );
                    })}
                  </div>
                  
                  {/* Actual Code Area */}
                  <div className="p-5 flex-1 whitespace-pre overflow-x-auto overflow-y-auto scrollbar-thin scrollbar-thumb-slate-800 scrollbar-track-transparent leading-relaxed relative">
                    <div className="block leading-relaxed">
                      {renderSyntaxHighlight(getActiveCode(), simulationStep)}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* 2. Interactive Simulation Execution Console (5 columns) */}
            <div className="lg:col-span-5 flex flex-col justify-between gap-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono font-black tracking-widest text-slate-500 uppercase">
                  SIMULATION TERMINAL & REGISTERS
                </span>
                <span className="text-[9px] font-mono font-bold text-amber-400 bg-amber-950/20 px-2 py-0.5 rounded border border-amber-900/30">
                  {isSimulating ? 'Tracing Engine Active' : 'Idle'}
                </span>
              </div>

              {/* Console logs box */}
              <div className="flex-1 bg-[#02050f] border border-[#141d35] rounded-2xl p-4 flex flex-col justify-between overflow-hidden min-h-[380px] lg:min-h-[460px] shadow-2xl relative">
                {/* Console scanlines background */}
                <div className="absolute inset-0 bg-gradient-to-b from-slate-900/10 via-transparent to-transparent pointer-events-none" />

                <div className="space-y-4 overflow-y-auto flex-1 max-h-[280px] lg:max-h-[340px] pr-1 scrollbar-thin scrollbar-thumb-slate-800">
                  <div className="border-b border-[#141d35]/65 pb-2">
                    <span className="text-[10px] font-mono text-cyan-400 font-bold block">
                      &gt; Live Process Stack Trace
                    </span>
                  </div>

                  {/* Logs list */}
                  <div className="space-y-2.5 font-mono text-[10.5px] leading-relaxed text-left">
                    {simulationLogs.map((log, idx) => {
                      let typeColor = 'text-slate-400';
                      if (log.startsWith('[Error]')) typeColor = 'text-rose-400 font-bold';
                      else if (log.startsWith('[System]') || log.startsWith('Initialized')) typeColor = 'text-indigo-400 font-bold';
                      else if (log.startsWith('[Weight]') || log.startsWith('[Bias]')) typeColor = 'text-pink-400';
                      else if (log.includes('=>') || log.includes('->')) typeColor = 'text-emerald-400 font-medium';
                      
                      return (
                        <div key={idx} className={`${typeColor} border-l-2 border-slate-800 pl-2 py-0.5 animate-fadeIn`}>
                          {log}
                        </div>
                      );
                    })}
                    {simulationLogs.length === 0 && (
                      <div className="text-slate-500 text-[10px] italic py-10 text-center font-sans">
                        Terminal ready. Tap "Play Live Trace" or alter model configurations/sliders above to generate real-time execution steps.
                      </div>
                    )}
                  </div>
                </div>

                {/* State Probe values monitor */}
                <div className="mt-4 pt-3 border-t border-[#141d35]/60 bg-[#030612]/90 rounded-xl p-3 space-y-2 text-left">
                  <span className="text-[9px] font-mono font-black text-slate-500 uppercase block tracking-wider">
                    Mathematical Register Probe:
                  </span>
                  
                  {/* Dynamic inputs & layers probe */}
                  <div className="grid grid-cols-2 gap-3 text-[10px] font-mono leading-normal">
                    <div className="bg-[#050918]/60 p-2 rounded-lg border border-[#141d35]/40">
                      <span className="text-slate-500 block text-[9px] uppercase font-bold">Input Matrix [X]:</span>
                      <span className="text-cyan-400 font-bold block">
                        [{network?.neurons[0]?.map(n => n.activation.toFixed(2)).join(', ') || '0.90, 0.20'}]
                      </span>
                    </div>

                    <div className="bg-[#050918]/60 p-2 rounded-lg border border-[#141d35]/40">
                      <span className="text-slate-500 block text-[9px] uppercase font-bold">Output Matrix [Y_hat]:</span>
                      <span className="text-amber-400 font-bold block">
                        [{network?.neurons[layers.length - 1]?.map(n => n.activation.toFixed(2)).join(', ') || '0.85'}]
                      </span>
                    </div>
                  </div>

                  {/* Weight probe summary */}
                  <div className="bg-[#050918]/60 p-2 rounded-lg border border-[#141d35]/40 text-[9px] font-mono flex justify-between items-center">
                    <div>
                      <span className="text-slate-500 block uppercase font-bold text-[8.5px]">Avg Weight Magnitude:</span>
                      <span className="text-emerald-400 font-bold text-[10.5px]">
                        {(() => {
                          if (!network) return '1.25';
                          const keys = Object.keys(network.connections);
                          if (keys.length === 0) return '0.00';
                          const sum = keys.reduce((acc, k) => acc + Math.abs(network.connections[k].weight), 0);
                          return (sum / keys.length).toFixed(4);
                        })()}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500 block uppercase font-bold text-[8.5px]">Total Synapses:</span>
                      <span className="text-purple-400 font-extrabold text-[10.5px] block text-right">
                        {network ? Object.keys(network.connections).length : '16'} Paths
                      </span>
                    </div>
                  </div>

                </div>

              </div>
            </div>
          </div>
        </div>

      </div>

    </div>
  );
}
