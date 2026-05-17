import { useState } from "react";
import {
  useAccount,
  useReadContract,
  useWriteContract,
  useWaitForTransactionReceipt,
} from "wagmi";
import { MARKETPLACE_ADDRESS, MarketplaceABI } from "../config/contracts.js";
import { useListings } from "../hooks/useListings.js";
import { eth, shortAddress, bpsToPercent } from "../lib/format.js";

export default function Admin() {
  const { address } = useAccount();

  const { data: owner } = useReadContract({
    address: MARKETPLACE_ADDRESS,
    abi: MarketplaceABI,
    functionName: "owner",
  });
  const { data: feeBps, refetch: refetchFee } = useReadContract({
    address: MARKETPLACE_ADDRESS,
    abi: MarketplaceABI,
    functionName: "platformFeeBps",
  });
  const { data: accumulated, refetch: refetchFees } = useReadContract({
    address: MARKETPLACE_ADDRESS,
    abi: MarketplaceABI,
    functionName: "accumulatedFees",
  });

  const { listings, refresh } = useListings({ includeInactive: true });
  const { writeContractAsync, data: txHash } = useWriteContract();
  const { isLoading: confirming, isSuccess: confirmed } =
    useWaitForTransactionReceipt({ hash: txHash });

  const [newFee, setNewFee] = useState("");
  const [withdrawTo, setWithdrawTo] = useState("");
  const [error, setError] = useState(null);

  const isOwner =
    address && owner && address.toLowerCase() === String(owner).toLowerCase();

  if (!isOwner) {
    return (
      <div className="empty">
        Admin panel is restricted to the marketplace owner.
      </div>
    );
  }

  async function updateFee() {
    setError(null);
    try {
      const bps = Math.round(Number(newFee) * 100);
      if (Number.isNaN(bps) || bps < 0 || bps > 1000) {
        return setError("Fee must be between 0 and 10 (%).");
      }
      await writeContractAsync({
        address: MARKETPLACE_ADDRESS,
        abi: MarketplaceABI,
        functionName: "setPlatformFee",
        args: [BigInt(bps)],
      });
      refetchFee();
    } catch (e) {
      setError(e.shortMessage || e.message);
    }
  }

  async function withdraw() {
    setError(null);
    try {
      const to = withdrawTo.trim() || address;
      await writeContractAsync({
        address: MARKETPLACE_ADDRESS,
        abi: MarketplaceABI,
        functionName: "withdrawFees",
        args: [to],
      });
      refetchFees();
    } catch (e) {
      setError(e.shortMessage || e.message);
    }
  }

  async function toggleFlag(listingId, currentlyFlagged) {
    setError(null);
    try {
      await writeContractAsync({
        address: MARKETPLACE_ADDRESS,
        abi: MarketplaceABI,
        functionName: "flagListing",
        args: [listingId, !currentlyFlagged],
      });
      refresh();
    } catch (e) {
      setError(e.shortMessage || e.message);
    }
  }

  return (
    <>
      <h1>Admin panel</h1>
      <p className="muted">Configure platform economics and moderate listings.</p>

      {error && <div className="error-banner">{error}</div>}
      {confirmed && (
        <div
          style={{
            marginBottom: 12,
            padding: 12,
            background: "rgba(74, 222, 128, 0.1)",
            border: "1px solid var(--good)",
            color: "var(--good)",
            borderRadius: 10,
          }}
        >
          Transaction confirmed.
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <div className="panel">
          <h3 style={{ marginTop: 0 }}>Platform fee</h3>
          <p className="muted">
            Current: <b>{bpsToPercent(feeBps || 0)}</b>
          </p>
          <label className="label">New fee (%)</label>
          <input
            className="input"
            type="number"
            step="0.05"
            min="0"
            max="10"
            placeholder="2.5"
            value={newFee}
            onChange={(e) => setNewFee(e.target.value)}
          />
          <div style={{ marginTop: 12 }}>
            <button className="btn" disabled={confirming || !newFee} onClick={updateFee}>
              Update fee
            </button>
          </div>
        </div>

        <div className="panel">
          <h3 style={{ marginTop: 0 }}>Accumulated fees</h3>
          <p style={{ fontSize: 24, fontWeight: 700 }}>{eth(accumulated || 0n)}</p>
          <label className="label">Withdraw to (leave blank for connected address)</label>
          <input
            className="input"
            placeholder={address || ""}
            value={withdrawTo}
            onChange={(e) => setWithdrawTo(e.target.value)}
          />
          <div style={{ marginTop: 12 }}>
            <button
              className="btn"
              onClick={withdraw}
              disabled={confirming || (accumulated || 0n) === 0n}
            >
              Withdraw fees
            </button>
          </div>
        </div>
      </div>

      <h2 style={{ marginTop: 28 }}>Listings</h2>
      <div className="panel">
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Seller</th>
              <th>Token</th>
              <th>Price</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {listings.map((l) => (
              <tr key={l.listingId.toString()}>
                <td className="mono">#{l.listingId.toString()}</td>
                <td className="mono">{shortAddress(l.seller)}</td>
                <td className="mono">#{l.tokenId.toString()}</td>
                <td>{eth(l.price)}</td>
                <td>
                  {!l.active && <span className="badge warn">closed</span>}
                  {l.active && l.flagged && <span className="badge bad">flagged</span>}
                  {l.active && !l.flagged && <span className="badge good">live</span>}
                </td>
                <td>
                  <button
                    className="btn secondary"
                    onClick={() => toggleFlag(l.listingId, l.flagged)}
                    disabled={!l.active || confirming}
                  >
                    {l.flagged ? "Unflag" : "Flag"}
                  </button>
                </td>
              </tr>
            ))}
            {listings.length === 0 && (
              <tr>
                <td colSpan="6" className="muted" style={{ textAlign: "center", padding: 20 }}>
                  No listings yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
