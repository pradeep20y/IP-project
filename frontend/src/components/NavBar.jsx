import { NavLink } from "react-router-dom";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useAccount, useReadContract } from "wagmi";
import { MARKETPLACE_ADDRESS, MarketplaceABI } from "../config/contracts.js";

export default function NavBar() {
  const { address } = useAccount();
  const { data: owner } = useReadContract({
    address: MARKETPLACE_ADDRESS,
    abi: MarketplaceABI,
    functionName: "owner",
    query: { enabled: Boolean(MARKETPLACE_ADDRESS) },
  });
  const isAdmin =
    address && owner && address.toLowerCase() === String(owner).toLowerCase();

  return (
    <nav className="navbar">
      <div className="row" style={{ gap: 32 }}>
        <NavLink to="/" className="brand">
          ◇ Art Chain
        </NavLink>
        <div className="nav-links">
          <NavLink to="/" end className={({ isActive }) => (isActive ? "active" : "")}>
            Browse
          </NavLink>
          <NavLink to="/mint" className={({ isActive }) => (isActive ? "active" : "")}>
            Mint
          </NavLink>
          {address && (
            <NavLink to="/me" className={({ isActive }) => (isActive ? "active" : "")}>
              My NFTs
            </NavLink>
          )}
          {isAdmin && (
            <NavLink to="/admin" className={({ isActive }) => (isActive ? "active" : "")}>
              Admin
            </NavLink>
          )}
        </div>
      </div>
      <ConnectButton chainStatus="icon" showBalance={false} />
    </nav>
  );
}
