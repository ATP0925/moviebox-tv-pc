import os
import sys
import subprocess
import shutil
import zipfile

ROOT_DIR = r"c:\Users\atpad\.gemini\antigravity-ide\scratch\moviebox-pc"
BUILD_DIR = os.path.join(ROOT_DIR, "android_build")
JAVA_HOME = r"C:\Program Files\Android\Android Studio\jbr"
SDK_DIR = r"C:\Users\atpad\AppData\Local\Android\Sdk"
BUILD_TOOLS = os.path.join(SDK_DIR, "build-tools", "36.0.0")
PLATFORM_JAR = os.path.join(SDK_DIR, "platforms", "android-37.0", "android.jar")

JAVAC = os.path.join(JAVA_HOME, "bin", "javac.exe")
KEYTOOL = os.path.join(JAVA_HOME, "bin", "keytool.exe")
AAPT2 = os.path.join(BUILD_TOOLS, "aapt2.exe")
D8 = os.path.join(BUILD_TOOLS, "d8.bat")
ZIPALIGN = os.path.join(BUILD_TOOLS, "zipalign.exe")
APKSIGNER = os.path.join(BUILD_TOOLS, "apksigner.bat")

os.environ["JAVA_HOME"] = JAVA_HOME
os.environ["PATH"] = os.path.join(JAVA_HOME, "bin") + os.pathsep + os.environ.get("PATH", "")

def run(cmd, cwd=BUILD_DIR):
    print(f">> Running: {' '.join(cmd) if isinstance(cmd, list) else cmd}")
    res = subprocess.run(cmd, cwd=cwd, capture_output=True, text=True, shell=True, env=os.environ)
    if res.returncode != 0:
        print(f"STDOUT: {res.stdout}")
        print(f"STDERR: {res.stderr}")
        raise RuntimeError(f"Command failed with exit code {res.returncode}")
    return res.stdout

print("Starting APK build pipeline...")

# Step 1: Compile Android resources
print("1. Compiling resources with aapt2...")
compiled_res_zip = os.path.join(BUILD_DIR, "compiled_res.zip")
run(f'"{AAPT2}" compile --dir res -o "{compiled_res_zip}"')

# Step 2: Link resources and generate R.java
print("2. Linking resources and generating R.java...")
unaligned_apk = os.path.join(BUILD_DIR, "unaligned.apk")
src_dir = os.path.join(BUILD_DIR, "src")
run(f'"{AAPT2}" link -I "{PLATFORM_JAR}" --manifest AndroidManifest.xml -o "{unaligned_apk}" "{compiled_res_zip}" --java "{src_dir}" --auto-add-overlay')

# Step 3: Compile Java sources with javac
print("3. Compiling Java sources with javac...")
obj_dir = os.path.join(BUILD_DIR, "obj")
java_files = []
for root, _, files in os.walk(src_dir):
    for f in files:
        if f.endswith(".java"):
            java_files.append(os.path.join(root, f))

run(f'"{JAVAC}" -source 17 -target 17 -cp "{PLATFORM_JAR}" -d "{obj_dir}" ' + ' '.join(f'"{jf}"' for jf in java_files))

# Step 4: Dex classes with d8
print("4. Dexing classes with d8...")
bin_dir = os.path.join(BUILD_DIR, "bin")
class_files = []
for root, _, files in os.walk(obj_dir):
    for f in files:
        if f.endswith(".class"):
            class_files.append(os.path.join(root, f))

run(f'"{D8}" --output "{bin_dir}" --lib "{PLATFORM_JAR}" ' + ' '.join(f'"{cf}"' for cf in class_files))

# Step 5: Add classes.dex into unaligned.apk
print("5. Packing classes.dex into APK...")
dex_file = os.path.join(bin_dir, "classes.dex")
with zipfile.ZipFile(unaligned_apk, 'a') as apk_zip:
    apk_zip.write(dex_file, "classes.dex")

# Step 6: 4-byte zipalign
print("6. Aligning APK with zipalign...")
aligned_apk = os.path.join(BUILD_DIR, "MovieBoxTV_aligned.apk")
run(f'"{ZIPALIGN}" -f 4 "{unaligned_apk}" "{aligned_apk}"')

# Step 7: Create keystore if not exists
keystore_path = os.path.join(BUILD_DIR, "moviebox_release.keystore")
if not os.path.exists(keystore_path):
    print("7. Generating signing keystore...")
    run(f'"{KEYTOOL}" -genkeypair -validity 10000 -dname "CN=MovieBoxTV,O=Cinema,C=US" -keystore "{keystore_path}" -storepass moviebox123 -keypass moviebox123 -alias moviebox -keyalg RSA -keysize 2048')

# Step 8: Sign APK with apksigner
print("8. Signing APK with apksigner...")
final_apk = os.path.join(BUILD_DIR, "MovieBoxTV.apk")
run(f'"{APKSIGNER}" sign --ks "{keystore_path}" --ks-pass pass:moviebox123 --key-pass pass:moviebox123 --out "{final_apk}" "{aligned_apk}"')

# Step 9: Verify signature
print("9. Verifying signed APK...")
verify_out = run(f'"{APKSIGNER}" verify --verbose "{final_apk}"')
print("Verification:", verify_out.strip())

# Copy to destinations
downloads_dir_root = os.path.join(ROOT_DIR, "downloads")
downloads_dir_public = os.path.join(ROOT_DIR, "app", "public", "downloads")
os.makedirs(downloads_dir_root, exist_ok=True)
os.makedirs(downloads_dir_public, exist_ok=True)

target_apk_root = os.path.join(downloads_dir_root, "MovieBoxTV.apk")
target_apk_public = os.path.join(downloads_dir_public, "MovieBoxTV.apk")

shutil.copyfile(final_apk, target_apk_root)
shutil.copyfile(final_apk, target_apk_public)

size_mb = os.path.getsize(target_apk_public) / (1024 * 1024)
print(f"🎉 SUCCESS! APK built and copied to downloads: {target_apk_public} ({size_mb:.2f} MB)")
