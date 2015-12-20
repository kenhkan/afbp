// Strip off a number of levels of substream brackets it encounters. This is
// useful when substreams need to be flatten by an arbitrary degree.

// How many levels of substreams do we want to flatten by? We strip off the
// first level only by default.
var flattenBy = 1;
// Levels so far
var level = 0;

function main(pinName, pinIndex, ip) {
  switch (pinName) {
  case "flattenBy":
    flattenBy = value;
    break;

  case "in":
    switch (ip) {
    case fbpOpenBracket:
      level++;
      if (level <= flattenBy) {
        return;
      }
      break;

    case fbpCloseBracket:
      // Send flush signal if we reach back the limit.
      if (level === flattenBy) {
        fbpSend(fbpCurrentPartId(), "flushed", pinIndex, new fbpPacket("data", null));
      }

      level--;
      if (level < flattenBy) {
        return;
      }
      break;
    }

    fbpSend(fbpCurrentPartId(), "out", pinIndex, ip);
  }
}
