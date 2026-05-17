const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Marketplace", function () {
  let nft, market, owner, alice, bob, carol;
  const PLATFORM_FEE_BPS = 250n; // 2.5%
  const ROYALTY_BPS = 500n;      // 5%
  const PRICE = ethers.parseEther("1");

  beforeEach(async () => {
    [owner, alice, bob, carol] = await ethers.getSigners();

    const NFT = await ethers.getContractFactory("NFTCollection");
    nft = await NFT.deploy();
    await nft.waitForDeployment();

    const Market = await ethers.getContractFactory("Marketplace");
    market = await Market.deploy(PLATFORM_FEE_BPS);
    await market.waitForDeployment();

    // Alice mints token 0 with 5% royalty
    await nft.connect(alice).mint("mock://art-0", ROYALTY_BPS);
    await nft.connect(alice).setApprovalForAll(await market.getAddress(), true);
  });

  describe("listItem", () => {
    it("lists an NFT and emits Listed", async () => {
      await expect(market.connect(alice).listItem(await nft.getAddress(), 0, PRICE))
        .to.emit(market, "Listed")
        .withArgs(0, alice.address, await nft.getAddress(), 0, PRICE);

      const l = await market.getListing(0);
      expect(l.seller).to.equal(alice.address);
      expect(l.price).to.equal(PRICE);
      expect(l.active).to.equal(true);
      expect(l.flagged).to.equal(false);
    });

    it("reverts if caller is not token owner", async () => {
      await expect(
        market.connect(bob).listItem(await nft.getAddress(), 0, PRICE)
      ).to.be.revertedWith("Not token owner");
    });

    it("reverts if marketplace is not approved", async () => {
      await nft.connect(alice).setApprovalForAll(await market.getAddress(), false);
      await expect(
        market.connect(alice).listItem(await nft.getAddress(), 0, PRICE)
      ).to.be.revertedWith("Marketplace not approved");
    });

    it("reverts on zero price", async () => {
      await expect(
        market.connect(alice).listItem(await nft.getAddress(), 0, 0)
      ).to.be.revertedWith("Price must be > 0");
    });
  });

  describe("cancelListing", () => {
    beforeEach(async () => {
      await market.connect(alice).listItem(await nft.getAddress(), 0, PRICE);
    });

    it("seller can cancel", async () => {
      await expect(market.connect(alice).cancelListing(0))
        .to.emit(market, "Cancelled")
        .withArgs(0);
      expect((await market.getListing(0)).active).to.equal(false);
    });

    it("non-seller cannot cancel", async () => {
      await expect(market.connect(bob).cancelListing(0)).to.be.revertedWith(
        "Not seller"
      );
    });
  });

  describe("buyItem (primary sale)", () => {
    beforeEach(async () => {
      await market.connect(alice).listItem(await nft.getAddress(), 0, PRICE);
    });

    it("transfers NFT and pays seller minus platform fee (no royalty on primary)", async () => {
      const aliceBefore = await ethers.provider.getBalance(alice.address);
      const tx = await market.connect(bob).buyItem(0, { value: PRICE });
      await expect(tx).to.emit(market, "Sold");

      const platformFee = (PRICE * PLATFORM_FEE_BPS) / 10000n;
      const aliceAfter = await ethers.provider.getBalance(alice.address);

      // Primary sale: royalty receiver == seller (alice), so no royalty deduction.
      expect(aliceAfter - aliceBefore).to.equal(PRICE - platformFee);
      expect(await nft.ownerOf(0)).to.equal(bob.address);
      expect(await market.accumulatedFees()).to.equal(platformFee);
    });

    it("reverts on wrong price", async () => {
      await expect(
        market.connect(bob).buyItem(0, { value: PRICE - 1n })
      ).to.be.revertedWith("Wrong price");
    });

    it("reverts if seller tries to buy own listing", async () => {
      await expect(
        market.connect(alice).buyItem(0, { value: PRICE })
      ).to.be.revertedWith("Cannot buy own listing");
    });

    it("reverts if listing flagged", async () => {
      await market.connect(owner).flagListing(0, true);
      await expect(
        market.connect(bob).buyItem(0, { value: PRICE })
      ).to.be.revertedWith("Listing flagged");
    });

    it("reverts if listing cancelled", async () => {
      await market.connect(alice).cancelListing(0);
      await expect(
        market.connect(bob).buyItem(0, { value: PRICE })
      ).to.be.revertedWith("Not active");
    });
  });

  describe("buyItem (secondary sale)", () => {
    beforeEach(async () => {
      // Primary: alice -> bob
      await market.connect(alice).listItem(await nft.getAddress(), 0, PRICE);
      await market.connect(bob).buyItem(0, { value: PRICE });
      // Now bob lists for secondary
      await nft.connect(bob).setApprovalForAll(await market.getAddress(), true);
      await market.connect(bob).listItem(await nft.getAddress(), 0, PRICE);
    });

    it("splits payment between creator (royalty), seller, and platform", async () => {
      const aliceBefore = await ethers.provider.getBalance(alice.address); // creator
      const bobBefore = await ethers.provider.getBalance(bob.address);     // seller (secondary)

      await market.connect(carol).buyItem(1, { value: PRICE });

      const platformFee = (PRICE * PLATFORM_FEE_BPS) / 10000n;
      const royalty = (PRICE * ROYALTY_BPS) / 10000n;
      const sellerProceeds = PRICE - platformFee - royalty;

      const aliceAfter = await ethers.provider.getBalance(alice.address);
      const bobAfter = await ethers.provider.getBalance(bob.address);

      expect(aliceAfter - aliceBefore).to.equal(royalty);
      expect(bobAfter - bobBefore).to.equal(sellerProceeds);
      expect(await nft.ownerOf(0)).to.equal(carol.address);
      expect(await market.accumulatedFees()).to.equal(platformFee * 2n);
    });
  });

  describe("admin", () => {
    it("owner can update platform fee", async () => {
      await expect(market.connect(owner).setPlatformFee(500))
        .to.emit(market, "PlatformFeeUpdated")
        .withArgs(500);
      expect(await market.platformFeeBps()).to.equal(500);
    });

    it("non-owner cannot update platform fee", async () => {
      await expect(market.connect(alice).setPlatformFee(500)).to.be.reverted;
    });

    it("rejects fee above 10%", async () => {
      await expect(
        market.connect(owner).setPlatformFee(1001)
      ).to.be.revertedWith("Fee too high");
    });

    it("owner can flag and unflag a listing", async () => {
      await market.connect(alice).listItem(await nft.getAddress(), 0, PRICE);
      await market.connect(owner).flagListing(0, true);
      expect((await market.getListing(0)).flagged).to.equal(true);
      await market.connect(owner).flagListing(0, false);
      expect((await market.getListing(0)).flagged).to.equal(false);
    });

    it("owner can withdraw accumulated fees", async () => {
      await market.connect(alice).listItem(await nft.getAddress(), 0, PRICE);
      await market.connect(bob).buyItem(0, { value: PRICE });
      const platformFee = (PRICE * PLATFORM_FEE_BPS) / 10000n;

      const toAddr = carol.address;
      const before = await ethers.provider.getBalance(toAddr);
      await market.connect(owner).withdrawFees(toAddr);
      const after = await ethers.provider.getBalance(toAddr);

      expect(after - before).to.equal(platformFee);
      expect(await market.accumulatedFees()).to.equal(0);
    });

    it("rejects withdraw with no fees", async () => {
      await expect(
        market.connect(owner).withdrawFees(carol.address)
      ).to.be.revertedWith("No fees to withdraw");
    });
  });
});
