import subprocess, os

os.environ['JAVA_HOME'] = r'C:\Program Files\Eclipse Adoptium\jdk-17.0.19.10-hotspot'
os.environ['PATH'] = os.path.join(os.environ['JAVA_HOME'], 'bin') + os.pathsep + os.environ['PATH']

sdk_root = r'C:\Users\Public\android-sdk'
sdkmanager = os.path.join(sdk_root, 'cmdline-tools', 'latest', 'bin', 'sdkmanager.bat')

# Accept licenses first
proc = subprocess.Popen(
    [sdkmanager, '--sdk_root=' + sdk_root, '--licenses'],
    stdin=subprocess.PIPE,
    stdout=subprocess.PIPE,
    stderr=subprocess.STDOUT,
    text=True
)
# Send 'y' repeatedly to accept all licenses
stdout, _ = proc.communicate(input='y\ny\ny\ny\ny\ny\n')
print('License acceptance:', proc.returncode)
if 'accepted' in stdout.lower() or 'all' in stdout.lower():
    print('Licenses accepted')

# Now install platforms
proc2 = subprocess.run(
    [sdkmanager, '--sdk_root=' + sdk_root, 'platforms;android-34', 'build-tools;34.0.0'],
    capture_output=True, text=True
)
print('Install result:', proc2.returncode)
for line in proc2.stdout.split('\n'):
    if line.strip():
        print('  ', line.strip()[:100])
