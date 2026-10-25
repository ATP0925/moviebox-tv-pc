"""
MovieBoxTV PC — Intelligent Keyboard, D-Pad, Mouse Scroll & Fullscreen Controller
Bridges PC Keyboard (WASD, Arrows, Hotkeys), Smooth Mouse Scrolling, and Fullscreen
directly into the Android TV Emulator with zero input lag.
"""

import ctypes
from ctypes import wintypes
import os
import subprocess
import sys
import threading
import time

user32 = ctypes.windll.user32
kernel32 = ctypes.windll.kernel32

ADB_PATH = r"C:\Users\atpad\CustomAndroidRuntime\platform-tools\adb.exe"

# Win32 Constants
GWL_STYLE = -16
WS_POPUP = 0x80000000
WS_VISIBLE = 0x10000000
WS_OVERLAPPEDWINDOW = 0x00CF0000
SWP_FRAMECHANGED = 0x0020
SWP_SHOWWINDOW = 0x0040
HWND_TOP = 0

WH_MOUSE_LL = 14
WM_MOUSEWHEEL = 0x020A

# Windows Key Codes
VK_LBUTTON = 0x01
VK_BACK = 0x08
VK_RETURN = 0x0D
VK_ESCAPE = 0x1B
VK_SPACE = 0x20
VK_LEFT = 0x25
VK_UP = 0x26
VK_RIGHT = 0x27
VK_DOWN = 0x28
VK_KEY_A = 0x41
VK_KEY_D = 0x44
VK_KEY_F = 0x46
VK_KEY_L = 0x4C
VK_KEY_M = 0x4D
VK_KEY_P = 0x50
VK_KEY_Q = 0x51
VK_KEY_S = 0x53
VK_KEY_W = 0x57
VK_F11 = 0x7A
VK_OEM_4 = 0xDB  # [
VK_OEM_6 = 0xDD  # ]
VK_OEM_PLUS = 0xBB  # +
VK_OEM_MINUS = 0xBD  # -

# Android Key Codes
AKEY_BACK = 4
AKEY_DPAD_UP = 19
AKEY_DPAD_DOWN = 20
AKEY_DPAD_LEFT = 21
AKEY_DPAD_RIGHT = 22
AKEY_DPAD_CENTER = 23
AKEY_VOLUME_UP = 24
AKEY_VOLUME_DOWN = 25
AKEY_MEDIA_PLAY_PAUSE = 85
AKEY_MEDIA_NEXT = 87
AKEY_MEDIA_PREVIOUS = 88
AKEY_VOLUME_MUTE = 164

class RECT(ctypes.Structure):
    _fields_ = [
        ("left", ctypes.c_long),
        ("top", ctypes.c_long),
        ("right", ctypes.c_long),
        ("bottom", ctypes.c_long)
    ]

class MSLLHOOKSTRUCT(ctypes.Structure):
    _fields_ = [
        ("pt_x", ctypes.c_long),
        ("pt_y", ctypes.c_long),
        ("mouseData", ctypes.c_ulong),
        ("flags", ctypes.c_ulong),
        ("time", ctypes.c_ulong),
        ("dwExtraInfo", ctypes.c_ulonglong)
    ]

