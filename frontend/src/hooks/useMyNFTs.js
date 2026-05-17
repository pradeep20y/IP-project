import { useEffect, useState, useCallback } from "react";
import { usePublicClient } from "wagmi";
import { NFT_ADDRESS, NFTCollectionABI } from "../config/contracts.js";

// Walks Transfer events to determine which tokens `address` currently owns.
// (No ERC721Enumerable in the contract, so we reconstruct it client-side.)
export function useMyNFTs(address) {
  const client = usePublicClient();
  const [tokens, setTokens] = useState([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!client || !address) return;
    setLoading(true);
    try {
      const transferEvt = NFTCollectionABI.find(
        (x) => x.type === "event" && x.name === "Transfer"
      );
      const [incoming, outgoing] = await Promise.all([
        client.getLogs({
          address: NFT_ADDRESS,
          event: transferEvt,
          args: { to: address },
          fromBlock: 0n,
        }),
        client.getLogs({
          address: NFT_ADDRESS,
          event: transferEvt,
          args: { from: address },
          fromBlock: 0n,
        }),
      ]);
      const owned = new Set();
      const ordered = [...incoming, ...outgoing].sort(
        (a, b) => Number(a.blockNumber - b.blockNumber) || a.logIndex - b.logIndex
      );
      for (const ev of ordered) {
        const tokenId = ev.args.tokenId.toString();
        if (ev.args.to.toLowerCase() === address.toLowerCase()) owned.add(tokenId);
        else if (ev.args.from.toLowerCase() === address.toLowerCase()) owned.delete(tokenId);
      }
      setTokens([...owned].map((t) => BigInt(t)));
    } finally {
      setLoading(false);
    }
  }, [client, address]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { tokens, loading, refresh };
}
