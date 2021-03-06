// *** Structs *** //
//
// We use ECMAScript 5 class semantics to allow optimization by JIT compilers
// used by most modern JS engines. We stick with ECMAScript 5 because it's more
// widely supported and its run-time behavior is well-known and stable.
//
// We do not use classes for OOP purpose but only to optimize JIT performance.
// Treat these as structures, not classes.

function fbpPart(id, name) {
  // The instance ID of a Part
  this.id = id;
  // The name by which we locate a Part
  this.name = name;
  // How many "sub"-Pins there are for each Pin?
  this.pinCounts = {};
  // The main entry point for the instantiated Part
  this.main = function () {};
}

function fbpPin(name, index, partId) {
  this.name = name;
  // A Pin without Pin index is assumed to be a Pin of 1 (i.e. just `pin[0]`).
  this.index = index;
  // The ID of the Part instance to which this Pin belongs
  this.partId = partId;
  // The meat of FBP! IPs are stored here when sent.
  //
  // The scheduler does not enforce the concept of input and output Pins. A Pin
  // of an upstream Part shares the same queue with the Pin of the downstream
  // Part.
  this.queue = [];
  // Which Part should use activate upon receiving IPs? We store the Pin which
  // belongs to the Part to be activated instead of the Part itself so that
  // when we have more than two Pins piped together, we can walk the pipe and
  // arrive at the right Part to activate, whereas storing the Part would break
  // that pipe.
  this.targetPin = this;
}

function fbpPacket(type, value) {
  this.type = type;
  this.value = value;
}


// *** Globals *** //

// Parts available to be instantiated, indexed by the Part name.
var fbpConstructors = {};
// The Part that FBP runtime functions refer to depends on the stack position.
// A Part may instantiate another Part so we need to keep a stack of Part IDs.
var fbpPartStack = [];
// Each Part instance has an integer ID, represented by the index of this
// array.
var fbpParts = [];
// All the Pins in a flat array. The order is insignificant because this is
// used only for the scheduler to go through all Pins to check for things to
// do. Due to the guarantee of asynchronous Parts, the order must not have any
// bearing on execution.
var fbpPins = [];
// Lookup table for all the Pins. This is indexed by the Part ID, then by the
// Pin name, and then the Pin index.
var fbpPinsByName = [];
// Is the main loop running?
var fbpIsLoopRunning = false;


// *** Constants *** //

var fbpOpenBracket = new fbpPacket("open", null);
var fbpCloseBracket = new fbpPacket("close", null);


// *** Scheduler *** //

// The main entry point. Please only call this once when you start the program!
function fbpRun() {
  // Instantiate the main Part and run it. This will instantiate all the other
  // Parts that are needed to run the program.
  fbpNew("main");
  fbpLoop();
}

// Try to find things to do by going through the queues. There should only be
// one loop running at a time. Check the `fbpIsLoopRunning` flag before
// calling!
function fbpLoop() {
  var i, l, originPin, pin, part, pinName, pinIndex, main, ip, hasProcessedIps;

  fbpIsLoopRunning = true;

  do {
    // Assume there's no IP and invalidate if there is.
    hasProcessedIps = false;

    // Go through each Pin.
    for (i = 0, l = fbpPins.length; i < l; i++) {
      originPin = fbpPins[i];
      // Some Pins are linked to downstream Pins.
      pin = getTargetPin(originPin);
      // Then get the Part to which the Pin belongs.
      part = fbpParts[pin.partId];
      // Caches
      pinName = pin.name;
      pinIndex = pin.index;
      main = part.main;

      fbpPartStack.push(part.id);

      // See if there's any IP.
      while (originPin.queue.length > 0) {
        main(pinName, pinIndex, originPin.queue.shift());
        // There's now more IP that has been processed!
        hasProcessedIps = true;
      }

      fbpPartStack.pop();
    }
  // Only stop if this round has no more IPs.
  } while (hasProcessedIps);

  fbpIsLoopRunning = false;
}

// Given a Pin, "walk" the chain of Pins and figure out which Pin should be
// activated upon IPs arriving at the given Pin's queue.
function getTargetPin(pin) {
  // Stop when there's no more Pin redirection.
  while (pin.targetPin !== pin) {
    pin = pin.targetPin;
  }

  return pin;
}


// *** Utility *** //

// Set the said property with the provided value unless it's already been
// defined.
function fbpSetUnlessDefined(object, key, defaultValue) {
  if (object[key] === void 0) {
    object[key] = defaultValue;
  }
  return object[key];
}


// *** Library *** //

function fbpCurrentPartId() {
  return fbpPartStack[fbpPartStack.length - 1];
}

// This subroutine is only available during run-time, not at load time. i.e.
// you cannot use this outside of the `main()` subroutine or its descedent
// callees of a Part.
function fbpPinCount(pinName) {
  return fbpParts[fbpCurrentPartId()].pinCounts[pinName];
}

function fbpSend(partId, pinName, pinIndex, ip) {
  fbpPinsByName[partId][pinName][pinIndex].queue.push(ip);

  // Sending an event triggers the loop, if not already running.
  if (!fbpIsLoopRunning) {
    fbpLoop();
  }
}

function fbpNew(name) {
  var id, part;

  id = fbpParts.length;
  // Remember to expose current Part.
  fbpPartStack.push(id);
  part = new fbpPart(id, name);
  fbpParts.push(part);
  // Run a Part's constructor to get a new instance's main entry point.
  part.main = fbpConstructors[name]();
  // Remember that it's a stack!
  fbpPartStack.pop();
  return id;
}

// Pipe IPs from a Pin to another Pin.
function fbpPipe(aPartId, aPinName, aPinIndex, bPartId, bPinName, bPinIndex) {
  var aPart, aPin, bPart, bPin;

  bPart = fbpParts[bPartId];
  bPin = fbpPinsByName[bPartId];
  bPin = bPin ? bPin[bPinName] ? bPin[bPinName][bPinIndex] : void 0 : void 0;
  // Initialize downstream Part
  if (!(bPin instanceof fbpPin)) {
    bPin = new fbpPin(bPinName, bPinIndex, bPartId);
    fbpSetUnlessDefined(fbpPinsByName, bPartId, {});
    fbpSetUnlessDefined(fbpPinsByName[bPartId], bPinName, []);
    fbpPinsByName[bPartId][bPinName][bPinIndex] = bPin;
    fbpPins.push(bPin);
    // Pin accounting
    fbpSetUnlessDefined(bPart.pinCounts, bPinName, -1);
    bPart.pinCounts[bPinName]++;
  }

  // Do the same for the upstream Part, but sometimes you don't want an
  // upstream if the Part is the most upstream.
  if (aPartId > -1) {
    aPart = fbpParts[aPartId];
    aPin = fbpPinsByName[aPartId];
    aPin = aPin ? aPin[aPinName] ? aPin[aPinName][aPinIndex] : void 0 : void 0;
    if (!(aPin instanceof fbpPin)) {
      aPin = new fbpPin(aPinName, aPinIndex, aPartId);
      // Save the Pin both by name and to general registry.
      fbpSetUnlessDefined(fbpPinsByName, aPartId, {});
      fbpSetUnlessDefined(fbpPinsByName[aPartId], aPinName, []);
      fbpPinsByName[aPartId][aPinName][aPinIndex] = aPin;
      fbpPins.push(aPin);
      fbpSetUnlessDefined(aPart.pinCounts, aPinName, -1);
      aPart.pinCounts[aPinName]++;
    }

    // Set downstream Pin as the target Pin.
    aPin.targetPin = bPin;
  }
}
