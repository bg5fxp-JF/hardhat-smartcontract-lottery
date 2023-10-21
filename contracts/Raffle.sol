//SPDX-License-Identifier: MIT
pragma solidity ^0.8.7;

import {VRFConsumerBaseV2} from "@chainlink/contracts/src/v0.8/vrf/VRFConsumerBaseV2.sol";
import {VRFCoordinatorV2Interface} from "@chainlink/contracts/src/v0.8/interfaces/VRFCoordinatorV2Interface.sol";
import {AutomationCompatibleInterface} from "@chainlink/contracts/src/v0.8/automation/AutomationCompatible.sol";

error Raffle__NotEnoughToEnter();
error Raffle__TransferFailed();
error Raffle__RaffleIsNotOpen();
error Raffle__UpkeepNotNeeded(uint256 currentBalance, uint256 numPlayers, uint256 raffleState);

/**
 * @title A sample Raffle Contract
 * @author Jacob Fecunda
 * @notice This contract is for creating a untamperable FAIR and RANDOM raffle
 * @dev This implements Chainlink VRFv2 abd Chainlink Keepers
 */

contract Raffle is VRFConsumerBaseV2, AutomationCompatibleInterface {
    /* Type Declerations */
    enum RaffleState {
        OPEN,
        CALCULATING
    }

    /* State variables */
    uint256 private immutable i_entranceFee;
    address payable[] private s_players;
    address payable private s_recentWinner;
    VRFCoordinatorV2Interface private immutable i_vrfCoordinator;
    bytes32 private immutable i_gasLane;
    uint64 private immutable i_subscriptionId;
    uint16 private constant REQUEST_CONFIRMATIONS = 3;
    uint32 private immutable i_callbackGasLimit;
    uint32 private constant NUM_WORDS = 1;
    RaffleState private s_raffleState;
    uint256 private s_lastTimeStamp;
    uint256 private immutable i_interval;

    /* Events */
    event RaffleEntered(address indexed player);
    event RequestedRandomWiinner(uint256 indexed requestId);
    event WinnerPicked(address indexed winner);

    constructor(
        address vrfCoordinatorV2,
        uint256 entranceFee,
        bytes32 gasLane,
        uint64 subscriptionId,
        uint32 callbackGasLimit,
        uint256 interval
    ) VRFConsumerBaseV2(vrfCoordinatorV2) {
        i_entranceFee = entranceFee;
        i_vrfCoordinator = VRFCoordinatorV2Interface(vrfCoordinatorV2);
        i_gasLane = gasLane;
        i_subscriptionId = subscriptionId;
        i_callbackGasLimit = callbackGasLimit;
        s_raffleState = RaffleState.OPEN;
        s_lastTimeStamp = block.timestamp;
        i_interval = interval;
    }

    /* Functions */
    // * receive function
    receive() external payable {}

    // * fallback function
    fallback() external payable {}

    /**
     * @dev this is the function that ChainLink Keeper nodes call
     * to preform the upkeep
     * It checks if upkeep is needed and requests the random words (winner number) if it is.
     */
    function performUpkeep(bytes calldata /* performData */ ) external override {
        (bool upkeepNeeded,) = checkUpkeep("");

        if (!upkeepNeeded) {
            revert Raffle__UpkeepNotNeeded(address(this).balance, s_players.length, uint256(s_raffleState));
        }
        s_raffleState = RaffleState.CALCULATING;
        uint256 requestId = i_vrfCoordinator.requestRandomWords(
            i_gasLane, i_subscriptionId, REQUEST_CONFIRMATIONS, i_callbackGasLimit, NUM_WORDS
        );
        emit RequestedRandomWiinner(requestId);
    }

    /**
     * @dev this is the function that ChainLink Keeper nodes call
     * they look for the 'upkeepNeeded' to return true:
     * 1. Our time interval should have passed
     * 2. The lottery should have at least 1 player, and have some ETH
     * 3. Our subscription is funded with LINK
     * 4. The lottery should be in an 'open' state
     */
    function checkUpkeep(bytes memory /*checkData*/ )
        public
        override
        returns (bool upkeepNeeded, bytes memory /* performData */ )
    {
        bool isOpen = (RaffleState.OPEN == s_raffleState);
        bool timePassed = ((block.timestamp - s_lastTimeStamp) > i_interval);
        bool hasPlayers = s_players.length > 0;
        bool hasBalance = address(this).balance > 0;

        upkeepNeeded = (isOpen && timePassed && hasPlayers && hasBalance);
    }

    function enterRaffle() public payable {
        if (msg.value < i_entranceFee) revert Raffle__NotEnoughToEnter();
        if (s_raffleState != RaffleState.OPEN) revert Raffle__RaffleIsNotOpen();

        s_players.push(payable(msg.sender));
        emit RaffleEntered(msg.sender);
    }

    function fulfillRandomWords(uint256, /*requestId*/ uint256[] memory randomWords) internal override {
        uint256 indexOfWinner = randomWords[0] % s_players.length;
        address payable recentWinner = s_players[indexOfWinner];
        s_recentWinner = recentWinner;
        s_raffleState = RaffleState.OPEN;
        s_players = new address payable[](0);
        s_lastTimeStamp = block.timestamp;
        (bool success,) = recentWinner.call{value: address(this).balance}("");

        if (!success) revert Raffle__TransferFailed();
        emit WinnerPicked(recentWinner);
    }

    /* View / Pure functions */
    function getEntranceFee() public view returns (uint256) {
        return i_entranceFee;
    }

    function getPlayer(uint256 index) public view returns (address) {
        return s_players[index];
    }

    function getRecentWinner() public view returns (address) {
        return s_recentWinner;
    }

    function getRaffleState() public view returns (RaffleState) {
        return s_raffleState;
    }

    function getNumWords() public pure returns (uint256) {
        return NUM_WORDS;
    }

    function getNumberOfPlayers() public view returns (uint256) {
        return s_players.length;
    }

    function getLastTimeStamp() public view returns (uint256) {
        return s_lastTimeStamp;
    }

    function getRequestConfirmations() public pure returns (uint256) {
        return REQUEST_CONFIRMATIONS;
    }

    function getInterval() public view returns (uint256) {
        return i_interval;
    }
}
