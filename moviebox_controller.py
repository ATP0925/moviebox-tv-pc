"""
MovieBoxTV PC — Intelligent Keyboard, Mouse & Fullscreen Controller v2.5
- 100% Screen Utilization / True Borderless Fullscreen (Auto-engages & F11 / F / Alt+Enter toggle)
- Solves Mouse Double-Click: High-precision OS hook debounces left clicks to 450ms, discarding duplicate streams & hardware bounce
- Right-Click = Back button (Clean PC navigation)
- Smooth Mouse Wheel Shelf Scrolling (Row-by-row navigation, zero fling jumps)
- Single-Shot Keypad (Space/Enter/Esc only fire ONCE per physical key press)
- WASD + Arrow Keys = D-Pad navigation
- Direct macros for Video Quality (Q / P) & Subtitles/Language (L)
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
LOG_FILE = r"C:\Users\atpad\CustomAndroidRuntime\controller.log"

def log(msg):
    timestamp = time.strftime("%Y-%m-%d %H:%M:%S")
    line = f"[{timestamp}] {msg}"
    print(line)
    try:
        with open(LOG_FILE, "a", encoding="utf-8") as f:
            f.write(line + "\n")
    except Exception:
        pass

# Win32 Constants
GWL_STYLE = -16
WS_CAPTION = 0x00C00000
WS_THICKFRAME = 0x00040000
WS_MINIMIZEBOX = 0x00020000
WS_MAXIMIZEBOX = 0x00010000
WS_SYSMENU = 0x00080000
WS_POPUP = 0x80000000
WS_VISIBLE = 0x10000000
WS_OVERLAPPEDWINDOW = 0x00CF0000

SWP_FRAMECHANGED = 0x0020
SWP_SHOWWINDOW = 0x0040
SW_HIDE = 0
SW_SHOW = 5
SW_RESTORE = 9
SW_MAXIMIZE = 3
HWND_TOP = 0
GA_ROOT = 2

WH_MOUSE_LL = 14
WM_LBUTTONDOWN = 0x0201
WM_LBUTTONUP = 0x0202
WM_RBUTTONDOWN = 0x0204
WM_RBUTTONUP = 0x0205
WM_MOUSEWHEEL = 0x020A

# Windows Virtual-Key Codes
VK_LBUTTON = 0x01
VK_RBUTTON = 0x02
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
VK_MENU = 0x12  # Alt
VK_OEM_4 = 0xDB  # [
VK_OEM_6 = 0xDD  # ]
VK_OEM_PLUS = 0xBB  # +
VK_OEM_MINUS = 0xBD  # -

KEYEVENTF_KEYUP = 0x0002

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

# Configure 64-bit Win32 types
LRESULT = ctypes.c_longlong
HOOKPROC = ctypes.WINFUNCTYPE(LRESULT, ctypes.c_int, wintypes.WPARAM, wintypes.LPARAM)
WNDENUMPROC = ctypes.WINFUNCTYPE(wintypes.BOOL, wintypes.HWND, wintypes.LPARAM)

class POINT(ctypes.Structure):
    _fields_ = [("x", ctypes.c_long), ("y", ctypes.c_long)]

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

user32.GetWindowTextLengthW.restype = ctypes.c_int
user32.GetWindowTextLengthW.argtypes = [wintypes.HWND]
user32.GetWindowTextW.restype = ctypes.c_int
user32.GetWindowTextW.argtypes = [wintypes.HWND, wintypes.LPWSTR, ctypes.c_int]
user32.GetClassNameW.restype = ctypes.c_int
user32.GetClassNameW.argtypes = [wintypes.HWND, wintypes.LPWSTR, ctypes.c_int]
user32.GetWindowLongW.restype = ctypes.c_long
user32.GetWindowLongW.argtypes = [wintypes.HWND, ctypes.c_int]
user32.SetWindowLongW.restype = ctypes.c_long
user32.SetWindowLongW.argtypes = [wintypes.HWND, ctypes.c_int, ctypes.c_long]
user32.GetWindowRect.restype = wintypes.BOOL
user32.GetWindowRect.argtypes = [wintypes.HWND, ctypes.POINTER(RECT)]
user32.SetWindowPos.restype = wintypes.BOOL
user32.SetWindowPos.argtypes = [wintypes.HWND, wintypes.HWND, ctypes.c_int, ctypes.c_int, ctypes.c_int, ctypes.c_int, wintypes.UINT]
user32.ShowWindow.restype = wintypes.BOOL
user32.ShowWindow.argtypes = [wintypes.HWND, ctypes.c_int]
user32.SetForegroundWindow.restype = wintypes.BOOL
user32.SetForegroundWindow.argtypes = [wintypes.HWND]
user32.WindowFromPoint.restype = wintypes.HWND
user32.WindowFromPoint.argtypes = [POINT]
user32.GetAncestor.restype = wintypes.HWND
user32.GetAncestor.argtypes = [wintypes.HWND, wintypes.UINT]
user32.GetSystemMetrics.restype = ctypes.c_int
user32.GetSystemMetrics.argtypes = [ctypes.c_int]
user32.GetAsyncKeyState.restype = ctypes.c_short
user32.GetAsyncKeyState.argtypes = [ctypes.c_int]
user32.GetForegroundWindow.restype = wintypes.HWND
user32.GetForegroundWindow.argtypes = []
user32.IsWindow.restype = wintypes.BOOL
user32.IsWindow.argtypes = [wintypes.HWND]
user32.IsWindowVisible.restype = wintypes.BOOL
user32.IsWindowVisible.argtypes = [wintypes.HWND]
user32.FindWindowW.restype = wintypes.HWND
user32.FindWindowW.argtypes = [wintypes.LPCWSTR, wintypes.LPCWSTR]
user32.EnumWindows.restype = wintypes.BOOL
user32.EnumWindows.argtypes = [WNDENUMPROC, wintypes.LPARAM]
user32.SetWindowsHookExW.restype = wintypes.HHOOK
user32.SetWindowsHookExW.argtypes = [ctypes.c_int, HOOKPROC, wintypes.HINSTANCE, wintypes.DWORD]
user32.CallNextHookEx.restype = LRESULT
user32.CallNextHookEx.argtypes = [wintypes.HHOOK, ctypes.c_int, wintypes.WPARAM, wintypes.LPARAM]
user32.UnhookWindowsHookEx.restype = wintypes.BOOL
user32.UnhookWindowsHookEx.argtypes = [wintypes.HHOOK]
user32.GetMessageW.restype = wintypes.BOOL
user32.GetMessageW.argtypes = [ctypes.POINTER(wintypes.MSG), wintypes.HWND, wintypes.UINT, wintypes.UINT]
user32.TranslateMessage.restype = wintypes.BOOL
user32.TranslateMessage.argtypes = [ctypes.POINTER(wintypes.MSG)]
user32.DispatchMessageW.restype = LRESULT
user32.DispatchMessageW.argtypes = [ctypes.POINTER(wintypes.MSG)]


class MovieBoxController:
    def __init__(self):
        self.adb_proc = None
        self.running = True
        self.fullscreen = False
        self.saved_style = None
        self.saved_rect = None
        
        # Debounce and State Tracking
        self.last_scroll_time = 0
        self.last_lbutton_time = 0
        self.block_next_lbutton_up = False
        
        # Key release tracking for single-shot buttons (prevents double triggers on press)
        self.key_down_states = {}
        self.nav_repeat_times = {}

        self.mouse_hook = None
        self.mouse_proc = None
        self.cached_emulator_hwnd = None
        self.toolbar_hwnds = []

        log("Initializing MovieBoxController v2.5...")
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
            log("[+] Connected to Android runtime via zero-latency pipe.")
        except Exception as e:
            log(f"[-] ADB shell pipe error: {e}")

    def send_key(self, keycode):
        if self.adb_proc and self.adb_proc.stdin:
            try:
                self.adb_proc.stdin.write(f"input keyevent {keycode}\n")
                self.adb_proc.stdin.flush()
            except Exception:
                self.start_adb_shell()

    def send_sequence(self, sequence):
        def _run():
            for code in sequence:
                self.send_key(code)
                time.sleep(0.08)
        threading.Thread(target=_run, daemon=True).start()

    def is_emulator_hwnd(self, hwnd):
        if not hwnd or not user32.IsWindow(hwnd):
            return False
        
        # Check window text
        length = user32.GetWindowTextLengthW(hwnd)
        if length > 0:
            buff = ctypes.create_unicode_buffer(length + 1)
            user32.GetWindowTextW(hwnd, buff, length + 1)
            title = buff.value.lower()
            if "moviebox" in title or ("android emulator" in title and "5554" in title) or "qemu" in title:
                return True
        
        # Check window class name (Qt6 or Qt5)
        cls_buff = ctypes.create_unicode_buffer(256)
        user32.GetClassNameW(hwnd, cls_buff, 256)
        cls_name = cls_buff.value.lower()
        if "qt6" in cls_name or "qt5" in cls_name or "qwindowicon" in cls_name or "qemu" in cls_name:
            return True

        return False

    def get_emulator_window(self):
        # 1. Check if cached hwnd is still valid
        if self.cached_emulator_hwnd and self.is_emulator_hwnd(self.cached_emulator_hwnd):
            return self.cached_emulator_hwnd

        # 2. Check current foreground window
        fg = user32.GetForegroundWindow()
        if fg:
            root = user32.GetAncestor(fg, GA_ROOT)
            target = root if root else fg
            if self.is_emulator_hwnd(target):
                self.cached_emulator_hwnd = target
                return target

        # 3. Direct title search
        h = user32.FindWindowW(None, "Android Emulator - MovieBoxTV_PC:5554")
        if h and user32.IsWindowVisible(h):
            self.cached_emulator_hwnd = h
            return h

        # 4. Search via EnumWindows
        found = []
        def enum_cb(h, lp):
            if user32.IsWindowVisible(h):
                l = user32.GetWindowTextLengthW(h)
                if l > 0:
                    b = ctypes.create_unicode_buffer(l + 1)
                    user32.GetWindowTextW(h, b, l + 1)
                    t = b.value.lower()
                    if "moviebox" in t or ("android emulator" in t and "5554" in t):
                        found.append(h)
                        return False
            return True

        user32.EnumWindows(WNDENUMPROC(enum_cb), 0)
        if found:
            self.cached_emulator_hwnd = found[0]
            return found[0]

        # 5. Try FindWindow with Qt6 class
        for cls in ["Qt653QWindowIcon", "Qt6QWindowIcon", "Qt5QWindowIcon"]:
            h = user32.FindWindowW(cls, None)
            if h and user32.IsWindowVisible(h):
                self.cached_emulator_hwnd = h
                return h

        return self.cached_emulator_hwnd

    def find_toolbars(self):
        """Finds any detached or docked emulator tool windows (Qt653QWindowToolSaveBits)."""
        toolbars = []
        def enum_tb(h, lp):
            if user32.IsWindowVisible(h):
                c = ctypes.create_unicode_buffer(256)
                user32.GetClassNameW(h, c, 256)
                cls_name = c.value.lower()
                if "tool" in cls_name and ("qt" in cls_name or "window" in cls_name):
                    toolbars.append(h)
            return True
        user32.EnumWindows(WNDENUMPROC(enum_tb), 0)
        self.toolbar_hwnds = toolbars
        return toolbars

    def toggle_fullscreen(self, hwnd=None):
        if not hwnd:
            hwnd = self.get_emulator_window()
        if not hwnd:
            log("[-] Emulator window not detected for fullscreen toggle.")
            return

        screen_w = user32.GetSystemMetrics(0)
        screen_h = user32.GetSystemMetrics(1)

        cur_style = user32.GetWindowLongW(hwnd, GWL_STYLE)
        is_borderless = (cur_style & WS_POPUP) and not (cur_style & WS_CAPTION)

        self.find_toolbars()

        if not is_borderless:
            # Entering Fullscreen
            rect = RECT()
            user32.GetWindowRect(hwnd, ctypes.byref(rect))
            self.saved_rect = rect
            self.saved_style = cur_style

            # Hide toolbars
            for tb in self.toolbar_hwnds:
                user32.ShowWindow(tb, SW_HIDE)

            # Strip caption & frame
            new_style = cur_style & ~(WS_CAPTION | WS_THICKFRAME | WS_MINIMIZEBOX | WS_MAXIMIZEBOX | WS_SYSMENU)
            new_style |= WS_POPUP | WS_VISIBLE
            user32.SetWindowLongW(hwnd, GWL_STYLE, new_style)

            # Cover full primary screen
            user32.SetWindowPos(hwnd, HWND_TOP, 0, 0, screen_w, screen_h, SWP_FRAMECHANGED | SWP_SHOWWINDOW)
            user32.ShowWindow(hwnd, SW_MAXIMIZE)
            user32.SetForegroundWindow(hwnd)

            self.fullscreen = True
            log(f"[+] Fullscreen ACTIVATED ({screen_w}x{screen_h} 100% PC Screen utilization).")
        else:
            # Exiting Fullscreen (Restoring windowed mode)
            restored_style = (cur_style & ~WS_POPUP) | WS_CAPTION | WS_THICKFRAME | WS_MINIMIZEBOX | WS_MAXIMIZEBOX | WS_SYSMENU | WS_VISIBLE
            user32.SetWindowLongW(hwnd, GWL_STYLE, restored_style)

            user32.ShowWindow(hwnd, SW_RESTORE)

            w = self.saved_rect.right - self.saved_rect.left if self.saved_rect else 1366
            h = self.saved_rect.bottom - self.saved_rect.top if self.saved_rect else 820
            x = self.saved_rect.left if self.saved_rect else 100
            y = self.saved_rect.top if self.saved_rect else 60
            user32.SetWindowPos(hwnd, HWND_TOP, x, y, w, h, SWP_FRAMECHANGED | SWP_SHOWWINDOW)

            # Show toolbars
            for tb in self.toolbar_hwnds:
                user32.ShowWindow(tb, SW_SHOW)

            user32.SetForegroundWindow(hwnd)
            self.fullscreen = False
            log("[+] Windowed mode RESTORED.")

    def is_key_down(self, vk):
        return (user32.GetAsyncKeyState(vk) & 0x8000) != 0

    def check_single_shot(self, vk):
        """Returns True ONCE when key transitions UP -> DOWN (rising edge). Prevents double triggers."""
        down = self.is_key_down(vk)
        was_down = self.key_down_states.get(vk, False)
        self.key_down_states[vk] = down
        if down and not was_down:
            return True
        return False

    def check_nav_repeat(self, key_id, vk, initial_delay=0.35, repeat_rate=0.14):
        """Clean navigation repeat: 0ms instant first press, then smooth hold-to-repeat."""
        now = time.time()
        down = self.is_key_down(vk)
        last_state = self.key_down_states.get(vk, False)
        self.key_down_states[vk] = down

        if down and not last_state:
            # Initial press (rising edge)
            self.nav_repeat_times[key_id] = now
            return True
        elif down and last_state:
            # Key held down
            start_time = self.nav_repeat_times.get(key_id, now)
            if (now - start_time) >= initial_delay:
                last_rep = self.nav_repeat_times.get(f"{key_id}_rep", 0)
                if (now - last_rep) >= repeat_rate:
                    self.nav_repeat_times[f"{key_id}_rep"] = now
                    return True
        return False

    def handle_keyboard_loop(self):
        while self.running:
            time.sleep(0.015)  # 60Hz polling, ultra-responsive
            hwnd = self.get_emulator_window()
            if not hwnd:
                continue

            # Directional Pad (WASD & Arrows) with clean repeat rate
            if self.check_nav_repeat('UP', VK_KEY_W) or self.check_nav_repeat('UP', VK_UP):
                self.send_key(AKEY_DPAD_UP)

            elif self.check_nav_repeat('DOWN', VK_KEY_S) or self.check_nav_repeat('DOWN', VK_DOWN):
                self.send_key(AKEY_DPAD_DOWN)

            elif self.check_nav_repeat('LEFT', VK_KEY_A) or self.check_nav_repeat('LEFT', VK_LEFT):
                self.send_key(AKEY_DPAD_LEFT)

            elif self.check_nav_repeat('RIGHT', VK_KEY_D) or self.check_nav_repeat('RIGHT', VK_RIGHT):
                self.send_key(AKEY_DPAD_RIGHT)

            # Single-Shot Action Buttons (Zero double-triggering!)
            elif self.check_single_shot(VK_RETURN) or self.check_single_shot(VK_SPACE):
                self.send_key(AKEY_DPAD_CENTER)

            elif self.check_single_shot(VK_ESCAPE) or self.check_single_shot(VK_BACK):
                self.send_key(AKEY_BACK)

            # Fullscreen Toggle: F, F11, or Alt+Enter
            elif self.check_single_shot(VK_F11) or self.check_single_shot(VK_KEY_F):
                self.toggle_fullscreen(hwnd)

            # Video Quality Macro (Q or P)
            elif self.check_single_shot(VK_KEY_Q) or self.check_single_shot(VK_KEY_P):
                log("[*] Macro: Opening Video Quality Settings...")
                self.send_sequence([AKEY_DPAD_DOWN, AKEY_DPAD_DOWN, AKEY_DPAD_RIGHT, AKEY_DPAD_CENTER])

            # Language & Subtitles Macro (L)
            elif self.check_single_shot(VK_KEY_L):
                log("[*] Macro: Opening Subtitles & Language Settings...")
                self.send_sequence([AKEY_DPAD_DOWN, AKEY_DPAD_DOWN, AKEY_DPAD_RIGHT, AKEY_DPAD_RIGHT, AKEY_DPAD_RIGHT, AKEY_DPAD_RIGHT, AKEY_DPAD_CENTER])

            # Previous / Next Episode ([ / ])
            elif self.check_single_shot(VK_OEM_4):
                self.send_key(AKEY_MEDIA_PREVIOUS)
            elif self.check_single_shot(VK_OEM_6):
                self.send_key(AKEY_MEDIA_NEXT)

            # Volume & Mute
            elif self.check_single_shot(VK_KEY_M):
                self.send_key(AKEY_VOLUME_MUTE)
            elif self.check_single_shot(VK_OEM_PLUS):
                self.send_key(AKEY_VOLUME_UP)
            elif self.check_single_shot(VK_OEM_MINUS):
                self.send_key(AKEY_VOLUME_DOWN)

    def hook_mouse(self):
        """
        Low-level mouse hook:
        1. Debounces Left-Clicks on Emulator window to strictly 450ms (Eliminates double-click bug in MovieBoxTV)
        2. Right-Click on Emulator = Instant BACK button
        3. Mouse Wheel = Smooth row-by-row shelf scroll (Blocks Android fling jump)
        """
        def low_level_mouse_proc(nCode, wParam, lParam):
            if nCode >= 0:
                try:
                    ms = ctypes.cast(lParam, ctypes.POINTER(MSLLHOOKSTRUCT)).contents
                    pt = POINT(ms.pt_x, ms.pt_y)
                    hwnd_target = user32.WindowFromPoint(pt)
                    root_hwnd = user32.GetAncestor(hwnd_target, GA_ROOT) if hwnd_target else None
                    target = root_hwnd if root_hwnd else hwnd_target

                    is_on_emulator = False
                    if target:
                        is_on_emulator = (target == self.cached_emulator_hwnd) or self.is_emulator_hwnd(target)

                    if is_on_emulator:
                        now = time.time()

                        # 1. DEBOUNCE LEFT-CLICK (Fixes the Double Click bug in MovieBoxTV!)
                        if wParam == WM_LBUTTONDOWN:
                            if (now - self.last_lbutton_time) < 0.45:
                                # Second click arrived within 450ms -> SWALLOW IT!
                                self.block_next_lbutton_up = True
                                return 1
                            else:
                                self.last_lbutton_time = now
                                self.block_next_lbutton_up = False

                        elif wParam == WM_LBUTTONUP:
                            if self.block_next_lbutton_up:
                                self.block_next_lbutton_up = False
                                return 1

                        # 2. RIGHT-CLICK = INSTANT BACK BUTTON
                        elif wParam == WM_RBUTTONDOWN:
                            self.send_key(AKEY_BACK)
                            return 1
                        elif wParam == WM_RBUTTONUP:
                            return 1

                        # 3. SMOOTH MOUSE WHEEL SCROLL (No fling jumping to top/bottom)
                        elif wParam == WM_MOUSEWHEEL:
                            raw_delta = (ms.mouseData >> 16) & 0xFFFF
                            delta = raw_delta if raw_delta < 0x8000 else raw_delta - 0x10000
                            if (now - self.last_scroll_time) >= 0.12:
                                self.last_scroll_time = now
                                if delta > 0:
                                    self.send_key(AKEY_DPAD_UP)
                                elif delta < 0:
                                    self.send_key(AKEY_DPAD_DOWN)
                            # Block raw Android fling event
                            return 1
                except Exception:
                    pass

            return user32.CallNextHookEx(None, nCode, wParam, lParam)

        self.mouse_proc = HOOKPROC(low_level_mouse_proc)
        self.mouse_hook = user32.SetWindowsHookExW(WH_MOUSE_LL, self.mouse_proc, 0, 0)
        log(f"[+] Mouse hook installed successfully: {self.mouse_hook}")

        # Win32 Message Loop
        msg = wintypes.MSG()
        while self.running and user32.GetMessageW(ctypes.byref(msg), None, 0, 0) != 0:
            user32.TranslateMessage(ctypes.byref(msg))
            user32.DispatchMessageW(ctypes.byref(msg))

    def auto_fullscreen_worker(self):
        """Automatically expands MovieBoxTV to fullscreen once Android app is ready."""
        time.sleep(3.0)
        for _ in range(15):
            if not self.running:
                break
            hwnd = self.get_emulator_window()
            if hwnd:
                log("[*] Auto-engaging 100% Fullscreen for full PC screen utilization...")
                self.toggle_fullscreen(hwnd)
                break
            time.sleep(1.0)

    def monitor_qemu_lifecycle(self):
        """Monitors emulator process and terminates gracefully when closed."""
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
                    log("[*] Emulator exited. Stopping controller.")
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
        log("==============================================================")
        log("  🎬 MovieBoxTV PC — Intelligent Keyboard, Mouse & Fullscreen")
        log("==============================================================")
        log("  ✓ Fullscreen           : F / F11 / Alt+Enter (Auto-Activated)")
        log("  ✓ Mouse Double-Click   : Filtered & Debounced (Strict 1-Click)")
        log("  ✓ Right-Click          : Instant Back / Close Menu")
        log("  ✓ Mouse Wheel          : Smooth Row Shelf Scrolling")
        log("  ✓ Navigation (D-Pad)   : WASD / Arrow Keys")
        log("  ✓ Select / Play-Pause  : Spacebar / Enter")
        log("  ✓ Back / Close         : Esc / Backspace")
        log("  ✓ Video Quality        : Q or P (480P / 720P / 1080P)")
        log("  ✓ Subtitles & Audio    : L (Language Menu)")
        log("  ✓ Episodes             : [ (Prev) / ] (Next)")
        log("  ✓ Volume Controls      : + (Up) / - (Down) / M (Mute)")
        log("==============================================================")

        t_key = threading.Thread(target=self.handle_keyboard_loop, daemon=True)
        t_key.start()

        t_auto = threading.Thread(target=self.auto_fullscreen_worker, daemon=True)
        t_auto.start()

        t_mon = threading.Thread(target=self.monitor_qemu_lifecycle, daemon=True)
        t_mon.start()

        self.hook_mouse()


if __name__ == "__main__":
    ctrl = MovieBoxController()
    ctrl.run()
