const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("NFTCollection", function () {
  let nft, owner, alice, bob;

  beforeEach(async () => {
    [owner, alice, bob] = await ethers.getSigners();
    const NFT = await ethers.getContractFactory("NFTCollection");
    nft = await NFT.deploy();
    await nft.waitForDeployment();
  });

  it("mints with metadata and emits NFTMinted", async () => {
    const uri = "mock://art-1";
    await expect(nft.connect(alice).mint(uri, 500))
      .to.emit(nft, "NFTMinted")
      .withArgs(0, alice.address, uri, 500);

    expect(await nft.ownerOf(0)).to.equal(alice.address);
    expect(await nft.tokenURI(0)).to.equal(uri);
    expect(await nft.creatorOf(0)).to.equal(alice.address);
    expect(await nft.totalMinted()).to.equal(1);
  });

  it("sets EIP-2981 royalty info correctly", async () => {
    await nft.connect(alice).mint("mock://art-1", 750); // 7.5%
    const salePrice = ethers.parseEther("1");
    const [receiver, amount] = await nft.royaltyInfo(0, salePrice);
    expect(receiver).to.equal(alice.address);
    expect(amount).to.equal((salePrice * 750n) / 10000n);
  });

  it("reverts if royalty exceeds 10%", async () => {
    await expect(nft.connect(alice).mint("mock://x", 1001)).to.be.revertedWith(
      "Royalty too high"
    );
  });

  it("reverts on empty URI", async () => {
    await expect(nft.connect(alice).mint("", 100)).to.be.revertedWith("Empty URI");
  });

  it("increments tokenId monotonically across minters", async () => {
    await nft.connect(alice).mint("mock://a", 100);
    await nft.connect(bob).mint("mock://b", 100);
    expect(await nft.ownerOf(0)).to.equal(alice.address);
    expect(await nft.ownerOf(1)).to.equal(bob.address);
  });

  it("supports ERC721 + ERC2981 interfaces", async () => {
    // ERC721
    expect(await nft.supportsInterface("0x80ac58cd")).to.equal(true);
    // ERC2981
    expect(await nft.supportsInterface("0x2a55205a")).to.equal(true);
    // ERC165
    expect(await nft.supportsInterface("0x01ffc9a7")).to.equal(true);
  });
});
