// services/graphService.ts
import { GoogleGenAI } from "@google/genai";
import { GraphNode, GraphLink, AppState } from '../types';

/**
 * NetworkX Backend via Gemini Code Execution
 * Blueprint requirement: "Gemini 3 Pro runs real Python code via code_execution tool"
 */

interface GraphAnalysis {
  dominanceChains: Array<{ path: string[]; strength: number }>;
  grudgePropagation: string[];
  tropeEntropy: number;
  speakerPriority: Array<{ character: string; score: number }>;
  hiddenEdges: GraphLink[];
}

export class NetworkXGraphService {
  private ai: GoogleGenAI;
  private graphState: string = ""; // Serialized NetworkX graph

  constructor(apiKey: string) {
    this.ai = new GoogleGenAI({ apiKey });
  }

  /**
   * Initialize persistent NetworkX graph
   */
  async initializeGraph(state: AppState): Promise<void> {
    const initCode = `
import networkx as nx
import json
import math

# Create persistent directed multigraph
G = nx.MultiDiGraph()

# Add initial nodes
${state.graph.nodes.map(n => 
  `G.add_node("${n.id}", label="${n.label}", group="${n.group}")`
).join('\n')}

# Add initial edges
${state.graph.links.map(l => 
  `G.add_edge("${l.source}", "${l.target}", relation="${l.label}", weight=${l.strength})`
).join('\n')}

# Serialize for persistence
graph_data = nx.node_link_data(G)
print(json.dumps(graph_data))
`;

    const response = await this.ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: `Execute this Python code to initialize the NetworkX graph:\n\n${initCode}`,
      config: {
        tools: [{ codeExecution: {} }],
        systemInstruction: 'You are a Python REPL. Execute code and return output.'
      }
    });

    const output = this.extractCodeOutput(response.text || "");
    this.graphState = output;
    
    // Restore from localStorage if available
    const savedGraph = localStorage.getItem('forge_graph');
    if (savedGraph) {
      this.graphState = savedGraph;
      console.log("Restored graph from localStorage.");
    }
  }

  /**
   * Calculate trope entropy to prevent narrative stagnation
   */
  async calculateTropeEntropy(): Promise<number> {
    const code = `
import networkx as nx
import json
import math
from collections import Counter

G = nx.node_link_graph(json.loads('''${this.graphState}'''))

tropes = [data.get('relation', 'unknown') for u, v, data in G.edges(data=True)]
if not tropes:
    print(0.5)
else:
    counter = Counter(tropes)
    total = sum(counter.values())
    probs = [count/total for count in counter.values()]
    
    entropy = -sum(p * math.log2(p) for p in probs if p > 0)
    
    max_entropy = math.log2(len(counter))
    normalized = entropy / max_entropy if max_entropy > 0 else 0
    
    print(normalized)
`;
    const response = await this.executeCode(code);
    return parseFloat(response || "0.5");
  }

  async addEdge(source: string, target: string, relation: string, weight: number): Promise<void> {
    const code = `
import networkx as nx
import json

G = nx.node_link_graph(json.loads('''${this.graphState}'''))
G.add_edge("${source}", "${target}", relation="${relation}", weight=${weight})

graph_data = nx.node_link_data(G)
print(json.dumps(graph_data))
`;
    const response = await this.executeCode(code);
    this.graphState = response;
  }
  
  async analyzeGraph(state: AppState): Promise<GraphAnalysis> {
    const entropy = await this.calculateTropeEntropy();
    const hiddenEdges: GraphLink[] = [];
    if (entropy < 0.35) {
      hiddenEdges.push({
        source: 'calista',
        target: 'subject',
        label: 'RomanticizedAbuse',
        strength: 0.8
      });
    }

    return {
      dominanceChains: [], // Placeholder
      grudgePropagation: [], // Placeholder
      tropeEntropy: entropy,
      speakerPriority: [], // Placeholder
      hiddenEdges
    };
  }

  private async executeCode(code: string): Promise<string> {
    try {
        const response = await this.ai.models.generateContent({
            model: 'gemini-3-pro-preview',
            contents: `Execute this Python code:\n\n${code}`,
            config: {
                tools: [{ codeExecution: {} }],
                systemInstruction: 'Execute code and return ONLY the print output, nothing else.'
            }
        });
        return this.extractCodeOutput(response.text || "");
    } catch(e) {
        console.error("Python execution failed:", e);
        return "";
    }
  }

  private extractCodeOutput(text: string): string {
    const match = text.match(/```(?:python)?\n([\s\S]*?)```/);
    if (match) return match[1].trim();
    const lines = text.split('\n').filter(l => !l.startsWith('>>>') && !l.startsWith('...'));
    return lines.join('\n').trim();
  }

  getGraphStateForUI(): { nodes: GraphNode[]; links: GraphLink[] } {
    try {
      if (!this.graphState) return { nodes: [], links: [] };
      const data = JSON.parse(this.graphState);
      return {
        nodes: data.nodes.map((n: any) => ({
          id: n.id,
          label: n.label || n.id,
          group: n.group || 'concept'
        })),
        links: data.links.map((l: any) => ({
          source: l.source,
          target: l.target,
          label: l.relation || 'related',
          strength: l.weight || 1
        }))
      };
    } catch(e) {
      console.error("Error parsing graph state for UI", e)
      return { nodes: [], links: [] };
    }
  }
}

export const createGraphService = (apiKey: string) => new NetworkXGraphService(apiKey);
