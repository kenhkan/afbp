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
}

function fbpPin(name, index, targetPartId) {
  this.name = name;
  // A Pin without Pin index is assumed to be a Pin of 1 (i.e. just `pin[0]`).
  this.index = index;
  // The meat of FBP! IPs are stored here when sent.
  //
  // The scheduler does not enforce the concept of input and output Pins. A Pin
  // of an upstream Part shares the same queue with the Pin of the downstream
  // Part.
  this.queue = [];
  // The two Pins sharing the same queue have a reference to the same Part that
  // needs to be activated on receipt of IPs.
  this.targetPartId = targetPartId;
}

function fbpPacket(type, value) {
  this.type = type;
  this.value = value;
}


// *** Globals *** //

// The Part that FBP runtime subroutines refer to is dynamically scoped.
var fbpCurrentPartId = -1;
// Each Part instance has an integer ID, represented by the index of this
// array.
var fbpParts = [];
// Lookup table for all the Pins. This is indexed by the Part ID, then by the
// Pin name, and then the Pin index.
var fbpPins = [];


// *** Scheduler *** //

// This is the scheduler, aka the main entry point. Please only call this once
// when you start the program!
//
// The scheduler expects two things:
//
// 1. The ID of the Part to use to start the program
// 2. An array of Parts
function fbpMain(mainPartId, parts) {
  // TODO:
  mainPart();
}


// *** Library *** //

function fbpPinCount(pinName) {
  return fbpParts[fbpCurrentPartId].pinCounts[pinName];
}

function fbpSend(pinName, pinIndex, ip) {
  fbpPins[fbpCurrentPartId][pinName][pinIndex].queue.push(ip);
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
  var id;

  id = fbpParts.length;
  fbpParts.push(new fbpPart(id, name));
  return id;
}

// Pipe IPs from a Pin to another Pin.
function fbpPipe(aPartId, aPinName, aPinIndex, bPartId, bPinName, bPinIndex) {
  // Find the input and output Pins.
  var aPin = fbpPins[aPartId][aPinName][aPinIndex];
  var bPin = fbpPins[bPartId][bPinName][bPinIndex];
  // Make sure they are initialized.
  if (!(aPin instanceof fbpPin)) {
    aPin = new fbpPin(aPinName, aPinIndex, aPartId);
    fbpPins[aPartId][aPinName][aPinIndex] = aPin;
  }
  if (!(bPin instanceof fbpPin)) {
    bPin = new fbpPin(bPinName, bPinIndex, bPartId);
    fbpPins[bPartId][bPinName][bPinIndex] = bPin;
  }
  // Use the same queue for the two Pins.
  aPin.queue = bPin.queue = [];
  // And point both Pins to the same downstream Pin.
  aPin.targetPartId = bPin.targetPartId = bPartId;
}
