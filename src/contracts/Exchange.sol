// my friend was telling me about crypto coins issued by soccer clubs
// trade with alot of volitility during games
// would be great avenue to test out creating an options or futures market
// it might bypass all of the legal bullshit that is involved in "sports betting"
// because it is trading crypto coin which is way less regulated

// MARKET SHARE GAME AT THIS POINT AKA AKA AKA SPEED IS SUPER IMPORTANT
// MONETIZATION COMES AFTER

// OPTION STRUCTURE
// 1. UNDERLYING - what you have the right to buy or sell
// 2. CALL/PUT - right to buy or right to sell
// 3. STRIKE PRICE - price at which you're allowed to buy or sell
// 4. EXPIRATION - how long you have that right for
// 5. CONTRACT SIZE - how many of whatever you have the right to buy or sell
// 6. SETTLEMENT/DELIVERY - I suppose all of these will be cash settled
// 7. TRADE PRICE

// recommends writing a similar structure for futures first and then layer on option code
// since these options wouldnt be stock/commodity delivery they'd need a future component anyways 
// namely they'd be options on futures and hence cash settled
// building the structure for futures is much more straightforward

// FUTURE STRUCTURE
// 1. UNDERLYING - whatever the club coin is 
// 2. EXPIRATION - when you can no longer execute the future contract aka the contract rights expire
// 3. PRICE - in chiliz coin, set by the user who puts the future contract onto the exchange

// just a guarantee that the buyer will buy x amount of y at z time
// needs to be a way to verify settlement in the structure (this comes with blockchain I think)

// exchange comes up with whatever contract on whatever underlying
// exchange decides expirations, usually quarterly
// then exchange members just buy and sell those to each other


// start with future structure just like Kahn said, then I can expand that to an option


// price is determined as an open market
// whatever people want to buy and sell it at
// where those prices cross, they trade
// so each contract should have variable for best bid and best offer
// so people can see where the current market is 
// if someone wants to trade either of those prices 
// it will trade and there will be counterparties

// whoever sells the prop, lets say we do the settlement at 0 or 100
// that means if the seller wants to offer it at 40 they stand to lose 60 if they lose the prop
// so 60 should automatically go into escrow until the future settles
// similarly, the buyer stands to lose 40 so 40 should go into escrow from their account
// until the future settles
// similarly the buyer stands to lose 40 so the 40 should go from their account into escrow
// that makes a total of 100 then whoever wins the prop gets all 100

// prop can be settled by block chian, say it needs to be verified by majority from at least 100 votes or something?
// Not sure how it works on blockchain as opposed to a dedicated exchange (atomic transfers?? Josh)
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

// declaring this is solidity contract and the version 
pragma solidity ^0.5.0;

// importing token contract
import "./Token.sol";
// importing safe math contract
import "openzeppelin-solidity/contracts/math/SafeMath.sol";

