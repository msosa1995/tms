import React, { useEffect } from "react";

const overlay = {
  position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)",
  display: "flex", alignItems: "center", justifyContent: "center",
  zIndex: 1000, padding: 16,
};

const box = {
  background: "#fff", borderRadius: 10, width: "100%", maxWidth: 560,
  maxHeight: "90vh", display: "flex", flexDirection: "column",
  boxShadow: "0 8px 32px rgba(0,0,0,0.18)",
};

const header = {
  padding: "16px 20px", borderBottom: "1px solid #dce3ec",
  display: "flex", alignItems: "center", justifyContent: "space-between",
};

const closeBtn = {
  background: "none", border: "none", fontSize: 20, cursor: "pointer",
  color: "#7f8c9a", lineHeight: 1,
};

export default function Modal({ title, onClose, children, footer }) {
  useEffect(() => {
    const handler = (e) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  return (
    <div style={overlay} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div style={box}>
        <div style={header}>
          <strong style={{ fontSize: 16, color: "#1a5276" }}>{title}</strong>
          <button style={closeBtn} onClick={onClose}>✕</button>
        </div>
        <div style={{ padding: "20px", overflowY: "auto", flex: 1 }}>
          {children}
        </div>
        {footer && (
          <div style={{ padding: "12px 20px", borderTop: "1px solid #dce3ec", display: "flex", gap: 10, justifyContent: "flex-end" }}>
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
