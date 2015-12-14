// Collate a single stream.

var i, l;

// The offsets to collate by. e.g. `[0, 1, 2, 5, 6]` to test the first three
// characters and the fourth and fifth.
var collateBy = [];
// The current key. If the last matching input is "ABC", we're matching the
// first two characters, and we're trying to match the second character,
// `matchKey` would then be `[A, B]`.
var matchKey = [];

// Queues for incoming messages, indexed by the pin index. Each array element
// is a queue for the corresponding pin.
var queues = new Array(fbpPinCount("in"));
for (i = 0, l = fbpPinCount("in"); i < l; i++) {
  queues[i] = [];
}

// TODO: value -> ip
function main(pinName, pinIndex, value) {
  switch (pinName) {
  case "collateBy":
    // TODO: If `value` is an array, it means we should collate "inward". e.g.
    // `["person", "name", "first"]` would collate by the "first" attribute of
    // the "name" property of the "person" property of the incoming IPs.
    collateBy.push(value);
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

function flushQueues() {
  var queue, value, isMatching;
  // How many matches do we need to collate by?
  var collateByCount = collateBy.length;
  // Active = queue with stuff in it
  var activeQueueCount = fbpPinCount("in");
  // Which queue are we dealing with?
  var queueIndex = 0;
  var queueCount = queues.length;

  while (activeQueueCount > 0) {
    // Looping back
    if (queueIndex === queueCount) {
      queueIndex = 0;
      // Backtrace because we've gone through a cycle.
      matchKey.pop();
      // Also need to send a close bracket to correspond with the open bracket.
      fbpSend(fbpCurrentPartId, "out", 0, fbpCloseBracket);
    }

    queue = queues[queueIndex];

    // Use the next queue if this queue is empty.
    if (queue.length === 0) {
      queueIndex++;
      continue;
    }

    // Match as many IPs as possible.
    while (1) {
      // Match the next value in queue with the collation match key.
      value = queue.shift();

      // End of queue or no match
      if (value === undefined || !matchForCollationKey(value)) {
        // Put the unmatched back and stop.
        queue.unshift(value);
        break;

      // We have a match otherwise!
      } else {
        fbpSend(fbpCurrentPartId, "out", 0, new fbpPacket("data", value));
      }
    }

    // Next queue please
    queueIndex++;

    // Deactivate empty queues.
    if (queue.length === 0) {
      activeQueueCount--;
    }
  }
}

// Given a value to match, this tries to match as many characters as possible
// given the existing match key.
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
    fbpSend(fbpCurrentPartId, "out", 0, fbpOpenBracket);
    matchKey.push(value[collateBy[i]]);
  }

  // If we have matched all the characters that `collateBy` specifies, it's a
  // complete match. Return true.
  return true;
}
