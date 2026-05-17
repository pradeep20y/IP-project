import NFTCollectionArtifact from "../abi/NFTCollection.json";
import MarketplaceArtifact from "../abi/Marketplace.json";

export const NFT_ADDRESS = import.meta.env.VITE_NFT_ADDRESS;
export const MARKETPLACE_ADDRESS = import.meta.env.VITE_MARKETPLACE_ADDRESS;

export const NFTCollectionABI = NFTCollectionArtifact.abi;
export const MarketplaceABI = MarketplaceArtifact.abi;

export function assertAddressesConfigured() {
  if (
    !NFT_ADDRESS ||
    !MARKETPLACE_ADDRESS ||
    NFT_ADDRESS === "0x0000000000000000000000000000000000000000"
  ) {
    throw new Error(
      "Contract addresses not set. Run the deploy script in /contracts and copy the values into frontend/.env"
    );
  }
}
