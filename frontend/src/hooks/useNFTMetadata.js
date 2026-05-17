import { useEffect, useState } from "react";
import { usePublicClient } from "wagmi";
import { NFT_ADDRESS, NFTCollectionABI } from "../config/contracts.js";
import { resolveTokenURI } from "../lib/ipfs.js";

export function useNFTMetadata(nftContract, tokenId) {
  const client = usePublicClient();
  const [meta, setMeta] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!client || nftContract === undefined || tokenId === undefined) return;
      setLoading(true);
      try {
        const uri = await client.readContract({
          address: nftContract || NFT_ADDRESS,
          abi: NFTCollectionABI,
          functionName: "tokenURI",
          args: [BigInt(tokenId)],
        });
        const resolved = await resolveTokenURI(uri);
        if (!cancelled) setMeta({ uri, ...(resolved || {}) });
      } catch {
        if (!cancelled) setMeta(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [client, nftContract, tokenId]);

  return { meta, loading };
}
