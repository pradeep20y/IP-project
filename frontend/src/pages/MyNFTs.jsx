import { useState } from "react";
import { useAccount } from "wagmi";
import { useMyNFTs } from "../hooks/useMyNFTs.js";
import { useHistory } from "../hooks/useHistory.js";
import NFTCard from "../components/NFTCard.jsx";
import { NFT_ADDRESS } from "../config/contracts.js";
import { eth, shortAddress } from "../lib/format.js";

export default function MyNFTs() {
  const { address, isConnected } = useAccount();
  const [tab, setTab] = useState("owned");
  const { tokens, loading: tokensLoading } = useMyNFTs(address);
  const { items: history, loading: historyLoading } = useHistory(address);

  if (!isConnected) {
    return (
      <div className="empty">
        Connect a wallet to see your NFTs and transaction history.
      </div>
    );
  }

  return (
    <>
      <h1>My NFTs</h1>
      <p className="muted">
        Connected as <span className="mono">{shortAddress(address)}</span>
      </p>

      <div className="tabs">
        <button
          className={`tab ${tab === "owned" ? "active" : ""}`}
          onClick={() => setTab("owned")}
        >
          Owned ({tokens.length})
        </button>
        <button
          className={`tab ${tab === "history" ? "active" : ""}`}
          onClick={() => setTab("history")}
        >
          History ({history.length})
        </button>
      </div>

      {tab === "owned" &&
        (tokensLoading ? (
          <div className="empty">Loading…</div>
        ) : tokens.length === 0 ? (
          <div className="empty">
            You don't own any NFTs yet. <a href="/mint">Mint one →</a>
          </div>
        ) : (
          <div className="grid">
            {tokens.map((t) => (
              <NFTCard key={t.toString()} tokenId={t} />
            ))}
          </div>
        ))}

      {tab === "history" &&
        (historyLoading ? (
          <div className="empty">Loading history…</div>
        ) : history.length === 0 ? (
          <div className="empty">No on-chain activity yet.</div>
        ) : (
          <div className="panel">
            <table>
              <thead>
                <tr>
                  <th>Event</th>
                  <th>Token / Listing</th>
                  <th>Counterparty</th>
                  <th>Price</th>
                  <th>Block</th>
                </tr>
              </thead>
              <tbody>
                {history.map((row, i) => (
                  <tr key={i}>
                    <td>
                      <span className={`badge ${badgeClass(row.kind)}`}>{row.kind}</span>
                    </td>
                    <td className="mono">
                      {row.tokenId !== undefined
                        ? `#${row.tokenId.toString()}`
                        : `Listing #${row.listingId.toString()}`}
                    </td>
                    <td className="mono">
                      {row.counterparty ? shortAddress(row.counterparty) : "—"}
                    </td>
                    <td>{row.price ? eth(row.price) : "—"}</td>
                    <td className="mono">{row.blockNumber.toString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}
    </>
  );
}

function badgeClass(kind) {
  switch (kind) {
    case "minted":
      return "good";
    case "bought":
      return "good";
    case "sold":
      return "warn";
    case "listed":
      return "";
    default:
      return "";
  }
}
