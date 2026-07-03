import React, { useState } from 'react';
import { 
  BookOpen, 
  Sparkles, 
  Info, 
  Layers, 
  ChevronRight, 
  Variable, 
  Zap, 
  CheckCircle,
  HelpCircle,
  Sliders,
  ArrowRight,
  TrendingUp,
  Award
} from 'lucide-react';
import { NetworkState } from '../types/network';

interface MathEquationsPanelProps {
  network: NetworkState;
  customInputs: number[];
  activation: string;
  hideHeader?: boolean;
}

type TopicId = 'sum' | 'relu' | 'sigmoid' | 'softmax' | 'loss' | 'forward' | 'backprop' | 'gradient';

export default function MathEquationsPanel({
  network,
  customInputs,
  activation,
  hideHeader = false
}: MathEquationsPanelProps) {
  
  const [selectedTopic, setSelectedTopic] = useState<TopicId>('sum');

  // Extract live network weights & biases with robust fallbacks
  const firstHiddenLayer = network?.neurons?.[1] || [];
  const activeHiddenNode = firstHiddenLayer[0] || { preAct: 0.38, activation: 0.38, bias: 0.15 };
  
  const w1 = network?.connections?.[`layer_0_node_0->layer_1_node_0`]?.weight ?? 0.45;
  const w2 = network?.connections?.[`layer_0_node_1->layer_1_node_0`]?.weight ?? -0.32;
  const w3 = network?.connections?.[`layer_0_node_2->layer_1_node_0`]?.weight ?? 0.22;
  
  const x1 = customInputs[0] ?? 0.8;
  const x2 = customInputs[1] ?? 0.4;
  const x3 = customInputs[2] ?? 0.5;
  const bias = activeHiddenNode.bias ?? 0.15;

  const calculatedPreAct = (w1 * x1) + (w2 * x2) + (w3 * x3) + bias;
  
  const currentActFunction = activation || 'relu';
  const calculatedAct = currentActFunction === 'relu' 
    ? Math.max(0, calculatedPreAct) 
    : currentActFunction === 'sigmoid' 
      ? 1 / (1 + Math.exp(-calculatedPreAct)) 
      : currentActFunction === 'tanh'
        ? Math.tanh(calculatedPreAct)
        : calculatedPreAct;

  const getTopicData = () => {
    switch (selectedTopic) {
      case 'sum':
        return {
          title: "Weighted Sum (Pre-activation)",
          formula: "z = (w_1 · x_1) + (w_2 · x_2) + (w_3 · x_3) + b",
          formulaDecomposed: [
            { text: "z", label: "Weighted Sum Output (Pre-activation voltage)", color: "text-pink-400" },
            { text: "=", label: "equals" },
            { text: "∑ (w_i · x_i)", label: "Sum of each (Weight · Input signal)", color: "text-emerald-400" },
            { text: "+", label: "plus" },
            { text: "b", label: "Neuron Bias offset value", color: "text-purple-400" }
          ],
          calculationSteps: [
            `1. Raw input signals: x₁ = ${x1.toFixed(2)}, x₂ = ${x2.toFixed(2)}, x₃ = ${x3.toFixed(2)}`,
            `2. Synapse connection weights: w₁₁ = ${w1.toFixed(3)}, w₂₁ = ${w2.toFixed(3)}, w₃₁ = ${w3.toFixed(3)}`,
            `3. Layer bias baseline value: b = ${bias.toFixed(3)}`,
            `4. Summing products: (${w1.toFixed(3)} · ${x1.toFixed(2)}) + (${w2.toFixed(3)} · ${x2.toFixed(2)}) + (${w3.toFixed(3)} · ${x3.toFixed(2)})`,
            `   = ${((w1 * x1) + (w2 * x2) + (w3 * x3)).toFixed(4)}`,
            `5. Adding Bias baseline: ${((w1 * x1) + (w2 * x2) + (w3 * x3)).toFixed(4)} + ${bias.toFixed(3)}`,
            `Result: z = ${calculatedPreAct.toFixed(4)}`
          ],
          variables: [
            { symbol: "x", desc: "The incoming feature signals from preceding layers or dataset inputs.", color: "text-cyan-400 bg-cyan-950/40 border-cyan-800" },
            { symbol: "w", desc: "Connection weights representing synaptic strength (amplifies or reduces the incoming signals).", color: "text-emerald-400 bg-emerald-950/40 border-emerald-800" },
            { symbol: "b", desc: "Bias value. An offset shift that controls when a neuron triggers, independent of the inputs.", color: "text-purple-400 bg-purple-950/40 border-purple-800" },
            { symbol: "z", desc: "The combined raw pre-activation state computed inside the neuron cell nucleus.", color: "text-pink-400 bg-pink-950/40 border-pink-800" }
          ],
          educationalInsight: "Think of this as the neuron gathering electrical signals from different synapses. Stronger synapses (higher weights) amplify their signal. The bias acts like a threshold spring keeping the valve shut or open by default."
        };
      case 'relu':
        return {
          title: "ReLU Activation Function",
          formula: "a = max(0, z)",
          formulaDecomposed: [
            { text: "a", label: "Activation Output Signal", color: "text-amber-400" },
            { text: "=", label: "equals" },
            { text: "max(", label: "maximum of either" },
            { text: "0,", label: "zero baseline" },
            { text: "z", label: "weighted pre-activation sum", color: "text-pink-400" },
            { text: ")", label: "" }
          ],
          calculationSteps: [
            `1. Raw weighted sum (z) = ${calculatedPreAct.toFixed(4)}`,
            `2. Applying Rectified Linear (ReLU) filter:`,
            `   If z is negative, output is strictly 0. Otherwise output remains z.`,
            `   a = max(0, ${calculatedPreAct.toFixed(4)})`,
            `Result: a = ${Math.max(0, calculatedPreAct).toFixed(4)}`
          ],
          variables: [
            { symbol: "z", desc: "The accumulated weighted pre-activation value before filtering.", color: "text-pink-400 bg-pink-950/40 border-pink-800" },
            { symbol: "max", desc: "A conditional function keeping positive values and throwing away negatives.", color: "text-slate-400 bg-slate-950 border-slate-800" },
            { symbol: "a", desc: "Final clean activation output sent out to subsequent layer inputs.", color: "text-amber-400 bg-amber-950/40 border-amber-800" }
          ],
          educationalInsight: "ReLU is the most popular activation filter. It is simple, fast to calculate, and lets models learn non-linear patterns without stalling gradients!"
        };
      case 'sigmoid':
        return {
          title: "Sigmoid Logistic Squeezer",
          formula: "σ(z) = 1 / (1 + e^-z)",
          formulaDecomposed: [
            { text: "σ(z)", label: "Sigmoid Activation Probability", color: "text-cyan-400" },
            { text: "=", label: "equals" },
            { text: "1 /", label: "one divided by" },
            { text: "(1 +", label: "one plus" },
            { text: "e^-z", label: "Euler constant raised to negative z power", color: "text-pink-400" },
            { text: ")", label: "" }
          ],
          calculationSteps: [
            `1. Raw input sum (z) = ${calculatedPreAct.toFixed(4)}`,
            `2. Compute negative exponent power (e^-z) ≈ ${Math.exp(-calculatedPreAct).toFixed(5)}`,
            `3. Add baseline (1 + e^-z) ≈ ${(1 + Math.exp(-calculatedPreAct)).toFixed(5)}`,
            `4. Divide: 1 / ${(1 + Math.exp(-calculatedPreAct)).toFixed(5)}`,
            `Result: a = ${(1 / (1 + Math.exp(-calculatedPreAct))).toFixed(4)}`
          ],
          variables: [
            { symbol: "z", desc: "Pre-activation total voltage value.", color: "text-pink-400 bg-pink-950/40 border-pink-800" },
            { symbol: "e", desc: "Euler's number constant, approximately 2.71828.", color: "text-slate-400 bg-slate-950 border-slate-800" },
            { symbol: "σ(z)", desc: "Squeezed output value restricted between 0.00 and 1.00.", color: "text-cyan-400 bg-cyan-950/40 border-cyan-800" }
          ],
          educationalInsight: "Sigmoid acts like an S-curve that squashes values into a range from 0 to 1. This makes it perfect for estimating class probabilities (like spam vs not spam)!"
        };
      case 'softmax':
        return {
          title: "Softmax Probability Normalizer",
          formula: "S(z_i) = e^(z_i) / ∑ e^(z_j)",
          formulaDecomposed: [
            { text: "S(z_i)", label: "Normalized probability for target class", color: "text-cyan-400" },
            { text: "=", label: "equals" },
            { text: "e^(z_i)", label: "Exponent value of the target class score", color: "text-pink-400" },
            { text: "/", label: "divided by" },
            { text: "∑ e^(z_j)", label: "Sum of exponent values of ALL classes combined", color: "text-indigo-400" }
          ],
          calculationSteps: [
            `Scenario: Final network output scores (logits): z₁ = 1.15, z₂ = 0.42, z₃ = -0.65`,
            `1. Apply exponent conversions (e^z):`,
            `   e^1.15 ≈ 3.16`,
            `   e^0.42 ≈ 1.52`,
            `   e^-0.65 ≈ 0.52`,
            `2. Sum of all exponentials = 3.16 + 1.52 + 0.52 = 5.20`,
            `3. Normalizing percentages:`,
            `   P(Class 1) = 3.16 / 5.20 = 60.8%`,
            `   P(Class 2) = 1.52 / 5.20 = 29.2%`,
            `   P(Class 3) = 0.52 / 5.20 = 10.0%`
          ],
          variables: [
            { symbol: "z_i", desc: "The raw output score (logit) for a specific classification node.", color: "text-pink-400 bg-pink-950/40 border-pink-800" },
            { symbol: "∑", desc: "Summation across all potential class outputs to normalize results.", color: "text-indigo-400 bg-indigo-950/40 border-indigo-800" },
            { symbol: "S", desc: "The resulting relative percentage distribution (adds up to 1.0 or 100%).", color: "text-cyan-400 bg-cyan-950/40 border-cyan-800" }
          ],
          educationalInsight: "Softmax is used at the very end of classification networks. It translates raw numbers into friendly relative probabilities that add up to exactly 100%."
        };
      case 'loss':
        return {
          title: "Cross Entropy Loss (Error Tracker)",
          formula: "L = - ∑ (y_i · log(p_i))",
          formulaDecomposed: [
            { text: "L", label: "Final Calculated mistake level", color: "text-rose-400" },
            { text: "=", label: "equals" },
            { text: "-∑", label: "negative sum of" },
            { text: "y_i", label: "True answer target vector (0 or 1)", color: "text-emerald-400" },
            { text: "· log(p_i)", label: "logarithm of predicted class probability", color: "text-cyan-400" }
          ],
          calculationSteps: [
            `Scenario: Target fruit is Class 1 (y₁ = 1, y₂ = 0, y₃ = 0)`,
            `Predicted confidence scores: p₁ = 0.82, p₂ = 0.15, p₃ = 0.03`,
            `1. Calculate individual entropy logs:`,
            `   y₁ · log(p₁) = 1 · log(0.82) = -0.198`,
            `   y₂ · log(p₂) = 0 · log(0.15) = 0`,
            `   y₃ · log(p₃) = 0 · log(0.03) = 0`,
            `2. Combine: L = - (-0.198 + 0 + 0)`,
            `Result Loss value: L = 0.198`,
            `Note: If the prediction was 100% correct (p₁ = 1.00), Loss is exactly 0.00!`
          ],
          variables: [
            { symbol: "y", desc: "The real true truth label (represented in a binary vector like [1, 0, 0]).", color: "text-emerald-400 bg-emerald-950/40 border-emerald-800" },
            { symbol: "p", desc: "The relative probability estimated by the neural network's Softmax output.", color: "text-cyan-400 bg-cyan-950/40 border-cyan-800" },
            { symbol: "L", desc: "The total penalty score. Lower loss means higher confidence in the correct answers.", color: "text-rose-400 bg-rose-950/40 border-rose-800" }
          ],
          educationalInsight: "Cross Entropy heavily penalizes the model if it is highly confident in the WRONG answer. It keeps the network focused on fixing major errors!"
        };
      case 'forward':
        return {
          title: "Forward Propagation Cascade",
          formula: "a^[l] = g( W^[l] · a^[l-1] + b^[l] )",
          formulaDecomposed: [
            { text: "a^[l]", label: "Activation matrix of current layer l", color: "text-amber-400" },
            { text: "=", label: "equals" },
            { text: "g(", label: "Activation filter function (ReLU, Sigmoid, etc.)" },
            { text: "W^[l] · a^[l-1]", label: "Weights multiplied by previous layer signals", color: "text-emerald-400" },
            { text: "+ b^[l]", label: "Biases of the current layer", color: "text-purple-400" },
            { text: ")", label: "" }
          ],
          calculationSteps: [
            `1. Signal starts at Input Layer (a^[0] = dataset inputs).`,
            `2. Multiply Layer 1 weights (W^[1]) by inputs and add biases (b^[1]).`,
            `3. Apply activation function (g) to calculate hidden states (a^[1]).`,
            `4. Cascade continues: multiply Hidden states by Layer 2 weights and add biases.`,
            `5. Apply final filter to calculate output classifications (a^[2]).`,
            `This forward flow transforms raw numeric traits into advanced classification estimates!`
          ],
          variables: [
            { symbol: "l", desc: "Current layer indicator inside the structural index.", color: "text-slate-400 bg-slate-950 border-slate-800" },
            { symbol: "W^[l]", desc: "Full synaptic connection weight matrix linking layers.", color: "text-emerald-400 bg-emerald-950/40 border-emerald-800" },
            { symbol: "g", desc: "The chosen non-linear filtering function applied to this layer's combined signals.", color: "text-cyan-400 bg-cyan-950/40 border-cyan-800" }
          ],
          educationalInsight: "Forward propagation is the process of feeding inputs through consecutive layers of neurons to calculate predictions. It is like an assembly line where each layer extracts higher-level concepts!"
        };
      case 'backprop':
        return {
          title: "Backpropagation & Chain Rule",
          formula: "∂L/∂w_i = ∂L/∂a · ∂a/∂z · ∂z/∂w_i",
          formulaDecomposed: [
            { text: "∂L/∂w", label: "Rate of change of Loss with respect to weight (Derivative slope)", color: "text-indigo-400" },
            { text: "=", label: "equals" },
            { text: "∂L/∂a", label: "Mistake sensitivity with respect to node output", color: "text-rose-400" },
            { text: "· ∂a/∂z", label: "Activation sensitivity with respect to input sum", color: "text-pink-400" },
            { text: "· ∂z/∂w", label: "Input sum sensitivity with respect to specific weight", color: "text-emerald-400" }
          ],
          calculationSteps: [
            `The chain rule isolates how much a single weight is responsible for the overall loss.`,
            `1. Output Sensitivity (∂L/∂a) = (predicted probability - true target value).`,
            `2. Activation Filter Slope (∂a/∂z) = (derivative of Sigmoid or ReLU at z).`,
            `3. Synapse multiplier sensitivity (∂z/∂w) = preceding input node signal (x).`,
            `Multiply these three rates of change:`,
            `   ∂L/∂w = (Error) · (Filter Slope) · (Incoming Input signal)`,
            `This tells us exactly how much to turn the weight dial up or down to fix mistakes!`
          ],
          variables: [
            { symbol: "∂", desc: "The partial derivative symbol, measuring the rate of change of one variable relative to another.", color: "text-slate-400 bg-slate-950 border-slate-800" },
            { symbol: "∂L/∂w", desc: "The calculated gradient slope direction. A map showing how to decrease the mistake value.", color: "text-indigo-400 bg-indigo-950/40 border-indigo-800" }
          ],
          educationalInsight: "Think of Backpropagation as backtracking blame. When the model makes a mistake, the error flows BACKWARD through the synapses, assigning a specific share of blame (gradient) to each weight."
        };
      case 'gradient':
        return {
          title: "Gradient Descent Optimizations",
          formula: "w_new = w_old - ( η · ∂L/∂w )",
          formulaDecomposed: [
            { text: "w_new", label: "Newly adjusted optimal weight", color: "text-cyan-400" },
            { text: "=", label: "equals" },
            { text: "w_old", label: "Original current weight value", color: "text-slate-400" },
            { text: "-", label: "subtract (to move opposite of mistake slope)" },
            { text: "η", label: "Learning Rate step speed size multiplier", color: "text-amber-400" },
            { text: "· ∂L/∂w", label: "Attributed error mistake slope gradient", color: "text-indigo-400" }
          ],
          calculationSteps: [
            `1. Current synapse connection weight (w_old) = ${w1.toFixed(3)}`,
            `2. Attributed mistake gradient slope (∂L/∂w) = -0.054`,
            `3. Learning Rate factor multiplier (η) = 0.100`,
            `4. Compute correction step: η · ∂L/∂w = 0.100 · -0.054 = -0.0054`,
            `5. Subtract correction: ${w1.toFixed(3)} - (-0.0054)`,
            `Result weight: w_new = ${(w1 - 0.1 * -0.054).toFixed(5)}`
          ],
          variables: [
            { symbol: "η", desc: "The Learning Rate. Controls how large of a step we take down the mistake hill. Too high can overshoot; too low takes forever!", color: "text-amber-400 bg-amber-950/40 border-amber-800" },
            { symbol: "∂L/∂w", desc: "The calculated gradient slope indicating the direction of steeper error increase.", color: "text-indigo-400 bg-indigo-950/40 border-indigo-800" },
            { symbol: "w_new", desc: "The updated weight that reduces prediction error on the next forward pass.", color: "text-cyan-400 bg-cyan-950/40 border-cyan-800" }
          ],
          educationalInsight: "Gradient Descent is like walking down a dark mountain with a flashlight. You feel the slope under your feet (gradient) and take steps (learning rate) downward until you reach the lowest, safest valley (minimum error)."
        };
    }
  };

  const topicData = getTopicData();

  return (
    <div id="math-equations-panel" className="flex-1 flex flex-col p-6 overflow-y-auto text-slate-100 font-sans gap-6 select-none bg-gradient-to-br from-[#040815] via-[#080d1a] to-[#02050e]">
      
      {/* Dynamic Keyframe Style block */}
      <style>{`
        @keyframes signalPulse {
          0% { stroke-dashoffset: 24; }
          100% { stroke-dashoffset: 0; }
        }
        .synapse-voltage-line {
          stroke-dasharray: 6 6;
          animation: signalPulse 1s linear infinite;
        }
        @keyframes ringPulse {
          0%, 100% { filter: drop-shadow(0 0 3px rgba(236,72,153,0.4)); }
          50% { filter: drop-shadow(0 0 10px rgba(236,72,153,0.8)); }
        }
        .glowing-neuron-core {
          animation: ringPulse 3s infinite ease-in-out;
        }
      `}</style>

      {/* 1. Header banner */}
      {!hideHeader && (
        <div className="bg-[#060a18]/70 border border-[#141d35]/75 rounded-2xl p-5 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shadow-xl shrink-0 text-left relative overflow-hidden backdrop-blur-md">
          {/* Decorative background glow */}
          <div className="absolute top-0 right-0 w-80 h-80 bg-purple-500/5 rounded-full blur-3xl pointer-events-none" />
          
          <div className="space-y-1.5 z-10">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono font-bold tracking-widest text-purple-400 uppercase bg-purple-950/45 border border-purple-800/25 px-2.5 py-0.5 rounded flex items-center gap-1.5 shadow-[0_0_12px_rgba(168,85,247,0.1)] animate-pulse">
                <Variable size={10} className="text-purple-400" />
                Active Equations Lab
              </span>
            </div>
            <h1 className="text-xl font-black tracking-tight text-white uppercase font-display">
              Math & <span className="text-purple-400 font-extrabold">Equations Panel</span>
            </h1>
            <p className="text-xs text-slate-400 font-medium font-sans">“Mathematics made visual and easy to understand.” Explore formula variables dynamically in real-time.</p>
          </div>
        </div>
      )}

      {/* 2. Main 3 Column Panel Layout split (Topic List - Formula breakdown - Variables legend) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch flex-1">
        
        {/* Left Column: Topic List Selector (3 columns) */}
        <div className="lg:col-span-3 bg-[#060a18]/70 border border-[#141d35]/75 rounded-2xl p-4 flex flex-col gap-3 shadow-xl text-left backdrop-blur-md">
          <div className="border-b border-[#141d35]/50 pb-2 mb-1 flex items-center justify-between">
            <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider block">
              Equation index
            </span>
            <BookOpen size={12} className="text-purple-400" />
          </div>

          <div className="space-y-1.5 flex-1">
            {[
              { id: 'sum', label: "1. Weighted Sum", category: "Pre-activation" },
              { id: 'relu', label: "2. ReLU Activation", category: "Thresholding" },
              { id: 'sigmoid', label: "3. Sigmoid Function", category: "Probability Squeezer" },
              { id: 'softmax', label: "4. Softmax Function", category: "Normalizer" },
              { id: 'loss', label: "5. Cross Entropy Loss", category: "Error Score" },
              { id: 'forward', label: "6. Forward Propagation", category: "Pass Cascade" },
              { id: 'backprop', label: "7. Backpropagation", category: "Blame Attribution" },
              { id: 'gradient', label: "8. Gradient Descent", category: "Weight Correction" }
            ].map((topic) => (
              <button
                key={topic.id}
                onClick={() => setSelectedTopic(topic.id as TopicId)}
                className={`w-full px-3.5 py-2.5 rounded-xl text-xs font-bold border flex flex-col items-start gap-0.5 transition cursor-pointer select-none active:scale-98 ${
                  selectedTopic === topic.id
                    ? 'bg-purple-950/35 border-purple-500 text-purple-300 shadow-lg shadow-purple-500/5'
                    : 'bg-[#030611] border-[#141d35] text-slate-400 hover:border-[#1e2d50] hover:text-slate-200'
                }`}
              >
                <div className="w-full flex justify-between items-center">
                  <span>{topic.label}</span>
                  <ChevronRight size={13} className={selectedTopic === topic.id ? 'text-purple-400' : 'text-slate-700'} />
                </div>
                <span className={`text-[8.5px] font-mono font-bold uppercase tracking-wider ${selectedTopic === topic.id ? 'text-purple-400/80' : 'text-slate-600'}`}>
                  {topic.category}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Middle Column: Active formula deconstructed breakdown & Flow chart (6 columns) */}
        <div id="tour-math-equations" className="lg:col-span-6 bg-[#060a18]/70 border border-[#141d35]/75 rounded-2xl p-5 flex flex-col justify-between shadow-xl backdrop-blur-md text-left gap-5 relative overflow-hidden hover:border-purple-500/10 transition-colors duration-300">
          {/* Subtle glow effect */}
          <div className="absolute top-0 left-0 w-24 h-24 bg-purple-500/10 rounded-full blur-2xl pointer-events-none" />

          <div className="space-y-4">
            
            <div className="flex justify-between items-center border-b border-[#141d35]/50 pb-2">
              <span className="text-xs font-bold font-mono text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles size={13} className="text-purple-400" />
                Formula Deconstruction
              </span>
              <span className="text-[10px] text-purple-400 font-mono font-bold bg-purple-950/40 border border-purple-800/30 px-2 py-0.5 rounded uppercase tracking-wider">
                {topicData.title}
              </span>
            </div>

            {/* Glowing Equation Card (Deconstructed block) */}
            <div className="bg-[#030611] border border-[#141d35] rounded-2xl p-4.5 flex flex-wrap gap-x-2.5 gap-y-1.5 items-center justify-center min-h-[64px] shadow-inner font-mono text-base md:text-lg font-black tracking-wide relative">
              <div className="absolute top-1 right-2 text-[7px] font-mono font-black text-slate-600 uppercase tracking-widest">formula view</div>
              {topicData.formulaDecomposed.map((token, idx) => (
                <div key={idx} className="group relative cursor-help">
                  <span className={`${token.color || 'text-white'} hover:brightness-125 transition-all`}>
                    {token.text}
                  </span>
                  {token.label && (
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block bg-slate-900 border border-slate-800 text-[9px] text-slate-300 px-2 py-1 rounded shadow-xl whitespace-nowrap z-50 font-sans tracking-normal font-semibold">
                      {token.label}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Visual explanation diagram of weight & activation flow */}
            <div className="bg-[#030611] border border-[#141d35] rounded-xl p-3 flex flex-col gap-2 relative">
              <span className="text-[7.5px] font-mono text-slate-500 uppercase tracking-widest font-black block border-b border-slate-900 pb-1">
                Visual Flow of a Single Neuron cell
              </span>
              
              <div className="h-28 w-full flex items-center justify-center">
                <svg className="w-full h-full" viewBox="0 0 280 100">
                  {/* Inputs */}
                  <g transform="translate(10, 0)">
                    {/* Input 1 */}
                    <circle cx="20" cy="20" r="9" fill="#020617" stroke="#22d3ee" strokeWidth="1.5" />
                    <text x="20" y="23" fill="#22d3ee" fontSize="7" fontWeight="bold" textAnchor="middle" className="font-mono">x₁</text>
                    <text x="20" y="36" fill="#475569" fontSize="6" textAnchor="middle" className="font-mono">{x1.toFixed(1)}</text>
                    
                    {/* Input 2 */}
                    <circle cx="20" cy="50" r="9" fill="#020617" stroke="#22d3ee" strokeWidth="1.5" />
                    <text x="20" y="53" fill="#22d3ee" fontSize="7" fontWeight="bold" textAnchor="middle" className="font-mono">x₂</text>
                    <text x="20" y="66" fill="#475569" fontSize="6" textAnchor="middle" className="font-mono">{x2.toFixed(1)}</text>

                    {/* Input 3 */}
                    <circle cx="20" cy="80" r="9" fill="#020617" stroke="#22d3ee" strokeWidth="1.5" />
                    <text x="20" y="83" fill="#22d3ee" fontSize="7" fontWeight="bold" textAnchor="middle" className="font-mono">x₃</text>
                    <text x="20" y="96" fill="#475569" fontSize="6" textAnchor="middle" className="font-mono">{x3.toFixed(1)}</text>
                  </g>

                  {/* Synapse line connections to Node Core */}
                  <g stroke="#334155" strokeWidth="1">
                    {/* Synapse 1 */}
                    <line x1="39" y1="20" x2="135" y2="50" className="synapse-voltage-line" stroke="#10b981" strokeWidth="1.2" />
                    {/* Synapse 2 */}
                    <line x1="39" y1="50" x2="135" y2="50" className="synapse-voltage-line" stroke="#f59e0b" strokeWidth="1" />
                    {/* Synapse 3 */}
                    <line x1="39" y1="80" x2="135" y2="50" className="synapse-voltage-line" stroke="#10b981" strokeWidth="1.2" />
                  </g>

                  {/* Weights text overlay */}
                  <g fill="#10b981" fontSize="6" fontWeight="bold" className="font-mono">
                    <text x="65" y="27" textAnchor="middle" fill="#34d399">w₁₁: {w1.toFixed(2)}</text>
                    <text x="65" y="47" textAnchor="middle" fill="#fbbf24">w₂₁: {w2.toFixed(2)}</text>
                    <text x="65" y="73" textAnchor="middle" fill="#34d399">w₃₁: {w3.toFixed(2)}</text>
                  </g>

                  {/* Neuron Core */}
                  <g transform="translate(135, 20)">
                    {/* Core outer shell */}
                    <circle cx="30" cy="30" r="18" fill="#090d16" stroke="#ec4899" strokeWidth="2.2" className="glowing-neuron-core" />
                    
                    {/* Weighted sum z label */}
                    <text x="30" y="27" fill="#f472b6" fontSize="7" fontWeight="black" textAnchor="middle" className="font-mono">z = ∑wx+b</text>
                    
                    {/* Value z value */}
                    <text x="30" y="37" fill="#ffffff" fontSize="7.5" fontWeight="bold" textAnchor="middle" className="font-mono">{calculatedPreAct.toFixed(2)}</text>
                    
                    {/* Bias spring indicator */}
                    <text x="30" y="46" fill="#c084fc" fontSize="5.5" fontWeight="bold" textAnchor="middle" className="font-mono">b: {bias.toFixed(2)}</text>
                  </g>

                  {/* Forward arrow connection to activation filter */}
                  <line x1="183" y1="50" x2="208" y2="50" stroke="#f472b6" strokeWidth="2" strokeDasharray="3 2" />

                  {/* Activation filter box */}
                  <g transform="translate(208, 35)">
                    <rect x="0" y="0" width="28" height="30" rx="6" fill="#0f172a" stroke="#fbbf24" strokeWidth="1.5" />
                    <text x="14" y="14" fill="#fbbf24" fontSize="6.5" fontWeight="black" textAnchor="middle" className="font-mono">{currentActFunction.toUpperCase()}</text>
                    <text x="14" y="24" fill="#ffffff" fontSize="7.5" fontWeight="black" textAnchor="middle" className="font-mono">{calculatedAct.toFixed(2)}</text>
                  </g>

                  {/* final output line */}
                  <line x1="236" y1="50" x2="265" y2="50" stroke="#fbbf24" strokeWidth="2" />
                  <polygon points="265,47 271,50 265,53" fill="#fbbf24" />
                  <text x="256" y="43" fill="#fbbf24" fontSize="7" fontWeight="black" className="font-mono">a</text>
                </svg>
              </div>
            </div>

            {/* Beginner-friendly Description text box */}
            <div className="p-4 bg-[#030611] border border-[#141d35] rounded-xl space-y-1">
              <span className="text-[8.5px] font-mono font-bold text-slate-500 uppercase tracking-widest block">Conceptual Insight:</span>
              <p className="text-[11px] text-slate-350 leading-relaxed font-sans font-medium">
                {topicData.educationalInsight}
              </p>
            </div>

            {/* Step-by-Step Example calculation box */}
            <div className="space-y-1.5 pt-1.5">
              <h4 className="text-[9px] font-mono text-slate-500 uppercase font-black tracking-widest">Real-time Step-by-Step Calculations:</h4>
              <div className="bg-[#030611] p-4 rounded-xl border border-[#141d35] font-mono text-[10.5px] text-slate-350 space-y-2 leading-relaxed">
                {topicData.calculationSteps.map((step, idx) => (
                  <div key={idx} className={`${idx === topicData.calculationSteps.length - 1 ? 'text-emerald-400 font-black border-t border-slate-900 pt-2 mt-1 flex items-center gap-1.5' : ''}`}>
                    {idx === topicData.calculationSteps.length - 1 && <CheckCircle size={12} className="text-emerald-400 shrink-0" />}
                    <span>{step}</span>
                  </div>
                ))}
              </div>
            </div>

          </div>

          <div className="text-[10px] text-slate-500 font-mono mt-4 flex gap-1.5 items-center border-t border-slate-900 pt-3">
            <CheckCircle size={12} className="text-emerald-500" />
            <span>Interactive math values dynamically bind to active weights stored in your neural sandbox matrix.</span>
          </div>
        </div>

        {/* Right Column: Variables description legend (3 columns) */}
        <div className="lg:col-span-3 bg-[#060a18]/70 border border-[#141d35]/75 rounded-2xl p-4 flex flex-col justify-between shadow-xl text-left backdrop-blur-md">
          
          <div className="space-y-4">
            <div className="border-b border-[#141d35]/50 pb-2 mb-1 flex items-center justify-between">
              <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider block">
                Variables Legend
              </span>
              <Sliders size={12} className="text-purple-400" />
            </div>

            <div className="space-y-3.5">
              {topicData.variables.map((variable, idx) => (
                <div key={idx} className="p-3 bg-[#030611] border border-[#141d35] rounded-xl flex flex-col gap-1.5 hover:border-purple-500/10 transition duration-200">
                  <span className={`text-[11px] font-black font-mono w-7 h-7 rounded-lg flex items-center justify-center border ${variable.color}`}>
                    {variable.symbol}
                  </span>
                  <span className="text-[11px] text-slate-400 leading-normal">
                    {variable.desc}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="text-[9.5px] text-slate-500 font-mono bg-[#030611] p-3 rounded-xl border border-[#141d35] leading-normal mt-4">
            <span className="font-bold text-white block mb-0.5">Summary Node:</span>
            By decomposing the complex formulas into color-coded segments and matching flow steps, you gain immediate access to core deep learning mathematics without complex academic jargon!
          </div>

        </div>

      </div>

    </div>
  );
}
