import ctypes

user32 = ctypes.windll.user32

def enum_cb(hwnd, lparam):
    pid = ctypes.c_ulong()
    user32.GetWindowThreadProcessId(hwnd, ctypes.byref(pid))
    length = user32.GetWindowTextLengthW(hwnd)
    buff = ctypes.create_unicode_buffer(length + 1)
    user32.GetWindowTextW(hwnd, buff, length + 1)
    cls_buff = ctypes.create_unicode_buffer(256)
    user32.GetClassNameW(hwnd, cls_buff, 256)
    if 'emulator' in buff.value.lower() or 'movie' in buff.value.lower() or '5554' in buff.value.lower() or 'qemu' in cls_buff.value.lower() or 'qt' in cls_buff.value.lower():
        print(f"HWND: {hwnd}, Visible: {user32.IsWindowVisible(hwnd)}, PID: {pid.value}, Class: {cls_buff.value}, Title: '{buff.value}'")
    return True

WNDENUMPROC = ctypes.WINFUNCTYPE(ctypes.c_bool, ctypes.c_void_p, ctypes.c_void_p)
user32.EnumWindows(WNDENUMPROC(enum_cb), 0)
