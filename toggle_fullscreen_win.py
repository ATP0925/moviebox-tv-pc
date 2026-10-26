"""
Standalone Fullscreen Toggle Utility for Android Emulator (MovieBoxTV PC)
Can be invoked from Toggle_FullScreen.bat or hotkey at any time.
"""
import ctypes
from ctypes import wintypes
import time

user32 = ctypes.windll.user32

GWL_STYLE = -16
WS_CAPTION = 0x00C00000
WS_THICKFRAME = 0x00040000
WS_MINIMIZEBOX = 0x00020000
WS_MAXIMIZEBOX = 0x00010000
WS_SYSMENU = 0x00080000
WS_POPUP = 0x80000000
WS_VISIBLE = 0x10000000
SWP_FRAMECHANGED = 0x0020
SWP_SHOWWINDOW = 0x0040
SW_HIDE = 0
SW_SHOW = 5
SW_RESTORE = 9
SW_MAXIMIZE = 3
HWND_TOP = 0

WNDENUMPROC = ctypes.WINFUNCTYPE(wintypes.BOOL, wintypes.HWND, wintypes.LPARAM)

class RECT(ctypes.Structure):
    _fields_ = [('left', ctypes.c_long), ('top', ctypes.c_long), ('right', ctypes.c_long), ('bottom', ctypes.c_long)]

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
user32.EnumWindows.restype = wintypes.BOOL
user32.EnumWindows.argtypes = [WNDENUMPROC, wintypes.LPARAM]
user32.FindWindowW.restype = wintypes.HWND
user32.FindWindowW.argtypes = [wintypes.LPCWSTR, wintypes.LPCWSTR]
user32.GetSystemMetrics.restype = ctypes.c_int
user32.GetSystemMetrics.argtypes = [ctypes.c_int]

def find_emulator_window():
    # 1. Exact title check
    h = user32.FindWindowW(None, "Android Emulator - MovieBoxTV_PC:5554")
    if h and user32.IsWindowVisible(h):
        return h

    # 2. EnumWindows
    found = []
    def cb(hwnd, lparam):
        if user32.IsWindowVisible(hwnd):
            l = user32.GetWindowTextLengthW(hwnd)
            if l > 0:
                b = ctypes.create_unicode_buffer(l + 1)
                user32.GetWindowTextW(hwnd, b, l + 1)
                t = b.value.lower()
                if "moviebox" in t or ("android emulator" in t and "5554" in t):
                    found.append(hwnd)
                    return False
        return True
    user32.EnumWindows(WNDENUMPROC(cb), 0)
    if found:
        return found[0]

    # 3. Class name search
    for cls in ["Qt653QWindowIcon", "Qt6QWindowIcon", "Qt5QWindowIcon"]:
        h = user32.FindWindowW(cls, None)
        if h and user32.IsWindowVisible(h):
            return h

    return None

def find_toolbars():
    toolbars = []
    def cb(h, lp):
        if user32.IsWindowVisible(h):
            c = ctypes.create_unicode_buffer(256)
            user32.GetClassNameW(h, c, 256)
            cls_name = c.value.lower()
            if "tool" in cls_name and ("qt" in cls_name or "window" in cls_name):
                toolbars.append(h)
        return True
    user32.EnumWindows(WNDENUMPROC(cb), 0)
    return toolbars

def toggle():
    hwnd = find_emulator_window()
    if not hwnd:
        print("[-] Emulator window not found.")
        return False

    screen_w = user32.GetSystemMetrics(0)
    screen_h = user32.GetSystemMetrics(1)

    cur_style = user32.GetWindowLongW(hwnd, GWL_STYLE)
    is_borderless = (cur_style & WS_POPUP) and not (cur_style & WS_CAPTION)

    toolbars = find_toolbars()

    if not is_borderless:
        print(f"[*] Switching to Fullscreen ({screen_w}x{screen_h})...")
        for tb in toolbars:
            user32.ShowWindow(tb, SW_HIDE)

        # Remove borders & caption
        new_style = cur_style & ~(WS_CAPTION | WS_THICKFRAME | WS_MINIMIZEBOX | WS_MAXIMIZEBOX | WS_SYSMENU)
        new_style |= WS_POPUP | WS_VISIBLE
        user32.SetWindowLongW(hwnd, GWL_STYLE, new_style)

        user32.SetWindowPos(hwnd, HWND_TOP, 0, 0, screen_w, screen_h, SWP_FRAMECHANGED | SWP_SHOWWINDOW)
        user32.ShowWindow(hwnd, SW_MAXIMIZE)
        user32.SetForegroundWindow(hwnd)
        print("[+] 100% Fullscreen Activated!")
    else:
        print("[*] Restoring Windowed mode...")
        # Restore standard windowed style
        restored_style = (cur_style & ~WS_POPUP) | WS_CAPTION | WS_THICKFRAME | WS_MINIMIZEBOX | WS_MAXIMIZEBOX | WS_SYSMENU | WS_VISIBLE
        user32.SetWindowLongW(hwnd, GWL_STYLE, restored_style)

        user32.ShowWindow(hwnd, SW_RESTORE)
        user32.SetWindowPos(hwnd, HWND_TOP, 100, 60, 1366, 820, SWP_FRAMECHANGED | SWP_SHOWWINDOW)

        for tb in toolbars:
            user32.ShowWindow(tb, SW_SHOW)

        user32.SetForegroundWindow(hwnd)
        print("[+] Windowed Mode Restored!")

    return True

if __name__ == "__main__":
    toggle()
