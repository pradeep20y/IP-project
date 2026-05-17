// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/token/common/ERC2981.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/// @title NFTCollection
/// @notice ERC-721 art collection with per-token IPFS metadata and EIP-2981 royalties.
///         Any address can mint and the minter is recorded as the original creator
///         (royalty receiver) for the lifetime of the token.
contract NFTCollection is ERC721URIStorage, ERC2981, Ownable {
    uint96 public constant MAX_ROYALTY_BPS = 1000; // 10%

    uint256 private _nextTokenId;

    mapping(uint256 => address) public creatorOf;

    event NFTMinted(
        uint256 indexed tokenId,
        address indexed creator,
        string tokenURI,
        uint96 royaltyBps
    );

    constructor() ERC721("ArtMarketplace", "ART") Ownable(msg.sender) {}

    /// @notice Mint a new NFT to the caller with metadata + royalty terms.
    /// @param uri Token metadata URI (mock://... or ipfs://...).
    /// @param royaltyBps Royalty in basis points (e.g. 500 = 5%), capped at MAX_ROYALTY_BPS.
    function mint(string calldata uri, uint96 royaltyBps) external returns (uint256) {
        require(royaltyBps <= MAX_ROYALTY_BPS, "Royalty too high");
        require(bytes(uri).length > 0, "Empty URI");

        uint256 tokenId = _nextTokenId++;
        _safeMint(msg.sender, tokenId);
        _setTokenURI(tokenId, uri);
        _setTokenRoyalty(tokenId, msg.sender, royaltyBps);
        creatorOf[tokenId] = msg.sender;

        emit NFTMinted(tokenId, msg.sender, uri, royaltyBps);
        return tokenId;
    }

    function totalMinted() external view returns (uint256) {
        return _nextTokenId;
    }

    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC721URIStorage, ERC2981)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
}
