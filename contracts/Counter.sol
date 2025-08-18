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
}
