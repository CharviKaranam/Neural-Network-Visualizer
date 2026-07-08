import React, { useState, useEffect } from 'react';
import { 
  LayoutDashboard, 
  Settings, 
  Layers, 
  Activity, 
  Variable, 
  Brain, 
  X, 
  ChevronRight, 
  Check,
  LayoutGrid,
  Play,
  Sparkles,
  HelpCircle,
  Lightbulb,
  ChevronLeft,
  Volume2,
  VolumeX
} from 'lucide-react';
import { 
  LayerConfig, 
  NetworkState, 
  MetricPoint, 
  NeuronState 
} from './types/network';
import { 
  initializeNetwork, 
  forwardPropagate, 
  backpropagate, 
  updateParams, 
  calculateLoss 
} from './utils/mathEngine';
import { audioSynth } from './utils/audioSynth';

// Import our gorgeous newly created panels
import DashboardPanel from './components/DashboardPanel';
import ConfigurationsPanel from './components/ConfigurationsPanel';
import VisualArchitecturePanel from './components/VisualArchitecturePanel';
import GraphsPanel from './components/GraphsPanel';
import MathEquationsPanel from './components/MathEquationsPanel';

// Define professional scientific datasets
const SCIENTIFIC_DATASET = {
  name: "Multivariable Coordinate Classifier",
  description: "Classifies 3D coordinates based on Euclidean geometric functions.",
  items: [
    { id: "d1", input: [0.5, -1.2, 2.0], expected: [1, 0, 0], label: "Coordinate point in Class A" },
    { id: "d2", input: [-0.8, 1.5, -0.4], expected: [0, 1, 0], label: "Coordinate point in Class B" },
    { id: "d3", input: [1.2, 0.3, -1.1], expected: [0, 0, 1], label: "Coordinate point in Class C" },
    { id: "d4", input: [-0.3, -0.9, 1.4], expected: [1, 0, 0], label: "Coordinate point in Class A" },
    { id: "d5", input: [0.7, 1.1, -0.8], expected: [0, 1, 0], label: "Coordinate point in Class B" },
    { id: "d6", input: [-1.5, 0.2, -1.5], expected: [0, 0, 1], label: "Coordinate point in Class C" }
  ]
};

