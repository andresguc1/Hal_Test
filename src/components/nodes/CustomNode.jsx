/**
 * Custom Node Component for ReactFlow
 * Memoized to prevent unnecessary re-renders
 */

import React, { memo } from "react";
import { Handle, Position } from "reactflow";
import { Play, CheckCircle, XCircle, Clock } from "lucide-react";
import { NODE_STATES, PROFESSIONAL_COLORS } from "../hooks/flowStyles";
import "./CustomNode.css";

/**
 * Custom node component with optimized rendering
 *
 * @param {Object} props - Node props from ReactFlow
 * @param {Object} props.data - Node data
 * @param {boolean} props.selected - Whether node is selected
 * @param {string} props.id - Node ID
 */
function CustomNode({ data, selected }) {
  const state = data?.state || NODE_STATES.DEFAULT;
  const colors =
    PROFESSIONAL_COLORS[state] || PROFESSIONAL_COLORS[NODE_STATES.DEFAULT];

  // Determine icon based on state
  const getIcon = () => {
    switch (state) {
      case NODE_STATES.EXECUTING:
        return <Clock size={16} className="node-icon spinning" />;
      case NODE_STATES.SUCCESS:
        return <CheckCircle size={16} className="node-icon" />;
      case NODE_STATES.ERROR:
        return <XCircle size={16} className="node-icon" />;
      default:
        return <Play size={16} className="node-icon" />;
    }
  };

  const nodeStyle = {
    background: colors.background,
    border: `2px solid ${selected ? colors.selectedBorder : colors.border}`,
    color: colors.text,
    padding: "10px 12px", // Reduced from 12px 16px
    borderRadius: "8px",
    minWidth: "140px", // Reduced from 180px
    width: "160px", // Reduced from 200px
    height: "auto",
    boxShadow: selected
      ? `0 0 0 2px ${colors.selectedBorder}40`
      : "0 2px 4px rgba(0,0,0,0.1)",
    transition: "all 0.2s ease",
    cursor: "pointer",
  };

  const labelStyle = {
    fontSize: "14px",
    fontWeight: 500,
    marginBottom: data?.description ? "4px" : 0,
    display: "flex",
    alignItems: "center",
    gap: "8px",
  };

  const descriptionStyle = {
    fontSize: "12px",
    opacity: 0.8,
    marginTop: "4px",
  };

  return (
    <div style={nodeStyle} className="custom-node">
      {/* Input Handle - Left */}
      <Handle
        type="target"
        position={Position.Left}
        style={{
          background: colors.border,
          width: 10,
          height: 10,
          border: "2px solid white",
        }}
      />

      {/* Node Content */}
      <div style={labelStyle}>
        {getIcon()}
        <span>{data?.label || "Node"}</span>
      </div>

      {data?.description && (
        <div style={descriptionStyle}>{data.description}</div>
      )}

      {/* Error message if any */}
      {state === NODE_STATES.ERROR && data?.error && (
        <div style={{ fontSize: "11px", color: "#ff6b6b", marginTop: "4px" }}>
          {data.error}
        </div>
      )}

      {/* Output Handle - Right */}
      <Handle
        type="source"
        position={Position.Right}
        style={{
          background: colors.border,
          width: 10,
          height: 10,
          border: "2px solid white",
        }}
      />
    </div>
  );
}

/**
 * Comparison function for React.memo
 * Only re-render if these props change
 */
function arePropsEqual(prevProps, nextProps) {
  return (
    prevProps.id === nextProps.id &&
    prevProps.selected === nextProps.selected &&
    prevProps.data?.state === nextProps.data?.state &&
    prevProps.data?.label === nextProps.data?.label &&
    prevProps.data?.description === nextProps.data?.description &&
    prevProps.data?.error === nextProps.data?.error
  );
}

// Export memoized component
export default memo(CustomNode, arePropsEqual);
