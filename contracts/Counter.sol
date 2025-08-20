// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/**
 * @title Counter
 * @author Smart Contract Developer
 * @notice A simple counter contract for demonstration purposes
 * @dev This contract demonstrates basic Solidity patterns and is used for CI/CD testing
 */
contract Counter {
    /// @notice The current counter value
    uint256 public count;
    
    /// @notice Event emitted when the counter is incremented
    /// @param by The amount by which the counter was incremented
    event Incremented(uint256 by);
    
    /// @notice Mapping to store user balances
    mapping(address => uint256) public balances;
    
    /// @notice Increment the counter by 1
    function increment() public {
        count++;
        emit Incremented(1);
    }
    
    /// @notice Increment the counter by a specific amount
    /// @param amount The amount to increment by
    function incrementBy(uint256 amount) public {
        require(amount > 0, "Amount must be greater than 0");
        count += amount;
        emit Incremented(amount);
    }
    
    /// @notice Get the current counter value
    /// @return The current count
    function getCount() public view returns (uint256) {
        return count;
    }
    
    // VULNERABILITY: Classic reentrancy attack vector
    // This function allows external calls before updating state
    function withdraw() public {
        uint256 amount = balances[msg.sender];
        require(amount > 0, "No balance to withdraw");
        
        // VULNERABILITY: External call before state update
        // This allows reentrancy attacks - attackers can call withdraw() multiple times
        (bool success, ) = msg.sender.call{value: amount}("");
        require(success, "Transfer failed");
        
        // State update happens after external call - VULNERABLE!
        balances[msg.sender] = 0;
    }
    
    // Function to add balance (for testing the vulnerability)
    function addBalance() public payable {
        balances[msg.sender] += msg.value;
    }
    
    // Function to get contract balance
    function getContractBalance() public view returns (uint256) {
        return address(this).balance;
    }
}
