<script>
	import { PriceServiceConnection } from '@pythnetwork/price-service-client';

	const connection = new PriceServiceConnection('https://hermes.pyth.network');
	const priceIds = ['0xef0d8b6fda2ceba41da15d4095d1da392a0d2f8ed0c6c7bc0f4cfac8c280b56d'];
	let price = [''];
	async function getPrice() {
		const priceFeeds = await connection.getLatestPriceFeeds(priceIds);
		connection.subscribePriceFeedUpdates(priceIds, (priceFeed) => {
			// priceFeed here is the same as returned by getLatestPriceFeeds above.
			price = [
				...price,
				(Number(priceFeed.getPriceNoOlderThan(60)?.price) / 100000000).toFixed(2) ?? ''
			];
		});
	}

	async function stopPrice() {
		connection.closeWebSocket();
	}
</script>

<h1>Oracle Aggregator</h1>
<button on:click={getPrice}>Start</button>
<button on:click={stopPrice}>Stop</button>
{#each price as p}
	<div>{p}</div>
{/each}
