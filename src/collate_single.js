// Collate a single stream.

// The offsets to collate by. e.g. `[0, 1, 2, 5, 6]` to test the first three
// characters and the fourth and fifth.
var collateBy = [];
// The current key. If the last matching input is "ABC", we're matching the
// first two characters, and we're trying to match the second character,
// `matchKey` would then be `[A, B]`.
var matchKey = [];
// Queues for incoming messages, indexed by the pin index. Each array element
// is a queue for the corresponding pin.
var queues = []
// We need to keep the indices of empty queues because we may go over them
// multiple times, so keeping a count doesn't work.
var emptyQueues = [];

// TODO: value -> ip
function main(pinName, pinIndex, value) {
  // Initialize if not already done so.
  fbpSetUnlessDefined(queues, pinIndex, []);

  switch (pinName) {
  case "collateBy":
    // TODO: If `value` is an array, it means we should collate "inward". e.g.
    // `["person", "name", "first"]` would collate by the "first" attribute of
    // the "name" property of the "person" property of the incoming IPs.
    collateBy.push(value.value);
    break;

  case "flush":
    flushQueues();
    break;

  case "in":
    // We need to queue up inputs because it could be the case that all IPs
    // from the first pin are lexigraphically smaller than those from other
    // pins and/or arrive before others.
    queues[pinIndex].push(value);
    break;
  }
}

// Go through all the queues and find the index of the queue whose next item is
// the "smallest" value that satisfies the current match key.
//
// For instance, assume these three queues:
//
// A. ["3824", "4023", "5839"]
// B. ["3235"]
// C. ["3822", "3852"]
//
// And the current match key is ["3", "8"]. The algorithm is as follows:
//
// 1. Only consider the immediately next items, so A: 3824, B: 3235, C: 3822.
// 2. Go through them in order, from A to C.
// 3. See if it satisfies the match key. For A and C, it does.
// 4. For each offset (in this case, for each radix), find the smallest value.
//    At offset 2, A and C are both 2, so proceed to the next offset.
// 5. Return the index of the queue containing smallest item. At offset 3, C is
//    2 and is smaller than A at offset 3, which is 4.
//
// The index is needed because it is used to "jump" to a particular queue for
// a new round of collation. We do not want to start matching A in this case
// given that C has the smaller value.
function findNextQueueIndex() {
  var i, l, j, m, ip, value, smallest, smallestIndices, radix;
  var smallest = null;
  var values = [];

  // Get the first value of each queue.
  for (i = 0, l = queues.length; i < l; i++) {
    ip = queues[i][0];

    // Use null if we're at the end of the queue.
    if (ip === void 0) {
      emptyQueues[i] = true;
      values.push(null);
      continue;
    }

    value = ip.value;

    // Only allow those that satisfy the match key.
    for (j = 0, m = matchKey.length; j < m; j++) {
      if (value[collateBy[j]] !== matchKey[j]) {
        value = null;
        break;
      }
    }

    values.push(value);
  }

  // For the remaining radices (i.e. starting with the end of match key and
  // ending with the full collation key), eliminate the larger values.
  for (i = matchKey.length, l = collateBy.length; i < l; i++) {
    radix = collateBy[i];
    // For each radix, reset the smallest value and the indices of the queues
    // with the smallest values.
    smallest = Infinity;
    smallestIndices = [];

    // First loop: find the smallest value.
    for (j = 0, m = values.length; j < m; j++) {
      // Ignore those that have already been eliminated.
      if (values[j] === null) {
        continue;
      }

      // Register if it's the smallest.
      if (values[j][radix] <= smallest) {
        smallest = values[j][radix];
      }
    }

    // Second loop: eliminate all values that are bigger than the smallest
    // value.
    for (j = 0, m = values.length; j < m; j++) {
      if (values[j] === null) {
        continue;
      }

      if (values[j][radix] > smallest) {
        values[j] = null;
      } else {
        // Register the smallest ones' indices.
        smallestIndices.push(j);
      }
    }

    // Stop when we hit only one index.
    if (smallestIndices.length === 1) {
      return smallestIndices[0];
    }
  }

  // We either have more than one smallest values, which we just return the
  // first qualified one.
  if (smallestIndices.length > 0) {
    return smallestIndices[0];

  // OR, we have no match at all. This happens when there has been matches
  // before this function is called but the match key is no longer applicable.
  } else {
    return -1;
  }
}

function countDefined(array) {
  var i, l;
  var n = 0;

  for (i = 0, l = array.length; i < l; i++) {
    if (array[i] !== void 0) {
      n++;
    }
  }

  return n;
}

function flushQueues() {
  var i, l, queue, value, isMatching, queueIndex_;
  // Determine the initial queue to run.
  var queueIndex = findNextQueueIndex();

  // Start anew.
  emptyQueues = [];

  // We go on until we've exhausted all queues.
  while (countDefined(emptyQueues) < queues.length) {
    // We end an iteration when we hit all the queues once.
    if (queueIndex === queues.length) {
      // Backtrace because we've gone through a cycle.
      matchKey.pop();
      // Also need to send a close bracket to correspond with the open bracket.
      fbpSend(fbpCurrentPartId(), "out", 0, fbpCloseBracket);

      // Each time we finish with a series of matches, we need to look ahead
      // for the next match key.
      queueIndex_ = findNextQueueIndex();
      // BUT, sometimes the match key could not match any of the queue, in
      // which case, we just need to "pop" one more of match key until we could
      // match.
      if (queueIndex_ < 0) {
        continue;
      } else {
        queueIndex = queueIndex_;
      }
    }

    queue = queues[queueIndex];

    // Use the next queue if this queue is empty.
    if (queue.length === 0) {
      emptyQueues[queueIndex] = true;
      queueIndex++;
      continue;
    }

    // Match as many IPs as possible.
    while ((value = queue.shift()) !== void 0) {
      // We have a complete match, send the IP out!
      if (matchForCollationKey(value.value)) {
        fbpSend(fbpCurrentPartId(), "out", 0, value);

      // No match. We needed to look ahead, so put the item back and stop.
      } else {
        queue.unshift(value);
        break;
      }
    }

    // Next queue please
    queueIndex++;
  }

  // Close out everything.
  for (i = 0, l = matchKey.length; i < l; i++) {
    matchKey.pop();
    fbpSend(fbpCurrentPartId(), "out", 0, fbpCloseBracket);
  }
}

// Given a value to match, this tries to match as many characters as possible
// given the existing match key.
//
// For instance, if the value is "1824" and the match key is `["1", "8"]`, then
// the match key will become `["1", "8", "2", "4"]`. If the match key is
// `["0"]`, then this would return `false`.
function matchForCollationKey(value) {
  var i, l;

  // As soon as there is not a match, return false.
  for (i = 0, l = matchKey.length; i < l; i++) {
    // Note that we need to get the specific index from `collateBy`.
    if (value[collateBy[i]] !== matchKey[i]) {
      return false;
    }
  }

  // The value matches the entire match key and there are remaining characters.
  // For each unmatched character, open a bracket IP and add to the match key.
  for (i = matchKey.length, l = collateBy.length; i < l; i++) {
    fbpSend(fbpCurrentPartId(), "out", 0, fbpOpenBracket);
    matchKey.push(value[collateBy[i]]);
  }

  // If we have matched all the characters that `collateBy` specifies, it's a
  // complete match. Return true.
  return true;
}
