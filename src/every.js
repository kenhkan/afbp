// Forward only every nth IP.

var count = 0;
var limit = 1;

function main(pinName, pinIndex, ip) {
  switch (pinName) {
  case "limit":
    limit = ip.value;
    break;

  case "in":
    count++;

    if (count >= limit) {
      count = 0;
      fbpSend(fbpCurrentPartId(), "out", 0, ip);
    }
  }
}
