// *** Structs *** //
//
// We use ECMAScript 5 class semantics to allow optimization by JIT compilers
// used by most modern JS engines. We stick with ECMAScript 5 because it's more
// widely supported and its run-time behavior is well-known and stable.
//
// We do not use classes for OOP purpose but only to optimize JIT performance.
// Treat these as structures, not classes.

function fbpPart(id, name, main) {
  // The instance ID of a Part
  this.id = id;
  // The name by which we locate a Part
  this.name = name;
  // How many "sub"-Pins there are for each Pin?
  this.pinCounts = {};
  // The main entry point for the instantiated Part
  this.main = main;
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

var fbpConstructors = [];
// The Part that FBP runtime functions refer to is dynamically scoped.
var fbpCurrentPartId = -1;
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


// *** Scheduler *** //

// This is the scheduler, aka the main entry point. Please only call this once
// when you start the program!
//
// The scheduler expects two things:
// 1. The name of the Part to use to start the program
// 2. A dictionary that maps Part names to their corresponding *constructor*
//    functions.
function fbpMain(mainPartName, partConstructors) {
  // Store all the constructors for instantiation with `fbpNew`.
  fbpConstructors = partConstructors;
  // Instantiate the main Part and run it. This will instantiate all the other
  // Parts that are needed to run the program.
  fbpNew(mainPartName)();
  fbpLoop();
}

// Try to find things to do by going through the queues. There should only be
// one loop running at a time. Check the `fbpIsLoopRunning` flag before
// calling!
function fbpLoop() {
  var i, l, pin, part, pinName, pinIndex, main, ip, hasProcessedIps;

  fbpIsLoopRunning = true;

  do {
    // Assume there's no IP and invalidate if there is.
    hasProcessedIps = false;

    // Go through each Pin.
    for (i = 0, l = fbpPins.length; i < l; i++) {
      pin = fbpPins[i];
      part = getTargetPart(pin);
      // Caches
      pinName = pin.name;
      pinIndex = pin.index;
      main = part.main;

      // See if there's any IP.
      while (pin.queue.length > 0) {
        main(pinName, pinIndex, pin.shift());
        // There's now more IP that has been processed!
        hasProcessedIps = true;
      }
    }
  // Only stop if this round has no more IPs.
  } while (hasProcessedIps);

  fbpIsLoopRunning = false;
}

// Given a Pin, "walk" the pipeline and figure out which Part should be
// activated upon IPs arriving at the given Pin's queue.
function getTargetPart(pin) {
  // Stop when there's no more Pin redirection.
  while (pin.targetPin !== pin) {
    pin = pin.targetPin;
  }

  // Then return the Part to which the Pin belongs.
  return fbpParts[pin.partId];
}


// *** Library *** //

function fbpPinCount(pinName) {
  return fbpParts[fbpCurrentPartId].pinCounts[pinName];
}

function fbpSend(pinName, pinIndex, ip) {
  fbpPinsByName[fbpCurrentPartId][pinName][pinIndex].queue.push(ip);

  // Sending an event triggers the loop, if not already running.
  if (!fbpIsLoopRunning) {
    fbpLoop();
  }
}

function fbpOpenBrakcet() {
  return new fbpPacket("open", null);
}

function fbpIsOpenBracket(ip) {
  return ip instanceof fbpPacket && ip.type === "open";
}

function fbpCloseBracket() {
  return new fbpPacket("close", null);
}

function fbpIsCloseBracket(ip) {
  return ip instanceof fbpPacket && ip.type === "close";
}

function fbpIp(value) {
  return new fbpPacket("data", value);
}

function fbpNew(name) {
  var id = fbpParts.length;
  // Run a Part's constructor to get a new instance's main entry point.
  var main = fbpConstructors[name]();

  fbpParts.push(new fbpPart(id, name, main));
  return id;
}

// Pipe IPs from a Pin to another Pin.
function fbpPipe(aPartId, aPinName, aPinIndex, bPartId, bPinName, bPinIndex) {
  // Find the input and output Pins.
  var aPin = fbpPinsByName[aPartId][aPinName][aPinIndex];
  var bPin = fbpPinsByName[bPartId][bPinName][bPinIndex];

  // Make sure they are initialized.
  if (!(aPin instanceof fbpPin)) {
    aPin = new fbpPin(aPinName, aPinIndex, aPartId);
    // Save the Pin both by name and to general registry.
    fbpPinsByName[aPartId][aPinName][aPinIndex] = aPin;
    fbpPins.push(aPin);
  }

  // Do the same for the downstream Part.
  if (!(bPin instanceof fbpPin)) {
    bPin = new fbpPin(bPinName, bPinIndex, bPartId);
    fbpPinsByName[bPartId][bPinName][bPinIndex] = bPin;
    fbpPins.push(bPin);
  }

  // Set downstream Pin as the target Pin.
  aPin.targetPin = bPin;
}
