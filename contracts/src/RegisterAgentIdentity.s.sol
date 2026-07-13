// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import "forge-std/Script.sol";
import {createPublicClient, http, createWalletClient, defineChain} from "viem";
import {celo} from "viem/chains";

/// @title RegisterAgent — Registers an ERC-8004 agent identity on Celo Mainnet
contract RegisterAgent is Script {

    // ERC-8004 Identity Registry on Celo Mainnet
    address constant IDENTITY_REGISTRY = 0x8004A169FB4a3325136EB29fA0ceB6D2e539a432;

    // Minimal ABI for register()
    bytes4 constant REGISTER_SELECTOR = bytes4(keccak256("register(string)"));

    function run(string calldata metadataUri) external {
        uint256 privateKey = vm.envUint("PRIVATE_KEY");

        // Encode the register call
        bytes memory data = abi.encodeWithSelector(REGISTER_SELECTOR, metadataUri);

        vm.startBroadcast(privateKey);

        // Send the registration transaction
        (bool success,) = IDENTITY_REGISTRY.call(data);
        require(success, "ERC-8004 registration failed");

        vm.stopBroadcast();

        console.log("Agent registered on ERC-8004 Identity Registry");
        console.log("Registry:", IDENTITY_REGISTRY);
    }
}
