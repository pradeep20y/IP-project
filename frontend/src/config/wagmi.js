import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import { sepolia, hardhat } from "wagmi/chains";

const projectId = import.meta.env.VITE_WALLETCONNECT_PROJECT_ID || "demo-project-id";

export const wagmiConfig = getDefaultConfig({
  appName: "Art Chain",
  projectId,
  chains: [sepolia, hardhat],
  ssr: false,
});

export const TARGET_CHAIN_ID = Number(import.meta.env.VITE_CHAIN_ID || sepolia.id);
