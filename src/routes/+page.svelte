<script lang="ts">
	import { onDestroy, onMount } from 'svelte';
	import '../app.css';
	import { PriceServiceConnection } from '@pythnetwork/price-service-client';
	import * as Select from '$lib/components/ui/select';
	import * as Sheet from '$lib/components/ui/sheet';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { ScrollArea } from '$lib/components/ui/scroll-area/index.js';
	import * as Card from '$lib/components/ui/card';
	import { Label } from '$lib/components/ui/label';

	interface price {
		price: number;
		timestamp: number;
		feed: feed;
	}

	interface customDataFeed {
		URL: string;
		name: string;
		priceArribute: string;
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

	let addDataFeedEnabled = false;
	let priceArray: Array<price> = [];
	let intervalId: number;
	let selectedAttribute = { value: '', label: '' };
	let keyDropdownArray: Array<string> = [];
	let nameCustomDataFeed = '';
	let APIUrl =
		'https://api.diadata.org/v1/assetQuotation/Solana/0x0000000000000000000000000000000000000000';
	let jsonData = '';
	let customDataFeedArray: Array<customDataFeed> = [
		{
			URL: 'https://api.diadata.org/v1/assetQuotation/Solana/0x0000000000000000000000000000000000000000',
			priceArribute: 'Price',
			name: 'DIA'
		}
	];

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

	async function fetchCustomDataFeed() {
		for (const datafeed of customDataFeedArray) {
			try {
				const response = await fetch(datafeed.URL);
				const result = await response.json();
				addToPriceArray(result[datafeed.priceArribute], feed.custom);
			} catch (error) {
				console.error('Error fetching data:', error);
			}
		}
	}

	async function fetchAPIFeed() {
		try {
			const response = await fetch(APIUrl);
			const result = await response.json();
			jsonData = result;
			keyDropdownArray = Object.keys(result).map((key) => key);
		} catch (error) {
			console.error('Error fetching data:', error);
		}
	}

	async function saveCustomDataFeed() {
		customDataFeedArray = [
			...customDataFeedArray,
			{ URL: APIUrl, name: nameCustomDataFeed, priceArribute: selectedAttribute.label }
		];
		console.log(customDataFeedArray);
		addDataFeedEnabled = false;
	}

	async function stopPythFeed() {
		connection.closeWebSocket();
	}

	function setSelectedMenuItem(i: any) {
		selectedAttribute.label = i.label;
		selectedAttribute.value = i.value;
	}

	onMount(() => {
		// startDIAfeed();
		// startPythfeed();
		// intervalId = setInterval(fetchCustomDataFeed, 5000) as unknown as number;
	});

	// Clean up the interval when the component is destroyed
	onDestroy(() => {
		clearInterval(intervalId);
	});
</script>

<div class="max-w-5xl p-8 mx-auto">
	<h1 class="text-lg mb-12 tracking-wide font-semibold">ORCA</h1>
	<Select.Root>
		<Select.Trigger class="w-[180px]">
			<Select.Item value="sol">SOL/USD</Select.Item>
		</Select.Trigger>
		<Select.Content>
			<Select.Item value="sol">SOL/USD</Select.Item>
			<Select.Item value="sol">BTC/USD</Select.Item>
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

	<Sheet.Root>
		<Sheet.Trigger asChild let:builder>
			<Button builders={[builder]} variant="outline">Open</Button>
		</Sheet.Trigger>
		<Sheet.Content>
			<Sheet.Header>
				<Sheet.Title>Settings</Sheet.Title>
			</Sheet.Header>
			{#if !addDataFeedEnabled}
				<div class="mt-6">
					<Card.Root>
						<Card.Header>
							<Card.Title>Pyth</Card.Title>
							<Card.Description class="truncate">{priceIds[0]}</Card.Description>
						</Card.Header>
					</Card.Root>
				</div>
				{#each customDataFeedArray as customDataFeed}
					<div class="mt-3 space-y-3">
						<Card.Root>
							<Card.Header>
								<Card.Title>{customDataFeed.name}</Card.Title>
								<Card.Description class="truncate">{customDataFeed.URL}</Card.Description>
							</Card.Header>
						</Card.Root>
					</div>
				{/each}
				<div class="my-3">
					<Button on:click={() => (addDataFeedEnabled = true)}>Add API data feed</Button>
				</div>
			{:else}
				<div class="text-sm font-medium mt-3 mb-1">Name</div>
				<Input bind:value={nameCustomDataFeed} type="text" placeholder="Name" />
				<div class="text-sm font-medium mt-3 mb-1">API URL</div>
				<div class="flex w-full max-w-sm items-center space-x-2">
					<Input bind:value={APIUrl} type="text" placeholder="API URL" />
					<Button on:click={fetchAPIFeed}>Test</Button>
				</div>
				{#if jsonData}
					<ScrollArea class="h-[200px] w-[350px] rounded-md border p-4 mt-5">
						<pre>{JSON.stringify(jsonData, null, 2)}</pre>
					</ScrollArea>
					<div class="mt-5 flex space-x-3">
						<Select.Root onSelectedChange={setSelectedMenuItem}>
							<Select.Trigger class="w-[200px]">
								<Select.Value placeholder="Select Price Attribute" />
							</Select.Trigger>
							<Select.Content>
								{#each keyDropdownArray as item}
									<Select.Item value={item}>{item}</Select.Item>
								{/each}
							</Select.Content>
						</Select.Root>
						<Button on:click={saveCustomDataFeed}>Save</Button>
					</div>
				{/if}
				<Button class="w-full mt-10" on:click={() => (addDataFeedEnabled = false)}>Cancel</Button>
			{/if}
		</Sheet.Content>
	</Sheet.Root>
</div>
