# Defining Talon User Actions

## Pattern

```python
from talon import Module, actions, ui

mod = Module()

@mod.action_class
class Actions:
    def my_action_name(arg: str):
        """Docstring is required — used as the action description"""
        # implementation
        actions.key("cmd-n")
```

## Key points

- `mod = Module()` registers the module with Talon
- `@mod.action_class` decorator registers all methods as `user.<method_name>` actions
- Docstring on each method is **required** — Talon uses it as the action description
- Actions are callable from `.talon` files as `user.my_action_name(arg)` or from Python as `actions.user.my_action_name(arg)`
- Talon auto-reloads when files change — no restart needed
- Only one module per file can define the same action name

## Calling other actions from within

```python
actions.user.switcher_focus_app(app)   # call another user action
actions.key("cmd-n")                    # built-in key action
actions.insert("text")                  # built-in text insertion
actions.sleep("500ms")                  # built-in sleep (timespec format)
```

## Timespec format for actions.sleep
- `"500ms"`, `"1s"`, `"50ms"` — string format
- `0.5` — float seconds also works
- NOT `"0.5s"` — this will error

## Calling from .talon files

```
my voice command:
    user.my_action_name("argument")
```

## Calling from REPL

```python
actions.user.my_action_name("argument")
```
