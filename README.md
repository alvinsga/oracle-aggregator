# ORCA - simple oracle aggregator

This oracle aggregator includes two data feeds by default (Pyth and DIA) but additional data feeds can be added through open APIs.

## Adding a new data feed

You can add any number of API feeds to the oracle to aggregate using your desired price aggregation methodology. Each custom data feed is polled every 3 seconds.

1. Click the settings button in the top right corner.
2. Click add API data feed.
3. Populate the name of the data feed and the API URL. Note: currently this only supports open APIs and not APIs which require API keys.
4. Click the 'Test' button. This will make a call to the API and return a response.
5. You will now have the option to select the appropriate attribute from the API response which contains the price data.
6. Click save and you should now see your new data feed in the list of data feeds.

## Aggregation Methodology

The application provides two ways of aggregating the price data.

### EWMA (Exponentially Weighted Moving Average):

A type of moving average that assigns exponentially decreasing weights to older data points. This gives more importance to recent observations, making the average more responsive to changes.

### TWAP (Time Weighted Average Price):

Calculates an average price over a given time period. You have an option a period between 30 seconds, 60 seconds or 5 minutes. The longer the time period, the greater the smoothening effect.

## Exporting price data

Click the export button in the top right corner to export a CSV file of prices. The CSV file will contain 3 columns: price, timestamp and feed source.

## Changing display precision

This allows you to change the number of decimal places being displayed on the frontend for both the aggregated price and the historical prices. By default the precision is set to 2 d.p. for the aggregated price annd 4 d.p. for the historical price.
