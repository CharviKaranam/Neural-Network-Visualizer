import { LayerConfig, NeuronState, ConnectionState, NetworkState, ActivationType, OptimizerType, DatasetItem, DatasetPreset } from '../types/network';

// Activation functions
export function activate(z: number, type: ActivationType): number {
  switch (type) {
    case 'sigmoid':
      return 1 / (1 + Math.exp(-z));
    case 'tanh':
      return Math.tanh(z);
    case 'relu':
      return Math.max(0, z);
    case 'linear':
    default:
      return z;
  }
}

// Derivative of activation functions (with respect to z, using pre-calculated output a)
export function activationDerivative(a: number, z: number, type: ActivationType): number {
  switch (type) {
    case 'sigmoid':
      // f'(z) = f(z) * (1 - f(z))
      return a * (1 - a);
    case 'tanh':
      // f'(z) = 1 - tanh(z)^2
      return 1 - a * a;
    case 'relu':
      // f'(z) = z > 0 ? 1 : 0
      return z > 0 ? 1 : 0;
    case 'linear':
    default:
      return 1;
  }
}

// Initialize clean weights and biases
export function initializeNetwork(layerConfigs: LayerConfig[]): NetworkState {
  const neurons: NeuronState[][] = [];
  const connections: Record<string, ConnectionState> = {};

  // 1. Initialize Neurons
  for (let l = 0; l < layerConfigs.length; l++) {
    const config = layerConfigs[l];
    const layerNeurons: NeuronState[] = [];
    
    for (let i = 0; i < config.size; i++) {
      layerNeurons.push({
        id: `layer_${l}_node_${i}`,
        layerIndex: l,
        nodeIndex: i,
        preAct: 0,
        activation: 0,
        bias: l === 0 ? 0 : (Math.random() * 0.4 - 0.2), // no biases on input layer
        biasGradient: 0,
        delta: 0
      });
    }
    neurons.push(layerNeurons);
  }

  // 2. Initialize Connections with Xavier/He-like random initialization
  for (let l = 0; l < layerConfigs.length - 1; l++) {
    const fromSize = layerConfigs[l].size;
    const toSize = layerConfigs[l + 1].size;
    const limit = Math.sqrt(6 / (fromSize + toSize)); // Xavier heuristic range

    for (let i = 0; i < fromSize; i++) {
      const fromNodeId = `layer_${l}_node_${i}`;
      for (let j = 0; j < toSize; j++) {
        const toNodeId = `layer_${l + 1}_node_${j}`;
        const connId = `${fromNodeId}->${toNodeId}`;

        connections[connId] = {
          id: connId,
          fromNodeId,
          toNodeId,
          fromLayerIndex: l,
          toLayerIndex: l + 1,
          weight: Math.random() * limit * 2 - limit,
          weightGradient: 0,
          prevDeltaW: 0,
          m: 0,
          v: 0
        };
      }
    }
  }

  return {
    layers: layerConfigs,
    neurons,
    connections
  };
}

// Forward propagation: Computes z and a for all neurons
export function forwardPropagate(network: NetworkState, inputs: number[]): NetworkState {
  // Deep clone neurons to avoid issues during mutation
  const nextNeurons = network.neurons.map(layer => layer.map(neuron => ({ ...neuron })));
  
  // Set input layer values
  if (inputs.length !== nextNeurons[0].length) {
    console.warn("Input length mismatch. Padding with 0s or slicing.");
  }
  
  for (let i = 0; i < nextNeurons[0].length; i++) {
    const value = inputs[i] !== undefined ? inputs[i] : 0;
    nextNeurons[0][i].preAct = value; // for input, z = a
    nextNeurons[0][i].activation = value;
  }

  // Forward pass layer by layer
  for (let l = 1; l < network.layers.length; l++) {
    const layerConfig = network.layers[l];
    const prevLayer = nextNeurons[l - 1];
    const currentLayer = nextNeurons[l];

    for (let j = 0; j < currentLayer.length; j++) {
      let weightedSum = currentLayer[j].bias;

      // Add weights * activations of previous layer
      for (let i = 0; i < prevLayer.length; i++) {
        const connId = `${prevLayer[i].id}->${currentLayer[j].id}`;
        const conn = network.connections[connId];
        if (conn) {
          weightedSum += prevLayer[i].activation * conn.weight;
        }
      }

      currentLayer[j].preAct = weightedSum;
      currentLayer[j].activation = activate(weightedSum, layerConfig.activation);
    }
  }

  return {
    ...network,
    neurons: nextNeurons
  };
}

