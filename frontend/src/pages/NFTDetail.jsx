import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
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
import { eth, shortAddress, bpsToPercent } from "../lib/format.js";

export default function NFTDetail() {
  const { listingId } = useParams();
  const navigate = useNavigate();
  const { address } = useAccount();
  const client = usePublicClient();

  const [listing, setListing] = useState(null);
  const [royalty, setRoyalty] = useState(null);
  const [error, setError] = useState(null);

  const {
    writeContractAsync,
    data: txHash,
    reset,
  } = useWriteContract();
  const { isLoading: confirming, isSuccess: confirmed } =
    useWaitForTransactionReceipt({ hash: txHash });

  useEffect(() => {
    async function load() {
      if (!client) return;
      try {
        const l = await client.readContract({
          address: MARKETPLACE_ADDRESS,
          abi: MarketplaceABI,
          functionName: "getListing",
          args: [BigInt(listingId)],
        });
        setListing(l);
        if (l.nftContract && l.nftContract !== "0x0000000000000000000000000000000000000000") {
          try {
            const r = await client.readContract({
              address: l.nftContract,
              abi: NFTCollectionABI,
              functionName: "royaltyInfo",
              args: [l.tokenId, l.price],
            });
            setRoyalty({ receiver: r[0], amount: r[1] });
          } catch {}
        }
      } catch (e) {
        setError(e.shortMessage || e.message);
      }
    }
    load();
  }, [client, listingId, confirmed]);

  const { meta, loading: metaLoading } = useNFTMetadata(
    listing?.nftContract,
    listing?.tokenId
  );

  async function buy() {
    setError(null);
    try {
      await writeContractAsync({
        address: MARKETPLACE_ADDRESS,
        abi: MarketplaceABI,
        functionName: "buyItem",
        args: [BigInt(listingId)],
        value: listing.price,
      });
    } catch (e) {
      setError(e.shortMessage || e.message);
    }
  }

  async function cancel() {
    setError(null);
    try {
      await writeContractAsync({
        address: MARKETPLACE_ADDRESS,
        abi: MarketplaceABI,
        functionName: "cancelListing",
        args: [BigInt(listingId)],
      });
    } catch (e) {
      setError(e.shortMessage || e.message);
    }
  }

  if (!listing) {
    return <div className="empty">{error || "Loading listing…"}</div>;
  }

  const isSeller =
    address && listing.seller.toLowerCase() === address.toLowerCase();

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
          {metaLoading ? (
            <span className="muted">Loading…</span>
          ) : meta?.image ? (
            <img
              src={meta.image}
              alt={meta.title || "art"}
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
            />
          ) : (
            <span className="muted">No image</span>
          )}
        </div>
      </div>

      <div>
        <div className="row" style={{ gap: 8 }}>
          {listing.flagged && <span className="badge bad">Flagged</span>}
          {!listing.active && <span className="badge warn">Not active</span>}
          <span className="badge">Listing #{listing && listingId}</span>
        </div>

        <h1 style={{ marginTop: 12 }}>{meta?.title || `Token #${listing.tokenId.toString()}`}</h1>
        <p className="muted">{meta?.description}</p>

        <div className="panel" style={{ marginTop: 16 }}>
          <div className="muted" style={{ fontSize: 12 }}>Current price</div>
          <div style={{ fontSize: 28, fontWeight: 700 }}>{eth(listing.price)}</div>

          {error && (
            <div className="error-banner" style={{ marginTop: 12 }}>
              {error}
            </div>
          )}

          {confirmed && (
            <div
              style={{
                marginTop: 12,
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

          <div className="row" style={{ marginTop: 16, gap: 8 }}>
            {listing.active && !isSeller && (
              <button
                className="btn"
                onClick={buy}
                disabled={!address || confirming}
              >
                {confirming ? "Confirming…" : `Buy for ${eth(listing.price)}`}
              </button>
            )}
            {listing.active && isSeller && (
              <button className="btn danger" onClick={cancel} disabled={confirming}>
                {confirming ? "Cancelling…" : "Cancel listing"}
              </button>
            )}
            <button className="btn secondary" onClick={() => navigate(-1)}>
              Back
            </button>
          </div>
        </div>

        <div className="panel" style={{ marginTop: 16 }}>
          <h3 style={{ marginTop: 0 }}>Details</h3>
          <table>
            <tbody>
              <tr>
                <th>Seller</th>
                <td className="mono">{shortAddress(listing.seller)}</td>
              </tr>
              <tr>
                <th>NFT contract</th>
                <td className="mono">{shortAddress(listing.nftContract)}</td>
              </tr>
              <tr>
                <th>Token ID</th>
                <td className="mono">{listing.tokenId.toString()}</td>
              </tr>
              {royalty && (
                <>
                  <tr>
                    <th>Royalty receiver</th>
                    <td className="mono">{shortAddress(royalty.receiver)}</td>
                  </tr>
                  <tr>
                    <th>Royalty on this price</th>
                    <td>
                      {eth(royalty.amount)}{" "}
                      <span className="muted">
                        ({listing.price > 0n
                          ? bpsToPercent((royalty.amount * 10000n) / listing.price)
                          : "—"})
                      </span>
                    </td>
                  </tr>
                </>
              )}
            </tbody>
          </table>
          <div style={{ marginTop: 12 }}>
            <Link to={`/token/${listing.tokenId.toString()}`} className="muted">
              View token history →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
