import { useState } from "react";
import { RESOURCE_ICONS } from "../gameState";
import type { GameState } from "../gameState";

const RESOURCES = ["wood", "brick", "sheep", "ore", "wheat"] as const;

interface TradeModalProps {
  state: GameState;
  onTrade: (give: { resource: string; amount: number }, receive: { resource: string; amount: number }) => void;
  onClose: () => void;
  botEvaluating?: boolean;
  tradeResult?: "accepted" | "declined" | null;
}

export default function TradeModal({ state, onTrade, onClose, botEvaluating = false, tradeResult = null }: TradeModalProps) {
  const [offerRes, setOfferRes] = useState("wood");
  const [offerAmt, setOfferAmt] = useState(1);
  const [wantRes, setWantRes] = useState("ore");
  const [wantAmt, setWantAmt] = useState(1);

  const team = state.currentTurn;
  const other = team === "eagles" ? "rattlers" : "eagles";
  const teamRes = state.resources[team];
  const otherRes = state.resources[other];

  const canTrade =
    offerRes !== wantRes &&
    (teamRes[offerRes as keyof typeof teamRes] || 0) >= offerAmt &&
    (otherRes[wantRes as keyof typeof otherRes] || 0) >= wantAmt &&
    offerAmt > 0 && wantAmt > 0;

  const errorMsg = offerRes === wantRes
    ? "Can't trade the same resource"
    : (teamRes[offerRes as keyof typeof teamRes] || 0) < offerAmt
    ? "Not enough to offer"
    : (otherRes[wantRes as keyof typeof otherRes] || 0) < wantAmt
    ? "Other team doesn't have enough"
    : "";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "rgba(0,0,0,0.85)" }}>
      <div className="font-mono" style={{ background: "#111", border: "4px solid #f8b800", padding: 28, width: "100%", maxWidth: 480 }}>
        <p style={{ color: "#f8b800", fontSize: 9, letterSpacing: "0.3em", marginBottom: 6 }}>★ BRIDGE TRADE</p>
        <p style={{ color: "#fff", fontSize: 16, fontWeight: "bold", marginBottom: 24 }}>PROPOSE A TRADE</p>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 20 }}>
          {/* Offer */}
          <div>
            <p style={{ color: "#888", fontSize: 8, letterSpacing: "0.3em", marginBottom: 10 }}>YOU OFFER</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {RESOURCES.map(r => (
                <button
                  key={r}
                  onClick={() => setOfferRes(r)}
                  style={{
                    display: "flex", alignItems: "center", gap: 8,
                    padding: "6px 10px",
                    border: `2px solid ${offerRes === r ? "#f8b800" : "#333"}`,
                    background: offerRes === r ? "rgba(248,184,0,0.1)" : "transparent",
                    color: offerRes === r ? "#fff" : "#666",
                    cursor: "pointer", fontSize: 11,
                  }}
                >
                  <span>{RESOURCE_ICONS[r]}</span>
                  <span style={{ textTransform: "capitalize" }}>{r}</span>
                  <span style={{ marginLeft: "auto", fontSize: 10, color: "#555" }}>×{teamRes[r] || 0}</span>
                </button>
              ))}
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 4 }}>
                <span style={{ color: "#666", fontSize: 9 }}>AMT:</span>
                <input type="number" min={1} max={10} value={offerAmt}
                  onChange={e => setOfferAmt(Math.max(1, parseInt(e.target.value) || 1))}
                  style={{ background: "#222", border: "2px solid #444", color: "#fff", width: 60, padding: "4px 8px", fontSize: 12, fontFamily: "inherit" }} />
              </div>
            </div>
          </div>

          {/* Want */}
          <div>
            <p style={{ color: "#888", fontSize: 8, letterSpacing: "0.3em", marginBottom: 10 }}>YOU WANT</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {RESOURCES.map(r => (
                <button
                  key={r}
                  onClick={() => setWantRes(r)}
                  style={{
                    display: "flex", alignItems: "center", gap: 8,
                    padding: "6px 10px",
                    border: `2px solid ${wantRes === r ? "#f8b800" : "#333"}`,
                    background: wantRes === r ? "rgba(248,184,0,0.1)" : "transparent",
                    color: wantRes === r ? "#fff" : "#666",
                    cursor: "pointer", fontSize: 11,
                  }}
                >
                  <span>{RESOURCE_ICONS[r]}</span>
                  <span style={{ textTransform: "capitalize" }}>{r}</span>
                  <span style={{ marginLeft: "auto", fontSize: 10, color: "#555" }}>×{otherRes[r] || 0}</span>
                </button>
              ))}
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 4 }}>
                <span style={{ color: "#666", fontSize: 9 }}>AMT:</span>
                <input type="number" min={1} max={10} value={wantAmt}
                  onChange={e => setWantAmt(Math.max(1, parseInt(e.target.value) || 1))}
                  style={{ background: "#222", border: "2px solid #444", color: "#fff", width: 60, padding: "4px 8px", fontSize: 12, fontFamily: "inherit" }} />
              </div>
            </div>
          </div>
        </div>

        {errorMsg && (
          <p style={{ color: "#d82800", fontSize: 9, marginBottom: 12 }}>✕ {errorMsg.toUpperCase()}</p>
        )}

        {tradeResult ? (
          <div style={{ textAlign: "center", padding: "20px 0" }}>
            {tradeResult === "accepted" ? (
              <>
                <p style={{ fontSize: 32, marginBottom: 8 }}>✅</p>
                <p style={{ color: "#4ade80", fontSize: 13, letterSpacing: "0.25em", fontWeight: "bold" }}>TRADE ACCEPTED</p>
                <p style={{ color: "#555", fontSize: 9, marginTop: 6, letterSpacing: "0.2em" }}>RESOURCES EXCHANGED</p>
              </>
            ) : (
              <>
                <p style={{ fontSize: 32, marginBottom: 8 }}>❌</p>
                <p style={{ color: "#f87171", fontSize: 13, letterSpacing: "0.25em", fontWeight: "bold" }}>TRADE DECLINED</p>
                <p style={{ color: "#555", fontSize: 9, marginTop: 6, letterSpacing: "0.2em" }}>🐍 RATTLERS REFUSED</p>
              </>
            )}
          </div>
        ) : botEvaluating ? (
          <div style={{ textAlign: "center", padding: "14px 0" }}>
            <p style={{ color: "#f8b800", fontSize: 10, letterSpacing: "0.25em", fontWeight: "bold" }} className="animate-pulse">
              🤖 BOT IS CONSIDERING…
            </p>
          </div>
        ) : (
          <div style={{ display: "flex", gap: 10 }}>
            <button
              onClick={() => canTrade && onTrade({ resource: offerRes, amount: offerAmt }, { resource: wantRes, amount: wantAmt })}
              disabled={!canTrade}
              style={{
                flex: 1, padding: "10px 0", fontSize: 10, fontFamily: "inherit", fontWeight: "bold",
                letterSpacing: "0.2em", cursor: canTrade ? "pointer" : "not-allowed",
                background: canTrade ? "#f8b800" : "#333", color: canTrade ? "#000" : "#555",
                border: `2px solid ${canTrade ? "#fff" : "#444"}`,
              }}
            >
              ✅ CONFIRM TRADE
            </button>
            <button
              onClick={onClose}
              style={{
                padding: "10px 20px", fontSize: 10, fontFamily: "inherit",
                background: "transparent", color: "#666", border: "2px solid #333", cursor: "pointer",
              }}
            >
              ✕ CANCEL
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
