# ORCA - simple oracle aggregator

This oracle aggregator aggregates prices for SOL/USD and BTC/USD from two oracles by default ([Pyth](https://pyth.network/) and [DIA](https://www.diadata.org/)). Additional open API based oracles can be added through the interface.

For Pyth, the app subscribes to real-time price updates through a WebSocket connection and typically receives a price update every c.400ms. For DIA and other custom oracles, the app poll the API provided every 3 seconds.

## Adding a new data feed

You can add any number of API feeds to the oracle to aggregate prices using your desired price aggregation methodology. Each custom data feed is polled every 3 seconds.

1. Click the settings button in the top right corner.
2. Click add API data feed button.
3. Populate the name of the data feed and the API URL. Note: currently this only supports open APIs and not APIs which require API keys.
4. Click the 'Test' button. This will make a call to the API and return a response.
5. You will now have the option to select the appropriate attribute from the API response which contains the price data you would like to aggregate.
6. Click save and you should now see your new data feed in the list of data feeds.

## Aggregation Methodology

The application provides two ways of aggregating the price data.

### EWMA (Exponentially Weighted Moving Average):

A type of moving average that assigns exponentially decreasing weights to older data points. This gives more importance to recent observations, making the average more responsive to changes.

This option is selected by default and we utilise a smoothing factor (alpha) of 0.5. This means that the calculation gives equal weight to the most recent price and the previous EWMA value. This creates a balance between responsiveness to new data and the stability of the trend.

### TWAP (Time Weighted Average Price):

This option calculates an average price over a given time period. You have an option of a period between 30 seconds, 60 seconds or 5 minutes. The longer the time period, the greater the smoothing effect.

## Exporting price data

Click the export button in the top right corner to export a CSV file of prices. The CSV file will contain 3 columns: price, timestamp and feed source.

## Changing display precision

The app allows you to change the number of decimal places being displayed on the frontend for both the aggregated price and the historical prices. By default the precision is set to 2 d.p. for the aggregated price and 4 d.p. for historical prices.