// Backpropagation: Computes deltas and gradients
export function backpropagate(
  network: NetworkState,
  expected: number[]
): { network: NetworkState; totalGradientMag: number } {
  // Deep clone to ensure immutability
  const nextNeurons = network.neurons.map(layer => layer.map(neuron => ({ ...neuron })));
  const nextConnections = { ...network.connections };
  for (const key in nextConnections) {
    nextConnections[key] = { ...nextConnections[key] };
  }

  const L = network.layers.length;
  const outputLayerIndex = L - 1;
  const outputLayer = nextNeurons[outputLayerIndex];
  const outputLayerConfig = network.layers[outputLayerIndex];

  let totalSqGradients = 0;
  let gradientCount = 0;

  // 1. Delta for output layer: dL/dz = (a - y) * f'(z) [using MSE Loss]
  for (let k = 0; k < outputLayer.length; k++) {
    const neuron = outputLayer[k];
    const expectedVal = expected[k] !== undefined ? expected[k] : 0;
    const errorTerm = neuron.activation - expectedVal; // dL/da = (a - y)
    const derivVal = activationDerivative(neuron.activation, neuron.preAct, outputLayerConfig.activation);
    
    // Output node delta
    neuron.delta = errorTerm * derivVal;
    neuron.biasGradient = neuron.delta; // dL/db = delta
    
    totalSqGradients += neuron.biasGradient * neuron.biasGradient;
    gradientCount++;
  }

  // 2. Delta for hidden layers: dL/dz = (sum(w * delta_next)) * f'(z)
  for (let l = outputLayerIndex - 1; l >= 1; l--) {
    const currentLayer = nextNeurons[l];
    const currentLayerConfig = network.layers[l];
    const nextLayer = nextNeurons[l + 1];

    for (let j = 0; j < currentLayer.length; j++) {
      let sumDeltaWeights = 0;

      // Sum connection from current node j to all next-layer nodes k
      for (let k = 0; k < nextLayer.length; k++) {
        const connId = `${currentLayer[j].id}->${nextLayer[k].id}`;
        const conn = nextConnections[connId];
        if (conn) {
          sumDeltaWeights += conn.weight * nextLayer[k].delta;
        }
      }

      const derivVal = activationDerivative(currentLayer[j].activation, currentLayer[j].preAct, currentLayerConfig.activation);
      currentLayer[j].delta = sumDeltaWeights * derivVal;
      currentLayer[j].biasGradient = currentLayer[j].delta; // dL/db = delta

      totalSqGradients += currentLayer[j].biasGradient * currentLayer[j].biasGradient;
      gradientCount++;
    }
  }

  // 3. Connection Gradients: dL/dw = a_prev * delta_curr
  for (const key in nextConnections) {
    const conn = nextConnections[key];
    const fromParts = conn.fromNodeId.split('_');
    const toParts = conn.toNodeId.split('_');
    const fromL = parseInt(fromParts[1], 10);
    const fromI = parseInt(fromParts[3], 10);
    const toL = parseInt(toParts[1], 10);
    const toI = parseInt(toParts[3], 10);

    const fromNode = nextNeurons[fromL][fromI];
    const toNode = nextNeurons[toL][toI];

    conn.weightGradient = fromNode.activation * toNode.delta;
    
    totalSqGradients += conn.weightGradient * conn.weightGradient;
    gradientCount++;
  }

  const totalGradientMag = Math.sqrt(totalSqGradients / Math.max(1, gradientCount));

  return {
    network: {
      ...network,
      neurons: nextNeurons,
      connections: nextConnections
    },
    totalGradientMag
  };
}

// Update weights & biases using chosen Optimizer
export function updateParams(
  network: NetworkState,
  lr: number,
  optimizer: OptimizerType,
  epoch: number
): NetworkState {
  const nextNeurons = network.neurons.map(layer => layer.map(neuron => ({ ...neuron })));
  const nextConnections = { ...network.connections };
  for (const key in nextConnections) {
    nextConnections[key] = { ...nextConnections[key] };
  }

  // Parameters for optimizers
  const momentumCoeff = 0.9;
  const beta1 = 0.9;
  const beta2 = 0.999;
  const eps = 1e-8;
  const t = epoch + 1; // time step for Adam

  // 1. Update Connection Weights
  for (const key in nextConnections) {
    const conn = nextConnections[key];
    const grad = conn.weightGradient;

    switch (optimizer) {
      case 'sgd':
        conn.weight -= lr * grad;
        break;

      case 'momentum': {
        const deltaW = momentumCoeff * conn.prevDeltaW - lr * grad;
        conn.weight += deltaW;
        conn.prevDeltaW = deltaW;
        break;
      }

      case 'adam': {
        // Update biased first moment estimate
        conn.m = beta1 * conn.m + (1 - beta1) * grad;
        // Update biased second raw moment estimate
        conn.v = beta2 * conn.v + (1 - beta2) * grad * grad;

        // Compute bias-corrected first and second moment estimates
        const mHat = conn.m / (1 - Math.pow(beta1, t));
        const vHat = conn.v / (1 - Math.pow(beta2, t));

        // Update weights
        conn.weight -= (lr * mHat) / (Math.sqrt(vHat) + eps);
        break;
      }
    }
  }

  // 2. Update Neuron Biases (skip input layer, l=0)
  for (let l = 1; l < nextNeurons.length; l++) {
    const layer = nextNeurons[l];
    for (let i = 0; i < layer.length; i++) {
      const neuron = layer[i];
      const grad = neuron.biasGradient;

      switch (optimizer) {
        case 'sgd':
          neuron.bias -= lr * grad;
          break;

        case 'momentum': {
          // Store bias momentum inside delta field index (transient)
          // To keep it simple, we use a simple inline momentum or just standard update
          neuron.bias -= lr * grad;
          break;
        }

        case 'adam': {
          neuron.bias -= lr * grad;
          break;
        }
      }
    }
  }

  return {
    ...network,
    neurons: nextNeurons,
    connections: nextConnections
  };
}

