// Schematic below would be a product expanded from compilation. A Schematic
// source would most likely be encoded in a more abstract technology like an
// ontological framework and compiled down to a target, e.g. JavaScript.

var collate = fbpNew("collate_single");

fbpPipe(fbpCurrentPartId(), "collateBy", 0, collate, "collateBy", 0);
fbpPipe(collate, "out", 0, fbpCurrentPartId(), "out", 0);


var every = fbpNew("every");

fbpPipe(-1, "", -1, every, "limit", 0);
fbpPipe(every, "out", 0, collate, "flush", 0);

// We want to wait for all three streams to arrive.
fbpSend(every, "limit", 0, new fbpPacket("data", 3));


var flattenA = fbpNew("strip_substream");
var syncA = fbpNew("sync_substreams");

fbpPipe(fbpCurrentPartId(), "in", 0, flattenA, "in", 0);
fbpPipe(flattenA, "out", 0, collate, "in", 0);
fbpPipe(flattenA, "flushed", 0, every, "in", 0);


var flattenB = fbpNew("strip_substream");
var syncB = fbpNew("sync_substreams");

fbpPipe(fbpCurrentPartId(), "in", 1, flattenB, "in", 0);
fbpPipe(flattenB, "out", 0, collate, "in", 1);
fbpPipe(flattenB, "flushed", 0, every, "in", 0);


var flattenC = fbpNew("strip_substream");
var syncC = fbpNew("sync_substreams");

fbpPipe(fbpCurrentPartId(), "in", 2, flattenC, "in", 0);
fbpPipe(flattenC, "out", 0, collate, "in", 2);
fbpPipe(flattenC, "flushed", 0, every, "in", 0);
