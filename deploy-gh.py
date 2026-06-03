"""
Deploy dist/ to gh-pages branch
"""
import os, shutil, subprocess, tempfile

os.chdir(os.path.dirname(os.path.abspath(__file__)))

# Step 1: Build
print("Building...")
subprocess.run(["npm", "run", "build"], check=True)

# Step 2: Get remote URL
result = subprocess.run(["git", "remote", "get-url", "origin"], capture_output=True, text=True, check=True)
remote_url = result.stdout.strip()

# Step 3: Create temp dir with dist contents
tmp = tempfile.mkdtemp()
shutil.copytree("dist", os.path.join(tmp, "dist"), dirs_exist_ok=True)

# Step 4: Init git in temp and push
original_dir = os.getcwd()
os.chdir(tmp)

subprocess.run(["git", "init"], check=True)
subprocess.run(["git", "checkout", "-b", "gh-pages"], check=True)

# Copy dist contents to root
for item in os.listdir("dist"):
    shutil.move(os.path.join("dist", item), os.path.join(".", item))
os.rmdir("dist")

subprocess.run(["git", "add", "-A"], check=True)
subprocess.run(["git", "commit", "-m", "Deploy PureMemo"], check=True)
subprocess.run(["git", "remote", "add", "origin", remote_url], check=True)

print("Pushing to gh-pages...")
result = subprocess.run(["git", "push", "--force", "origin", "gh-pages"], capture_output=True, text=True)
print(result.stdout)
if result.returncode != 0:
    print("STDERR:", result.stderr)
    # Try without embedded token
    clean_url = remote_url.split("@")[-1] if "@" in remote_url else remote_url
    if "ghp_" in remote_url:
        print("Token may have expired. Please push manually.")
else:
    print("Deploy successful!")

# Cleanup
os.chdir(original_dir)
shutil.rmtree(tmp, ignore_errors=True)