// Calculate mean squared error for a single sample
export function calculateLoss(outputActivations: number[], expected: number[]): number {
  let errorSum = 0;
  for (let i = 0; i < outputActivations.length; i++) {
    const difference = outputActivations[i] - (expected[i] !== undefined ? expected[i] : 0);
    errorSum += difference * difference;
  }
  return 0.5 * errorSum; // MSE
}

// Calculate binary classification accuracy
export function calculateAccuracy(outputActivations: number[], expected: number[]): number {
  let correctCount = 0;
  for (let i = 0; i < outputActivations.length; i++) {
    const predIdx = outputActivations[i] >= 0.5 ? 1 : 0;
    const expIdx = expected[i] >= 0.5 ? 1 : 0;
    if (predIdx === expIdx) {
      correctCount++;
    }
  }
  return correctCount / outputActivations.length;
}

// Generate some initial datasets: XOR, Circles, Moons, Linear Classifiers
export const DATASET_PRESETS: DatasetPreset[] = [
  {
    name: "Logical XOR Gate",
    description: "Classic non-linear separation. Requires at least one hidden layer.",
    items: [
      { id: "xor_0", input: [0, 0], expected: [0], label: "Class 0" },
      { id: "xor_1", input: [0, 1], expected: [1], label: "Class 1" },
      { id: "xor_2", input: [1, 0], expected: [1], label: "Class 1" },
      { id: "xor_3", input: [1, 1], expected: [0], label: "Class 0" }
    ]
  },
  {
    name: "Concentric Circles",
    description: "Class 1 is a small hub; Class 0 forms the outer ring ring.",
    items: [
      { id: "circ_0", input: [0.1, 0.1], expected: [1], label: "Inner" },
      { id: "circ_1", input: [-0.15, 0.12], expected: [1], label: "Inner" },
      { id: "circ_2", input: [0.08, -0.15], expected: [1], label: "Inner" },
      { id: "circ_3", input: [-0.05, -0.05], expected: [1], label: "Inner" },
      { id: "circ_4", input: [0.75, 0.75], expected: [0], label: "Outer" },
      { id: "circ_5", input: [-0.8, -0.1], expected: [0], label: "Outer" },
      { id: "circ_6", input: [0.1, -0.85], expected: [0], label: "Outer" },
      { id: "circ_7", input: [-0.7, 0.65], expected: [0], label: "Outer" }
    ]
  },
  {
    name: "Linearly Separable",
    description: "Simple diagonal separation boundary.",
    items: [
      { id: "lin_0", input: [-0.5, -0.6], expected: [0], label: "Below" },
      { id: "lin_1", input: [-0.8, -0.2], expected: [0], label: "Below" },
      { id: "lin_2", input: [-0.3, -0.7], expected: [0], label: "Below" },
      { id: "lin_3", input: [0.5, 0.6], expected: [1], label: "Above" },
      { id: "lin_4", input: [0.2, 0.8], expected: [1], label: "Above" },
      { id: "lin_5", input: [0.7, 0.3], expected: [1], label: "Above" }
    ]
  },
  {
    name: "3D Multi-Class Classifier",
    description: "3 input dimensions, mapping to multi-neuron binary patterns.",
    items: [
      { id: "mc_0", input: [0.1, 0.9, 0.1], expected: [1, 0], label: "North" },
      { id: "mc_1", input: [0.2, 0.85, -0.15], expected: [1, 0], label: "North" },
      { id: "mc_2", input: [-0.8, -0.1, 0.3], expected: [0, 1], label: "West" },
      { id: "mc_3", input: [-0.75, -0.2, -0.3], expected: [0, 1], label: "West" },
      { id: "mc_4", input: [0.1, -0.85, 0.9], expected: [0, 0], label: "South" }
    ]
  }
];
