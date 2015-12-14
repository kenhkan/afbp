// Print to IPs to screen, including the pin index on which they are received.

function main(pinName, pinIndex, value) {
  switch (pinName) {
  case "in":
    switch (value) {
    case fbpOpenBracket:
      console.log("[" + pinIndex + "] Open Bracket");
      break;

    case fbpCloseBracket:
      console.log("[" + pinIndex + "] Close Bracket");
      break;

    default:
      console.log("[" + pinIndex + "] Data: ", value);
    }
  }
}
