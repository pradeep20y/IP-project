const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  const network = hre.network.name;
  console.log(`\nDeploying to ${network} as ${deployer.address}`);
  console.log(`Balance: ${hre.ethers.formatEther(await hre.ethers.provider.getBalance(deployer.address))} ETH\n`);

  // 1. Deploy NFTCollection
  const NFT = await hre.ethers.getContractFactory("NFTCollection");
  const nft = await NFT.deploy();
  await nft.waitForDeployment();
  const nftAddress = await nft.getAddress();
  console.log(`NFTCollection deployed: ${nftAddress}`);

  // 2. Deploy Marketplace with 2.5% platform fee
  const Market = await hre.ethers.getContractFactory("Marketplace");
  const platformFeeBps = 250;
  const market = await Market.deploy(platformFeeBps);
  await market.waitForDeployment();
  const marketAddress = await market.getAddress();
  console.log(`Marketplace deployed: ${marketAddress} (platform fee ${platformFeeBps / 100}%)`);

  // 3. Persist addresses to a JSON file the frontend can import
  const deployments = {
    network,
    chainId: Number((await hre.ethers.provider.getNetwork()).chainId),
    NFTCollection: nftAddress,
    Marketplace: marketAddress,
    deployedAt: new Date().toISOString(),
  };

  const outDir = path.join(__dirname, "..", "deployments");
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
  const outFile = path.join(outDir, `${network}.json`);
  fs.writeFileSync(outFile, JSON.stringify(deployments, null, 2));
  console.log(`\nAddresses saved to ${outFile}`);

  // 4. Copy ABIs to frontend (best-effort — skipped if frontend dir missing)
  await exportAbisToFrontend();

  console.log("\nDeployment complete.");
  console.log("Set these in frontend/.env:");
  console.log(`  VITE_NFT_ADDRESS=${nftAddress}`);
  console.log(`  VITE_MARKETPLACE_ADDRESS=${marketAddress}`);
  console.log(`  VITE_CHAIN_ID=${deployments.chainId}`);
}

async function exportAbisToFrontend() {
  const frontendAbiDir = path.join(__dirname, "..", "..", "frontend", "src", "abi");
  if (!fs.existsSync(frontendAbiDir)) {
    console.log(`(frontend/src/abi not found — skipping ABI export)`);
    return;
  }
  const artifacts = ["NFTCollection", "Marketplace"];
  for (const name of artifacts) {
    const artifactPath = path.join(
      __dirname,
      "..",
      "artifacts",
      "contracts",
      `${name}.sol`,
      `${name}.json`
    );
    if (!fs.existsSync(artifactPath)) continue;
    const artifact = JSON.parse(fs.readFileSync(artifactPath, "utf8"));
    const outPath = path.join(frontendAbiDir, `${name}.json`);
    fs.writeFileSync(outPath, JSON.stringify({ abi: artifact.abi }, null, 2));
    console.log(`Exported ABI -> ${outPath}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