contract Exchange {
	// dependency for doing match safely in solidity
	using SafeMath for uint256;

	// fee account (i.e.) exchange deployer account
	address public feeAccount;
	// fee charged by the account holder
	uint256 public feePercent;

	// assigning the ether address to CHZ const (Ether equivalent for Chiliz chain)
	address constant CHZ = address(0);	// CHZ address 0xc59181b702A7F3A8eCea27f30072B8dbCcC0c48a https://scoville-explorer.chiliz.com/address/0xc59181b702A7F3A8eCea27f30072B8dbCcC0c48a/transactions
	// AC Milan (testACM) address assigned to a variable
	address constant testACM = 0x27c294288837D0B8be487Db282058C6c3087B74d;
	// Arsenal FC (testAFC) address assigned to a variable
	address constant testAFC = 0x6c91CcF20E55B7e6A5D58Db65cAB607516951904;
	// Atletico de Madrid (testATM) address assigned to variable
	address constant testATM = 0x911a6935C6D4271f6F4b3992cd47caC8EbEd4498;
	// FC Barcelona (testBAR) address assigned to a variable
	address constant testBAR = 0x4e724A93c993a4Ed692016e35C5B175b1E92b045;
	// Manchester City FC (testCITY) address assigned to a variable
	address constant testCITY = 0x9CCBe6aeaF87a5d181a897A72df67DeB1a34009D;
	// Galatasary S.K. (testGAL) address is assigned to a variable
	address constant testGAL = 0xB9aD700dDA548f509afE049C6846C70B14968493;
	// Inter Milan (testINTER) address is assigned to a variable
	address constant testINTER = 0x8A8ECD3eC11DB38A8683952eF0836fF1cFa85dB0;
	// Juventus (testJUV) address is assigned to a variable
	address constant testJUV = 0xF07E2a2f21E47b3359284b253017D666faE1Daea;
	// Flamengo (testMENGO) address is assigned to a variable
	address constant testMENGO = 0x492F559cDE683bEBB0094Ef9D4544bF2360Dd71E;
	// Paris Saint-Germain (testPSG) address is assigned to a variable
	address constant testPSG = 0xFcf885081F09BEa9DE6925bbDc41EB61303E6A41;
	// Socios United (testSSU) address is assigned to a variable
	address constant testSSU = 0xE40beA7F708b563e4E70d529C164288144C01782;
	// Trabzonspor (testTRA) address is assigned to a variable
	address constant testTRA = 0xe0b2d2c2363dAA6a4F4fD564025EdBFaD58704d3;

	// tokens mapping for different ERC20 tokens: token address is first key, second address is token owner, third key is amount of tokens
	mapping(address => mapping(address => uint256)) public tokens;
	// counter cache for futures id
	uint256 public futuresCount;
	// mapping for holding our futures on the exchangenvm 
	mapping(uint256 => _futuresContract) public futures;
	// mapping to track cancelled future orders
	mapping(uint256 => bool) public futureOrderCancelled;

	// event emits when a deposit is made into the exchange tokens mapping
	event Deposit(address token, address user, uint256 amount, uint256 balance);
	// event emits when a withdraw is made from the exchange tokens mapping
	event Withdraw(address token, address user, uint256 amount, uint256 balance);
	// event emits when a futures contract is creates
	event CreateFuturesContract(
		// unique identifier for the future order
		uint256 id,
		// address that creates the order
		address futuresContractCreator,
		// address of UNDERLYING 
		address tokenGet,
		// amount of UNDERLYING
		uint256 amountGet,
		// address of the PRICE payment token (CHZ)
		address tokenGive,
		// amount of the PRICE method
		uint256 amountGive,
		// future contract expiration time, should be quarterly
		uint256 timeExpiration,
		// timestamp for creation of future contract
		uint256 timeCreation
	);

	// futures orders data type structure
	struct _futuresContract {
		// unique identifier for the future order
		uint256 id; 
		// address that creates the order
		address futuresContractCreator;
		// address of UNDERLYING 
		address tokenGet;
		// amount of UNDERLYING
		uint256 amountGet;
		// address of the PRICE payment token (CHZ)
		address tokenGive;
		// amount of the PRICE method
		uint256 amountGive;
		// future contract expiration time, should be quarterly
		uint256 timeExpiration;
		// timestamp for creation of future contract
		uint256 timeCreation;
	}

	// constructor sets feeAccount and feePercent when the contract is deployed, this happens once in the contract lifecycle
	constructor (address _feeAccount, uint256 _feePercent) public {
		// address where fees are sent is set
		feeAccount = _feeAccount;
		// the fee percentage is set
		feePercent = _feePercent;
	}

	// fallback function to send CHZ back if someone just sends to the contract address accidentally, otherwise would just be locked into the contract forever
	function() external {
		revert();
	}

	// allows you to deposit Chiliz network coin to the exchange tokens mapping
	function depositChiliz() payable public {
		// increasing the token mapping amount of CHZ for msg.sender by the msg.value
		tokens[CHZ][msg.sender] = tokens[CHZ][msg.sender].add(msg.value);
		// emit deposit event 
		emit Deposit(CHZ, msg.sender, msg.value, tokens[CHZ][msg.sender]);
	}

	// allows you to withdraw Chiliz network coin from the exchange tokens mapping
	function withdrawChiliz(uint256 _amount) public {
		// require that the user has enough tokens
		require(tokens[CHZ][msg.sender] >= _amount);
		// decrease the tokens mapping on the exchange by the amount of the withdraw
		tokens[CHZ][msg.sender] = tokens[CHZ][msg.sender].sub(_amount);
		// sends network tokens back to the user
		msg.sender.transfer(_amount);
		// deposit a withdraw event
		emit Withdraw(CHZ, msg.sender, _amount, tokens[CHZ][msg.sender]);
	}

	// allows you to deposit ERC20 tokens into your tokens mapping
	function depositToken(address _token, uint256 _amount) public {
		// dissalow deposits of network tokens (CHZ) using this function
		require(_token != CHZ);
		// require the correct conditions for deposit be executed, calling transfer from function from the ERC20 smart contract
		require(Token(_token).transferFrom(msg.sender, address(this), _amount));
		// add tokens to the tokens mapping
		tokens[_token][msg.sender] = tokens[_token][msg.sender].add(_amount);
		// emit a deposit event
		emit Deposit(_token, msg.sender, _amount, tokens[_token][msg.sender]);
	}

	// function that withdraws tokens from the exchange tokens mapping
	function withdrawToken(address _token, uint256 _amount) public {
		// require that the token is not a chiliz network token
		require(_token != CHZ);
		// require that the user is not asking for more than they have
		require(tokens[_token][msg.sender] >= _amount);
		// remove the amount from the tokens mapping on the exchange smart contract
		tokens[_token][msg.sender] = tokens[_token][msg.sender].sub(_amount);
		// require that the transfer function on the ERC20 token smart contract is called
		require(Token(_token).approve(msg.sender, _amount));
		// emit a withdraw event
		emit Withdraw(_token, msg.sender, _amount, tokens[_token][msg.sender]);
	}

	// function to see the balance of a token in our tokens mapping
	function balanceOf(address _token, address _user) public view returns (uint256) {
		// returns the tokens mapping requested with the function call input parameters
		return tokens[_token][_user];
	}

	// function that puts the futures contract onto the exchange
	function createFuturesContract(
		// underlying address parameter
		address _tokenGet, 
		// underlying amount parameter
		uint256 _amountGet, 
		// token price payment method address
		address _tokenGive, 
		// token price payment amount
		uint256 _amountGive, 
		// quarter that the futures contract may no longer be filled
		uint256 _expirationQuarter
		) public {
		// set the order count for the id value
		futuresCount = futuresCount.add(1);
		// create the futures contract
		futures[futuresCount] = _futuresContract(
			// input for id param
			futuresCount,
			// input for address that creates the order
			msg.sender,
			// input for address of underlying
			_tokenGet,
			// input for amount of underlying
			_amountGet,
			// input for address of price token
			_tokenGive,
			// input for amount of price token
			_amountGive,
			// input for expiration time of the futures contract
			_expirationQuarter,
			// input for creation time of the futures contract
			now
		);
		// emits a create futures event
		emit CreateFuturesContract(
			// input for id param
			futuresCount,
			// input for address that creates the order
			msg.sender,
			// input for address of underlying
			_tokenGet,
			// input for amount of underlying
			_amountGet,
			// input for address of price token
			_tokenGive,
			// input for amount of price token
			_amountGive,
			// input for expiration time of the futures contract
			_expirationQuarter,
			// input for creation time of the futures contract
			now
		);
	}

	// function that allows a user to cancel a futures order that has not been filled
	function cancelFuturesContract(uint256 _id) public {
		_Order storage _order = orders[_id]
	}
}