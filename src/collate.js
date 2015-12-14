var collate = fbpNew("collate_single");
var flatten = fbpNew("strip_substream");
var sync = fbpNew("sync_substreams");

fbpPipe(fbpCurrentPartId, "in", 0, flatten, "in", 0);
fbpPipe(fbpCurrentPartId, "collateBy", 0, collate, "collateBy", 0);
fbpPipe(flatten, "out", 0, collate, "in", 0);
fbpPipe(flatten, "flushed", 0, collate, "flush", 0);
fbpPipe(collate, "out", 0, fbpCurrentPartId, "out", 0);
