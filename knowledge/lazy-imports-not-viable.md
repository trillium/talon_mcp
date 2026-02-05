# Lazy Imports Are Not Viable in Talon Python Files

## Problem

In Talon Python files, **all import statements must be at the top of the file**. Lazy/inline imports inside functions do not work reliably and can cause silent failures.

## Example of What NOT to Do

```python
# BAD - lazy import inside function
def mouse_clock_toggle():
    """Toggle mouse clock on/off"""
    from talon import actions  # This causes issues!
    mouse_clock = get_mouse_clock_instance()
    if mouse_clock.active_canvas:
        actions.user.mouse_clock_close()
    else:
        actions.user.mouse_clock_activate()
```

```python
# BAD - lazy import in draw callback
def draw(self, canvas_obj):
    if self._display_mode == DISPLAY_MODE_BOXES:
        from ..features.box import draw_concentric_boxes  # This causes issues!
        draw_concentric_boxes(canvas_obj, ...)
```

## Correct Approach

```python
# GOOD - all imports at top of file
from talon import actions
from ..features.box import draw_concentric_boxes

def mouse_clock_toggle():
    """Toggle mouse clock on/off"""
    mouse_clock = get_mouse_clock_instance()
    if mouse_clock.active_canvas:
        actions.user.mouse_clock_close()
    else:
        actions.user.mouse_clock_activate()

def draw(self, canvas_obj):
    if self._display_mode == DISPLAY_MODE_BOXES:
        draw_concentric_boxes(canvas_obj, ...)
```

## Why This Happens

Talon's module loading system handles imports differently than standard Python. Lazy imports inside functions can:
- Fail silently without raising errors
- Cause the function to not execute as expected
- Lead to orphaned UI elements (like canvases) that persist but are disconnected from their controlling code

## Symptoms

- Actions appear to execute (print statements work) but actual functionality doesn't happen
- UI elements don't update when state changes
- Code works after a fresh Talon restart but breaks after module reloads

## Source

Discovered while debugging mouse-clock display mode cycling (2026-02-01). The `super-w` keybinding was printing to logs but the display wasn't changing modes due to lazy imports in `actions_core.py` and `adapter.py`.