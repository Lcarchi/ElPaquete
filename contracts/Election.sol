// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract Election {
    struct Candidate {
        address payable addr;
        string name;
        uint voteCount;
    }
    
    Candidate[] public candidates;
    mapping(address => bool) hasVoted;
    uint public contractEndTime;
    address public owner;
    bool private locked = false;

    event PayoutSuccess(address recipient, uint amount);
    event PayoutFailure(address recipient, uint amount);

    modifier onlyOwner() {
        require(msg.sender == owner, "Only the contract owner can perform this operation.");
        _;
    }

    modifier noReentrancy() {
        require(!locked, "Reentrant call.");
        locked = true;
        _;
        locked = false;
    }

    constructor(string[] memory candidateNames, address payable[] memory candidateAddresses, uint duration) {
        require(candidateNames.length == candidateAddresses.length, "Each candidate must have a name and an address.");
        
        for(uint i = 0; i < candidateNames.length; i++){
            candidates.push(Candidate({
                addr: candidateAddresses[i],
                name: candidateNames[i],
                voteCount: 0
            }));
        }
        
        contractEndTime = block.timestamp + duration;
        owner = msg.sender;
    }
    
    function addCandidate(string memory name, address payable addr) public onlyOwner {
        candidates.push(Candidate({
            addr: addr,
            name: name,
            voteCount: 0
        }));
    }
    
    function vote(uint candidateIndex) external {
        require(block.timestamp <= contractEndTime, "Voting period has ended.");
        require(!hasVoted[msg.sender], "You have already voted.");
        
        candidates[candidateIndex].voteCount += 1;
        hasVoted[msg.sender] = true;
    }
    
    function payout() external noReentrancy {
        require(block.timestamp > contractEndTime, "Voting period is not yet over.");

        Candidate memory highestCandidate = candidates[0];
        for(uint i = 1; i < candidates.length; i++){
            if(candidates[i].voteCount > highestCandidate.voteCount){
                highestCandidate = candidates[i];
            }
        }

        (bool success, ) = highestCandidate.addr.call{value: address(this).balance}("");
        if(success){
            emit PayoutSuccess(highestCandidate.addr, address(this).balance);
        } else {
            emit PayoutFailure(highestCandidate.addr, address(this).balance);
        }
    }
    
    receive() external payable {}
}
