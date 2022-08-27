
	describe('order actions', async () => {

		beforeEach(async () => {
			await exchange.depositEther({ from: user1, value: ether(1) })
			await token.transfer(user2, tokens(2), { from: deployer })
			await token.approve(exchange.address, tokens(2), { from: user2 })
			await exchange.depositToken(token.address, tokens(2), { from: user2 })
			await exchange.makeOrder(token.address, tokens(1), ETHER_ADDRESS, ether(1), 1, { from: user1 })

		})
		describe('filling orders', async () => {
			let result

			describe('success', async () => {
				beforeEach(async () => {
					result = await exchange.fillOrder('1', { from: user2 })
				})

				it('executes the trade and charges fees', async () => {
					let balance
					balance = await exchange.balanceOf(token.address, user1)
					balance.toString().should.equal(tokens(1).toString(), 'user received tokens')
					balance = await exchange.balanceOf(ETHER_ADDRESS, user2)
					balance.toString().should.equal(ether(1).toString(), 'user2 received ether')
					balance = await exchange.balanceOf(ETHER_ADDRESS, user1)
					balance.toString().should.equal('0', 'user2 ether deducted')
					balance = await exchange.balanceOf(token.address, user2)
					balance.toString().should.equal(tokens(0.9).toString(), 'user2 tokens deducted with fee applied')
					const feeAccount = await exchange.feeAccount()
					balance = await exchange.balanceOf(token.address, feeAccount)
					balance.toString().should.equal(tokens(0.1).toString(), 'feeAccount received fee')
				})

				it('updates filled orders', async () => {
					const orderFilled = await exchange.orderFilled(1)
					orderFilled.should.equal(true)
				})

				it('emits a trade event', async () => {
					const log = result.logs[0]
					log.event.should.eq('Trade')
					const event = log.args
					event.id.toString().should.equal('1', 'id is correct')
					event.user.toString().should.equal(user1, 'user is correct')
					event.tokenGet.should.equal(token.address, 'token get is correct')
					event.amountGet.toString().should.equal(tokens(1).toString(), 'amount get is correct')
					event.tokenGive.should.equal(ETHER_ADDRESS, 'token give is correct')
					event.amountGive.toString().should.equal(ether(1).toString(), 'amount give is correct')
					event.userFill.toString().should.equal(user2, 'user fill is correct')
					event.timestamp.toString().length.should.be.at.least(1, 'timestamp is present')
				})
			})

			describe('failure', async () => {

				it('rejects invalid order ids', async () => {
					const invalidOrderId = 99999
					await exchange.fillOrder(invalidOrderId, { from: user2 }).should.be.rejectedWith(EVM_REVERT)
				})

				it('rejects already-filled orders', async () => {
					await exchange.fillOrder('1', { from: user2 }).should.be.fulfilled
					await exchange.fillOrder('1', { from: user2 }).should.be.rejectedWith(EVM_REVERT)
				})

				it('rejects cancelled orders', async () => {
					await exchange.cancelOrder('1', { from: user1 }).should.be.fulfilled
					await exchange.fillOrder('1', { from: user2 }).should.be.rejectedWith(EVM_REVERT)
				})
			})

		})

		describe('cancelling orders', async () => {
			let result

			describe('success', async () => {
				beforeEach(async () => {
					result = await exchange.cancelOrder('1', { from: user1 })
				})

				it('updates cancelled orders', async () => {
					const orderCancelled = await exchange.orderCancelled(1)
					orderCancelled.should.equal(true)
				})

				it('emits a cancel event', async () => {
					const log = result.logs[0]
					log.event.should.eq('Cancel')
					const event = log.args
					event.id.toString().should.equal('1', 'id is correct')
					event.user.toString().should.equal(user1, 'user is correct')
					event.tokenGet.should.equal(token.address, 'token get is correct')
					event.amountGet.toString().should.equal(tokens(1).toString(), 'amount get is correct')
					event.tokenGive.should.equal(ETHER_ADDRESS, 'token give is correct')
					event.amountGive.toString().should.equal(ether(1).toString(), 'amount give is correct')
					event.timestamp.toString().length.should.be.at.least(1, 'timestamp is present')
				})
			})

			describe('failure', async () => {
				it('rejects invalid order ids', async() => {
					const invalidOrderId = 99999
					await exchange.cancelOrder(invalidOrderId, { from: user1 }).should.be.rejectedWith(EVM_REVERT)
				})

				it('rejects unauthorized calcelations', async () => {
					// try to cancel the order from another user
					await exchange.cancelOrder('1', { from: user2 }).should.be.rejectedWith(EVM_REVERT)
				})
			})
		})
	})
})