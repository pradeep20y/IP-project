import { useMemo, useState } from "react";
import { useListings } from "../hooks/useListings.js";
import NFTCard from "../components/NFTCard.jsx";
import { formatEther } from "viem";

export default function Home() {
  const { listings, loading, error } = useListings();
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState("newest");
  const [maxPrice, setMaxPrice] = useState("");

  const filtered = useMemo(() => {
    let result = listings;
    if (maxPrice) {
      try {
        const cap = BigInt(Math.floor(Number(maxPrice) * 1e18));
        result = result.filter((l) => l.price <= cap);
      } catch {}
    }
    if (query.trim()) {
      const q = query.toLowerCase();
      result = result.filter((l) =>
        [l.seller, l.tokenId.toString(), l.listingId.toString()]
          .join(" ")
          .toLowerCase()
          .includes(q)
      );
    }
    result = [...result];
    if (sort === "newest") result.sort((a, b) => Number(b.blockNumber - a.blockNumber));
    if (sort === "oldest") result.sort((a, b) => Number(a.blockNumber - b.blockNumber));
    if (sort === "priceAsc") result.sort((a, b) => Number(a.price - b.price));
    if (sort === "priceDesc") result.sort((a, b) => Number(b.price - a.price));
    return result;
  }, [listings, query, sort, maxPrice]);

  return (
    <>
      <section className="hero">
        <h1>Discover, collect, and protect digital art.</h1>
        <p>
          A decentralized marketplace for original NFTs with on-chain royalties.
          Mint your work, list it, and earn forever — every time it resells.
        </p>
      </section>

      <div className="toolbar">
        <input
          className="input"
          placeholder="Search by address or token id…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <input
          className="input"
          type="number"
          step="0.001"
          min="0"
          placeholder="Max price (ETH)"
          value={maxPrice}
          onChange={(e) => setMaxPrice(e.target.value)}
        />
        <select className="select" value={sort} onChange={(e) => setSort(e.target.value)}>
          <option value="newest">Newest first</option>
          <option value="oldest">Oldest first</option>
          <option value="priceAsc">Price: low to high</option>
          <option value="priceDesc">Price: high to low</option>
        </select>
      </div>

      {error && (
        <div className="error-banner">
          Failed to load listings. Check that contract addresses are set in <code>.env</code>.
        </div>
      )}

      {loading ? (
        <div className="empty">Loading listings…</div>
      ) : filtered.length === 0 ? (
        <div className="empty">
          No listings yet. <a href="/mint">Mint the first piece →</a>
        </div>
      ) : (
        <div className="grid">
          {filtered.map((l) => (
            <NFTCard
              key={l.listingId.toString()}
              listing={l}
              seller={l.seller}
              price={l.price}
              flagged={l.flagged}
            />
          ))}
        </div>
      )}
    </>
  );
}
