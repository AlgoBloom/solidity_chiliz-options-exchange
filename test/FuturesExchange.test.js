// brining all helper functions into the test file
import { tokens, chiliz, CHZ_REVERT, CHZ_ADDRESS } from './helpers.js'

// pulling token and exchange contracts into test file as JS objects
const Token = artifacts.require('./Token')
const Exchange = artifacts.require('./Exchange')

// using chai assertion language
require('chai')
	.use(require('chai-as-promised'))
	.should()

// instantianting smart contract and testing it
contract('Exchange', ([deployer, feeAccount, user1, user2]) => {
	// variables for use throughout the contract
	let token
	let exchange
	const feePercent = 10

	// this is ran before every test in this test file
	beforeEach(async () => {
		// deploy token
		token = await Token.new()
		// transfer some tokens to user 1
		token.transfer(user1, tokens(100), { from: deployer })
		// deploy exchange
		exchange = await Exchange.new(feeAccount, feePercent)
	})

	// describing the deployment of the exchange contract
	describe('contract deployment', () => {
		// waiting for the feeAccount to be set and then assigning the result to result variable
		it('tracks the fee account', async () => {
			// result is fee account
			const result = await exchange.feeAccount()
			// testing equality to the expected value
			result.should.equal(feeAccount)
		})
		// waits for fee percent to be loaded in memory and then tests equality
		it('tracks the fee percent', async () => {
			// result is the fee percent
			const result = await exchange.feePercent()
			// check equality with the percent we expect
			result.toString().should.equal('10')
		})
	})

	// describes when main net token is sent directly to the smart contract not using a contract method
	describe('reverts when CHZ is sent directly to contract without deposit function', () => {
		// reverting when CHZ is sent directly to smart contract for exchange
		it('reverts when CHZ is sent', async () => {
			// attemping to send 
			await exchange.sendTransaction({ value: 1, from: user1 }).should.be.rejectedWith(CHZ_REVERT)
		})
	})

	// describes when chiliz is depostited into the exchange correctly using the deposit function
	describe('depositing chiliz into the tokens mapping correctly using the contract function for deposits', () => {
		// used to store results from testing
		let result
		// used to store amounts for testing
		let amount

		// before each test we will deposit ether
		beforeEach(async () => {
			// setting amount to be 1 CHZ
			amount = chiliz(1)
			// calling the deposit function from user1 with 1 CHZ
			result = await exchange.depositChiliz({ from: user1, value: amount })
		})

		// testing that the chiliz was deposited
		it('tracks the chiliz deposit into tokens mapping', async () => {
				// assign the tokens object to new var balance
				const balance = await exchange.tokens(CHZ_ADDRESS, user1)
				// checking that the chiliz balance is now 1
				balance.toString().should.equal(amount.toString())
		})

		// testing that a deposit event is emited 
		it('tracks the deposit event from putting one chiliz in the tokens mapping for user1', async () => {
			// assigns the resulting object of the deposit event to new log object
			const log = result.logs[0]
			// testing that the event's name is Deposit
			log.event.should.equal('Deposit')
			// pulling the arguments out of the emit object log and assigning them to a new object
			const event = log.args
			// token is chiliz coin
			event.token.should.equal(CHZ_ADDRESS)
			// user is user1
			event.user.should.equal(user1)
			// amount is 1 chiliz
			event.amount.toString().should.equal(chiliz(1).toString())
			// balance is 1 chiliz
			event.balance.toString().should.equal(chiliz(1).toString())
		})
	})

	// tests withdrawing chiliz from the exchange
	describe('withdrawing chiliz network coin from the exchange', () => {
		// used to store results from testing
		let result
		// used to store amounts for testing
		let amount

		// before each to deposit some chiliz coin
		beforeEach(async () => {
			// setting the amount for this test
			amount = chiliz(3)
			// deposit chiliz
			await exchange.depositChiliz({ from: user1, value: amount })
		})

		// describing the success case
		describe('success', () => {
			// before each to withdraw some chiliz coin
			beforeEach(async () => {
				// withdraw chiliz
				result = await exchange.withdrawChiliz(chiliz(1), {from: user1})
			})

			// testing that the new balance is 2 chiliz coins
			it('tests that the withdraw function removed one chiliz token from the tokens mapping', async () => {
				// assigns the value of the chiliz tokens mapping for user1 to result variable
				const balance = await exchange.tokens(CHZ_ADDRESS, user1)
				// tests that the value is two chiliz coins
				balance.toString().should.equal(chiliz(2).toString())
			})

			// testing that a withdraw event occured and has expected data in emit object
			it('tests that the withdraw event worked properly', async () => {
				// pull the logs out of the deposit event and assign to a new object
				const log = result.logs[0]
				// check that the log's name is withdraw
				log.event.should.equal('Withdraw')
				// pulling the arguments we want to look at out of the log
				const event = log.args
				// checking address of token
				event.token.should.equal(CHZ_ADDRESS)
				// checking user address
				event.user.should.equal(user1)
				// checking amount withdrawn 
				event.amount.toString().should.equal(chiliz(1).toString())
				// checking balance of tokens mapping for chiliz
				event.balance.toString().should.equal(chiliz(2).toString())
			})
		})

		// describing the failure case
		describe('failure', () => {
			// testing to see if the exchange allows me to remove more tokens than I have
			it('tests prevention of overdraws', async () => {
				// setting amount for this test
				amount = chiliz(5)
				// tries to withdraw five chiliz tokens and should be rejected
				await exchange.withdrawChiliz( amount, { from: user1 }).should.be.rejectedWith(CHZ_REVERT)
			})
		})

	})

	// describing functionality of deposit token function
	describe('despositing tokens using the deposit token function', () => {
		// result variable for testing
		let result
		// amount variable for testing
		let amount

		// describing the success cases
		describe('success', () => {
			// before each approving the token transfer on the ERC20 smart contract and then depositing the token
			beforeEach(async () => {
				// setting amount to ten tokens for the approval and deposit purposes
				amount = tokens(10)
				// awaiting the approval of 10 of user1's tokens to be accessed by the exchange smart contract
				await token.approve(exchange.address, amount, { from: user1 })
				// depositing the tokens into the exchange
				result = await exchange.depositToken(token.address, amount, { from: user1 })
			})

			// testing that the token has successfully deposited into the exchange
			it('tracks the deposit of ERC20 token into the tokens mapping on the exchange', async () => {
				// creating balance variable for testing purposes
				let balance
				// setting balance to the value of the balance of the tokens mapping
				balance = await exchange.balanceOf(token.address, user1)
				// testing that the balance of the user is ten of the ERC20 tokens
				balance.toString().should.equal(tokens(10).toString())
				// testing that the tokens mapping is working as expected
				balance = await exchange.tokens(token.address, user1)
				// checking that the balance is 10 ERC20 tokens as expected
				balance.toString().should.equal(tokens(10).toString())
			})
			// testing that a deposit event is emited 
			it('tracks the deposit event from putting 10 ERC20 tokens in the tokens mapping for user1', async () => {
				// assigns the resulting object of the deposit event to new log object
				const log = result.logs[0]
				// testing that the event's name is Deposit
				log.event.should.equal('Deposit')
				// pulling the arguments out of the emit object log and assigning them to a new object
				const event = log.args
				// token is testing ERC20 token
				event.token.should.equal(token.address)
				// user is user1
				event.user.should.equal(user1)
				// amount is 10 ERC20 tokens
				event.amount.toString().should.equal(tokens(10).toString())
				// balance is 10 ERC20 tokens
				event.balance.toString().should.equal(tokens(10).toString())
			})
		})
		// testing the cases where we expect failure
		describe('failure', () => {
			// testing that the deposit function rejects using chiliz in this function
			it('tests that chiliz cannot be deposited with depositToken function', async () => {
				// tries to deposit chiliz using depositToken
				await exchange.depositToken(CHZ_ADDRESS, chiliz(5), { from: user1 }).should.be.rejectedWith(CHZ_REVERT)
			})
			// testing failure when no tokens are approved
			it('tests that deposit fails when tokens are not approved', async () => {
				// trying to deposit tokens without approving them first with the ERC20 approve function
				await exchange.depositToken(token.address, tokens(5), { from: user1 }).should.be.rejectedWith(CHZ_REVERT)
			})

		})
	})

	// testing the withdrawToken function
	describe('testing the withdraw token function', () => {
		// creating result variable for testing
		let result
		// creating amount variable for testing
		let amount
		// testing for success
		describe('success', () => {
			// before each success test case
			beforeEach(async () => {
				// setting amount to 10 ERC20 tokens
				amount = tokens(10)
				// approving the exchange to receive tokens from the ERC20 smart contract
				await token.approve(exchange.address, amount, { from: user1 })
				// deposit the tokens into the exchange tokens mapping
				await exchange.depositToken(token.address, amount, { from: user1 })
				// withdraw the tokens from exchange tokens mapping
				result = await exchange.withdrawToken(token.address, amount, { from: user1 })
			})
			// testing the removal of token funds
			it('testing for the removal of tokens from exchange tokens mapping', async () => {
				// setting balance to the token mapping balance for the test token
				const balance = await exchange.tokens(token.address, user1)
				// checking that balance equals 0
				balance.toString().should.equal(tokens(0).toString())
			})
			// testing that a withdraw event occured and has expected data in emit object
			it('tests that the withdraw event worked properly', async () => {
				// pull the logs out of the deposit event and assign to a new object
				const log = result.logs[0]
				// check that the log's name is withdraw
				log.event.should.equal('Withdraw')
				// pulling the arguments we want to look at out of the log
				const event = log.args
				// checking address of token
				event.token.should.equal(token.address)
				// checking user address
				event.user.should.equal(user1)
				// checking amount withdrawn 
				event.amount.toString().should.equal(tokens(10).toString())
				// checking balance of tokens mapping for chiliz
				event.balance.toString().should.equal(tokens(0).toString())
			})
		})
		// testing for failure cases
		describe('failure', () => {
			// testing that chiliz withdraws are rejected
			it('rejects chiliz withdraw attempts using withdrawToken function', async () => {
				// awaiting withdraw token function to run with chiliz token address used as parameter one
				await exchange.withdrawToken(CHZ_ADDRESS, chiliz(5), { from: user1 }).should.be.rejectedWith(CHZ_REVERT)
			})
			// testing that overdraws are rejected 
			it('rejects overdraws from exchange', async () => {
				// awaiting withdraw token function to attempt to withdraw more than user1 has
				await exchange.withdrawToken(token.address, tokens(5), { from: user1 }).should.be.rejectedWith(CHZ_REVERT)
			})
		})
	})


	// testing the create futures contract function
	describe('testing the create futures contract function', () => {
		// create result variable for testing 
		let result 

		// run this before each test 
		beforeEach(async () => {
			// create a futures contract
			result = await exchange.createFuturesContract(
				// address of underlying
				token.address,
				// amount of underlying
				tokens(3),
				// address of price payment method
				CHZ_ADDRESS,
				// amount of price to be paid
				chiliz(1),
				// time when the futures contract expires, epoch timestamp for the first second of 9/16/22
				1663286401,
				// metadata that defines function is being called by user1
				{ from: user1 },
				)
		})

		// tests that the futures contract was created
		it('tracks the newly created futures contract', async () => {
			// assigns the futures count to a new variable
			const futuresCount = await exchange.futuresCount()
			// testing that the order count equals one
			futuresCount.toString().should.equal('1')
			// setting the resulting object to order
			const contract = await exchange.futures('1')
			// testing that the id is correct
			contract.id.toString().should.equal('1')
			// testing that contract creator address is correct
			contract.futuresContractCreator.should.equal(user1)
			// testing that token get (underlying) address is correct
			contract.tokenUnderlying.should.equal(token.address)
			// testing that token get (underlying) amount is correct
			contract.amountUnderlying.toString().should.equal(tokens(3).toString())
			// testing that token give (price) address is correct
			contract.tokenPrice.should.equal(CHZ_ADDRESS)
			// testing that token give (price) amount is correct
			contract.amountPrice.toString().should.equal(chiliz(1).toString())
			// testing that expiration epoch time is set correctly
			contract.timeExpiration.toString().should.equal('1663286401')
			// testing that the timestamp for the contract creation is correct
			contract.timeCreation.length.should.be.at.least(1)
		})

		// testing that an CreateFuturesContract emit event occured
		it('confirms a CreateFuturesContract event occured', async () => {
			// pullings the logs out of the result
			const log = result.logs[0]
			// testing that this event is CreateFuturesContract
			log.event.should.equal('CreateFuturesContract')
			// pulling the args out of the logs and assigning to a variable
			const event = log.args
			// id should be 1
			event.id.toString().should.equal('1')
			// futures contract creator should be user1
			event.futuresContractCreator.should.equal(user1)
			// underlying token get should be the test ERC20 token address
			event.tokenUnderlying.should.equal(token.address)
			// underlying token amount should be three test ERC20 tokens
			event.amountUnderlying.toString().should.equal(tokens(3).toString())
			// price payment method token address should be chiliz
			event.tokenPrice.should.equal(CHZ_ADDRESS)
			// price amount used to pay for the uncerlying
			event.amountPrice.toString().should.equal(chiliz(1).toString())
			// testing that expiration epoch time is set correctly
			event.timeExpiration.toString().should.equal('1663286401')
			// testing that the timestamp for the contract creation is correct
			event.timeCreation.length.should.be.at.least(1)
		})
	})



	// // tests the futures contract cancellation function
	// describe('testing the cancel futures contract function', () => {
	// 	// creating result variable for testing
	// 	let result

	// 	// describing success cases
	// 	describe('success', async () => {
	// 		// before each success case do this
	// 		beforeEach(async () => {
	// 			await
	// 		})
	// 	})
	// })
})