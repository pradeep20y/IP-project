import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  useAccount,
  usePublicClient,
  useWriteContract,
  useWaitForTransactionReceipt,
} from "wagmi";
import {
  MARKETPLACE_ADDRESS,
  MarketplaceABI,
  NFT_ADDRESS,
  NFTCollectionABI,
} from "../config/contracts.js";
import { useNFTMetadata } from "../hooks/useNFTMetadata.js";
import { eth, shortAddress } from "../lib/format.js";
import { parseEther } from "viem";

// Detail view by tokenId — used for owned-but-not-listed tokens to start a listing,
// or to view ownership history.
export default function TokenDetail() {
  const { tokenId } = useParams();
  const navigate = useNavigate();
  const { address } = useAccount();
  const client = usePublicClient();

  const [tokenOwner, setTokenOwner] = useState(null);
  const [creator, setCreator] = useState(null);
  const [approved, setApproved] = useState(false);
  const [listPrice, setListPrice] = useState("");
  const [error, setError] = useState(null);
  const [phase, setPhase] = useState("idle"); // idle | approving | listing

  const { writeContractAsync, data: txHash } = useWriteContract();
  const { isLoading: confirming, isSuccess: confirmed } =
    useWaitForTransactionReceipt({ hash: txHash });

  const { meta } = useNFTMetadata(NFT_ADDRESS, tokenId);

  useEffect(() => {
    async function load() {
      if (!client) return;
      try {
        const [owner, c] = await Promise.all([
          client.readContract({
            address: NFT_ADDRESS,
            abi: NFTCollectionABI,
            functionName: "ownerOf",
            args: [BigInt(tokenId)],
          }),
          client.readContract({
            address: NFT_ADDRESS,
            abi: NFTCollectionABI,
            functionName: "creatorOf",
            args: [BigInt(tokenId)],
          }),
        ]);
        setTokenOwner(owner);
        setCreator(c);
        if (address) {
          const ok = await client.readContract({
            address: NFT_ADDRESS,
            abi: NFTCollectionABI,
            functionName: "isApprovedForAll",
            args: [address, MARKETPLACE_ADDRESS],
          });
          setApproved(ok);
        }
      } catch (e) {
        setError(e.shortMessage || e.message);
      }
    }
    load();
  }, [client, tokenId, address, confirmed]);

  const isOwner =
    address && tokenOwner && address.toLowerCase() === tokenOwner.toLowerCase();

  async function approveMarket() {
    setError(null);
    setPhase("approving");
    try {
      await writeContractAsync({
        address: NFT_ADDRESS,
        abi: NFTCollectionABI,
        functionName: "setApprovalForAll",
        args: [MARKETPLACE_ADDRESS, true],
      });
    } catch (e) {
      setError(e.shortMessage || e.message);
      setPhase("idle");
    }
  }

  async function list() {
    setError(null);
    try {
      const priceWei = parseEther(listPrice || "0");
      if (priceWei <= 0n) {
        setError("Set a price greater than 0.");
        return;
      }
      setPhase("listing");
      await writeContractAsync({
        address: MARKETPLACE_ADDRESS,
        abi: MarketplaceABI,
        functionName: "listItem",
        args: [NFT_ADDRESS, BigInt(tokenId), priceWei],
      });
    } catch (e) {
      setError(e.shortMessage || e.message);
      setPhase("idle");
    }
  }

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 32 }}>
      <div className="panel" style={{ padding: 0, overflow: "hidden" }}>
        <div
          style={{
            aspectRatio: "1/1",
            background: "var(--panel-2)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {meta?.image ? (
            <img
              src={meta.image}
              alt={meta.title || `#${tokenId}`}
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
            />
          ) : (
            <span className="muted">No image</span>
          )}
        </div>
      </div>

      <div>
        <h1>{meta?.title || `Token #${tokenId}`}</h1>
        <p className="muted">{meta?.description}</p>

        <div className="panel" style={{ marginTop: 16 }}>
          <table>
            <tbody>
              <tr>
                <th>Owner</th>
                <td className="mono">{shortAddress(tokenOwner)}</td>
              </tr>
              <tr>
                <th>Creator</th>
                <td className="mono">{shortAddress(creator)}</td>
              </tr>
              {meta?.category && (
                <tr>
                  <th>Category</th>
                  <td>{meta.category}</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {error && <div className="error-banner" style={{ marginTop: 16 }}>{error}</div>}

        {isOwner && (
          <div className="panel" style={{ marginTop: 16 }}>
            <h3 style={{ marginTop: 0 }}>List this NFT</h3>
            {!approved ? (
              <>
                <p className="muted">
                  Step 1 — approve the marketplace to transfer this NFT on your behalf
                  (one-time per collection).
                </p>
                <button
                  className="btn"
                  onClick={approveMarket}
                  disabled={confirming || phase === "approving"}
                >
                  {confirming && phase === "approving"
                    ? "Approving…"
                    : "Approve marketplace"}
                </button>
              </>
            ) : (
              <>
                <label className="label">Price (ETH)</label>
                <input
                  className="input"
                  type="number"
                  step="0.001"
                  min="0"
                  placeholder="0.05"
                  value={listPrice}
                  onChange={(e) => setListPrice(e.target.value)}
                />
                <div style={{ marginTop: 12 }}>
                  <button
                    className="btn"
                    onClick={list}
                    disabled={confirming || !listPrice}
                  >
                    {confirming && phase === "listing"
                      ? "Listing…"
                      : "Create listing"}
                  </button>
                  <button
                    className="btn secondary"
                    style={{ marginLeft: 8 }}
                    onClick={() => navigate("/me")}
                  >
                    Cancel
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
