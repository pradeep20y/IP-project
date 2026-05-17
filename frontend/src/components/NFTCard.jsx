import { Link } from "react-router-dom";
import { useNFTMetadata } from "../hooks/useNFTMetadata.js";
import { NFT_ADDRESS } from "../config/contracts.js";
import { eth, shortAddress } from "../lib/format.js";

export default function NFTCard({ listing, tokenId, seller, price, flagged }) {
  const id = listing?.tokenId ?? tokenId;
  const contract = listing?.nftContract ?? NFT_ADDRESS;
  const { meta, loading } = useNFTMetadata(contract, id);

  const target = listing
    ? `/nft/${listing.listingId}`
    : `/token/${id}`;

  return (
    <Link to={target} className="card" style={{ color: "inherit" }}>
      <div className="thumb">
        {loading ? (
          <span className="muted">Loading…</span>
        ) : meta?.image ? (
          <img src={meta.image} alt={meta.title || `#${id}`} />
        ) : (
          <span className="muted">no image</span>
        )}
      </div>
      <div className="body">
        <div className="row" style={{ justifyContent: "space-between" }}>
          <div className="title">{meta?.title || `Token #${id?.toString()}`}</div>
          {flagged && <span className="badge bad">flagged</span>}
        </div>
        <div className="meta">
          {seller ? `by ${shortAddress(seller)}` : `#${id?.toString()}`}
        </div>
        {price !== undefined && <div className="price">{eth(price)}</div>}
      </div>
    </Link>
  );
}
