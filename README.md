# rate-limit-promise-pool

This project is meant to help rate limit a group of promises. It has a concurrentLimit which limits the number of promises running at the same time, and a minWaitMs which ensures that at least that much time passes between promise execution.

## Example usage:

```js
// Initialize a pool object with a concurrent limit of 10 and 50 milliseconds minimum between each call.
const pool = new RateLimitPromisePool(10, 50, () => {
  console.log('All jobs complete');
});

// Add 50 promises to the pool, each of which will last between 750 and 1250 milliseconds.
for (let i=0; i<50; i++) {
  pool.addItem({index: i}, async (data) => {
    return new Promise((res, rej) => {
      setTimeout( i % 5 === 0 ? rej : res, 750 + (500 * Math.random()) );
    })
    .then(() => {console.log(data.index + ' success')})
    .catch(() => {console.log(data.index + ' failure')});
  });
  // Add some checkpoints that will get called once all previous items have resolved their promises.
  if (i % 7 === 0) {
    pool.addCheckpoint(i, (data) => {
      console.log(`first ${data} definitely completed`);
    });
  }
}

// Start execution
pool.startExecution();
```