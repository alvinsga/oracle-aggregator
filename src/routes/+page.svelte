<script lang="ts">
	import { onDestroy, onMount } from 'svelte';
	import '../app.css';
	import { PriceServiceConnection } from '@pythnetwork/price-service-client';
	import * as Select from '$lib/components/ui/select';

	interface price {
		price: number;
		timestamp: number;
		feed: feed;
	}

	enum feed {
		'pyth',
		'custom'
	}

	$: displayedItems = priceArray.slice(0, 10);
	$: TVAP = priceArray.reduce((prev, curr) => prev + curr.price, 0) / priceArray.length;

	const connection = new PriceServiceConnection('https://hermes.pyth.network');
	const priceIds = ['0xef0d8b6fda2ceba41da15d4095d1da392a0d2f8ed0c6c7bc0f4cfac8c280b56d'];
	const TVAPperiod = 60 * 1000; // 60 seconds * 1000 milliseconds

	let priceArray: Array<price> = [];
	let intervalId: number;

	async function startPythfeed() {
		const priceFeeds = await connection.getLatestPriceFeeds(priceIds);
		connection.subscribePriceFeedUpdates(priceIds, (priceFeed) => {
			const price = Number(priceFeed.getPriceNoOlderThan(60)?.price) / 100000000;
			addToPriceArray(price, feed.pyth);
		});
	}

	function addToPriceArray(price: number, feed: feed) {
		const timestamp = Date.now();
		priceArray = [{ price, timestamp, feed }, ...priceArray];
		removeOldPrices();
	}

	function removeOldPrices() {
		const currentTime = Date.now();
		const dataRetentionPeriod = currentTime - TVAPperiod;
		priceArray = priceArray.filter((entry) => entry.timestamp > dataRetentionPeriod);
	}

	async function startDIAfeed() {
		try {
			const response = await fetch(
				'https://api.diadata.org/v1/assetQuotation/Solana/0x0000000000000000000000000000000000000000'
			);
			const result = await response.json();
			addToPriceArray(result.Price, feed.custom);
		} catch (error) {
			console.error('Error fetching data:', error);
		}
	}

	async function stopPythFeed() {
		connection.closeWebSocket();
	}

	onMount(() => {
		// startDIAfeed();
		// startPythfeed();
		// intervalId = setInterval(startDIAfeed, 50000) as unknown as number;
	});

	// Clean up the interval when the component is destroyed
	onDestroy(() => {
		clearInterval(intervalId);
	});
</script>

<div class="max-w-5xl mt-8 mx-auto">
	<h1 class="text-lg mb-12 tracking-wide font-semibold">ORCA</h1>
	<Select.Root>
		<Select.Trigger class="w-[180px]">
			<Select.Item value="sol">SOL/USD</Select.Item>
		</Select.Trigger>
		<Select.Content>
			<Select.Item value="sol">SOL/USD</Select.Item>
		</Select.Content>
	</Select.Root>
	<div class="text-[156px] mt-24 text-center font-semibold">{TVAP.toFixed(2)}</div>
	<div
		class="bg-gradient-to-b from-gray-900 to-gray-100 bg-clip-text text-transparent align-center flex-col"
	>
		{#each displayedItems as priceItem, index}
			<div
				class="max-w-lg mx-auto font-semibold flex justify-center items-center"
				style="font-size: {2 - index * 0.1}rem;margin-top: {2 - index * 0.1}rem;margin-bottom: {2 -
					index * 0.1}rem;"
			>
				{priceItem.price.toFixed(6)}
			</div>
		{/each}
	</div>
	<button on:click={startPythfeed}>Start</button>
	<button on:click={stopPythFeed}>Stop</button>
</div>
