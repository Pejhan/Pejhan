---
layout: "project"
title: "Trash Current Track"
project_slug: "quodlibet-trash-current"
permalink: "/side-projects/quodlibet-trash-current/"
---

A [Quod Libet](https://github.com/quodlibet/quodlibet) plugin that confirms before
moving the current track to the trash and removing it from the library.
Works with paused tracks; ignores streams and never permanently deletes files.

## Setup

Requires Linux, Quod Libet 4.7.1, `dbus-python`, and GLib's `gdbus` command.
The built-in shortcut editor requires KDE Plasma, including on Wayland.
Other Quod Libet versions, Flatpak, and Snap have not been tested.

1. Copy `trash_current.py` to `~/.config/quodlibet/plugins/`, creating it if needed.
2. Restart Quod Libet and enable **Trash Current Track** in **Plugins**.
3. In the plugin preferences, type a **Global shortcut** such as
   `Meta+Shift+Delete` and click **Apply**. `Meta` means Windows/Super.

The shortcut field accepts text, not recorded key presses. No shortcut is set
by default. Changes apply immediately and persist across restarts; conflicts
are reported without replacing the existing binding. **Clear** removes it.
Desktop action registration is automatic.

Quod Libet must be running with the plugin enabled and trash allowed.
Canceling confirmation leaves the file and library unchanged; repeated requests
are ignored while confirmation is pending. Disabling the plugin retains its
saved shortcut.

The plugin preferences show a running total: “So far you've saved X MB/GB of
storage amounting to Y mins/Hrs”. Each track successfully trashed through this
plugin adds its file size and duration; canceled or failed attempts add nothing.
Totals update immediately and persist across restarts. Storage uses MB below
1,000 MB and GB from that point; duration uses minutes below an hour and hours
from that point. Counting starts when this version is installed. These totals
measure files moved to the trash; disk space is reclaimed when the trash is emptied.

## Other desktops

Bind this command through your desktop's global shortcut settings:

```sh
gdbus call --session --dest io.github.quodlibet.TrashCurrent --object-path /io/github/quodlibet/TrashCurrent --method io.github.quodlibet.TrashCurrent.TrashCurrent
```

## Uninstall

**Clear** the shortcut, disable the plugin, and delete `trash_current.py` from
the plugins directory. Refresh **Plugins** or restart Quod Libet. You can also
remove `~/.local/share/kglobalaccel/quodlibet-trash-current.desktop`.
Use your corresponding XDG directories if `XDG_CONFIG_HOME` or `XDG_DATA_HOME`
is set.

## Tests

Requires a Quod Libet source checkout with its test dependencies. From this
repository, run:

```sh
QUODLIBET_SOURCE_DIR=/path/to/quodlibet python3 -m pytest
```

Use a graphical session with D-Bus, or install Xvfb and `pyvirtualdisplay` for
headless testing. Tests load this repository's plugin, isolate user data and
D-Bus, and mock shortcut-service calls so no real shortcuts are assigned.

## License

Independent community plugin. GPL-2.0-or-later; see [COPYING](https://github.com/Pejhan/quodlibet-trash-current/blob/main/COPYING).
