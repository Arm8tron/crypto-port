const { Connection, PublicKey, LAMPORTS_PER_SOL } = require("@solana/web3.js")
const { TOKEN_PROGRAM_ID } = require("@solana/spl-token")



async function getWalletData(wallet) {
	const walletData = [];

	const rpcEndpoint = process.env.RPC_ENDPOINT;
	const solanaConnection = new Connection(rpcEndpoint);
	const filters = [
		{
			dataSize: 165,    //size of account (bytes)
		},
		{
			memcmp: {
				offset: 32,     //location of our query in the account (bytes)
				bytes: wallet,  //our search criteria, a base58 encoded string
			}
		}
	];

	const accounts = await solanaConnection.getParsedProgramAccounts(
		TOKEN_PROGRAM_ID,   
		{ filters: filters }
	);

	accounts.forEach(async (account, i) => {

		const parsedAccountInfo = account.account.data;
		const mintAddress = parsedAccountInfo["parsed"]["info"]["mint"];
		const tokenBalance = parsedAccountInfo["parsed"]["info"]["tokenAmount"]["uiAmount"];
		if (tokenBalance > 0) {
			walletData.push({
				mintAddress,
				tokenBalance: tokenBalance.toFixed(2)
			})
		}

	});

	const solBal = await solanaConnection.getBalance(new PublicKey(wallet));

	return { walletData, solBalance: (solBal / LAMPORTS_PER_SOL).toFixed(2) };
}

async function getTokenData(queryString) {
	const data = await fetch(`https://api.dexscreener.com/latest/dex/tokens/${queryString}`)
		.then(res => res.json())

	const pairs = data.pairs;
	const tokenData = [];


	pairs.forEach((token) => {
		tokenData.push({
			mintAddress: token.baseToken.address,
			name: token.baseToken.name,
			price: token.priceUsd,
			fdv: token.fdv,
			liquidity: token.liquidity.usd,
			priceChange: token.priceChange
		})
	})

	return tokenData;
}

async function getCombinedData(address) {
	const { walletData, solBalance } = await getWalletData(address);
	let queryString = "";
	walletData.forEach((token) => {
		queryString += `${token.mintAddress},`;
	})
	queryString = queryString.slice(0, -1);
	const tokenData = await getTokenData(queryString);

	let walletBalance = 0;

	let combinedData = walletData.map(walletItem => {
		let reqToken = tokenData.find(tokenItem => tokenItem.mintAddress == walletItem.mintAddress);

		if (reqToken) {
			walletBalance += reqToken.liquidity < 100 ? 0 : walletItem.tokenBalance * reqToken.price;
			return {
				...walletItem,
				...reqToken,
				value: walletItem.tokenBalance * reqToken.price,
				danger: reqToken.liquidity < 100
			}
		}

		return null;
	}).filter(entry => entry !== null);

	combinedData.sort((t1, t2) => {
		if(t1.danger) {
			return 1;
		} else if(t2.danger) {
			return -1;
		} else {
			return t2.value - t1.value
		}
	});

	return { walletBalance: walletBalance.toFixed(2), combinedData, solBalance }
}

module.exports = getCombinedData