export default function App() {
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [isAudioMuted, setIsAudioMuted] = useState<boolean>(true);

  // Synchronize audio synthesizer mute status
  useEffect(() => {
    audioSynth.setMute(isAudioMuted);
  }, [isAudioMuted]);

  // Multi-dataset states
  const [activeDataset, setActiveDataset] = useState(SCIENTIFIC_DATASET);
  const [customInputs, setCustomInputs] = useState<number[]>([0.5, -1.2, 2.0]); // Default inputs matching screenshot exactly

  // Main structural configurations - Default to 5 hidden neurons matching screenshot
  const [layers, setLayers] = useState<LayerConfig[]>([
    { id: 0, size: 3, activation: 'linear' }, // inputs
    { id: 1, size: 5, activation: 'relu' },   // hidden 1 with 5 neurons
    { id: 2, size: 3, activation: 'sigmoid' } // outputs
  ]);

  const [activation, setActivation] = useState<'relu' | 'sigmoid' | 'tanh' | 'linear'>('relu');
  const [learningRate, setLearningRate] = useState<number>(0.01);

  // Core evaluated network state
  const [network, setNetwork] = useState<NetworkState>(() => initializeNetwork([
    { id: 0, size: 3, activation: 'linear' },
    { id: 1, size: 5, activation: 'relu' },
    { id: 2, size: 3, activation: 'sigmoid' }
  ]));

  // Stats and history mapping
  const [currentLoss, setCurrentLoss] = useState<number>(0.284);
  const [currentAccuracy, setCurrentAccuracy] = useState<number>(0.667);
  const [history, setHistory] = useState<MetricPoint[]>([
    { epoch: 1, loss: 0.38, accuracy: 0.33, gradientMagnitude: 0.1 },
    { epoch: 2, loss: 0.28, accuracy: 0.67, gradientMagnitude: 0.1 }
  ]);
  const [isTraining, setIsTraining] = useState<boolean>(false);

  // Visual propagation animation states
  const [isAnimating, setIsAnimating] = useState<boolean>(false);
  const [animatingLayer, setAnimatingLayer] = useState<number | null>(null);
  const [animationProgress, setAnimationProgress] = useState<number>(0);

  // Guided Onboarding Tour system states
  const [isTourOpen, setIsTourOpen] = useState<boolean>(() => {
    const hasSeen = localStorage.getItem('hasSeenTour');
    return hasSeen !== 'true';
  });
  const [tourStep, setTourStep] = useState<number>(0);
  const [rect, setRect] = useState<DOMRect | null>(null);

  const tourSteps = [
    {
      title: "Welcome Future AI Scientist! 🚀",
      description: "Welcome to the Interactive Neural Network Visualizer! This educational platform helps you explore machine learning under the hood using interactive sliders, real-time neuron visualizations, graphs, and simple equations.",
      tab: "dashboard",
      targetId: null,
      placement: "center" as const,
      tip: "We have prepared an ultra-friendly guide to get you oriented instantly."
    },
    {
      title: "The Navigation Sidebar 🧭",
      description: "Use the clean vertical tabs on the left to switch between views. We have exactly 5 simple panels: Dashboard, Configuration, Visual Architecture, Graphs, and Math Equations.",
      tab: "dashboard",
      targetId: "sidebar-navigation",
      placement: "right" as const,
      tip: "Everything updates instantly across all views when you tweak settings!"
    },
    {
      title: "Input Probe & Streamer 🍏",
      description: "Adjust manual coordinate features or stream real chaotic orbit datasets (like Sine Wave Orbits or Lorenz Attractor Chaos) to probe the model live.",
      tab: "dashboard",
      targetId: "input-controller-section",
      placement: "right" as const,
      tip: "Slide coordinates or stream a dataset to see how outputs change instantly."
    },
    {
      title: "Feedforward Synapse Map 🧠",
      description: "Behold the active neural network! Watch inputs process and flow left-to-right through hidden layers to trigger the final output activations.",
      tab: "dashboard",
      targetId: "network-map-section",
      placement: "bottom" as const,
      tip: "You can hear the hum of these active connections when Audio Feedback is turned on!"
    },
    {
      title: "Target Probabilities 🎯",
      description: "The final layer uses Softmax to compute confidence values. The highest probability determines the model's live prediction.",
      tab: "dashboard",
      targetId: "output-prediction-section",
      placement: "left" as const,
      tip: "Check out the live bar chart that visually compares output scores."
    },
    {
      title: "Live Stream Console 📟",
      description: "Control the propagation speed, pause/play the signals, and view a scrolling monospace log of active classification ticks in real-time.",
      tab: "dashboard",
      targetId: "simulation-control-strip",
      placement: "top" as const,
      tip: "You can step frame-by-frame to dissect the exact values calculated at each step."
    },
    {
      title: "Architectural Settings ⚙️",
      description: "Modify learning rates, toggle activation functions (ReLU, Sigmoid, Tanh, Linear), and dynamically add or remove hidden layer nodes.",
      tab: "config",
      targetId: "tour-config-controls",
      placement: "right" as const,
      tip: "See how the syntax highlighter traces parameter optimization on the right!"
    },
    {
      title: "Interactive 3D Synapses 🪐",
      description: "Explore the network in high-fidelity 3D! Drag to rotate, scroll to zoom, click neurons to inspect parameters, or test backpropagation passes.",
      tab: "architecture",
      targetId: "tour-architecture-map",
      placement: "top" as const,
      tip: "Angle presets let you snap to Isometric, Top Down, or Front view instantly."
    },
    {
      title: "Performance Curves 📊",
      description: "Watch training curves dropping as the network optimizes and parameters align, or toggle the 3D Decision Boundary Sheet.",
      tab: "graphs",
      targetId: "training-performance-chart",
      placement: "bottom" as const,
      tip: "Click 'Train Epoch Cycle' to start active learning epochs on the spot."
    },
    {
      title: "Equations Demystified 📐",
      description: "Inspect color-coded formulas for ReLU and Softmax, complete with interactive calculators displaying real-time calculations.",
      tab: "math",
      targetId: "tour-math-equations",
      placement: "top" as const,
      tip: "Hover over formula variables to view their mathematical descriptions!"
    },
    {
      title: "You are Ready! 🎉",
      description: "Orientation complete! Tweak settings, explore different labs, or enable Lab Audio Feedback to listen to the neural network live.",
      tab: "dashboard",
      targetId: null,
      placement: "center" as const,
      tip: "Click 'Finish Tour' to start your interactive learning journey."
    }
  ];

  // Measure target element on step change
  useEffect(() => {
    if (!isTourOpen) {
      setRect(null);
      return;
    }

    const currentStep = tourSteps[tourStep];
    if (!currentStep.targetId) {
      setRect(null);
      return;
    }

    // Set active tab first
    if (activeTab !== currentStep.tab) {
      setActiveTab(currentStep.tab);
    }

    // Poll to find target element once tab renders
    let count = 0;
    const interval = setInterval(() => {
      const el = document.getElementById(currentStep.targetId!);
      if (el) {
        clearInterval(interval);
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        
        // Delay measurement slightly to stabilize after scroll
        setTimeout(() => {
          setRect(el.getBoundingClientRect());
        }, 350);
      } else {
        count++;
        if (count > 25) {
          clearInterval(interval);
        }
      }
    }, 50);

    return () => clearInterval(interval);
  }, [tourStep, isTourOpen]);

  // Handle resize & scroll events to keep highlight locked to the element
  useEffect(() => {
    if (!isTourOpen) return;
    const handleUpdate = () => {
      const currentStep = tourSteps[tourStep];
      if (currentStep && currentStep.targetId) {
        const el = document.getElementById(currentStep.targetId);
        if (el) {
          setRect(el.getBoundingClientRect());
        }
      }
    };
    window.addEventListener('resize', handleUpdate);
    window.addEventListener('scroll', handleUpdate, true);
    return () => {
      window.removeEventListener('resize', handleUpdate);
      window.removeEventListener('scroll', handleUpdate, true);
    };
  }, [isTourOpen, tourStep, rect]);

  // Compute tooltip position relative to highlighted target
  const getTooltipPosition = () => {
    if (!rect) {
      return {
        position: 'fixed' as const,
        left: '50%',
        top: '50%',
        transform: 'translate(-50%, -50%)',
        zIndex: 50,
        width: '100%',
        maxWidth: '430px',
        transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
      };
    }

    const gap = 16;
    const tooltipWidth = 380;
    const tooltipHeight = 250; // estimate
    const windowWidth = window.innerWidth;
    const windowHeight = window.innerHeight;

    const currentStep = tourSteps[tourStep];
    let placement = currentStep.placement || 'bottom';

    // Space-aware intelligent placement adjustment
    if (placement === 'right' && rect.right + tooltipWidth + gap > windowWidth) {
      if (rect.left - tooltipWidth - gap > 0) {
        placement = 'left';
      } else if (windowHeight - rect.bottom - tooltipHeight - gap > 0) {
        placement = 'bottom';
      } else {
        placement = 'top';
      }
    } else if (placement === 'left' && rect.left - tooltipWidth - gap < 0) {
      if (rect.right + tooltipWidth + gap < windowWidth) {
        placement = 'right';
      } else if (windowHeight - rect.bottom - tooltipHeight - gap > 0) {
        placement = 'bottom';
      } else {
        placement = 'top';
      }
    } else if (placement === 'bottom' && rect.bottom + tooltipHeight + gap > windowHeight) {
      if (rect.top - tooltipHeight - gap > 0) {
        placement = 'top';
      } else if (rect.right + tooltipWidth + gap < windowWidth) {
        placement = 'right';
      } else {
        placement = 'left';
      }
    } else if (placement === 'top' && rect.top - tooltipHeight - gap < 0) {
      if (rect.bottom + tooltipHeight + gap < windowHeight) {
        placement = 'bottom';
      } else if (rect.right + tooltipWidth + gap < windowWidth) {
        placement = 'right';
      } else {
        placement = 'left';
      }
    }

    let top = 0;
    let left = 0;

    if (placement === 'right') {
      left = rect.right + gap;
      top = rect.top + rect.height / 2 - tooltipHeight / 2;
    } else if (placement === 'left') {
      left = rect.left - tooltipWidth - gap;
      top = rect.top + rect.height / 2 - tooltipHeight / 2;
    } else if (placement === 'top') {
      top = rect.top - tooltipHeight - gap;
      left = rect.left + rect.width / 2 - tooltipWidth / 2;
    } else { // bottom
      top = rect.bottom + gap;
      left = rect.left + rect.width / 2 - tooltipWidth / 2;
    }

    // Adjust margins so it never clips off screen bounds
    left = Math.max(16, Math.min(windowWidth - tooltipWidth - 16, left));
    top = Math.max(16, Math.min(windowHeight - tooltipHeight - 16, top));

    return {
      position: 'fixed' as const,
      left,
      top,
      zIndex: 50,
      width: '100%',
      maxWidth: `${tooltipWidth}px`,
      transition: 'all 0.35s cubic-bezier(0.16, 1, 0.3, 1)'
    };
  };

  // Tour callbacks
  const handleTourNext = () => {
    if (tourStep < tourSteps.length - 1) {
      const nextStep = tourStep + 1;
      setTourStep(nextStep);
      setActiveTab(tourSteps[nextStep].tab);
    } else {
      setIsTourOpen(false);
      localStorage.setItem('hasSeenTour', 'true');
    }
  };

  const handleTourPrev = () => {
    if (tourStep > 0) {
      const prevStep = tourStep - 1;
      setTourStep(prevStep);
      setActiveTab(tourSteps[prevStep].tab);
    }
  };

  const skipTour = () => {
    setIsTourOpen(false);
    setActiveTab('dashboard');
    localStorage.setItem('hasSeenTour', 'true');
  };

  // Auto-evaluate / feedforward pass instantly when inputs or structures change
  useEffect(() => {
    setNetwork(prev => {
      // Safety guard: ensure current network structure is exactly in sync with config layers
      if (prev.layers.length !== layers.length) return prev;
      for (let i = 0; i < layers.length; i++) {
        if (prev.layers[i].size !== layers[i].size) return prev;
      }
      return forwardPropagate(prev, customInputs);
    });
  }, [customInputs, layers, activation]);

  const handleSliderValueChange = (index: number, val: number) => {
    const nextInputs = [...customInputs];
    nextInputs[index] = val;
    setCustomInputs(nextInputs);
  };

  // Configurations callbacks
  const handleAddHiddenLayer = () => {
    if (layers.length >= 7) return; // limit to max 7 layers total (1 input, 5 hidden, 1 output)
    const nextLayers = [...layers];
    const outputLayer = nextLayers.pop()!;
    
    // Insert new hidden layer
    nextLayers.push({
      id: Date.now(),
      size: 3,
      activation: activation
    });
    nextLayers.push(outputLayer);
    setLayers(nextLayers);
    const initialized = initializeNetwork(nextLayers);
    const propagated = forwardPropagate(initialized, customInputs);
    setNetwork(propagated);
  };

  const handleRemoveHiddenLayer = () => {
    if (layers.length <= 3) return; // at least 1 hidden layer
    const nextLayers = [...layers];
    const outputLayer = nextLayers.pop()!;
    nextLayers.pop(); // remove hidden
    nextLayers.push(outputLayer);
    setLayers(nextLayers);
    const initialized = initializeNetwork(nextLayers);
    const propagated = forwardPropagate(initialized, customInputs);
    setNetwork(propagated);
  };

  const handleSetInputSize = (newSize: number) => {
    const targetSize = Math.max(1, Math.min(8, newSize));
    const nextLayers = layers.map((layer, idx) => {
      if (idx === 0) {
        return {
          ...layer,
          size: targetSize
        };
      }
      return layer;
    });
    setLayers(nextLayers);

    let nextInputs = [...customInputs];
    if (targetSize > nextInputs.length) {
      while (nextInputs.length < targetSize) {
        nextInputs.push(0.5);
      }
    } else {
      nextInputs = nextInputs.slice(0, targetSize);
    }
    setCustomInputs(nextInputs);

    const initialized = initializeNetwork(nextLayers);
    const propagated = forwardPropagate(initialized, nextInputs);
    setNetwork(propagated);
  };

  const handleModifyNeuronCount = (layerIdx: number, increment: boolean) => {
    const nextLayers = layers.map((layer, idx) => {
      if (idx === layerIdx) {
        const currentSize = layer.size;
        const newSize = increment ? currentSize + 1 : currentSize - 1;
        return {
          ...layer,
          size: Math.max(1, Math.min(8, newSize))
        };
      }
      return layer;
    });
    setLayers(nextLayers);

    // Handle input size change specifically to resize customInputs
    let nextInputs = [...customInputs];
    if (layerIdx === 0) {
      const newInputSize = nextLayers[0].size;
      if (newInputSize > nextInputs.length) {
        while (nextInputs.length < newInputSize) {
          nextInputs.push(0.5);
        }
      } else {
        nextInputs = nextInputs.slice(0, newInputSize);
      }
      setCustomInputs(nextInputs);
    }

    const initialized = initializeNetwork(nextLayers);
    const propagated = forwardPropagate(initialized, nextInputs);
    setNetwork(propagated);
  };

  const handleActivationChangeLocal = (act: 'relu' | 'sigmoid' | 'tanh' | 'linear') => {
    setActivation(act);
    const nextLayers = layers.map((l, idx) => {
      if (idx > 0 && idx < layers.length - 1) {
        return { ...l, activation: act };
      }
      return l;
    });
    setLayers(nextLayers);
    const initialized = initializeNetwork(nextLayers);
    const propagated = forwardPropagate(initialized, customInputs);
    setNetwork(propagated);
  };

  const handleResetWeights = () => {
    setNetwork(initializeNetwork(layers));
  };

  const handleUpdateWeight = (connId: string, value: number) => {
    setIsTraining(false);
    setNetwork(prev => {
      const nextConnections = { ...prev.connections };
      if (nextConnections[connId]) {
        nextConnections[connId] = {
          ...nextConnections[connId],
          weight: value
        };
      }
      const updatedNet = {
        ...prev,
        connections: nextConnections
      };
      return forwardPropagate(updatedNet, customInputs);
    });
  };

  const handleUpdateBias = (layerIndex: number, nodeIndex: number, value: number) => {
    setIsTraining(false);
    setNetwork(prev => {
      const nextNeurons = prev.neurons.map((layer, lIdx) => {
        if (lIdx === layerIndex) {
          return layer.map((neuron, nIdx) => {
            if (nIdx === nodeIndex) {
              return { ...neuron, bias: value };
            }
            return neuron;
          });
        }
        return layer;
      });
      const updatedNet = {
        ...prev,
        neurons: nextNeurons
      };
      return forwardPropagate(updatedNet, customInputs);
    });
  };

  const handleInjectPerturbation = () => {
    setNetwork(prev => {
      // Perturb weights slightly
      const nextConnections = { ...prev.connections };
      Object.keys(nextConnections).forEach(key => {
        nextConnections[key] = {
          ...nextConnections[key],
          weight: nextConnections[key].weight + (Math.random() - 0.5) * 0.35
        };
      });

      // Perturb biases slightly
      const nextNeurons = prev.neurons.map((layer) => {
        return layer.map((neuron) => {
          return {
            ...neuron,
            bias: neuron.bias + (Math.random() - 0.5) * 0.2
          };
        });
      });

      const updatedNet = {
        ...prev,
        neurons: nextNeurons,
        connections: nextConnections
      };

      audioSynth.playPerturbationChaos();
      return forwardPropagate(updatedNet, customInputs);
    });
  };

  // Train one dynamic epoch
  const trainOneEpoch = () => {
    if (isTraining) return;
    setIsTraining(true);

    setTimeout(() => {
      let tempNetwork = { ...network };
      let epochLoss = 0;
      let correct = 0;

      // Iterate through all dataset items and apply gradient descent updates
      activeDataset.items.forEach((item) => {
        // 1. Forward propagate
        tempNetwork = forwardPropagate(tempNetwork, item.input);
        const outputNeurons = tempNetwork.neurons[tempNetwork.neurons.length - 1];
        const outputs = outputNeurons.map(n => n.activation);

        epochLoss += calculateLoss(outputs, item.expected);

        // Check predictions
        const maxPredIdx = outputs.indexOf(Math.max(...outputs));
        const maxExpectedIdx = item.expected.indexOf(Math.max(...item.expected));
        if (maxPredIdx === maxExpectedIdx) {
          correct++;
        }

        // 2. Backpropagation pass to calculate weight gradients
        const { network: netWithGradients } = backpropagate(tempNetwork, item.expected);

        // 3. Update connection parameter weights using standard SGD
        tempNetwork = updateParams(netWithGradients, learningRate, 'sgd', history.length);
      });

      const avgLoss = epochLoss / activeDataset.items.length;
      const accuracy = correct / activeDataset.items.length;

      setNetwork(tempNetwork);
      setCurrentLoss(avgLoss);
      setCurrentAccuracy(accuracy);
      setHistory(prev => [
        ...prev,
        { epoch: prev.length + 1, loss: avgLoss, accuracy, gradientMagnitude: 0.1 }
      ]);
      setIsTraining(false);
      audioSynth.playTrainingEpoch(accuracy);
    }, 180);
  };

  // Triggers flowing voltage signals in sequential layers
  const onTriggerForward = () => {
    if (isAnimating) return;
    setIsAnimating(true);
    setAnimatingLayer(0);
    audioSynth.playLayerActivation(0, layers.length);

    // Sequence through layers sequentially to simulate voltage signals cascading
    let currentLayer = 0;
    const interval = setInterval(() => {
      currentLayer++;
      if (currentLayer < layers.length) {
        setAnimatingLayer(currentLayer);
        audioSynth.playLayerActivation(currentLayer, layers.length);
      } else {
        clearInterval(interval);
        setIsAnimating(false);
        setAnimatingLayer(null);
      }
    }, 1000);
  };

  // Triggers flowing backprop elements in reverse
  const onTriggerBackward = () => {
    if (isAnimating) return;
    setIsAnimating(true);
    setAnimatingLayer(layers.length - 1);
    audioSynth.playBackpropagation(layers.length - 1, layers.length);

    let currentLayer = layers.length - 1;
    const interval = setInterval(() => {
      currentLayer--;
      if (currentLayer >= 1) {
        setAnimatingLayer(currentLayer);
        audioSynth.playBackpropagation(currentLayer, layers.length);
      } else {
        clearInterval(interval);
        setIsAnimating(false);
        setAnimatingLayer(null);
      }
    }, 1000);
  };

  // Render current active tab component
  const renderActivePanel = () => {
    const outputNeurons = network.neurons[network.neurons.length - 1] || [];
    const networkOutputs = outputNeurons.map(n => n.activation);

    switch (activeTab) {
      case 'dashboard':
        return (
          <DashboardPanel 
            customInputs={customInputs}
            handleSliderValueChange={handleSliderValueChange}
            onSetCustomInputs={setCustomInputs}
            networkOutputs={networkOutputs}
            setActiveTab={setActiveTab}
            layers={layers}
            activation={activation}
            network={network}
            onUpdateInputSize={handleSetInputSize}
          />
        );
      case 'config':
        return (
          <ConfigurationsPanel 
            layers={layers}
            network={network}
            learningRate={learningRate}
            setLearningRate={setLearningRate}
            activation={activation}
            setActivation={handleActivationChangeLocal}
            handleAddHiddenLayer={handleAddHiddenLayer}
            handleRemoveHiddenLayer={handleRemoveHiddenLayer}
            handleModifyNeuronCount={handleModifyNeuronCount}
          />
        );
      case 'architecture':
        return (
          <VisualArchitecturePanel 
            layers={layers}
            network={network}
            customInputs={customInputs}
            handleSliderValueChange={handleSliderValueChange}
            networkOutputs={networkOutputs}
            activation={activation}
            onResetWeights={handleResetWeights}
            onTriggerForward={onTriggerForward}
            onTriggerBackward={onTriggerBackward}
            isAnimating={isAnimating}
            animatingLayer={animatingLayer}
            animationProgress={animationProgress}
            onUpdateWeight={handleUpdateWeight}
            onUpdateBias={handleUpdateBias}
            onInjectPerturbation={handleInjectPerturbation}
          />
        );
      case 'graphs':
        return (
          <GraphsPanel 
            currentAccuracy={currentAccuracy}
            currentLoss={currentLoss}
            history={history}
            onTrainEpoch={trainOneEpoch}
            isTraining={isTraining}
          />
        );
      case 'math':
        return (
          <MathEquationsPanel 
            network={network}
            customInputs={customInputs}
            activation={activation}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="flex h-screen bg-[#030611] text-slate-100 overflow-hidden font-sans select-none relative">
      
      {/* AMBIENT GLOWING ATMOSPHERIC BLOBS */}
      <div className="absolute top-[-10%] left-[-10%] w-[45%] h-[45%] rounded-full bg-cyan-500/5 blur-[120px] pointer-events-none z-0 animate-pulse" style={{ animationDuration: '8s' }} />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-indigo-500/5 blur-[130px] pointer-events-none z-0 animate-pulse" style={{ animationDuration: '12s' }} />
      <div className="absolute top-[30%] right-[10%] w-[35%] h-[35%] rounded-full bg-purple-500/3 blur-[110px] pointer-events-none z-0" />

      {/* BACKGROUND GRID OVERLAY */}
      <div className="absolute inset-0 bg-[radial-gradient(rgba(0,240,255,0.02)_1px,transparent_1px)] bg-[size:24px_24px] opacity-85 pointer-events-none z-0" />
      <div className="absolute inset-0 bg-[linear-gradient(rgba(0,0,0,0.25)_1px,transparent_1px)] bg-[size:100%_40px] pointer-events-none z-0" />

      {/* LEFT SIDEBAR: PANEL TOGGLER */}
      <aside 
        id="sidebar-navigation" 
        className="w-[240px] bg-[#050915]/95 border-r border-[#141d35]/65 flex flex-col justify-between shrink-0 h-full relative z-20 shadow-2xl backdrop-blur-xl"
      >
        <div className="flex flex-col gap-6 p-5">
          {/* Main Workspace Logo */}
          <div className="flex items-center gap-3 border-b border-[#141d35]/50 pb-5 hover:border-cyan-500/40 transition-all duration-300 group/logo">
            <div className="w-10 h-10 bg-gradient-to-tr from-cyan-400 via-indigo-500 to-pink-500 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/25 relative group">
              <div className="absolute inset-0 bg-gradient-to-tr from-cyan-400 via-indigo-500 to-pink-500 rounded-xl blur-md opacity-50 group-hover:opacity-85 transition-opacity" />
              <Brain size={22} className="text-white relative z-10" />
            </div>
            <div className="text-left">
              <h2 className="text-[11px] font-black text-white tracking-tight uppercase leading-tight font-display">Neural Network Visualizer</h2>
              <div className="flex items-center gap-1.5 mt-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                <span className="text-[9px] font-mono font-bold tracking-wider text-slate-400 uppercase">Live Simulator</span>
              </div>
            </div>
          </div>

          {/* Nav Items */}
          <nav className="flex flex-col gap-2 text-left">
            {([
              { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, color: 'text-cyan-400', border: 'border-cyan-400', bg: 'from-cyan-950/30' },
              { id: 'config', label: 'Configuration', icon: Settings, color: 'text-purple-400', border: 'border-purple-400', bg: 'from-purple-950/20' },
              { id: 'architecture', label: 'Visual Architecture', icon: Layers, color: 'text-indigo-400', border: 'border-indigo-400', bg: 'from-indigo-950/25' },
              { id: 'graphs', label: 'Graphs & Charts', icon: Activity, color: 'text-emerald-400', border: 'border-emerald-400', bg: 'from-emerald-950/20' },
              { id: 'math', label: 'Math & Equations', icon: Variable, color: 'text-rose-400', border: 'border-rose-400', bg: 'from-rose-950/20' }
            ] as const).map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`w-full px-4 py-3 rounded-xl text-xs font-bold flex items-center gap-3 transition-all duration-200 cursor-pointer select-none relative group border ${
                    isActive 
                      ? `bg-gradient-to-r ${item.bg} to-slate-950/10 border-[#141d35]/90 text-white shadow-md shadow-indigo-500/5` 
                      : 'border-transparent text-slate-400 hover:bg-[#0c1225]/55 hover:text-slate-100 hover:border-[#141d35]/30'
                  }`}
                >
                  {/* Glowing vertical line for active items */}
                  {isActive && (
                    <div className={`absolute left-0 top-3 bottom-3 w-1.5 rounded-r bg-gradient-to-b from-cyan-400 to-indigo-500 shadow-[0_0_8px_rgba(34,211,238,0.5)]`} />
                  )}
                  <Icon size={15} className={`transition-transform group-hover:scale-105 duration-200 ${isActive ? item.color : 'text-slate-500 group-hover:text-slate-300'}`} />
                  <span className="font-display tracking-wide">{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Sidebar Footer */}
        <div className="p-5 border-t border-[#141d35]/50 bg-slate-950/25 text-left space-y-2.5">
          <div 
            className="flex items-center gap-2.5 bg-[#0b1022]/80 border border-[#141d35]/40 hover:border-cyan-500/30 p-3 rounded-xl cursor-pointer transition-all hover:shadow-[0_0_12px_rgba(6,182,212,0.06)] group" 
            onClick={() => { setIsTourOpen(true); setTourStep(0); setActiveTab('dashboard'); }}
          >
            <HelpCircle size={15} className="text-cyan-400 group-hover:rotate-12 transition-transform" />
            <div className="text-[11px] font-bold text-slate-300 group-hover:text-white transition-colors font-display">
              Tour Guide
            </div>
            <span className="text-[9px] font-mono text-slate-500 ml-auto font-bold px-1.5 py-0.5 bg-[#050814] rounded-md border border-[#141d35]/60">?</span>
          </div>
          <p className="text-[9px] text-slate-500 font-mono text-center uppercase tracking-widest font-bold">
            Interactive AI Sandbox
          </p>
        </div>
      </aside>

      {/* MAIN VIEW AREA */}
      <main className="flex-1 flex flex-col min-w-0 h-full relative z-10 overflow-hidden bg-slate-950/20">
        {renderActivePanel()}
      </main>

      {/* GUIDED ONBOARDING TOUR MODAL WINDOW */}
      {isTourOpen && (
        <>
          {/* Backdrop dimming overlays & highlight border */}
          {rect ? (
            <>
              {/* Top overlay */}
              <div 
                className="fixed inset-x-0 top-0 bg-slate-950/75 transition-all duration-300 pointer-events-auto"
                style={{ height: Math.max(0, rect.top), zIndex: 40 }}
              />
              {/* Bottom overlay */}
              <div 
                className="fixed inset-x-0 bottom-0 bg-slate-950/75 transition-all duration-300 pointer-events-auto"
                style={{ top: Math.max(0, rect.bottom), zIndex: 40 }}
              />
              {/* Left overlay */}
              <div 
                className="fixed left-0 bg-slate-950/75 transition-all duration-300 pointer-events-auto"
                style={{ top: Math.max(0, rect.top), height: Math.max(0, rect.height), width: Math.max(0, rect.left), zIndex: 40 }}
              />
              {/* Right overlay */}
              <div 
                className="fixed right-0 bg-slate-950/75 transition-all duration-300 pointer-events-auto"
                style={{ top: Math.max(0, rect.top), height: Math.max(0, rect.height), left: Math.max(0, rect.right), zIndex: 40 }}
              />

              {/* Glowing animated visual frame around target element */}
              <div 
                className="fixed border-2 border-cyan-400 rounded-2xl pointer-events-none transition-all duration-300 animate-pulse shadow-[0_0_22px_rgba(34,211,238,0.45),_inset_0_0_12px_rgba(34,211,238,0.25)]"
                style={{
                  left: rect.left - 4,
                  top: rect.top - 4,
                  width: rect.width + 8,
                  height: rect.height + 8,
                  zIndex: 42
                }}
              />
            </>
          ) : (
            /* Full backdrop overlay for non-targeted steps (like step 1 & finish step) */
            <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs z-40 pointer-events-auto" />
          )}

          {/* Floated Smart Positioned Explanation Card */}
          <div 
            style={getTooltipPosition()}
            className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-2xl relative overflow-hidden flex flex-col justify-between"
          >
            {/* Top color accent strip */}
            <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-cyan-500 via-indigo-500 to-purple-500" />
            
            {/* Close/Skip button */}
            <button 
              onClick={skipTour}
              className="absolute top-4.5 right-4 text-slate-400 hover:text-white transition cursor-pointer z-10"
              title="Skip Tour"
            >
              <X size={15} />
            </button>

            <div className="space-y-3.5 pt-1 text-left">
              <div className="flex items-center gap-2 text-[10px] font-mono font-bold text-cyan-400 uppercase tracking-widest bg-cyan-950/30 border border-cyan-800/40 px-2 py-0.5 rounded-md w-fit">
                <Sparkles size={11} className="text-cyan-400 animate-spin" style={{ animationDuration: '6s' }} />
                <span>Step {tourStep + 1} of {tourSteps.length}</span>
              </div>

              <h3 className="text-sm font-black text-white tracking-tight uppercase leading-tight font-display">
                {tourSteps[tourStep].title}
              </h3>

              <p className="text-[11.5px] text-slate-300 leading-relaxed font-sans font-medium">
                {tourSteps[tourStep].description}
              </p>

              {/* Dynamic educational tip box */}
              {tourSteps[tourStep].tip && (
                <div className="p-3 bg-indigo-950/20 border border-indigo-900/30 rounded-xl flex gap-2 text-[11px] text-slate-350 font-semibold leading-normal">
                  <Lightbulb size={14} className="text-cyan-400 shrink-0 mt-0.5" />
                  <p>{tourSteps[tourStep].tip}</p>
                </div>
              )}

              {/* Dots and Navigation Controls Row */}
              <div className="flex justify-between items-center pt-2.5 border-t border-slate-800/60">
                <div className="flex gap-1.5">
                  {tourSteps.map((_, idx) => (
                    <button 
                      key={idx} 
                      onClick={() => {
                        setTourStep(idx);
                        setActiveTab(tourSteps[idx].tab);
                      }}
                      className={`h-1.5 rounded-full transition-all duration-300 cursor-pointer ${
                        idx === tourStep ? 'w-5 bg-cyan-400' : 'w-1.5 bg-slate-750 hover:bg-slate-500'
                      }`}
                      title={`Go to step ${idx + 1}`}
                    />
                  ))}
                </div>

                <div className="flex gap-1.5">
                  <button
                    onClick={handleTourPrev}
                    disabled={tourStep === 0}
                    className="px-2.5 py-1.5 bg-slate-950 hover:bg-slate-850 disabled:opacity-20 border border-slate-800 rounded-lg text-[10px] font-bold text-slate-400 hover:text-white cursor-pointer active:scale-95 transition-all flex items-center gap-1"
                  >
                    <ChevronLeft size={12} />
                    <span>Back</span>
                  </button>

                  <button
                    onClick={handleTourNext}
                    className="px-3.5 py-1.5 bg-gradient-to-r from-cyan-500 to-indigo-500 hover:from-cyan-400 hover:to-indigo-400 text-white rounded-lg text-[10px] font-black cursor-pointer active:scale-95 transition-all flex items-center gap-1 shadow-md shadow-cyan-500/10"
                  >
                    <span>{tourStep === tourSteps.length - 1 ? "Finish" : "Next"}</span>
                    <ChevronRight size={12} />
                  </button>
                </div>
              </div>

            </div>
          </div>
        </>
      )}

    </div>
  );
}