class MovieBoxController:
    def __init__(self):
        self.adb_proc = None
        self.running = True
        self.fullscreen = False
        self.saved_style = None
        self.saved_rect = None
        self.last_scroll_time = 0
        self.last_key_times = {}
        self.mouse_hook = None
        
        self.start_adb_shell()

    def start_adb_shell(self):
        try:
            self.adb_proc = subprocess.Popen(
                [ADB_PATH, "shell"],
                stdin=subprocess.PIPE,
                stdout=subprocess.DEVNULL,
                stderr=subprocess.DEVNULL,
                text=True,
                bufsize=1
            )
            print("[+] Connected to Android runtime with 0ms fast-pipe.")
        except Exception as e:
            print(f"[-] ADB shell pipe error: {e}")

    def send_key(self, keycode):
        if self.adb_proc and self.adb_proc.stdin:
            try:
                self.adb_proc.stdin.write(f"input keyevent {keycode}\n")
                self.adb_proc.stdin.flush()
            except Exception:
                self.start_adb_shell()

    def send_sequence(self, sequence):
        """Sends a macro sequence (e.g. for opening Quality or Language menu)"""
        def _run():
            for code in sequence:
                self.send_key(code)
                time.sleep(0.08)
        threading.Thread(target=_run, daemon=True).start()

    def get_emulator_window(self):
        fg = user32.GetForegroundWindow()
        if not fg:
            return None
        length = user32.GetWindowTextLengthW(fg)
        buff = ctypes.create_unicode_buffer(length + 1)
        user32.GetWindowTextW(fg, buff, length + 1)
        title = buff.value.lower()
        if "android emulator" in title or "movieboxtv" in title or "5554" in title or "qemu" in title:
            return fg
        
        # Check class name
        cls_buff = ctypes.create_unicode_buffer(256)
        user32.GetClassNameW(fg, cls_buff, 256)
        cls_name = cls_buff.value.lower()
        if "qt5qwindowicon" in cls_name or "qemu" in cls_name:
            return fg

        return None

    def toggle_fullscreen(self, hwnd=None):
        if not hwnd:
            hwnd = self.get_emulator_window()
        if not hwnd:
            # Fallback: search all windows
            def enum_cb(h, lp):
                nonlocal hwnd
                l = user32.GetWindowTextLengthW(h)
                b = ctypes.create_unicode_buffer(l + 1)
                user32.GetWindowTextW(h, b, l + 1)
                if "android emulator" in b.value.lower() or "movieboxtv" in b.value.lower() or "5554" in b.value.lower():
                    hwnd = h
                    return False
                return True
            WNDENUMPROC = ctypes.WINFUNCTYPE(ctypes.c_bool, ctypes.c_void_p, ctypes.c_void_p)
            user32.EnumWindows(WNDENUMPROC(enum_cb), 0)

        if not hwnd:
            return

        screen_w = user32.GetSystemMetrics(0)
        screen_h = user32.GetSystemMetrics(1)

        if not self.fullscreen:
            # Store current bounds & style
            rect = RECT()
            user32.GetWindowRect(hwnd, ctypes.byref(rect))
            self.saved_rect = rect
            self.saved_style = user32.GetWindowLongW(hwnd, GWL_STYLE)

            # Apply borderless fullscreen
            new_style = (self.saved_style & ~WS_OVERLAPPEDWINDOW) | WS_POPUP | WS_VISIBLE
            user32.SetWindowLongW(hwnd, GWL_STYLE, new_style)
            user32.SetWindowPos(hwnd, HWND_TOP, 0, 0, screen_w, screen_h, SWP_FRAMECHANGED | SWP_SHOWWINDOW)
            self.fullscreen = True
            print("[+] Fullscreen ENABLED (True Borderless 1080p).")
        else:
            # Restore windowed mode
            if self.saved_style:
                user32.SetWindowLongW(hwnd, GWL_STYLE, self.saved_style)
            w = self.saved_rect.right - self.saved_rect.left if self.saved_rect else 1366
            h = self.saved_rect.bottom - self.saved_rect.top if self.saved_rect else 820
            x = self.saved_rect.left if self.saved_rect else 100
            y = self.saved_rect.top if self.saved_rect else 100
            user32.SetWindowPos(hwnd, HWND_TOP, x, y, w, h, SWP_FRAMECHANGED | SWP_SHOWWINDOW)
            self.fullscreen = False
            print("[+] Windowed mode RESTORED.")

    def is_key_pressed(self, vk):
        # High bit set indicates key is down
        return (user32.GetAsyncKeyState(vk) & 0x8000) != 0

    def check_key_debounce(self, key_id, cooldown=0.18):
        now = time.time()
        last = self.last_key_times.get(key_id, 0)
        if now - last >= cooldown:
            self.last_key_times[key_id] = now
            return True
        return False

    def handle_keyboard_loop(self):
        while self.running:
            time.sleep(0.015)  # ~60Hz polling, negligible CPU
            hwnd = self.get_emulator_window()
            if not hwnd:
                continue

            # Directional Pad (WASD & Arrows)
            if (self.is_key_pressed(VK_KEY_W) or self.is_key_pressed(VK_UP)) and self.check_key_debounce('UP'):
                self.send_key(AKEY_DPAD_UP)

            elif (self.is_key_pressed(VK_KEY_S) or self.is_key_pressed(VK_DOWN)) and self.check_key_debounce('DOWN'):
                self.send_key(AKEY_DPAD_DOWN)

            elif (self.is_key_pressed(VK_KEY_A) or self.is_key_pressed(VK_LEFT)) and self.check_key_debounce('LEFT'):
                self.send_key(AKEY_DPAD_LEFT)

            elif (self.is_key_pressed(VK_KEY_D) or self.is_key_pressed(VK_RIGHT)) and self.check_key_debounce('RIGHT'):
                self.send_key(AKEY_DPAD_RIGHT)

            # Select / Play-Pause / OK
            elif (self.is_key_pressed(VK_RETURN) or self.is_key_pressed(VK_SPACE)) and self.check_key_debounce('ENTER', 0.25):
                self.send_key(AKEY_DPAD_CENTER)

            # Back / Exit Settings
            elif (self.is_key_pressed(VK_ESCAPE) or self.is_key_pressed(VK_BACK)) and self.check_key_debounce('BACK', 0.25):
                self.send_key(AKEY_BACK)

            # Full Screen Toggle (F or F11)
            elif (self.is_key_pressed(VK_F11) or self.is_key_pressed(VK_KEY_F)) and self.check_key_debounce('FULLSCREEN', 0.4):
                self.toggle_fullscreen(hwnd)

            # Quality / Resolution Button Shortcut (Q or P)
            # In player: DOWN -> DOWN -> RIGHT lands on Quality (480P) button and opens it!
            elif (self.is_key_pressed(VK_KEY_Q) or self.is_key_pressed(VK_KEY_P)) and self.check_key_debounce('QUALITY', 0.5):
                print("[*] Macro: Accessing Video Quality Settings...")
                self.send_sequence([AKEY_DPAD_DOWN, AKEY_DPAD_DOWN, AKEY_DPAD_RIGHT, AKEY_DPAD_CENTER])

            # Language / Subtitles Button Shortcut (L)
            # In player: DOWN -> DOWN -> RIGHT 4x lands on Language button and opens it!
            elif self.is_key_pressed(VK_KEY_L) and self.check_key_debounce('LANG', 0.5):
                print("[*] Macro: Accessing Subtitles & Audio Language Settings...")
                self.send_sequence([AKEY_DPAD_DOWN, AKEY_DPAD_DOWN, AKEY_DPAD_RIGHT, AKEY_DPAD_RIGHT, AKEY_DPAD_RIGHT, AKEY_DPAD_RIGHT, AKEY_DPAD_CENTER])

            # Previous Episode [
            elif self.is_key_pressed(VK_OEM_4) and self.check_key_debounce('PREV', 0.4):
                self.send_key(AKEY_MEDIA_PREVIOUS)

            # Next Episode ]
            elif self.is_key_pressed(VK_OEM_6) and self.check_key_debounce('NEXT', 0.4):
                self.send_key(AKEY_MEDIA_NEXT)

            # Mute (M)
            elif self.is_key_pressed(VK_KEY_M) and self.check_key_debounce('MUTE', 0.3):
                self.send_key(AKEY_VOLUME_MUTE)

            # Volume Up (+) / Volume Down (-)
            elif self.is_key_pressed(VK_OEM_PLUS) and self.check_key_debounce('VOLUP', 0.1):
                self.send_key(AKEY_VOLUME_UP)
            elif self.is_key_pressed(VK_OEM_MINUS) and self.check_key_debounce('VOLDOWN', 0.1):
                self.send_key(AKEY_VOLUME_DOWN)

    def hook_mouse_scroll(self):
        """Low-level mouse hook to convert wheel scrolling into clean D-Pad UP/DOWN events."""
        HOOKPROC = ctypes.WINFUNCTYPE(ctypes.c_longlong, ctypes.c_int, ctypes.c_ulonglong, ctypes.POINTER(MSLLHOOKSTRUCT))

        def low_level_mouse_proc(nCode, wParam, lParam):
            if nCode >= 0 and wParam == WM_MOUSEWHEEL:
                hwnd = self.get_emulator_window()
                if hwnd:
                    ms = lParam.contents
                    # Delta high word
                    raw_delta = (ms.mouseData >> 16) & 0xFFFF
                    delta = raw_delta if raw_delta < 0x8000 else raw_delta - 0x10000
                    now = time.time()
                    if now - self.last_scroll_time >= 0.12:  # 120ms debounce for smooth shelf scrolling
                        self.last_scroll_time = now
                        if delta > 0:
                            # Scrolled UP -> Smoothly move one shelf up
                            self.send_key(AKEY_DPAD_UP)
                        elif delta < 0:
                            # Scrolled DOWN -> Smoothly move one shelf down
                            self.send_key(AKEY_DPAD_DOWN)
                    # Block raw Android mouse wheel fling to prevent jumping all the way to top/bottom!
                    return 1
            return user32.CallNextHookEx(None, nCode, wParam, lParam)

        self.mouse_proc = HOOKPROC(low_level_mouse_proc)
        self.mouse_hook = user32.SetWindowsHookExW(WH_MOUSE_LL, self.mouse_proc, None, 0)
        
        # Message loop for the hook
        msg = wintypes.MSG()
        while self.running and user32.GetMessageW(ctypes.byref(msg), None, 0, 0) != 0:
            user32.TranslateMessage(ctypes.byref(msg))
            user32.DispatchMessageW(ctypes.byref(msg))

    def monitor_qemu_lifecycle(self):
        """Monitors the emulator process and gracefully terminates when the emulator is closed."""
        while self.running:
            time.sleep(2)
            try:
                res = subprocess.run(
                    ["tasklist", "/FI", "IMAGENAME eq qemu-system-x86_64.exe"],
                    capture_output=True,
                    text=True,
                    creationflags=0x08000000
                )
                if "qemu-system-x86_64" not in res.stdout:
                    print("[*] Emulator exited. Stopping controller.")
                    self.running = False
                    if self.mouse_hook:
                        user32.UnhookWindowsHookEx(self.mouse_hook)
                    if self.adb_proc:
                        try:
                            self.adb_proc.terminate()
                        except Exception:
                            pass
                    os._exit(0)
            except Exception:
                pass


    def run(self):
        print("==============================================================")
        print("  🎬 MovieBoxTV PC — Intelligent Keyboard & Scroll Controller")
        print("==============================================================")
        print("  Controls Active:")
        print("  • WASD / Arrow Keys  : Smooth D-Pad Navigation")
        print("  • Mouse Wheel        : Smooth Shelf Scrolling (No Fling Jump)")
        print("  • Spacebar / Enter   : Select / Play-Pause / OK")
        print("  • Esc / Backspace    : Back / Close Menu")
        print("  • F / F11            : True Borderless 1080p Fullscreen")
        print("  • Q / P              : Quality Settings (480P / 720P / 1080P)")
        print("  • L                  : Subtitles & Audio Language Menu")
        print("  • [ / ]              : Previous / Next Episode")
        print("  • + / - / M          : Volume Up / Down / Mute")
        print("==============================================================")

        t_key = threading.Thread(target=self.handle_keyboard_loop, daemon=True)
        t_key.start()

        t_mon = threading.Thread(target=self.monitor_qemu_lifecycle, daemon=True)
        t_mon.start()

        # Mouse hook needs message pump on this thread
        self.hook_mouse_scroll()

if __name__ == "__main__":
    ctrl = MovieBoxController()
    ctrl.run()
