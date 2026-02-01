# Talon Hot-Reload Events

Talon has a built-in event system for detecting when files are hot-reloaded. There is no direct file watcher API exposed, but Talon internally watches for file changes and fires events that your code can subscribe to.

## Event Registration

Use `registry.register(topic, callback)` to subscribe to events:

```python
from talon import registry, app

def on_ready():
    registry.register("update_decls", my_callback)

app.register("ready", on_ready)
```

## Available Hot-Reload Events

| Event | Fires When | Callback Signature |
|-------|------------|-------------------|
| `update_contexts` | Contexts are reloaded/updated | `callback(contexts)` |
| `update_commands` | Commands are reloaded | `callback(commands)` |
| `update_captures` | Captures are reloaded | `callback(captures)` |
| `update_decls` | Declarations (lists, actions, tags) reload | `callback(decls)` |
| `update_settings` | Settings are reloaded | `callback(settings)` |

## Example: Detecting Any File Reload

```python
from talon import registry, app

def on_decls_updated(decls):
    print("Files were reloaded!")
    # decls.actions, decls.lists, decls.captures, decls.tags available

def on_contexts_updated(contexts):
    print("Contexts updated!")

def on_ready():
    registry.register("update_decls", on_decls_updated)
    registry.register("update_contexts", on_contexts_updated)

app.register("ready", on_ready)
```

## Manual Refresh Functions

- `registry.refresh_module(mod)` - Manually refresh a specific module
- `registry.refresh_context(ctx, event)` - Manually refresh a specific context
- `registry.update_contexts()` - Manually trigger context updates

## Dispatch System

You can also use the dispatch system directly:

- `registry.register(topic, cb)` - Register a callback
- `registry.unregister(topic, cb)` - Unregister a callback
- `registry.dispatch(topic, *args)` - Manually dispatch an event
- `registry.dispatch_pre(topic, *args)` - Dispatch "pre" event
- `registry.dispatch_post(topic, *args)` - Dispatch "post" event

## App Lifecycle Events

For initialization timing:

```python
from talon import app

app.register("ready", on_ready)   # Called when Talon is ready
app.register("launch", on_launch) # Called on application launch
```

## See Also

- `~/.talon/documentation/registry/` for full API docs
- `~/.talon/user/__talon_community/core/help/help.py` for real usage examples
