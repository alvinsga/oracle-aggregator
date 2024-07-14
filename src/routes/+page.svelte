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
	import * as RadioGroup from '$lib/components/ui/radio-group/index.js';

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
	$: displayedPrice = mainPriceDisplay(priceArray);

	let selectedCurrency = { value: 'sol', label: 'SOL/USD' };
	const connection = new PriceServiceConnection('https://hermes.pyth.network');
	let priceIds = ['0xef0d8b6fda2ceba41da15d4095d1da392a0d2f8ed0c6c7bc0f4cfac8c280b56d'];
	let TVAPperiod = 60 * 1000; // 60 seconds * 1000 milliseconds
	const EWMAArray: Array<number> = [];
	let addDataFeedEnabled = false;
	let priceArray: Array<price> = [];
	let intervalId: number;
	let aggregationRadioButton = 'ewma';
	let selectedAttribute = { value: '', label: '' };
	let keyDropdownArray: Array<string> = [];
	let nameCustomDataFeed = '';
	let APIUrl = '';
	let jsonData = '';
	let customDataFeedArray: Array<customDataFeed> = [
		{
			URL: 'https://api.diadata.org/v1/assetQuotation/Solana/0x0000000000000000000000000000000000000000',
			priceArribute: 'Price',
			name: 'DIA'
		}
	];

	async function startDataFeeds() {
		startPythDataFeed();
		startCustomDataFeed();
	}

	async function stopDataFeeds() {
		stopPythFeed();
		stopCustomDataFeed();
	}

	async function startPythDataFeed() {
		const priceFeeds = await connection.getLatestPriceFeeds(priceIds);
		connection.subscribePriceFeedUpdates(priceIds, (priceFeed) => {
			const price = Number(priceFeed.getPriceNoOlderThan(60)?.price) / 100000000;
			addToPriceArray(price, feed.pyth);
		});
	}

	function startCustomDataFeed() {
		intervalId = setInterval(fetchCustomDataFeed, 5000) as unknown as number;
	}

	function stopPythFeed() {
		connection.closeWebSocket();
	}

	function stopCustomDataFeed() {
		clearInterval(intervalId);
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

	function mainPriceDisplay(priceArray: Array<price>) {
		if (priceArray.length === 0) {
			return 0;
		} else if (aggregationRadioButton === 'ewma') {
			return calculateEWMA(priceArray) ?? 0;
		} else {
			return priceArray.reduce((prev, curr) => prev + curr.price, 0) / priceArray.length;
		}
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

	function setSelectedMenuItem(i: any) {
		selectedAttribute.label = i.label;
		selectedAttribute.value = i.value;
	}

	function handleRadioButtonChange(value: string) {
		switch (value) {
			case 'twap30':
				aggregationRadioButton = 'twap30';
				TVAPperiod = 30 * 1000;
				break;
			case 'twap60':
				aggregationRadioButton = 'twap60';
				TVAPperiod = 60 * 1000;
				break;
			case 'twap300':
				aggregationRadioButton = 'twap300';
				TVAPperiod = 300 * 1000;
				break;
			default:
				aggregationRadioButton = 'ewma';
				break;
		}
		console.log(TVAPperiod);
	}

	function calculateEWMA(arrayOfPrices: Array<price>) {
		const reversedArray = arrayOfPrices.reverse();
		if (arrayOfPrices.length === 0) return;
		if (arrayOfPrices.length === 1) {
			EWMAArray.push(arrayOfPrices[0].price);
			return;
		}
		const alpha = 0.5;
		const mostRecentPrice = arrayOfPrices[0].price;
		const previousEWMA = EWMAArray[EWMAArray.length - 1];
		const newEWMA = alpha * mostRecentPrice + (1 - alpha) * previousEWMA;
		EWMAArray.push(newEWMA);
		return EWMAArray[EWMAArray.length - 1];
	}

	function currencyDropdownChange(value: any) {
		stopDataFeeds();
		if (value.value === 'sol') {
			priceIds = ['0xef0d8b6fda2ceba41da15d4095d1da392a0d2f8ed0c6c7bc0f4cfac8c280b56d'];
			customDataFeedArray = [
				{
					URL: 'https://api.diadata.org/v1/assetQuotation/Solana/0x0000000000000000000000000000000000000000',
					priceArribute: 'Price',
					name: 'DIA'
				}
			];
			priceArray = [];
		} else if (value.value === 'btc') {
			priceIds = ['0xe62df6c8b4a85fe1a67db44dc12de5db330f7ac66b72dc658afedf0f4a415b43'];
			customDataFeedArray = [
				{
					URL: 'https://api.diadata.org/v1/assetQuotation/Bitcoin/0x0000000000000000000000000000000000000000',
					priceArribute: 'Price',
					name: 'DIA'
				}
			];
			priceArray = [];
		}
		startDataFeeds();
	}

	onMount(() => {
		// startDataFeeds()
	});

	// Clean up the interval when the component is destroyed
	onDestroy(() => {
		clearInterval(intervalId);
	});
</script>

<svelte:head>
	<title>{`$${displayedPrice.toFixed(2)} - ${selectedCurrency.label}`}</title>
</svelte:head>
<div class="max-w-5xl p-8 mx-auto">
	<button on:click={startDataFeeds}>Start</button>
	<button on:click={stopDataFeeds}>Stop</button>
	<div class="flex align-middle justify-between">
		<h1 class="text-lg mb-12 tracking-wide font-semibold">ORCA</h1>
		<Sheet.Root>
			<Sheet.Trigger asChild let:builder>
				<Button builders={[builder]} variant="outline">Settings</Button>
			</Sheet.Trigger>
			<Sheet.Content>
				<Sheet.Header>
					<Sheet.Title>Settings</Sheet.Title>
				</Sheet.Header>
				<Sheet.Header class="mt-12">
					<Sheet.Title>Data Feeds</Sheet.Title>
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
					<Sheet.Header class="mt-12">
						<Sheet.Title>Aggregation Methodology</Sheet.Title>
					</Sheet.Header>
					<RadioGroup.Root
						value={aggregationRadioButton}
						class="mt-3"
						onValueChange={handleRadioButtonChange}
					>
						<div class="flex items-center space-x-2">
							<RadioGroup.Item value="ewma" id="r1" />
							<Label for="r1">EMA</Label>
						</div>
						<div class="flex items-center space-x-2">
							<RadioGroup.Item value="twap30" id="r2" />
							<Label for="r2">TWAP (30 Seconds)</Label>
						</div>
						<div class="flex items-center space-x-2">
							<RadioGroup.Item value="twap60" id="r3" />
							<Label for="r3">TWAP (60 seconds)</Label>
						</div>
						<div class="flex items-center space-x-2">
							<RadioGroup.Item value="twap300" id="r3" />
							<Label for="r3">TWAP (5 minutes)</Label>
						</div>
						<RadioGroup.Input name="spacing" />
					</RadioGroup.Root>
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
	<div class="flex justify-center">
		<Select.Root onSelectedChange={currencyDropdownChange} selected={selectedCurrency}>
			<Select.Trigger class="w-[180px]">
				<Select.Value />
			</Select.Trigger>
			<Select.Content>
				<Select.Item value="sol">SOL/USD</Select.Item>
				<Select.Item value="btc">BTC/USD</Select.Item>
			</Select.Content>
		</Select.Root>
	</div>

	<div class="text-[128px] mt-6 text-center font-semibold">${displayedPrice.toFixed(2)}</div>
	<div
		class="bg-gradient-to-b from-gray-900 to-gray-100 bg-clip-text text-transparent align-center flex-col"
	>
		{#each displayedItems as priceItem, index}
			<div
				class="max-w-lg mx-auto font-semibold flex justify-center items-center"
				style="font-size: {3 - index * 0.2}rem;margin-top: {2 - index * 0.1}rem;margin-bottom: {2 -
					index * 0.1}rem;"
			>
				{priceItem.price.toFixed(4)}
			</div>
		{/each}
	</div>
</div>
