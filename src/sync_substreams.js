// Queue up streams on different input pins and flush them at once, as soon as
// there is at least one substream on each input pin.

var queues = [];
// We need to keep track of the number of substream levels there is because we
// only want to queue up the first level.
var levels = [];

function main(pinName, pinIndex, value) {
  // Initialize if not already done so.
  fbpSetUnlessDefined(queues, pinIndex, []);
  fbpSetUnlessDefined(levels, pinIndex, 0);

  switch (pinName) {
  case "in":
    switch (value) {
    case fbpOpenBracket:
      levels[pinIndex]++;
      // A new spot for a new substream
      queues[pinIndex].push([]);
      break;

    case fbpCloseBracket:
      levels[pinIndex]--;
      if (levels[pinIndex] < 1) {
        flush();
      }
      break;

    default:
      var streamCount = queues[pinIndex].length;
      // We only handle substreams.
      if (streamCount > 0) {
        queues[pinIndex][streamCount - 1].push(value);
      }
    }
  }
}

function flush() {
  var i, l, j, m, queue;

  for (i = 0, l = fbpPinCount("in"); i < l; i++) {
    // All pins must have received at least one substream.
    if (queues[i].length === 0) {
      return;
    }
  }

  // Loop through it again to avoid having to backtrace when there is at least
  // one pin without substreams.
  for (i = 0, l = fbpPinCount("in"); i < l; i++) {
    queue = queues[i].pop();

    for (j = 0, m = queue.length; j < m; j++) {
      // Send queue IP one-by-one to the corresponding pin index.
      fbpSend(fbpCurrentPartId, "in", i, fbpPacket("data", queue[j]));
    }
  }

  // Send an IP to signal that a substream has been released.
  fbpSend(fbpCurrentPartId, "flushed", 0, fbpPacket("data", null));
}
