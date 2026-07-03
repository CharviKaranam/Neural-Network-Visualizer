export type ActivationType = 'sigmoid' | 'tanh' | 'relu' | 'linear';
export type OptimizerType = 'sgd' | 'momentum' | 'adam';

export interface LayerConfig {
  id: number;
  size: number;
  activation: ActivationType;
}

export interface NeuronState {
  id: string; // "layer_{layerIndex}_node_{nodeIndex}"
  layerIndex: number;
  nodeIndex: number;
  preAct: number; // z = sum(w * a) + b
  activation: number; // a = f(z)
  bias: number;
  biasGradient: number; // dL/db
  delta: number; // error term (dL/dz)
}

export interface ConnectionState {
  id: string; // "fromNodeId->toNodeId"
  fromNodeId: string;
  toNodeId: string;
  fromLayerIndex: number;
  toLayerIndex: number;
  weight: number;
  weightGradient: number; // dL/dw
  prevDeltaW: number; // for momentum
  m: number; // adam 1st moment
  v: number; // adam 2nd moment
}

export interface DatasetItem {
  id: string;
  input: number[];
  expected: number[];
  label?: string;
}

export interface DatasetPreset {
  name: string;
  description: string;
  items: DatasetItem[];
}

export interface MetricPoint {
  epoch: number;
  loss: number;
  accuracy: number;
  gradientMagnitude: number;
}

export interface NetworkState {
  layers: LayerConfig[];
  neurons: NeuronState[][]; // outer index is layer index, inner index is neuron
  connections: Record<string, ConnectionState>; // keyed by fromNodeId->toNodeId
}

export interface TrainingState {
  epoch: number;
  history: MetricPoint[];
  currentLoss: number;
  currentAccuracy: number;
  status: 'idle' | 'forward_done' | 'backprop_done' | 'training';
  stepMode: 'continuous' | 'manual_steps';
  stepIndex: number; // 0=idle/ready, 1=forward complete, 2=backward complete, 3=weights updated
}
