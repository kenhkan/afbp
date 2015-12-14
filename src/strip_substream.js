// Strip off a number of levels of substream brackets it encounters. This is
// useful when substreams need to be flatten by an arbitrary degree.

// How many levels of substreams do we want to flatten by? We strip off the
// first level only by default.
var flattenBy = 1;
// Levels so far
var level = 0;

function main(pinName, pinIndex, value) {
  switch (pinName) {
  case "flattenBy":
    flattenBy = value;
    break;

  case "in":
    switch (value) {
    case fbpOpenBracket:
      level++;
      if (level < flattenBy) {
        return;
      }
      break;

    case fbpCloseBracket:
      level--;
      if (level < flattenBy) {
        return;
      }
      break;
    }

    fbpSend("out", pinIndex, new fbpPacket("data", value));
  }
}
