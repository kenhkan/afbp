# Asynchronous flow-based programming

NOTE: This is a work-in-progress.

This document is intended to be a specification (i.e. not "the" specification)
of a variant of [Flow-based Programming](http://www.jpaulmorrison.com/fbp/)
(FBP), that is completely asynchronous, tentatively named AFBP in this document
for short. The idea is explored by Paul Tarvydas and Norm Sanford.

A completely asynchronous FBP variant is preferred in environments where
processes and preemption are not supported, i.e. it is single-threaded, which
is a requirement in web browsers and other environments without an "operating
system".

The two papers by Tarvydas and Sanford explain the motivations and design of
developing such a system:

* [Software architecture using fine-grained event-driven reactive
  components](http://www.researchgate.net/publication/220796260_Software_architecture_using_fine-grained_event-driven_reactive_components)
* [Software Architecture with Visual
  Frameworks](http://www.researchgate.net/publication/224684025_Software_Architecture_with_Visual_Frameworks)


## Usage

1. `make clean`
2. `make`
3. Open `bin/index.html` in your browser.


## Differences from classic FBP

This section highlights the differences between the de facto specification of
[FBP](http://www.amazon.com/Flow-Based-Programming-J-Paul-Morrison-ebook/dp/B004PLO66O)
and the specification of asynchronous FBP. Basic understanding of FBP is
required.

### There is no preemption.

There are no processes, threads, and therefore no preemption in AFBP.
Multitasking is cooperative. Only [a single
thread](https://bittarvydas.wordpress.com/2014/12/20/there-was-only-one-cpu/)
is assumed. The implication is that all processes (as in an FBP process) must
run to completion and no blocking of any form is allowed.

That is, completely asynchronous.

### There is no implicit back-pressure.

All FBP processes are executed concurrently. IPs are delivered without ever
blocking execution of either the sender or the receiver. This is a requirement
in environments where blocking (i.e. allowing a suspended stack) is not
possible.

That is, completely asynchronous.

### Queues are unbounded.

In classic FBP, queues must be bounded so that back-pressure can happen. Given
that implicit back-pressure is not even possible in a single-threaded
environment, queues are unbounded. It is the responsibility of network designer
to calculate the limits and ensure the network could physically handle the
load.

That is, completely asynchronous.

### Automatic fan-out

Or, one input port may have more than one output ports. In classic FBP, one
must handle sending one IP to multiple FBP processes in a separate component.

Philosophically, classic FBP follows the data factory model where each IP is a
distinct "object" flowing through a data factory; automatic copying violates
the model.

Practically, there is ambiguity in back-pressure handling when copying is
automatic. If one of the destination input ports is blocked, do we block all
other input ports? There is more coupling if copying is automatic.

There is no practical issue with automatic copying in AFBP because all queues
are unbounded. There is also no philosophical issue in AFBP as it follows the
electric network model, where electricity simply flows into the additional
branches when they are present.

That is, completely asynchronous.

### No selective receive

In classic FBP, a component "selects" which port it wishes to receive from at
any point in time. In AFBP, however, a component "reacts" to incoming IPs, each
of which "activates" some subroutine in the component. Selective receive is not
possible in AFBP because there is no blocking, in contrast to FBP in which
selecting to receive from an input port without enqueued IPs would block
component execution.

That is, completely asynchronous.

### IPs are sent after a subroutine has completed. 

Because an activated subroutine must run to completion, sending an IP does not
block. Instead, IPs are "collected" by the runtime scheduler and sent after the
subroutine has completed. This ensures that order is preserved while processes
maintain separation without preemption.

That is, completely asynchronous.


## Implementation specification

TODO
