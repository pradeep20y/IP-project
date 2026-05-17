// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/interfaces/IERC2981.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/// @title Marketplace
/// @notice Fixed-price NFT marketplace with platform fee, EIP-2981 royalty payouts
///         on every sale (primary + secondary), per-listing flagging, and an admin
///         fee withdrawal flow.
contract Marketplace is Ownable, ReentrancyGuard {
    uint96 public constant MAX_FEE_BPS = 1000;       // 10%
    uint96 public constant BPS_DENOMINATOR = 10000;

    uint96 public platformFeeBps;
    uint256 public accumulatedFees;

    struct Listing {
        address seller;
        address nftContract;
        uint256 tokenId;
        uint256 price;
        bool active;
        bool flagged;
    }

    uint256 public nextListingId;
    mapping(uint256 => Listing) private _listings;

    event Listed(
        uint256 indexed listingId,
        address indexed seller,
        address indexed nftContract,
        uint256 tokenId,
        uint256 price
    );
    event Sold(
        uint256 indexed listingId,
        address indexed buyer,
        address indexed seller,
        uint256 price,
        uint256 royaltyPaid,
        uint256 platformFee
    );
    event Cancelled(uint256 indexed listingId);
    event Flagged(uint256 indexed listingId, bool flagged);
    event PlatformFeeUpdated(uint96 newFeeBps);
    event FeesWithdrawn(address indexed to, uint256 amount);

    constructor(uint96 _platformFeeBps) Ownable(msg.sender) {
        require(_platformFeeBps <= MAX_FEE_BPS, "Fee too high");
        platformFeeBps = _platformFeeBps;
    }

    // ---------- Seller actions ----------

    function listItem(address nftContract, uint256 tokenId, uint256 price)
        external
        returns (uint256)
    {
        require(price > 0, "Price must be > 0");
        IERC721 nft = IERC721(nftContract);
        require(nft.ownerOf(tokenId) == msg.sender, "Not token owner");
        require(
            nft.getApproved(tokenId) == address(this) ||
                nft.isApprovedForAll(msg.sender, address(this)),
            "Marketplace not approved"
        );

        uint256 listingId = nextListingId++;
        _listings[listingId] = Listing({
            seller: msg.sender,
            nftContract: nftContract,
            tokenId: tokenId,
            price: price,
            active: true,
            flagged: false
        });

        emit Listed(listingId, msg.sender, nftContract, tokenId, price);
        return listingId;
    }

    function cancelListing(uint256 listingId) external {
        Listing storage l = _listings[listingId];
        require(l.active, "Not active");
        require(l.seller == msg.sender, "Not seller");
        l.active = false;
        emit Cancelled(listingId);
    }

    // ---------- Buyer action ----------

    function buyItem(uint256 listingId) external payable nonReentrant {
        Listing storage l = _listings[listingId];
        require(l.active, "Not active");
        require(!l.flagged, "Listing flagged");
        require(msg.sender != l.seller, "Cannot buy own listing");
        require(msg.value == l.price, "Wrong price");

        l.active = false;
        address seller = l.seller;
        address nftContract = l.nftContract;
        uint256 tokenId = l.tokenId;
        uint256 price = msg.value;

        // Royalty (EIP-2981) — try/catch in case the NFT contract doesn't implement it
        uint256 royaltyAmount;
        address royaltyReceiver;
        try IERC2981(nftContract).royaltyInfo(tokenId, price) returns (
            address rec,
            uint256 amt
        ) {
            royaltyReceiver = rec;
            royaltyAmount = amt;
        } catch {
            royaltyReceiver = address(0);
            royaltyAmount = 0;
        }

        uint256 platformFee = (price * platformFeeBps) / BPS_DENOMINATOR;
        accumulatedFees += platformFee;

        bool payRoyalty = royaltyAmount > 0 &&
            royaltyReceiver != address(0) &&
            royaltyReceiver != seller; // skip on primary sale to creator

        uint256 sellerProceeds = price - platformFee;
        if (payRoyalty) {
            require(royaltyAmount <= sellerProceeds, "Royalty exceeds proceeds");
            sellerProceeds -= royaltyAmount;
        }

        // Effects done. Now interactions. Transfer NFT first — if it fails (e.g.
        // seller revoked approval) the whole tx reverts and the buyer is refunded.
        IERC721(nftContract).safeTransferFrom(seller, msg.sender, tokenId);

        if (payRoyalty) {
            (bool okR, ) = payable(royaltyReceiver).call{value: royaltyAmount}("");
            require(okR, "Royalty transfer failed");
        }
        (bool okS, ) = payable(seller).call{value: sellerProceeds}("");
        require(okS, "Seller transfer failed");

        emit Sold(listingId, msg.sender, seller, price, payRoyalty ? royaltyAmount : 0, platformFee);
    }

    // ---------- Views ----------

    function getListing(uint256 listingId) external view returns (Listing memory) {
        return _listings[listingId];
    }

    // ---------- Admin ----------

    function setPlatformFee(uint96 newFeeBps) external onlyOwner {
        require(newFeeBps <= MAX_FEE_BPS, "Fee too high");
        platformFeeBps = newFeeBps;
        emit PlatformFeeUpdated(newFeeBps);
    }

    function flagListing(uint256 listingId, bool flag) external onlyOwner {
        require(_listings[listingId].seller != address(0), "Listing does not exist");
        _listings[listingId].flagged = flag;
        emit Flagged(listingId, flag);
    }

    function withdrawFees(address to) external onlyOwner {
        require(to != address(0), "Zero address");
        uint256 amount = accumulatedFees;
        require(amount > 0, "No fees to withdraw");
        accumulatedFees = 0;
        (bool ok, ) = payable(to).call{value: amount}("");
        require(ok, "Withdraw failed");
        emit FeesWithdrawn(to, amount);
    }
}
