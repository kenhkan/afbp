// An example on how to use collate

// Number of characters to collate by
var nChar = 2;

var collate = fbpNew("collate");
var output = fbpNew("log");

var a = [
  fbpOpenBracket,
  new fbpPacket("data", "111 A"),
  new fbpPacket("data", "112 A"),
  new fbpPacket("data", "112 A"),
  new fbpPacket("data", "112 A"),
  new fbpPacket("data", "200 A"),
  new fbpPacket("data", "201 A"),
  new fbpPacket("data", "201 A"),
  new fbpPacket("data", "210 A"),
  fbpCloseBracket
];
var b = [
  fbpOpenBracket,
  new fbpPacket("data", "011 B"),
  new fbpPacket("data", "100 B"),
  new fbpPacket("data", "200 B"),
  new fbpPacket("data", "200 B"),
  new fbpPacket("data", "210 B"),
  new fbpPacket("data", "220 B"),
  fbpCloseBracket
];
var c = [
  fbpOpenBracket,
  new fbpPacket("data", "100 C"),
  new fbpPacket("data", "200 C"),
  new fbpPacket("data", "200 C"),
  new fbpPacket("data", "204 C"),
  fbpCloseBracket
];

var i, l;

fbpPipe(collate, "out", 0, output, "in", 0);

// Prepare input Pins for sending initial IPs.
fbpPipe(-1, "", -1, collate, "in", 0);
fbpPipe(-1, "", -1, collate, "in", 1);
fbpPipe(-1, "", -1, collate, "in", 2);

// Collate by the first n characters.
for (i = 0, l = nChar; i < l; i++) {
  fbpSend(collate, "collateBy", 0, new fbpPacket("data", i));
}

// Send all three substreams in.
for (i = 0, l = a.length; i < l; i++) {
  fbpSend(collate, "in", 0, a[i]);
}
for (i = 0, l = b.length; i < l; i++) {
  fbpSend(collate, "in", 1, b[i]);
}
for (i = 0, l = c.length; i < l; i++) {
  fbpSend(collate, "in", 2, c[i]);
}
