import React from "react";
import { MiniMap } from "reactflow";
import "./styles/StyledMiniMap.css";

// Paleta de colores
const colors = {
  deepSpace: "#0B0C10",
  starBlue: "#1A73E8",
  metallicSilver: "#B0B0B0",
};

export default function StyledMiniMap() {
  return (
    <MiniMap
      nodeStrokeColor={(n) => n.style?.backgroundColor || colors.starBlue}
      nodeColor={(n) => n.style?.backgroundColor || colors.starBlue}
      nodeBorderRadius={6}
      nodeStrokeWidth={2}
      maskColor="rgba(11,12,16,0.8)"
      maskStrokeColor={colors.metallicSilver}
      maskStrokeWidth={1.5}
      style={{
        height: 120,
        width: 180,
        backgroundColor: colors.deepSpace,
        border: `1px solid ${colors.metallicSilver}`,
        borderRadius: "8px",
        boxShadow: "0 0 10px rgba(0,0,0,0.5)",
      }}
      zoomable={true}
      pannable={true}
    />
  );
}
