export const CHZ_ADDRESS = '0x0000000000000000000000000000000000000000'

export const CHZ_REVERT = 'VM Exception while processing transaction: revert'

export const chiliz = (n) => {
	// converting to BN
	return new web3.utils.BN(
			// helper we use to convert to wei using same tool as ether because same number of decimal places
			web3.utils.toWei(n.toString(), 'ether')
		)
}	

// same as ether
export const tokens = (n) => chiliz(n)