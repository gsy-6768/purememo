import subprocess, os

os.environ['JAVA_HOME'] = r'C:\Program Files\Eclipse Adoptium\jdk-17.0.19.10-hotspot'
os.environ['PATH'] = os.path.join(os.environ['JAVA_HOME'], 'bin') + os.pathsep + os.environ['PATH']

sdk_root = r'C:\Users\Public\android-sdk'
sdkmanager = os.path.join(sdk_root, 'cmdline-tools', 'latest', 'bin', 'sdkmanager.bat')

# Install SDK components - non-interactive by piping input
print('Installing platforms;android-34...')
proc = subprocess.run(
    [sdkmanager, '--sdk_root=' + sdk_root, 'platforms;android-34'],
    input='y\ny\ny\n',
    capture_output=True,
    text=True,
    encoding='utf-8',
    errors='replace'
)
print(f'  Return code: {proc.returncode}')
for line in proc.stdout.split('\n'):
    if line.strip() and ('installing' in line.lower() or 'done' in line.lower() or 'error' in line.lower() or '%' in line):
        print(f'  {line.strip()[:100]}')

print('Installing build-tools;34.0.0...')
proc2 = subprocess.run(
    [sdkmanager, '--sdk_root=' + sdk_root, 'build-tools;34.0.0'],
    input='y\ny\ny\n',
    capture_output=True,
    text=True,
    encoding='utf-8',
    errors='replace'
)
print(f'  Return code: {proc2.returncode}')
for line in proc2.stdout.split('\n'):
    if line.strip() and ('installing' in line.lower() or 'done' in line.lower() or 'error' in line.lower() or '%' in line):
        print(f'  {line.strip()[:100]}')

# Verify
for name in ['platforms/android-34', 'build-tools/34.0.0']:
    path = os.path.join(sdk_root, name.replace('/', os.sep))
    mark = "OK" if os.path.isdir(path) else "NO"
    print(f'{mark} {name}')
