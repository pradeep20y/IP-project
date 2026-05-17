import { Routes, Route, Navigate } from "react-router-dom";
import NavBar from "./components/NavBar.jsx";
import Home from "./pages/Home.jsx";
import Mint from "./pages/Mint.jsx";
import NFTDetail from "./pages/NFTDetail.jsx";
import TokenDetail from "./pages/TokenDetail.jsx";
import MyNFTs from "./pages/MyNFTs.jsx";
import Admin from "./pages/Admin.jsx";

export default function App() {
  return (
    <>
      <NavBar />
      <main className="container">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/mint" element={<Mint />} />
          <Route path="/nft/:listingId" element={<NFTDetail />} />
          <Route path="/token/:tokenId" element={<TokenDetail />} />
          <Route path="/me" element={<MyNFTs />} />
          <Route path="/admin" element={<Admin />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </>
  );
}
