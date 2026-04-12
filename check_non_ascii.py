import os

def check_css_files(directory):
    for root, dirs, files in os.walk(directory):
        for file in files:
            if file.endswith('.css'):
                path = os.path.join(root, file)
                with open(path, 'rb') as f:
                    content = f.read()
                    for i, byte in enumerate(content):
                        if byte > 127:
                            print(f"{path}:{i}: Non-ASCII byte {byte} at index {i}")

if __name__ == "__main__":
    check_css_files('d:/Aplicaciones/App Savit/src')
