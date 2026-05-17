// Standalone ABI exporter. Run after `hardhat compile` if you don't want a full redeploy.
const fs = require("fs");
const path = require("path");

const frontendAbiDir = path.join(__dirname, "..", "..", "frontend", "src", "abi");
if (!fs.existsSync(frontendAbiDir)) {
  fs.mkdirSync(frontendAbiDir, { recursive: true });
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
  if (!fs.existsSync(artifactPath)) {
    console.error(`Artifact not found for ${name}. Run 'npx hardhat compile' first.`);
    process.exit(1);
  }
  const artifact = JSON.parse(fs.readFileSync(artifactPath, "utf8"));
  const outPath = path.join(frontendAbiDir, `${name}.json`);
  fs.writeFileSync(outPath, JSON.stringify({ abi: artifact.abi }, null, 2));
  console.log(`Exported -> ${outPath}`);
}
