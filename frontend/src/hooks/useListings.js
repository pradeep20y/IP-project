import { useEffect, useState, useCallback } from "react";
import { usePublicClient } from "wagmi";
import { MARKETPLACE_ADDRESS, MarketplaceABI } from "../config/contracts.js";

// Reads every Listed event, then for each listing checks current on-chain state
// (active / flagged / price) and returns the live set.
export function useListings({ includeInactive = false } = {}) {
  const client = usePublicClient();
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const refresh = useCallback(async () => {
    if (!client) return;
    setLoading(true);
    setError(null);
    try {
      const logs = await client.getLogs({
        address: MARKETPLACE_ADDRESS,
        event: MarketplaceABI.find((x) => x.type === "event" && x.name === "Listed"),
        fromBlock: 0n,
        toBlock: "latest",
      });

      const enriched = await Promise.all(
        logs.map(async (log) => {
          const listingId = log.args.listingId;
          const onChain = await client.readContract({
            address: MARKETPLACE_ADDRESS,
            abi: MarketplaceABI,
            functionName: "getListing",
            args: [listingId],
          });
          return {
            listingId,
            seller: onChain.seller,
            nftContract: onChain.nftContract,
            tokenId: onChain.tokenId,
            price: onChain.price,
            active: onChain.active,
            flagged: onChain.flagged,
            blockNumber: log.blockNumber,
          };
        })
      );

      setListings(
        includeInactive ? enriched : enriched.filter((l) => l.active && !l.flagged)
      );
    } catch (e) {
      setError(e);
    } finally {
      setLoading(false);
    }
  }, [client, includeInactive]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { listings, loading, error, refresh };
}
