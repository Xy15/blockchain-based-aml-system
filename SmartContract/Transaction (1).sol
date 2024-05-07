//SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

contract AML{

    event Transactions(uint256 timestamp, address sender, address receiver, string method, string description, uint amount);
    event SuspiciousTransactions(uint256 timestamp, address sender, address receiver, 
        string method, string description, uint amount, string susDescription, uint256 timeProcessed, string status);
    event PendingTransactions(uint256 timestamp, address sender, address receiver, 
        string method, string description, uint amount, string susDescription);

    mapping(address => uint) public balances;

    function deposit(string memory _desc, uint _amount) public {
        balances[msg.sender] += _amount;
        emit Transactions(block.timestamp, msg.sender, address(0), "Deposit", _desc, _amount);
    }

    function withdraw(string memory _desc, uint _amount) public {
        balances[msg.sender] -= _amount;
        emit Transactions(block.timestamp, msg.sender, address(0), "Withdraw", _desc, _amount);
    }

    function transfer (address _receiver, string memory _desc, uint _amount) public {
        balances[msg.sender] -= _amount;
        balances[_receiver] += _amount;
        emit Transactions(block.timestamp, msg.sender, _receiver, "Transfer", _desc, _amount);
    }
    
    function susTransaction(address receiver, string memory method, string memory desc, uint amount, string memory susDesc) public {
        emit PendingTransactions(block.timestamp, msg.sender, receiver, method, desc, amount, susDesc);
    }

    function approveDepositTx(uint256 timestamp, address sender, address receiver, string memory method, string memory description, 
    uint amount, string memory susDescription) public {
        balances[sender] += amount;
        emit SuspiciousTransactions(timestamp, sender, receiver, method, description, amount, susDescription, block.timestamp, "Approved");
    }

    function approveWithdrawTx(uint256 timestamp, address sender, address receiver, string memory method, string memory description, 
    uint amount, string memory susDescription) public {
        balances[sender] -= amount;
        emit SuspiciousTransactions(timestamp, sender, receiver, method, description, amount, susDescription, block.timestamp, "Approved");
    }

    function approveTransferTx(uint256 timestamp, address sender, address receiver, string memory method, string memory description, 
    uint amount, string memory susDescription) public {
        balances[sender] -= amount;
        balances[receiver] += amount;
        emit SuspiciousTransactions(timestamp, sender, receiver, method, description, amount, susDescription, block.timestamp, "Approved");
    }

    function denyPendingTx(uint256 timestamp, address sender, address receiver, string memory method, string memory description, 
    uint amount, string memory susDescription, string memory status) public {
        emit SuspiciousTransactions(timestamp, sender, receiver, method, description, amount, susDescription, block.timestamp, status);
    }

    function getBalances() view public returns (uint){
        return balances[msg.sender];
    }

    function getBalances(address account) view public returns (uint){
        return balances[account];
    }

}