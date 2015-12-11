var collate = fbpNew("collate");
var output = fbpNew("log");

var a = [
  fbpOpenBracket(),
  "111 A",
  "112 A",
  "112 A",
  "112 A",
  "200 A",
  "201 A",
  "201 A",
  "210 A",
  fbpCloseBracket()
];
var b = [
  fbpOpenBracket(),
  "111 B",
  "111 B",
  "200 B",
  "200 B",
  "210 B",
  "220 B",
  fbpCloseBracket()
];
var c = [
  fbpOpenBracket(),
  "000 C",
  "200 C",
  "200 C",
  "204 C",
  fbpCloseBracket()
];

fbpInit(collate, "collateBy", 0, [0, 1, 2]);
fbpInit(collate, "in", 0, a);
fbpInit(collate, "in", 1, b);
fbpInit(collate, "in", 2, c);
fbpPipe(collate, "out", output, "in");
