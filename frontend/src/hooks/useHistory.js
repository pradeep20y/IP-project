import { useEffect, useState, useCallback } from "react";
import { usePublicClient } from "wagmi";
import {
  MARKETPLACE_ADDRESS,
  MarketplaceABI,
  NFT_ADDRESS,
  NFTCollectionABI,
} from "../config/contracts.js";

// Returns minted/listed/bought/sold history for `address`, oldest first.
export function useHistory(address) {
  const client = usePublicClient();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!client || !address) return;
    setLoading(true);
    try {
      const mintedEvt = NFTCollectionABI.find((x) => x.type === "event" && x.name === "NFTMinted");
      const listedEvt = MarketplaceABI.find((x) => x.type === "event" && x.name === "Listed");
      const soldEvt = MarketplaceABI.find((x) => x.type === "event" && x.name === "Sold");

      const [minted, listedSeller, boughtBuyer, soldSeller] = await Promise.all([
        client.getLogs({
          address: NFT_ADDRESS,
          event: mintedEvt,
          args: { creator: address },
          fromBlock: 0n,
        }),
        client.getLogs({
          address: MARKETPLACE_ADDRESS,
          event: listedEvt,
          args: { seller: address },
          fromBlock: 0n,
        }),
        client.getLogs({
          address: MARKETPLACE_ADDRESS,
          event: soldEvt,
          args: { buyer: address },
          fromBlock: 0n,
        }),
        client.getLogs({
          address: MARKETPLACE_ADDRESS,
          event: soldEvt,
          args: { seller: address },
          fromBlock: 0n,
        }),
      ]);

      const rows = [];
      for (const l of minted) {
        rows.push({
          kind: "minted",
          tokenId: l.args.tokenId,
          tokenURI: l.args.tokenURI,
          royaltyBps: l.args.royaltyBps,
          blockNumber: l.blockNumber,
          txHash: l.transactionHash,
        });
      }
      for (const l of listedSeller) {
        rows.push({
          kind: "listed",
          listingId: l.args.listingId,
          tokenId: l.args.tokenId,
          price: l.args.price,
          blockNumber: l.blockNumber,
          txHash: l.transactionHash,
        });
      }
      for (const l of boughtBuyer) {
        rows.push({
          kind: "bought",
          listingId: l.args.listingId,
          price: l.args.price,
          counterparty: l.args.seller,
          blockNumber: l.blockNumber,
          txHash: l.transactionHash,
        });
      }
      for (const l of soldSeller) {
        rows.push({
          kind: "sold",
          listingId: l.args.listingId,
          price: l.args.price,
          counterparty: l.args.buyer,
          blockNumber: l.blockNumber,
          txHash: l.transactionHash,
        });
      }
      rows.sort((a, b) => Number(a.blockNumber - b.blockNumber));
      setItems(rows);
    } finally {
      setLoading(false);
    }
  }, [client, address]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { items, loading, refresh };
}
