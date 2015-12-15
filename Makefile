JS_TARGET = index.js
HTML_TARGET = index.html

SRCDIR = src
LIBDIR = lib
OBJDIR = obj
BINDIR = bin

SOURCES := $(wildcard $(SRCDIR)/*.js)
OBJECTS := $(SOURCES:$(SRCDIR)/%.js=$(OBJDIR)/%.js)

.PHONY: all
all: setup $(BINDIR)/$(HTML_TARGET)
	@echo "* Build complete"

.PHONY: setup
setup:
	# Re-making all necessary directories
	@mkdir -p $(BINDIR)
	@mkdir -p $(OBJDIR)
	# Setup complete

.PHONY: clean
clean:
	# Cleaning up
	@rm -rf $(OBJDIR)
	@rm -rf $(BINDIR)
	# Cleanup complete

$(BINDIR)/$(HTML_TARGET): $(BINDIR)/$(JS_TARGET)
	# Building HTML "binary"
	@echo "<html><body><script src=\"index.js\"></script></body></html>" > $@
	# HTML build complete

# Build object files from source files.
$(OBJECTS): NAME=$(basename $(notdir $(<)))
$(OBJECTS): $(OBJDIR)/%.js : $(SRCDIR)/%.js
	@echo "fbpConstructors[\""$(NAME)"\"] = function "$(NAME)"() {" > $@
	@echo "var main;" >> $@
	@cat $< >> $@
	@echo "return main || function () {};" >> $@
	@echo "};" >> $@
	@echo "# Built "$<

# Build JavaScript "binary" from the object files.
$(BINDIR)/$(JS_TARGET): $(OBJECTS)
	# Building JavaScript "binary"
	@echo "(function () {" > $@
	# Writing scheduler
	@cat $(LIBDIR)/scheduler.js >> $@
	# Writing object files
	@cat $(OBJECTS) >> $@
	# Finishing up
	@echo "fbpRun();" >> $@
	@echo "})();" >> $@
	# JavaScript build complete
