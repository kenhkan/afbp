var collate = fbpNew("collate_single");
var flatten = fbpNew("strip_substream");
var sync = fbpNew("sync_substreams");

fbpIn("in", flatten, "in");
fbpIn("collateBy", collate, "collateBy");
fbpPipe(flatten, "out", collate, "in");
fbpPipe(flatten, "flushed", collate, "flush");
fbpOut(collate, "out", "out");
