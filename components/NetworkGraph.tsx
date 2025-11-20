import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import { GraphNode, GraphLink } from '../types';

interface NetworkGraphProps {
  nodes: GraphNode[];
  links: GraphLink[];
}

export const NetworkGraph: React.FC<NetworkGraphProps> = ({ nodes, links }) => {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!svgRef.current) return;

    const width = svgRef.current.clientWidth;
    const height = svgRef.current.clientHeight;

    // Clear previous
    d3.select(svgRef.current).selectAll("*").remove();

    const svg = d3.select(svgRef.current)
      .attr("viewBox", [0, 0, width, height])
      .style("background-color", "rgba(0,0,0,0.5)");

    // Simulation setup
    const simulation = d3.forceSimulation(nodes as d3.SimulationNodeDatum[])
      .force("link", d3.forceLink(links).id((d: any) => d.id).distance(100))
      .force("charge", d3.forceManyBody().strength(-300))
      .force("center", d3.forceCenter(width / 2, height / 2));

    // Links
    const link = svg.append("g")
      .selectAll("line")
      .data(links)
      .join("line")
      .attr("stroke", "#4a0404")
      .attr("stroke-opacity", 0.6)
      .attr("stroke-width", d => Math.sqrt(d.strength || 1) * 2);

    // Nodes
    const node = svg.append("g")
      .selectAll("circle")
      .data(nodes)
      .join("circle")
      .attr("r", 10)
      .attr("fill", (d) => {
        if (d.group === 'character') return '#d4af37';
        if (d.group === 'concept') return '#2f2f2f';
        return '#e5e5e5';
      })
      .call(drag(simulation) as any);

    // Labels
    const label = svg.append("g")
      .selectAll("text")
      .data(nodes)
      .join("text")
      .attr("dx", 12)
      .attr("dy", ".35em")
      .text(d => d.label)
      .attr("fill", "#ccc")
      .style("font-family", "Roboto Mono")
      .style("font-size", "10px");

    simulation.on("tick", () => {
      link
        .attr("x1", (d: any) => d.source.x)
        .attr("y1", (d: any) => d.source.y)
        .attr("x2", (d: any) => d.target.x)
        .attr("y2", (d: any) => d.target.y);

      node
        .attr("cx", (d: any) => d.x)
        .attr("cy", (d: any) => d.y);

      label
        .attr("x", (d: any) => d.x)
        .attr("y", (d: any) => d.y);
    });

    function drag(simulation: d3.Simulation<d3.SimulationNodeDatum, undefined>) {
      function dragstarted(event: any) {
        if (!event.active) simulation.alphaTarget(0.3).restart();
        event.subject.fx = event.subject.x;
        event.subject.fy = event.subject.y;
      }

      function dragged(event: any) {
        event.subject.fx = event.x;
        event.subject.fy = event.y;
      }

      function dragended(event: any) {
        if (!event.active) simulation.alphaTarget(0);
        event.subject.fx = null;
        event.subject.fy = null;
      }

      return d3.drag()
        .on("start", dragstarted)
        .on("drag", dragged)
        .on("end", dragended);
    }

  }, [nodes, links]);

  return <svg ref={svgRef} className="w-full h-full" />;
};
