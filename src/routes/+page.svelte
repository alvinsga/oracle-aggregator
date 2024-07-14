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
	import * as Tooltip from '$lib/components/ui/tooltip';
	import { flyAndScale } from '$lib/utils';

	interface price {
		price: number;
		timestamp: number;
		feed: string;
	}

	interface customDataFeed {
		URL: string;
		name: string;
		priceArribute: string;
	}

	$: displayedItems = priceArray.slice(0, 10);
	$: displayedPrice = mainPriceDisplay(priceArray);
	$: datapointCount = countDatapoints(priceArray);

	let paused = true;
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
		paused = false;
		startPythDataFeed();
		startCustomDataFeed();
	}

	async function stopDataFeeds() {
		paused = true;
		stopPythFeed();
		stopCustomDataFeed();
	}

	async function startPythDataFeed() {
		const priceFeeds = await connection.getLatestPriceFeeds(priceIds);
		connection.subscribePriceFeedUpdates(priceIds, (priceFeed) => {
			const price = Number(priceFeed.getPriceNoOlderThan(60)?.price) / 100000000;
			addToPriceArray(price, 'pyth');
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

	function addToPriceArray(price: number, feed: string) {
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
				addToPriceArray(result[datafeed.priceArribute], datafeed.name);
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
	}

	function calculateEWMA(arrayOfPrices: Array<price>) {
		const reversedArray = arrayOfPrices.reverse();
		if (arrayOfPrices.length === 0) return;
		if (arrayOfPrices.length === 1) {
			EWMAArray.push(arrayOfPrices[0].price);
			return arrayOfPrices[0].price;
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

	function countDatapoints(arr: Array<price>): Record<string, number> {
		const datapointCountRecord: Record<string, number> = {};
		arr.forEach((item) => {
			if (datapointCountRecord[item.feed]) {
				datapointCountRecord[item.feed]++;
			} else {
				datapointCountRecord[item.feed] = 1;
			}
		});
		return datapointCountRecord;
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
	<div class="flex align-middle justify-between">
		<h1 class="text-lg mb-12 tracking-wide font-semibold">ORCA</h1>
		<div>
			{#if paused}
				<Button variant="outline" size="icon" on:click={startDataFeeds}>
					<svg
						xmlns="http://www.w3.org/2000/svg"
						fill="none"
						viewBox="0 0 24 24"
						stroke-width="1.5"
						stroke="currentColor"
						class="size-6"
					>
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.347a1.125 1.125 0 0 1 0 1.972l-11.54 6.347a1.125 1.125 0 0 1-1.667-.986V5.653Z"
						/>
					</svg>
				</Button>
			{:else}
				<Button variant="outline" size="icon" on:click={stopDataFeeds}>
					<svg
						xmlns="http://www.w3.org/2000/svg"
						fill="none"
						viewBox="0 0 24 24"
						stroke-width="1.5"
						stroke="currentColor"
						class="size-6"
					>
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							d="M15.75 5.25v13.5m-7.5-13.5v13.5"
						/>
					</svg>
				</Button>
			{/if}

			<Sheet.Root>
				<Sheet.Trigger asChild let:builder>
					<Button builders={[builder]} variant="outline" size="icon">
						<svg
							xmlns="http://www.w3.org/2000/svg"
							fill="none"
							viewBox="0 0 24 24"
							stroke-width="1.5"
							stroke="currentColor"
							class="size-6"
						>
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								d="M10.343 3.94c.09-.542.56-.94 1.11-.94h1.093c.55 0 1.02.398 1.11.94l.149.894c.07.424.384.764.78.93.398.164.855.142 1.205-.108l.737-.527a1.125 1.125 0 0 1 1.45.12l.773.774c.39.389.44 1.002.12 1.45l-.527.737c-.25.35-.272.806-.107 1.204.165.397.505.71.93.78l.893.15c.543.09.94.559.94 1.109v1.094c0 .55-.397 1.02-.94 1.11l-.894.149c-.424.07-.764.383-.929.78-.165.398-.143.854.107 1.204l.527.738c.32.447.269 1.06-.12 1.45l-.774.773a1.125 1.125 0 0 1-1.449.12l-.738-.527c-.35-.25-.806-.272-1.203-.107-.398.165-.71.505-.781.929l-.149.894c-.09.542-.56.94-1.11.94h-1.094c-.55 0-1.019-.398-1.11-.94l-.148-.894c-.071-.424-.384-.764-.781-.93-.398-.164-.854-.142-1.204.108l-.738.527c-.447.32-1.06.269-1.45-.12l-.773-.774a1.125 1.125 0 0 1-.12-1.45l.527-.737c.25-.35.272-.806.108-1.204-.165-.397-.506-.71-.93-.78l-.894-.15c-.542-.09-.94-.56-.94-1.109v-1.094c0-.55.398-1.02.94-1.11l.894-.149c.424-.07.765-.383.93-.78.165-.398.143-.854-.108-1.204l-.526-.738a1.125 1.125 0 0 1 .12-1.45l.773-.773a1.125 1.125 0 0 1 1.45-.12l.737.527c.35.25.807.272 1.204.107.397-.165.71-.505.78-.929l.15-.894Z"
							/>
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z"
							/>
						</svg>
					</Button>
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
									<Card.Title>
										<div class="flex justify-between">
											<div class="flex space-x-2 items-center">
												<svg viewBox="0 0 24 30" class="w-[16px] h-[24px] fill-dark dark:fill-light"
													><path
														d="M14.664 12.299a2.855 2.855 0 0 1-2.854 2.856v2.856a5.71 5.71 0 0 0 5.708-5.712A5.71 5.71 0 0 0 8.956 7.35a5.708 5.708 0 0 0-2.854 4.948v14.28l2.566 2.57.288.287V12.3a2.855 2.855 0 1 1 5.708 0Z"
													></path><path
														d="M11.811.867c-2.08 0-4.029.557-5.708 1.53a11.417 11.417 0 0 0-2.854 2.34 11.386 11.386 0 0 0-2.854 7.555v8.57l2.854 2.855V12.292a8.552 8.552 0 0 1 2.854-6.387 8.545 8.545 0 0 1 5.708-2.182c4.729 0 8.563 3.837 8.563 8.57 0 4.731-3.834 8.568-8.563 8.568v2.856c6.306 0 11.417-5.115 11.417-11.425 0-6.31-5.111-11.425-11.417-11.425Z"
													></path></svg
												>
												<p>Pyth</p>
												<span class="relative flex h-2 w-2">
													<span
														class="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-600 opacity-75"
													></span>
													<span class="relative inline-flex rounded-full h-2 w-2 bg-green-600"
													></span>
												</span>
											</div>
											<div>
												<a target="_blank" href="https://pyth.network/price-feeds">
													<svg
														xmlns="http://www.w3.org/2000/svg"
														fill="none"
														viewBox="0 0 24 24"
														stroke-width="1.5"
														stroke="currentColor"
														class="size-4"
													>
														<path
															stroke-linecap="round"
															stroke-linejoin="round"
															d="M13.5 6H5.25A2.25 2.25 0 0 0 3 8.25v10.5A2.25 2.25 0 0 0 5.25 21h10.5A2.25 2.25 0 0 0 18 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25"
														/>
													</svg>
												</a>
											</div>
										</div>
									</Card.Title>
									<Card.Description class="truncate">
										<div>
											Data points: {datapointCount['pyth'] ?? 0}
										</div>
									</Card.Description>
								</Card.Header>
							</Card.Root>
						</div>
						{#each customDataFeedArray as customDataFeed}
							<div class="mt-3 space-y-3">
								<Card.Root>
									<Card.Header>
										<Card.Title>
											<div class="flex items-center justify-between">
												<div class="flex items-center space-x-2">
													<div>
														<svg
															xmlns="http://www.w3.org/2000/svg"
															fill="none"
															viewBox="0 0 24 24"
															stroke-width="1.5"
															stroke="currentColor"
															class="size-6"
														>
															<path
																stroke-linecap="round"
																stroke-linejoin="round"
																d="m21 7.5-9-5.25L3 7.5m18 0-9 5.25m9-5.25v9l-9 5.25M3 7.5l9 5.25M3 7.5v9l9 5.25m0-9v9"
															/>
														</svg>
													</div>
													<p>{customDataFeed.name}</p>
													<span class="relative flex h-2 w-2">
														<span
															class="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-600 opacity-75"
														></span>
														<span class="relative inline-flex rounded-full h-2 w-2 bg-green-600"
														></span>
													</span>
												</div>
												<div>
													<a target="_blank" href="https://www.diadata.org/app/price/">
														<svg
															xmlns="http://www.w3.org/2000/svg"
															fill="none"
															viewBox="0 0 24 24"
															stroke-width="1.5"
															stroke="currentColor"
															class="size-4"
														>
															<path
																stroke-linecap="round"
																stroke-linejoin="round"
																d="M13.5 6H5.25A2.25 2.25 0 0 0 3 8.25v10.5A2.25 2.25 0 0 0 5.25 21h10.5A2.25 2.25 0 0 0 18 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25"
															/>
														</svg>
													</a>
												</div>
											</div>
										</Card.Title>
										<Card.Description class="truncate">
											<div>
												Data points: {datapointCount[customDataFeed.name] ?? 0}
											</div>
										</Card.Description>
									</Card.Header>
								</Card.Root>
							</div>
						{/each}
						<div class="my-3">
							<Button on:click={() => (addDataFeedEnabled = true)}>Add API data feed</Button>
						</div>
						<Sheet.Header class="mt-12">
							<Sheet.Title>
								<div class="flex items-center space-x-2">
									<div>Aggregation Methodology</div>
									<div>
										<Tooltip.Root openDelay={0}>
											<Tooltip.Trigger
												><svg
													xmlns="http://www.w3.org/2000/svg"
													fill="none"
													viewBox="0 0 24 24"
													stroke-width="1.5"
													stroke="currentColor"
													class="size-5"
												>
													<path
														stroke-linecap="round"
														stroke-linejoin="round"
														d="m11.25 11.25.041-.02a.75.75 0 0 1 1.063.852l-.708 2.836a.75.75 0 0 0 1.063.853l.041-.021M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9-3.75h.008v.008H12V8.25Z"
													/>
												</svg>
											</Tooltip.Trigger>
											<Tooltip.Content
												transition={flyAndScale}
												transitionConfig={{ y: 8, duration: 150 }}
												sideOffset={8}
												side="right"
											>
												<div class="w-72">
													<p class="font-bold">EWMA (Exponentially Weighted Average Price):</p>
													<p class="font-normal">
														A type of moving average that assigns exponentially decreasing weights
														to older data points. This gives more importance to recent observations,
														making the average more responsive to changes.
													</p>
													<p class="font-bold mt-3">TWAP (Time Weighted Average Price):</p>
													<p class="font-normal">
														Calculates an average price over a given time period. You have an option
														a period between 30 seconds, 60 seconds or 5 minutes. The longer the
														time period, the greater the smoothening effect.
													</p>
												</div>
											</Tooltip.Content>
										</Tooltip.Root>
									</div>
								</div>
							</Sheet.Title>
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
						<Button class="w-full mt-10" on:click={() => (addDataFeedEnabled = false)}
							>Cancel</Button
						>
					{/if}
				</Sheet.Content>
			</Sheet.Root>
		</div>
	</div>
	<div class="flex justify-center">
		<Select.Root onSelectedChange={currencyDropdownChange} selected={selectedCurrency}>
			<Select.Trigger class="w-[120px]">
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
