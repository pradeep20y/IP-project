import { useState } from "react";
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { useNavigate } from "react-router-dom";
import { uploadFile, uploadMetadata } from "../lib/ipfs.js";
import { NFT_ADDRESS, NFTCollectionABI } from "../config/contracts.js";

const CATEGORIES = [
  "Illustration",
  "Photography",
  "3D",
  "Pixel Art",
  "Generative",
  "Music",
  "Other",
];

export default function Mint() {
  const { address } = useAccount();
  const navigate = useNavigate();

  const [file, setFile] = useState(null);
  const [filePreview, setFilePreview] = useState(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [royalty, setRoyalty] = useState("5");
  const [stage, setStage] = useState("idle");
  const [error, setError] = useState(null);

  const {
    writeContractAsync,
    data: txHash,
    reset: resetWrite,
  } = useWriteContract();
  const { isLoading: confirming, isSuccess: confirmed } =
    useWaitForTransactionReceipt({ hash: txHash });

  function onFile(e) {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    const reader = new FileReader();
    reader.onload = () => setFilePreview(reader.result);
    reader.readAsDataURL(f);
  }

  async function handleMint(e) {
    e.preventDefault();
    setError(null);
    if (!address) return setError("Connect a wallet to mint.");
    if (!file) return setError("Select an artwork file.");
    if (!title.trim()) return setError("Give it a title.");

    const royaltyNum = Number(royalty);
    if (Number.isNaN(royaltyNum) || royaltyNum < 0 || royaltyNum > 10) {
      return setError("Royalty must be between 0 and 10 (%).");
    }

    try {
      setStage("uploading");
      const imageUri = await uploadFile(file);
      const metadataUri = await uploadMetadata({
        title,
        description,
        category,
        image: imageUri,
        creator: address,
        createdAt: new Date().toISOString(),
      });

      setStage("minting");
      await writeContractAsync({
        address: NFT_ADDRESS,
        abi: NFTCollectionABI,
        functionName: "mint",
        args: [metadataUri, BigInt(Math.round(royaltyNum * 100))],
      });
    } catch (err) {
      setError(err.shortMessage || err.message);
      setStage("idle");
    }
  }

  if (confirmed) {
    return (
      <div className="panel" style={{ textAlign: "center", padding: 40 }}>
        <h2>Minted!</h2>
        <p className="muted">Your NFT is now on-chain. List it for sale from My NFTs.</p>
        <div className="row" style={{ justifyContent: "center", gap: 12, marginTop: 20 }}>
          <button className="btn" onClick={() => navigate("/me")}>
            Go to My NFTs
          </button>
          <button
            className="btn secondary"
            onClick={() => {
              resetWrite();
              setStage("idle");
              setFile(null);
              setFilePreview(null);
              setTitle("");
              setDescription("");
              setRoyalty("5");
            }}
          >
            Mint another
          </button>
        </div>
      </div>
    );
  }

  const busy = stage === "uploading" || stage === "minting" || confirming;

  return (
    <div style={{ maxWidth: 720, margin: "0 auto" }}>
      <h1>Mint your artwork</h1>
      <p className="muted">
        Upload a file, set royalty terms, and the creator address gets paid on every resale.
      </p>

      {error && <div className="error-banner">{error}</div>}

      <form onSubmit={handleMint} className="panel" style={{ marginTop: 20 }}>
        <label className="label">Artwork file</label>
        <input
          className="input"
          type="file"
          accept="image/*"
          onChange={onFile}
          disabled={busy}
        />
        {filePreview && (
          <div
            style={{
              marginTop: 12,
              aspectRatio: "1 / 1",
              maxWidth: 360,
              borderRadius: 12,
              overflow: "hidden",
              border: "1px solid var(--border)",
            }}
          >
            <img
              src={filePreview}
              alt="preview"
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
            />
          </div>
        )}

        <label className="label">Title</label>
        <input
          className="input"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          maxLength={80}
          disabled={busy}
        />

        <label className="label">Description</label>
        <textarea
          className="textarea"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          maxLength={500}
          disabled={busy}
        />

        <label className="label">Category</label>
        <select
          className="select"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          disabled={busy}
        >
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>

        <label className="label">Royalty %</label>
        <input
          className="input"
          type="number"
          step="0.1"
          min="0"
          max="10"
          value={royalty}
          onChange={(e) => setRoyalty(e.target.value)}
          disabled={busy}
        />
        <div className="muted" style={{ fontSize: 12, marginTop: 6 }}>
          Earned forever on every secondary resale (EIP-2981). Max 10%.
        </div>

        <div style={{ marginTop: 20 }}>
          <button className="btn" type="submit" disabled={busy}>
            {stage === "uploading"
              ? "Uploading…"
              : stage === "minting"
              ? "Confirm in wallet…"
              : confirming
              ? "Waiting for confirmation…"
              : "Mint NFT"}
          </button>
        </div>
      </form>
    </div>
  );
}
