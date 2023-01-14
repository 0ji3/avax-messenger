// SPDX-License-Identifier: MIT

pragma solidity ^0.8.9;

contract Ownable {
    address public owner;

    function ownable() internal {
        owner = msg.sender;
    }

    modifier onlyOwner() {
        require(msg.sender == owner, "You aren't the owner");
        _;
    }
}